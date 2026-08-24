"""
Matching Service - FastAPI Main Application
Provides deterministic hybrid matching and recommendation APIs
"""
import logging
import time
import uuid
from collections import defaultdict
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from sqlalchemy import text
from sqlalchemy.orm import Session
import psycopg2
from tenacity import retry, wait_fixed, stop_after_attempt, retry_if_exception_type

from .config import settings
from .database import get_db, engine, Base
from . import models, schemas
from .service import MatchingService
from .auth import (
    get_current_user,
    get_current_user_optional,
    get_roles_from_token,
    get_user_id_from_token,
    require_admin,
    require_role,
    ForbiddenException,
)
from .migrations import run_sql_migrations
from .observability import configure_observability

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
configure_observability()

# ============= Simple In-Memory Rate Limiter =============

# Known proxy/gateway IPs — only these are trusted for X-Forwarded-For
TRUSTED_PROXY_IPS = frozenset({
    "127.0.0.1",
    "::1",
    # Add gateway/proxy internal IPs here in production
})

_MAX_BUCKET_SIZE = 5_000  # prevent memory exhaustion from spoofed IPs


class RateLimiter:
    """Simple sliding-window rate limiter (per IP, per endpoint).
    NOT a production-grade solution — use Redis or gateway-based limiting
    for multi-replica deployments. This is defense-in-depth only."""

    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._buckets: dict = defaultdict(list)

    def _clean(self, key: str, now: float) -> None:
        cutoff = now - self.window_seconds
        records = [t for t in self._buckets[key] if t > cutoff]
        if records:
            self._buckets[key] = records
        else:
            del self._buckets[key]  # remove empty bucket

    def allow(self, key: str) -> bool:
        # Guard against unbounded key space
        if len(self._buckets) > _MAX_BUCKET_SIZE:
            # Fallback: remove oldest bucket
            oldest_key = min(self._buckets.keys(), key=lambda k: self._buckets[k][0] if self._buckets[k] else float("inf"))
            del self._buckets[oldest_key]

        now = time.monotonic()
        self._clean(key, now)
        if len(self._buckets[key]) >= self.max_requests:
            return False
        self._buckets[key].append(now)
        return True


def _client_ip(request: Request) -> str:
    """Extract client IP — only trust X-Forwarded-For from known proxies."""
    client_host = request.client.host if request.client else "unknown"

    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded and client_host in TRUSTED_PROXY_IPS:
        # Rightmost IP in the chain (added by our trusted proxy)
        return forwarded.split(",")[-1].strip()

    return client_host


# Default rate limiters
_score_limiter = RateLimiter(max_requests=30, window_seconds=60)
_batch_limiter = RateLimiter(max_requests=10, window_seconds=60)
_recommend_limiter = RateLimiter(max_requests=10, window_seconds=60)

REQUEST_ID_HEADER = "X-Request-Id"
HTTP_REQUESTS_TOTAL = Counter(
    "matching_http_requests_total",
    "Total HTTP requests handled by matching-service.",
    ["method", "path", "status"],
)
HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "matching_http_request_duration_seconds",
    "HTTP request latency in seconds for matching-service.",
    ["method", "path"],
)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Deterministic hybrid matching and recommendation service",
    docs_url="/docs" if settings.ENABLE_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_DOCS else None,
    openapi_url="/api/v1/openapi.json" if settings.ENABLE_DOCS else None,
)

# CORS middleware — matching is internal-only behind gateway.
# No browser should call it directly. Keep a tight allowlist.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-Id"],
)

