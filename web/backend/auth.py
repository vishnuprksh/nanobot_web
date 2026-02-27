"""Authentication utilities."""

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from config import settings

security = HTTPBearer()


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    host: str
    port: int = 22
    username: str = "root"
    password: str


class UserSession(BaseModel):
    host: str
    port: int
    username: str
    # password stored in encrypted JWT — only used for SSH reconnection
    password: str


def create_access_token(data: dict[str, Any]) -> str:
    """Create a JWT access token."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode = {**data, "exp": expire}
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT token."""
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


def get_current_session(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserSession:
    """Extract the current user session from the JWT token."""
    payload = decode_token(credentials.credentials)
    try:
        return UserSession(
            host=payload["host"],
            port=payload["port"],
            username=payload["username"],
            password=payload["password"],
        )
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
