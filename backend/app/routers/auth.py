"""
Auth routes.

Note: there's no public "register" endpoint. Hospital staff accounts are
created by an admin (see POST /users below), not self-signed-up, because
in a real hospital you don't want random people creating doctor accounts.
The very first admin account is created via a seed script (see seed.py).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import verify_password, create_access_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import Token, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    """
    Uses OAuth2PasswordRequestForm so this works directly with the
    FastAPI /docs "Authorize" button and standard OAuth2 client libraries.
    The form's `username` field is used to carry the user's email.
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is deactivated")

    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=access_token, user=UserOut.model_validate(user))