@app.middleware("http")
async def request_latency_logging(request: Request, call_next):
    start = time.perf_counter()
    request_id = (request.headers.get(REQUEST_ID_HEADER) or "").strip() or str(uuid.uuid4())
    response = None
    status_code = 500

    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        duration_seconds = time.perf_counter() - start
        duration_ms = duration_seconds * 1000
        route = request.scope.get("route")
        metric_path = getattr(route, "path", request.url.path)

        HTTP_REQUESTS_TOTAL.labels(
            method=request.method,
            path=metric_path,
            status=str(status_code),
        ).inc()
        HTTP_REQUEST_DURATION_SECONDS.labels(
            method=request.method,
            path=metric_path,
        ).observe(duration_seconds)

        if response is not None:
            response.headers[REQUEST_ID_HEADER] = request_id
            response.headers["X-Response-Time-Ms"] = f"{duration_ms:.2f}"

        log_fn = logger.info if duration_ms >= 500 else logger.debug
        log_fn(
            "http_request requestId=%s method=%s path=%s status=%s durationMs=%.2f env=%s version=%s commit=%s",
            request_id,
            request.method,
            request.url.path,
            status_code,
            duration_ms,
            settings.DEPLOY_ENVIRONMENT,
            settings.APP_VERSION,
            settings.GIT_COMMIT,
        )

# ============= Startup Events =============

@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    # Check database connection
    try:
        check_db_connection()
        logger.info("✅ Database connection successful")
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
    
    if settings.RUN_MIGRATIONS:
        try:
            run_sql_migrations(engine)
            logger.info("Database migrations applied/verified")
        except Exception as e:
            logger.error(f"Database migration failed: {e}")
            raise

    if settings.AUTO_CREATE_TABLES:
        try:
            Base.metadata.create_all(bind=engine)
            ensure_schema_compatibility()
            logger.info("Database tables created/verified by SQLAlchemy fallback")
        except Exception as e:
            logger.error(f"Error creating tables: {e}")
            raise
    
    logger.info("🚀 Matching Service ready to accept requests")

@retry(
    wait=wait_fixed(5),
    stop=stop_after_attempt(10),
    retry=retry_if_exception_type(psycopg2.OperationalError),
    reraise=True
)
def check_db_connection():
    """Check database connection with retry"""
    logger.info("Checking database connection...")
    try:
        conn = psycopg2.connect(settings.DATABASE_URL)
        conn.close()
    except psycopg2.OperationalError as e:
        logger.warning(f"Database not ready, retrying... Error: {e}")
        raise

