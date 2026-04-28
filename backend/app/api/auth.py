import os
import shutil
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from jose import jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.config import settings
from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── Helpers ──────────────────────────────────────────────────────────────────

def _hash(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def _verify(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _create_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire},
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


# ── Schemas ───────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    fullname: str
    email: EmailStr
    password: str
    password_confirmation: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    fullname: str
    email: str
    role: str
    avatar_url: Optional[str] = None
    is_active: bool = True
    parent_id: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    user: UserOut
    token: str


class ProfileUpdateRequest(BaseModel):
    fullname: str


class ResetPasswordRequest(BaseModel):
    current_password: str
    password: str
    password_confirmation: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if body.password != body.password_confirmation:
        raise HTTPException(400, "Passwords do not match")
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(400, "Email already registered")

    from app.models.user import UserRole
    is_first = db.query(User).count() == 0
    user = User(
        fullname=body.fullname.strip(),
        email=body.email,
        hashed_password=_hash(body.password),
        role=UserRole.SUPER_ADMIN if is_first else UserRole.MEMBER,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthResponse(user=UserOut.model_validate(user), token=_create_token(user.id))


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not _verify(body.password, user.hashed_password):
        raise HTTPException(401, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(403, "Account is disabled")
    return AuthResponse(user=UserOut.model_validate(user), token=_create_token(user.id))


@router.post("/logout")
def logout():
    return {"message": "Logged out"}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.put("/profile", response_model=UserOut)
def update_profile(
    body: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.fullname = body.fullname.strip()
    db.commit()
    db.refresh(current_user)
    return UserOut.model_validate(current_user)


@router.post("/avatar", response_model=UserOut)
def update_avatar(
    avatar: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    upload_dir = os.path.join(settings.UPLOAD_DIR, "avatars")
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(avatar.filename or "")[1] or ".jpg"
    dest = os.path.join(upload_dir, f"{uuid.uuid4().hex}{ext}")
    with open(dest, "wb") as f:
        shutil.copyfileobj(avatar.file, f)

    current_user.avatar_url = f"/uploads/avatars/{os.path.basename(dest)}"
    db.commit()
    db.refresh(current_user)
    return UserOut.model_validate(current_user)


@router.put("/reset-password")
def reset_password(
    body: ResetPasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _verify(body.current_password, current_user.hashed_password):
        raise HTTPException(400, "Current password is incorrect")
    if body.password != body.password_confirmation:
        raise HTTPException(400, "Passwords do not match")
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    current_user.hashed_password = _hash(body.password)
    db.commit()
    return {"message": "Password updated"}
