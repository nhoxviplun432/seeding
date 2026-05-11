from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.social_account import AccountPlatform, AccountStatus, AccountType


class SocialAccountCreate(BaseModel):
    platform:      AccountPlatform = AccountPlatform.FACEBOOK
    account_type:  AccountType     = AccountType.VIA
    name:          str
    uid:           Optional[str]   = None
    email:         Optional[str]   = None
    phone:         Optional[str]   = None
    password:      Optional[str]   = None
    two_fa_secret: Optional[str]   = None
    cookie:        Optional[str]   = None
    user_agent:    Optional[str]   = None
    proxy_id:      Optional[int]   = None
    note:          Optional[str]   = None


class SocialAccountUpdate(BaseModel):
    name:          Optional[str]          = None
    email:         Optional[str]          = None
    phone:         Optional[str]          = None
    account_type:  Optional[AccountType]  = None
    password:      Optional[str]          = None
    two_fa_secret: Optional[str]          = None
    cookie:        Optional[str]          = None
    user_agent:    Optional[str]          = None
    proxy_id:      Optional[int]          = None
    avatar_url:    Optional[str]          = None
    access_token:  Optional[str]          = None
    token_expires_at: Optional[datetime]  = None
    status:        Optional[AccountStatus] = None
    is_active:     Optional[bool]          = None
    note:          Optional[str]           = None


class LoginPayload(BaseModel):
    """Trigger a Playwright-based Facebook login for an existing account."""
    account_id: int


class LoginResult(BaseModel):
    success:   bool
    message:   str
    uid:       Optional[str]          = None
    name:      Optional[str]          = None
    avatar_url: Optional[str]         = None
    status:    Optional[AccountStatus] = None
    step:      Optional[str]           = None   # e.g. "2fa_required", "checkpoint", "done"


class SocialAccountOut(BaseModel):
    id:           int
    user_id:      int
    platform:     AccountPlatform
    account_type: AccountType
    uid:          Optional[str]   = None
    name:         str
    email:        Optional[str]   = None
    phone:        Optional[str]   = None
    avatar_url:   Optional[str]   = None
    has_2fa:      bool            = False
    cookie:       Optional[str]   = None
    user_agent:   Optional[str]   = None
    proxy_id:     Optional[int]   = None
    token_expires_at: Optional[datetime] = None
    status:       AccountStatus
    is_active:    bool
    note:         Optional[str]   = None
    last_active_at:  Optional[datetime] = None
    checkpoint_at:   Optional[datetime] = None
    created_at:   datetime
    updated_at:   Optional[datetime] = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        instance = super().model_validate(obj, *args, **kwargs)
        instance.has_2fa = bool(getattr(obj, "two_fa_secret", None))
        return instance