def ensure_schema_compatibility():
    """Add non-destructive columns/indexes that create_all will not add to old DBs."""
    statements = [
        "ALTER TABLE applicant_features ADD COLUMN IF NOT EXISTS level VARCHAR(100)",
        "ALTER TABLE applicant_features ADD COLUMN IF NOT EXISTS study_mode VARCHAR(100)",
        "ALTER TABLE applicant_features ADD COLUMN IF NOT EXISTS location VARCHAR(255)",
        "ALTER TABLE applicant_features ADD COLUMN IF NOT EXISTS nationality VARCHAR(100)",
        "ALTER TABLE applicant_features ADD COLUMN IF NOT EXISTS preferred_locations VARCHAR[]",
        "ALTER TABLE applicant_features ADD COLUMN IF NOT EXISTS preferred_funding_types VARCHAR[]",
        "ALTER TABLE applicant_features ADD COLUMN IF NOT EXISTS profile_version VARCHAR(100)",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS application_deadline DATE",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS scholarship_amount DOUBLE PRECISION",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS level VARCHAR(100)",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS study_mode VARCHAR(100)",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS location VARCHAR(255)",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS funding_type VARCHAR(100)",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255)",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS source_url TEXT",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS is_public BOOLEAN",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(50)",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS eligible_majors VARCHAR[]",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS eligible_nationalities VARCHAR[]",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS opportunity_version VARCHAR(100)",
        "ALTER TABLE matching_scores ADD COLUMN IF NOT EXISTS gpa_score DOUBLE PRECISION",
        "ALTER TABLE matching_scores ADD COLUMN IF NOT EXISTS skills_score DOUBLE PRECISION",
        "ALTER TABLE matching_scores ADD COLUMN IF NOT EXISTS research_score DOUBLE PRECISION",
        "ALTER TABLE matching_scores ADD COLUMN IF NOT EXISTS score_breakdown JSON",
        "ALTER TABLE matching_scores ADD COLUMN IF NOT EXISTS profile_version VARCHAR(100)",
        "ALTER TABLE matching_scores ADD COLUMN IF NOT EXISTS opportunity_version VARCHAR(100)",
        "ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS cache_version VARCHAR(255)",
        "ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS rank INTEGER",
        "ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS eligibility_status VARCHAR(30)",
        "ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS components_json JSON",
        "ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS reasons_json JSON",
        "ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS missing_information_json JSON",
        "ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS source_url TEXT",
        "ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP",
        "ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS score_type VARCHAR(50)",
        "ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS model_version VARCHAR(100)",
        "ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS corpus_version VARCHAR(150)",
        "ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS profile_version VARCHAR(100)",
        "ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS opportunity_version VARCHAR(100)",
        "ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP",
        "ALTER TABLE processed_events ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP",
        "ALTER TABLE processed_events ADD COLUMN IF NOT EXISTS lease_until TIMESTAMP",
        "ALTER TABLE processed_events ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE processed_events ADD COLUMN IF NOT EXISTS last_error TEXT",
        "ALTER TABLE processed_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP",
        "CREATE INDEX IF NOT EXISTS ix_matching_score_applicant_opportunity ON matching_scores (applicant_id, opportunity_id)",
        "CREATE INDEX IF NOT EXISTS ix_matching_score_applicant_score_desc ON matching_scores (applicant_id, overall_score DESC)",
        "CREATE INDEX IF NOT EXISTS ix_matching_score_expires ON matching_scores (expires_at)",
        "CREATE INDEX IF NOT EXISTS ix_recommendation_target_score_desc ON recommendation_cache (target_type, target_id, matching_score DESC)",
        "CREATE INDEX IF NOT EXISTS ix_recommendation_target_rank ON recommendation_cache (target_type, target_id, rank)",
        "CREATE INDEX IF NOT EXISTS ix_recommendation_model_version ON recommendation_cache (model_version)",
        "CREATE INDEX IF NOT EXISTS ix_recommendation_corpus_version ON recommendation_cache (corpus_version)",
        "CREATE INDEX IF NOT EXISTS ix_recommendation_expires ON recommendation_cache (expires_at)",
        "CREATE INDEX IF NOT EXISTS ix_processed_events_lease_until ON processed_events (lease_until)",
    ]
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))

# ============= Health Check =============

