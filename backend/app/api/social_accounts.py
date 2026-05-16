import math
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models.social_account import AccountStatus, SocialAccount
from app.models.user import User
from app.schemas.social_account import (
    LoginResult,
    SocialAccountCreate,
    SocialAccountOut,
    SocialAccountUpdate,
)


class SocialAccountListResponse(BaseModel):
    items:       List[SocialAccountOut]
    total:       int
    page:        int
    page_size:   int
    total_pages: int

router = APIRouter()


def _get_account_or_404(account_id: int, user_id: int, db: Session) -> SocialAccount:
    acc = (
        db.query(SocialAccount)
        .filter(SocialAccount.id == account_id, SocialAccount.user_id == user_id)
        .first()
    )
    if not acc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Social account not found")
    return acc


# ── Own accounts ───────────────────────────────────────────────────────────────

@router.get("/me", response_model=SocialAccountListResponse)
def list_my_accounts(
    platform:     Optional[str]  = Query(None),
    is_active:    Optional[bool] = Query(None),
    account_type: Optional[str]  = Query(None),
    search:       Optional[str]  = Query(None),
    page:         int            = Query(1, ge=1),
    page_size:    int            = Query(10, ge=1, le=100),
    db:           Session        = Depends(get_db),
    current_user: User           = Depends(get_current_user),
):
    q = db.query(SocialAccount).filter(SocialAccount.user_id == current_user.id)
    if platform:
        q = q.filter(SocialAccount.platform == platform)
    if account_type and account_type != "all":
        q = q.filter(SocialAccount.account_type == account_type)
    if is_active is not None:
        q = q.filter(SocialAccount.is_active == is_active)
    if search:
        like = f"%{search}%"
        q = q.filter(
            SocialAccount.name.ilike(like)
            | SocialAccount.uid.ilike(like)
            | SocialAccount.email.ilike(like)
        )
    total       = q.count()
    items       = q.order_by(SocialAccount.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    total_pages = max(1, math.ceil(total / page_size))
    return SocialAccountListResponse(items=items, total=total, page=page, page_size=page_size, total_pages=total_pages)


@router.post("/me", response_model=SocialAccountOut, status_code=status.HTTP_201_CREATED)
def add_my_account(
    body:         SocialAccountCreate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    if body.uid:
        existing = (
            db.query(SocialAccount)
            .filter(SocialAccount.user_id == current_user.id, SocialAccount.uid == body.uid)
            .first()
        )
        if existing:
            raise HTTPException(400, "Account UID already added")

    acc = SocialAccount(**body.model_dump(), user_id=current_user.id)
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc


@router.get("/me/{account_id}", response_model=SocialAccountOut)
def get_my_account(
    account_id:   int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    return _get_account_or_404(account_id, current_user.id, db)


@router.put("/me/{account_id}", response_model=SocialAccountOut)
def update_my_account(
    account_id:   int,
    body:         SocialAccountUpdate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    acc = _get_account_or_404(account_id, current_user.id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(acc, field, value)
    db.commit()
    db.refresh(acc)
    return acc


@router.delete("/me/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_account(
    account_id:   int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    acc = _get_account_or_404(account_id, current_user.id, db)
    db.delete(acc)
    db.commit()


# ── Playwright login ───────────────────────────────────────────────────────────

@router.post("/me/{account_id}/login", response_model=LoginResult)
async def login_account(
    account_id:   int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """
    Trigger a Playwright-based Facebook login for an account that has
    email + password set. Saves cookie, session_data, uid, name, avatar
    back to the DB on success.
    """
    acc = _get_account_or_404(account_id, current_user.id, db)

    identifier = acc.email or acc.phone
    if not identifier or not acc.password:
        raise HTTPException(400, "Account must have (email or phone) and password set before login")

    from app.services.fb_login import login_facebook
    from app.models.proxy import Proxy

    proxy_opts = None
    if acc.proxy_id:
        proxy = db.query(Proxy).filter(Proxy.id == acc.proxy_id).first()
        if proxy:
            proxy_url = f"{proxy.protocol}://"
            if proxy.username:
                proxy_url += f"{proxy.username}:{proxy.password or ''}@"
            proxy_url += f"{proxy.host}:{proxy.port}"
            proxy_opts = {"server": proxy_url}

    result = await login_facebook(
        identifier=identifier,
        password=acc.password,
        cookie=acc.cookie,
        user_agent=acc.user_agent,
        proxy=proxy_opts,
    )

    if result.success:
        if result.uid:
            acc.uid = result.uid
        if result.name:
            acc.name = result.name
        if result.avatar_url:
            acc.avatar_url = result.avatar_url
        if result.cookie:
            acc.cookie = result.cookie
        acc.session_data   = None  # clear any pending 2FA state
        acc.status         = AccountStatus.ACTIVE
        acc.last_active_at = func.now()
    elif result.step == "2fa":
        # Preserve browser state for Phase 2 (verify-2fa)
        acc.session_data  = result.session_data
        acc.status        = AccountStatus.CHECKPOINT
        acc.checkpoint_at = func.now()
    elif result.step == "banned":
        acc.status = AccountStatus.BANNED
    elif result.step == "checkpoint":
        acc.status        = AccountStatus.CHECKPOINT
        acc.checkpoint_at = func.now()

    db.commit()
    db.refresh(acc)

    return LoginResult(
        success=result.success,
        step=result.step,
        message=result.message,
        uid=result.uid,
        name=result.name,
        avatar_url=result.avatar_url,
        status=acc.status,
    )


# ── Verify 2FA ────────────────────────────────────────────────────────────────
class Verify2FABody(BaseModel):
    code: str  # 6-digit OTP supplied by the user

@router.post("/me/{account_id}/verify-2fa", response_model=LoginResult)
async def verify_2fa(
    account_id:   int,
    body:         Verify2FABody,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """
    Phase 2 of the 2FA login flow.
    Restores the Playwright session saved during /login, submits the OTP,
    scrapes uid/name/avatar, and clears session_data on success.
    """
    acc = _get_account_or_404(account_id, current_user.id, db)

    if not acc.session_data:
        raise HTTPException(400, "No pending 2FA session — please trigger /login first.")

    if not body.code or len(body.code) != 6:
        raise HTTPException(400, "OTP must be 6 digits.")

    from app.services.fb_login import resume_2fa
    from app.models.proxy import Proxy

    proxy_opts = None
    if acc.proxy_id:
        proxy = db.query(Proxy).filter(Proxy.id == acc.proxy_id).first()
        if proxy:
            proxy_url = f"{proxy.protocol}://"
            if proxy.username:
                proxy_url += f"{proxy.username}:{proxy.password or ''}@"
            proxy_url += f"{proxy.host}:{proxy.port}"
            proxy_opts = {"server": proxy_url}

    result = await resume_2fa(
        session_data=acc.session_data,
        otp_code=body.code,
        user_agent=acc.user_agent,
        proxy=proxy_opts,
    )

    if result.success:
        if result.uid:
            acc.uid = result.uid
        if result.name:
            acc.name = result.name
        if result.avatar_url:
            acc.avatar_url = result.avatar_url
        if result.cookie:
            acc.cookie = result.cookie
        acc.session_data   = None  # clear pending state
        acc.status         = AccountStatus.ACTIVE
        acc.last_active_at = func.now()
    elif result.step == "2fa":
        # Wrong OTP — keep session_data so user can retry
        acc.session_data = result.session_data
    else:
        # Session expired or other error — clear stale state
        acc.session_data = None
        if result.step == "error":
            acc.status = AccountStatus.CHECKPOINT

    db.commit()
    db.refresh(acc)

    return LoginResult(
        success=result.success,
        step=result.step,
        message=result.message,
        uid=result.uid,
        name=result.name,
        avatar_url=result.avatar_url,
        status=acc.status,
    )


# ── Admin: accounts by any user ────────────────────────────────────────────────

@router.get("/user/{user_id}", response_model=List[SocialAccountOut])
def list_user_accounts(
    user_id: int,
    db:      Session = Depends(get_db),
    _:       User    = Depends(require_admin),
):
    return (
        db.query(SocialAccount)
        .filter(SocialAccount.user_id == user_id)
        .order_by(SocialAccount.created_at.desc())
        .all()
    )


@router.post("/user/{user_id}", response_model=SocialAccountOut, status_code=status.HTTP_201_CREATED)
def add_account_for_user(
    user_id: int,
    body:    SocialAccountCreate,
    db:      Session = Depends(get_db),
    _:       User    = Depends(require_admin),
):
    if not db.query(User).filter(User.id == user_id).first():
        raise HTTPException(404, "User not found")

    if body.uid:
        existing = (
            db.query(SocialAccount)
            .filter(SocialAccount.user_id == user_id, SocialAccount.uid == body.uid)
            .first()
        )
        if existing:
            raise HTTPException(400, "Account UID already added for this user")

    acc = SocialAccount(**body.model_dump(), user_id=user_id)
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc


@router.put("/user/{user_id}/{account_id}", response_model=SocialAccountOut)
def update_account_for_user(
    user_id:    int,
    account_id: int,
    body:       SocialAccountUpdate,
    db:         Session = Depends(get_db),
    _:          User    = Depends(require_admin),
):
    acc = _get_account_or_404(account_id, user_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(acc, field, value)
    db.commit()
    db.refresh(acc)
    return acc


@router.delete("/user/{user_id}/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account_for_user(
    user_id:    int,
    account_id: int,
    db:         Session = Depends(get_db),
    _:          User    = Depends(require_admin),
):
    acc = _get_account_or_404(account_id, user_id, db)
    db.delete(acc)
    db.commit()