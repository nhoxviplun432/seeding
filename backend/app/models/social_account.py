import enum

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class AccountPlatform(str, enum.Enum):
    FACEBOOK  = "facebook"
    INSTAGRAM = "instagram"
    TIKTOK    = "tiktok"


class AccountStatus(str, enum.Enum):
    ACTIVE     = "active"
    INACTIVE   = "inactive"
    BANNED     = "banned"
    CHECKPOINT = "checkpoint"
    WARMING    = "warming"


class AccountType(str, enum.Enum):
    VIA      = "via"
    CLONE    = "clone"
    BUSINESS = "business"


class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id      = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    platform = Column(
        Enum(AccountPlatform, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=AccountPlatform.FACEBOOK,
    )
    account_type = Column(
        Enum(AccountType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=AccountType.VIA,
    )

    uid        = Column(String(100), nullable=True, index=True)   # filled after login
    name       = Column(String(255), nullable=False)
    email      = Column(String(255), nullable=True)
    phone      = Column(String(50),  nullable=True)
    avatar_url = Column(String(500), nullable=True)

    # credentials
    password      = Column(String(255), nullable=True)   # plaintext (operator-side encryption optional)
    two_fa_secret = Column(String(255), nullable=True)   # TOTP base32 secret
    cookie        = Column(Text,        nullable=True)   # raw cookie string
    user_agent    = Column(String(512), nullable=True)

    # session saved by playwright (JSON string)
    session_data  = Column(Text, nullable=True)

    # access token (Graph API)
    access_token     = Column(Text,                    nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)

    proxy_id = Column(Integer, ForeignKey("proxies.id", ondelete="SET NULL"), nullable=True, index=True)

    status    = Column(
        Enum(AccountStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=AccountStatus.INACTIVE,
    )
    is_active = Column(Boolean, default=True)
    note      = Column(Text, nullable=True)

    last_active_at = Column(DateTime(timezone=True), nullable=True)
    checkpoint_at  = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="social_accounts")