@app.get("/health", response_model=schemas.HealthResponse)
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    
    # Check database
    db_status = "healthy"
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = "unavailable"
        logger.error("Database health check failed")
    
    # Check RabbitMQ (basic check)
    rabbitmq_status = "not_checked"
    
    return schemas.HealthResponse(
        status="healthy" if db_status == "healthy" else "degraded",
        service=settings.APP_NAME,
        version=settings.APP_VERSION,
        timestamp=datetime.utcnow(),
        database=db_status,
        rabbitmq=rabbitmq_status
    )

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint — disabled in production."""
    if not settings.ENABLE_METRICS:
        raise HTTPException(status_code=404, detail="Not found")
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs"
    }

# ============= API Endpoints =============

ALLOWED_ROLES = {"USER", "EMPLOYER", "ADMIN"}


def _check_rate_limit(limiter: RateLimiter, request: Request):
    """Raise 429 if rate limit exceeded."""
    ip = _client_ip(request)
    if not limiter.allow(ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please slow down.",
        )


def _require_known_role(current_user: dict) -> set:
    """Extract roles and fail-closed if none recognized."""
    roles = set(get_roles_from_token(current_user))
    if not ALLOWED_ROLES.intersection(roles):
        raise ForbiddenException("Access denied — unrecognized or missing role")
    return roles


def _validate_user_applicant_access(current_user: dict, applicant_id: str):
    """
    Validate that the current user is allowed to access the given applicant_id.
    - ADMIN: unrestricted
    - USER: only their own applicant_id (fail-closed if token missing userId)
    - EMPLOYER: BLOCKED from direct matching API — must use scholarship provider facade
    """
    roles = _require_known_role(current_user)
    if "ADMIN" in roles:
        return

    if "EMPLOYER" in roles:
        raise ForbiddenException(
            "Employer access must use the scholarship provider API. "
            "Direct matching API is restricted to USER (self) and ADMIN."
        )

    if "USER" in roles:
        user_id = get_user_id_from_token(current_user)
        if not user_id:
            raise ForbiddenException(
                "Token missing userId claim — cannot verify applicant ownership"
            )
        if str(applicant_id) != str(user_id):
            raise ForbiddenException("You can only query your own applicant data")
        return


def _validate_opportunity_endpoint_access(current_user: dict):
    """
    Opportunity recommendation endpoint:
    - USER: NOT allowed (use applicant recommendation instead)
    - EMPLOYER: BLOCKED from direct matching API — must use scholarship provider facade
    - ADMIN: unrestricted
    """
    roles = _require_known_role(current_user)
    if "ADMIN" in roles:
        return

    if "EMPLOYER" in roles:
        raise ForbiddenException(
            "Employer access must use the scholarship provider API. "
            "Direct matching API is restricted to USER (self) and ADMIN."
        )

    if "USER" in roles:
        raise ForbiddenException(
            "USER role cannot query opportunity recommendations. "
            "Use /api/v1/recommendations/applicant/{yourId} instead."
        )


def _validate_score_endpoint_access(current_user: dict, applicant_id: str):
    """
    Score / batch-score endpoint:
    - USER: must query own applicant_id (fail-closed)
    - EMPLOYER: BLOCKED from direct matching API — must use scholarship provider facade
    - ADMIN: unrestricted
    """
    roles = _require_known_role(current_user)
    if "ADMIN" in roles:
        return

    if "EMPLOYER" in roles:
        raise ForbiddenException(
            "Employer access must use the scholarship provider API. "
            "Direct matching API is restricted to USER (self) and ADMIN."
        )

    if "USER" in roles:
        user_id = get_user_id_from_token(current_user)
        if not user_id:
            raise ForbiddenException(
                "Token missing userId claim — cannot verify applicant ownership"
            )
        if str(applicant_id) != str(user_id):
            raise ForbiddenException("You can only query your own applicant data")
        return


# ============= Sanitized Error Handling =============

def _sanitized_error_response(e: Exception, logger: logging.Logger) -> JSONResponse:
    """Return a generic error response without exposing internal details."""
    logger.error(f"Internal error: {e}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal error occurred. Please try again later."},
    )


@app.post("/api/v1/match/score", response_model=schemas.ScoreResponse)
async def calculate_matching_score(
    request: schemas.ScoreRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Calculate matching score between applicant and opportunity

    **Requires authentication.** USER can only query their own applicant data.
    **Performance:** < 300ms (rule-based algorithm)
    """
    _check_rate_limit(_score_limiter, http_request)

    # Authorization: role gating + applicant ownership
    _validate_score_endpoint_access(current_user, request.applicantId)

    logger.info(
        "Calculating score for applicant=%s, opportunity=%s, user=%s",
        request.applicantId, request.opportunityId, current_user.get("sub"),
    )

    try:
        service = MatchingService(db)
        result = service.calculate_score(
            applicant_id=request.applicantId,
            opportunity_id=request.opportunityId,
        )

        logger.info("Score calculated: %s", result.overallScore)
        return result

    except Exception as e:
        return _sanitized_error_response(e, logger)


