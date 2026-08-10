"""
JWT Authentication for Matching Service
Validates JWT tokens issued by Auth Service
"""
import logging
from typing import Optional, List
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

from .config import settings

logger = logging.getLogger(__name__)

# HTTP Bearer token scheme with custom error handling
class CustomHTTPBearer(HTTPBearer):
    """Custom HTTPBearer that returns 401 instead of 403"""
    async def __call__(self, request: Request):
        try:
            return await super().__call__(request)
        except HTTPException as e:
            # Convert 403 to 401 for missing credentials
            if e.status_code == status.HTTP_403_FORBIDDEN:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            raise

security = CustomHTTPBearer()

class JWTAuthException(HTTPException):
    """Custom JWT authentication exception"""
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class ForbiddenException(HTTPException):
    """Custom forbidden exception"""
    def __init__(self, detail: str = "Access denied"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )


def _get_public_key():
    """Load RSA public key if configured. In production, HS256 fallback is DISABLED."""
    if settings.JWT_PUBLIC_KEY_PATH:
        try:
            from cryptography.hazmat.primitives import serialization
            with open(settings.JWT_PUBLIC_KEY_PATH, "rb") as f:
                return serialization.load_pem_public_key(f.read())
        except Exception as e:
            logger.critical("JWT_PUBLIC_KEY_PATH set but failed to load RSA key: %s", e)
            raise JWTAuthException(detail="Authentication configuration error")
    # No public key configured — use shared secret (dev/test only)
    logger.warning("No RSA public key configured — using HS256 shared secret (NOT FOR PRODUCTION)")
    return settings.JWT_SECRET


def decode_jwt_token(token: str) -> dict:
    """
    Decode and validate JWT token.
    Production: RS256 with RSA public key (HS256 fallback DISABLED).
    Dev/Test: HS256 with shared secret.

    Args:
        token: JWT token string

    Returns:
        dict: Decoded token payload

    Raises:
        JWTAuthException: If token is invalid
    """
    try:
        key = _get_public_key()
        # When RSA public key is configured, ONLY accept RS256 (not HS256)
        if settings.JWT_PUBLIC_KEY_PATH:
            algorithms = ["RS256"]
        else:
            algorithms = [settings.JWT_ALGORITHM]

        payload = jwt.decode(token, key, algorithms=algorithms)

        # Validate issuer — MUST be present and correct
        expected_iss = settings.JWT_EXPECTED_ISSUER
        iss = payload.get("iss")
        if not iss or iss != expected_iss:
            raise JWTAuthException(detail="Invalid token issuer")

        # Validate audience
        expected_aud = getattr(settings, 'JWT_EXPECTED_AUDIENCE', 'edumatch-api')
        aud = payload.get("aud")
        if not aud or aud != expected_aud:
            raise JWTAuthException(detail="Invalid token audience")

        # Validate token type
        typ = payload.get("typ")
        if typ != "access":
            raise JWTAuthException(detail="Invalid token type")

        # Extract username (subject) — required
        username: str = payload.get("sub")
        if not username:
            raise JWTAuthException(detail="Token missing subject")

        # Validate userId claim is present
        user_id = payload.get("userId")
        if not user_id:
            raise JWTAuthException(detail="Token missing userId claim")

        return payload

    except JWTError as e:
        logger.warning("JWT validation failed: %s", e)
        raise JWTAuthException(detail="Invalid or expired token")


def get_roles_from_token(payload: dict) -> List[str]:
    """Extract normalized roles from JWT payload (strip ROLE_ prefix)."""
    roles_str = payload.get("roles", "")
    if not roles_str:
        return []
    return [
        r.strip().replace("ROLE_", "").upper()
        for r in roles_str.split(",")
        if r.strip()
    ]


def get_user_id_from_token(payload: dict) -> Optional[str]:
    """Extract user ID from JWT payload if present."""
    uid = payload.get("userId") or payload.get("user_id")
    if uid is not None:
        return str(uid)
    return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Dependency to extract and validate JWT token from Authorization header.
    Returns the full decoded JWT payload.

    Usage:
        @app.get("/protected")
        async def protected_route(user: dict = Depends(get_current_user)):
            return {"user": user["sub"]}

    Args:
        credentials: HTTP Bearer credentials from request header

    Returns:
        dict: Decoded user information from JWT token

    Raises:
        JWTAuthException: If authentication fails
    """
    token = credentials.credentials
    return decode_jwt_token(token)


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[dict]:
    """
    Optional authentication - returns None if no token provided

    Usage:
        @app.get("/public-or-private")
        async def route(user: Optional[dict] = Depends(get_current_user_optional)):
            if user:
                return {"message": f"Hello {user['sub']}"}
            return {"message": "Hello guest"}
    """
    if credentials is None:
        return None

    try:
        return decode_jwt_token(credentials.credentials)
    except JWTAuthException:
        return None


def require_admin(current_user: dict = Depends(get_current_user)):
    """Dependency: only ADMIN role allowed."""
    roles = get_roles_from_token(current_user)
    if "ADMIN" not in roles:
        raise ForbiddenException("Administrator access required")
    return current_user


def require_role(*allowed_roles: str):
    """Factory: create a dependency requiring at least one of the given roles."""
    allowed = set(r.upper() for r in allowed_roles)

    async def _check(current_user: dict = Depends(get_current_user)):
        roles = get_roles_from_token(current_user)
        if not allowed.intersection(roles):
            raise ForbiddenException(
                f"Access denied. Required roles: {', '.join(sorted(allowed))}"
            )
        return current_user

    return _check
