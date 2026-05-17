"""
Matching Service - FastAPI Main Application
Provides ML-based matching and recommendation APIs
"""
import logging
import time
import uuid
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from sqlalchemy import text
from sqlalchemy.orm import Session
import psycopg2
from tenacity import retry, wait_fixed, stop_after_attempt, retry_if_exception_type

from .config import settings
from .database import get_db, engine, Base
from . import models, schemas
from .service import MatchingService
from .auth import get_current_user
from .migrations import run_sql_migrations
from .observability import configure_observability

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
configure_observability()

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
    description="ML-based matching and recommendation service",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
        "ALTER TABLE applicant_features ADD COLUMN IF NOT EXISTS profile_version VARCHAR(100)",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS application_deadline DATE",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS scholarship_amount DOUBLE PRECISION",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS level VARCHAR(100)",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS study_mode VARCHAR(100)",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS location VARCHAR(255)",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS is_public BOOLEAN",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(50)",
        "ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS opportunity_version VARCHAR(100)",
        "ALTER TABLE matching_scores ADD COLUMN IF NOT EXISTS gpa_score DOUBLE PRECISION",
        "ALTER TABLE matching_scores ADD COLUMN IF NOT EXISTS skills_score DOUBLE PRECISION",
        "ALTER TABLE matching_scores ADD COLUMN IF NOT EXISTS research_score DOUBLE PRECISION",
        "ALTER TABLE matching_scores ADD COLUMN IF NOT EXISTS score_breakdown JSON",
        "ALTER TABLE matching_scores ADD COLUMN IF NOT EXISTS profile_version VARCHAR(100)",
        "ALTER TABLE matching_scores ADD COLUMN IF NOT EXISTS opportunity_version VARCHAR(100)",
        "ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS cache_version VARCHAR(255)",
        "CREATE INDEX IF NOT EXISTS ix_matching_score_applicant_opportunity ON matching_scores (applicant_id, opportunity_id)",
        "CREATE INDEX IF NOT EXISTS ix_matching_score_applicant_score_desc ON matching_scores (applicant_id, overall_score DESC)",
        "CREATE INDEX IF NOT EXISTS ix_matching_score_expires ON matching_scores (expires_at)",
        "CREATE INDEX IF NOT EXISTS ix_recommendation_target_score_desc ON recommendation_cache (target_type, target_id, matching_score DESC)",
        "CREATE INDEX IF NOT EXISTS ix_recommendation_expires ON recommendation_cache (expires_at)",
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
        db_status = f"unhealthy: {e}"
        logger.error(f"Database health check failed: {e}")
    
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
    """Prometheus metrics endpoint."""
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

@app.post("/api/v1/match/score", response_model=schemas.ScoreResponse)
async def calculate_matching_score(
    request: schemas.ScoreRequest,
    db: Session = Depends(get_db)
):
    """
    Calculate matching score between applicant and opportunity
    
    **Performance:** < 300ms (rule-based algorithm)
    """
    logger.info(f"Calculating score for applicant={request.applicantId}, opportunity={request.opportunityId}")
    
    try:
        service = MatchingService(db)
        result = service.calculate_score(
            applicant_id=request.applicantId,
            opportunity_id=request.opportunityId
        )
        
        logger.info(f"Score calculated: {result.overallScore}")
        return result
        
    except Exception as e:
        logger.error(f"Error calculating score: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/matching/batch-scores")
async def batch_matching_scores(
    request: schemas.BatchScoreRequest,
    db: Session = Depends(get_db)
):
    """
    Calculate matching scores for multiple opportunities in parallel
    
    **Performance:** Optimized for UI display - processes multiple scores efficiently
    """
    logger.info(f"Batch scoring: applicant={request.applicantId}, opportunities={len(request.opportunityIds)}")
    
    try:
        service = MatchingService(db)
        if request.includeBreakdown:
            details = service.calculate_score_details_batch(
                applicant_id=request.applicantId,
                opportunity_ids=request.opportunityIds
            )
            logger.info(f"Detailed batch scoring complete: {len(details)} scores calculated")
            return details

        scores = service.calculate_scores_batch(
            applicant_id=request.applicantId,
            opportunity_ids=request.opportunityIds
        )
        
        logger.info(f"Batch scoring complete: {len(scores)} scores calculated")
        return scores
        
    except Exception as e:
        logger.error(f"Error in batch scoring: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/recommendations/applicant/{applicantId}", response_model=schemas.RecommendationResponse)
async def get_recommendations_for_applicant(
    applicantId: str,
    limit: int = Query(default=10, ge=1, le=100),
    page: int = Query(default=1, ge=1),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get opportunity recommendations for an applicant
    
    **⚠️ WARNING:** This API is SLOW (2-5 seconds) as it performs ML computation on-the-fly
    
    **Premium Feature:** Requires authentication
    """
    logger.info(f"Getting recommendations for applicant={applicantId}, user={current_user.get('sub')}, limit={limit}, page={page}")
    
    try:
        service = MatchingService(db)
        result = service.get_recommendations_for_applicant(
            applicant_id=applicantId,
            limit=limit,
            page=page
        )
        
        logger.info(f"Found {result.metadata.total} recommendations")
        return result
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/recommendations/opportunity/{opportunityId}", response_model=schemas.RecommendationResponse)
async def get_recommendations_for_opportunity(
    opportunityId: str,
    limit: int = Query(default=10, ge=1, le=100),
    page: int = Query(default=1, ge=1),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get applicant recommendations for an opportunity
    
    **⚠️ WARNING:** This API is SLOW (2-5 seconds) as it performs ML computation on-the-fly
    
    **Premium Feature:** Requires authentication
    """
    logger.info(f"Getting recommendations for opportunity={opportunityId}, user={current_user.get('sub')}, limit={limit}, page={page}")
    
    try:
        service = MatchingService(db)
        result = service.get_recommendations_for_opportunity(
            opportunity_id=opportunityId,
            limit=limit,
            page=page
        )
        
        logger.info(f"Found {result.metadata.total} recommendations")
        return result
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ============= Internal Test Endpoints (for PoC compatibility) =============

@app.get("/api/v1/internal-ping")
async def internal_ping():
    """Internal ping endpoint (for testing sync communication)"""
    logger.info("[PoC 2] Received SYNC ping")
    return {
        "status": "python_ok",
        "message": "Ping received successfully",
        "service": settings.APP_NAME
    }