@app.post("/api/v1/matching/batch-scores")
async def batch_matching_scores(
    request: schemas.BatchScoreRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Calculate matching scores for multiple opportunities in parallel

    **Requires authentication.** Max 100 opportunity IDs per request.
    **Performance:** Optimized for UI display - processes multiple scores efficiently
    """
    _check_rate_limit(_batch_limiter, http_request)

    # Authorization: role gating + applicant ownership
    _validate_score_endpoint_access(current_user, request.applicantId)

    logger.info(
        "Batch scoring: applicant=%s, opportunities=%s, user=%s",
        request.applicantId, len(request.opportunityIds), current_user.get("sub"),
    )

    try:
        service = MatchingService(db)
        if request.includeBreakdown:
            details = service.calculate_score_details_batch(
                applicant_id=request.applicantId,
                opportunity_ids=request.opportunityIds,
            )
            logger.info("Detailed batch scoring complete: %s scores calculated", len(details))
            return details

        scores = service.calculate_scores_batch(
            applicant_id=request.applicantId,
            opportunity_ids=request.opportunityIds,
        )

        logger.info("Batch scoring complete: %s scores calculated", len(scores))
        return scores

    except Exception as e:
        return _sanitized_error_response(e, logger)


@app.get("/api/v1/recommendations/applicant/{applicantId}", response_model=schemas.RecommendationResponse)
async def get_recommendations_for_applicant(
    applicantId: str,
    http_request: Request,
    limit: int = Query(default=10, ge=1, le=100),
    page: int = Query(default=1, ge=1),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get opportunity recommendations for an applicant

    **Requires authentication.** USER can only query their own recommendations.
    Reads precomputed cache/read-model rows; asynchronous workers refresh the heavier matching pipeline.
    """
    _check_rate_limit(_recommend_limiter, http_request)

    # Authorization: USER can only query their own applicant ID
    _validate_user_applicant_access(current_user, applicantId)

    logger.info(
        "Getting recommendations for applicant=%s, user=%s, limit=%s, page=%s",
        applicantId, current_user.get("sub"), limit, page,
    )

    try:
        service = MatchingService(db)
        result = service.get_recommendations_for_applicant(
            applicant_id=applicantId,
            limit=limit,
            page=page,
        )

        logger.info("Found %s total recommendations", result.metadata.total)
        return result

    except Exception as e:
        return _sanitized_error_response(e, logger)


@app.get("/api/v1/recommendations/opportunity/{opportunityId}", response_model=schemas.RecommendationResponse)
async def get_recommendations_for_opportunity(
    opportunityId: str,
    http_request: Request,
    limit: int = Query(default=10, ge=1, le=100),
    page: int = Query(default=1, ge=1),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get applicant recommendations for an opportunity

    **Requires authentication.** EMPLOYER and ADMIN only.
    USER must use /api/v1/recommendations/applicant/{yourId} instead.
    Reads precomputed cache/read-model rows; asynchronous workers refresh the heavier matching pipeline.
    """
    _check_rate_limit(_recommend_limiter, http_request)

    # Authorization: USER blocked, EMPLOYER accepted, ADMIN unrestricted
    _validate_opportunity_endpoint_access(current_user)

    roles = get_roles_from_token(current_user)
    logger.info(
        "Getting recommendations for opportunity=%s, user=%s, roles=%s, limit=%s, page=%s",
        opportunityId, current_user.get("sub"), roles, limit, page,
    )

    try:
        service = MatchingService(db)
        result = service.get_recommendations_for_opportunity(
            opportunity_id=opportunityId,
            limit=limit,
            page=page,
        )

        logger.info("Found %s total recommendations", result.metadata.total)
        return result

    except Exception as e:
        return _sanitized_error_response(e, logger)

# ============= Internal Test Endpoints (for PoC compatibility) =============

@app.get("/api/v1/internal-ping")
async def internal_ping():
    """Internal ping endpoint — disabled in production."""
    if not settings.ENABLE_INTERNAL_PING:
        raise HTTPException(status_code=404, detail="Not found")
    logger.info("Received internal ping")
    return {
        "status": "python_ok",
        "message": "Ping received successfully",
        "service": settings.APP_NAME,
    }
