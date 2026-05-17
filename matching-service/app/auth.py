"""
JWT Authentication for Matching Service
Validates JWT tokens issued by Auth Service
"""
import logging
from typing import Optional
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

def decode_jwt_token(token: str) -> dict:
    """
    Decode and validate JWT token
    
    Args:
        token: JWT token string
        
    Returns:
        dict: Decoded token payload
        
    Raises:
        JWTAuthException: If token is invalid
    """
    try:
        # Decode token using the same secret as Auth Service
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        # Extract username (subject)
        username: str = payload.get("sub")
        if username is None:
            raise JWTAuthException(detail="Token missing subject")
        
        return payload
        
    except JWTError as e:
        logger.warning(f"JWT validation failed: {e}")
        raise JWTAuthException(detail="Invalid or expired token")

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Dependency to extract and validate JWT token from Authorization header
    
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
