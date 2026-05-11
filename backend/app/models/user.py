import enum

from sqlalchemy import Column, Enum, ForeignKey, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN       = "admin"
    AGENCY      = "agency"
    STAFF       = "staff"
    MEMBER      = "member"


ACCOUNT_TYPES = ("personal", "company")


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    fullname        = Column(String(255), nullable=False)
    email           = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    avatar_url      = Column(String(500), nullable=True)
    role            = Column(
        Enum(UserRole, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=UserRole.MEMBER,
    )
    account_type    = Column(String(20), nullable=True, default=None)
    is_active       = Column(Boolean, default=True)
    parent_id       = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Self-referential adjacency list
    # `remote_side` is evaluated lazily so `id` column is already resolved
    parent = relationship(
        "User",
        back_populates="children",
        foreign_keys=lambda: [User.parent_id],
        remote_side=lambda: [User.id],
        uselist=False,
    )
    children = relationship(
        "User",
        back_populates="parent",
        foreign_keys=lambda: [User.parent_id],
        lazy="dynamic",
    )

    social_accounts = relationship(
        "SocialAccount",
        back_populates="owner",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )
