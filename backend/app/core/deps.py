"""
Auth dependencies: extract & validate the current user from a JWT, and
enforce role-based access control on routes.

Usage in a route:
    @router.post("/patients")
    def create_patient(..., user: User = Depends(require_role(UserRole.receptionist, UserRole.admin))):
        ...

This pattern keeps authorization logic declarative and visible right in
the route signature, rather than buried in if-statements inside the
function body.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is deactivated")

    return user


def require_role(*allowed_roles: UserRole):
    """
    Returns a FastAPI dependency that only allows users whose role is in
    allowed_roles. Raises 403 Forbidden otherwise.
    """

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of these roles: "
                       f"{', '.join(r.value for r in allowed_roles)}",
            )
        return current_user

    return role_checker
