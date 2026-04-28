from typing import List, Optional

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models.user import User, UserRole

router = APIRouter(tags=["users"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class UserItem(BaseModel):
    id: int
    fullname: str
    email: str
    role: str
    is_active: bool
    parent_id: Optional[int] = None
    created_at: Optional[str] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, obj: User) -> "UserItem":
        return cls(
            id=obj.id,
            fullname=obj.fullname,
            email=obj.email,
            role=obj.role.value if hasattr(obj.role, "value") else str(obj.role),
            is_active=obj.is_active,
            parent_id=obj.parent_id,
            created_at=obj.created_at.isoformat() if obj.created_at else None,
        )


class UserListResponse(BaseModel):
    items: List[UserItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class CreateUserRequest(BaseModel):
    fullname: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.MEMBER
    is_active: bool = True
    parent_id: Optional[int] = None


class UpdateUserRequest(BaseModel):
    fullname: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    parent_id: Optional[int] = None
    password: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _hash(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=UserListResponse)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    role: Optional[UserRole] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    q = db.query(User)

    if search:
        like = f"%{search}%"
        q = q.filter((User.fullname.ilike(like)) | (User.email.ilike(like)))
    if role is not None:
        q = q.filter(User.role == role)
    if is_active is not None:
        q = q.filter(User.is_active == is_active)

    total = q.count()
    users = q.order_by(User.id.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return UserListResponse(
        items=[UserItem.from_orm(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, -(-total // page_size)),
    )


@router.post("", response_model=UserItem, status_code=status.HTTP_201_CREATED)
def create_user(
    body: CreateUserRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
):
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(400, "Email already registered")

    # SUPER_ADMIN can only be created by another SUPER_ADMIN
    if body.role == UserRole.SUPER_ADMIN and actor.role != UserRole.SUPER_ADMIN:
        raise HTTPException(403, "Only super_admin can assign super_admin role")

    user = User(
        fullname=body.fullname.strip(),
        email=body.email,
        hashed_password=_hash(body.password),
        role=body.role,
        is_active=body.is_active,
        parent_id=body.parent_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserItem.from_orm(user)


@router.get("/me", response_model=UserItem)
def get_me(current_user: User = Depends(get_current_user)):
    return UserItem.from_orm(current_user)


@router.get("/{user_id}", response_model=UserItem)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return UserItem.from_orm(user)


@router.patch("/{user_id}", response_model=UserItem)
def update_user(
    user_id: int,
    body: UpdateUserRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    if body.role == UserRole.SUPER_ADMIN and actor.role != UserRole.SUPER_ADMIN:
        raise HTTPException(403, "Only super_admin can assign super_admin role")

    if body.fullname is not None:
        user.fullname = body.fullname.strip()
    if body.email is not None:
        existing = db.query(User).filter(User.email == body.email, User.id != user_id).first()
        if existing:
            raise HTTPException(400, "Email already in use")
        user.email = body.email
    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.parent_id is not None:
        user.parent_id = body.parent_id
    if body.password:
        if len(body.password) < 6:
            raise HTTPException(400, "Password must be at least 6 characters")
        user.hashed_password = _hash(body.password)

    db.commit()
    db.refresh(user)
    return UserItem.from_orm(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == actor.id:
        raise HTTPException(400, "Cannot delete your own account")
    db.delete(user)
    db.commit()
