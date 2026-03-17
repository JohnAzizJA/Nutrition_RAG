from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from auth.utils import decode_access_token
from db.repositories import UserRepository
from time import time

security = HTTPBearer()
user_repo = UserRepository()

# Short-lived cache — avoids a DB round-trip for every API request
# User data is stable between requests; 30s stale window is acceptable
_user_cache: dict[int, tuple[object, float]] = {}
_USER_CACHE_TTL = 30  # seconds


def invalidate_user_cache(user_id: int):
    """Call this after any profile update so the next request re-fetches from DB."""
    _user_cache.pop(user_id, None)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current authenticated user from JWT token"""
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    uid = int(user_id)
    cached = _user_cache.get(uid)
    if cached and (time() - cached[1]) < _USER_CACHE_TTL:
        return cached[0]

    user = user_repo.get_by_id(uid)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    _user_cache[uid] = (user, time())
    return user
