import math
import time
from typing import Optional

import requests
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func as sqlfunc
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models.proxy import Proxy, ProxyStatus
from app.models.social_account import SocialAccount
from app.models.user import User
from app.schemas.proxy import (
    CheckResult,
    ProxyCreate,
    ProxyListResponse,
    ProxyOut,
    ProxyUpdate,
    RotateResult,
)

router = APIRouter()


def _get_or_404(proxy_id: int, db: Session) -> Proxy:
    p = db.query(Proxy).filter(Proxy.id == proxy_id).first()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proxy not found")
    return p


def _sync_assigned_count(proxy_id: int, db: Session) -> int:
    count = db.query(sqlfunc.count(SocialAccount.id)).filter(SocialAccount.proxy_id == proxy_id).scalar() or 0
    db.query(Proxy).filter(Proxy.id == proxy_id).update({"assigned_count": count})
    db.commit()
    return count


# ── CRUD ───────────────────────────────────────────────────────────────────────

@router.get("/", response_model=ProxyListResponse)
def list_proxies(
    search:    Optional[str]         = Query(None),
    status_:   Optional[str]         = Query(None, alias="status"),
    protocol:  Optional[str]         = Query(None),
    page:      int                   = Query(1, ge=1),
    page_size: int                   = Query(10, ge=1, le=100),
    db:        Session               = Depends(get_db),
    _:         User                  = Depends(get_current_user),
):
    q = db.query(Proxy)
    if search:
        like = f"%{search}%"
        q = q.filter(Proxy.label.ilike(like) | Proxy.host.ilike(like) | Proxy.country.ilike(like))
    if status_ and status_ != "all":
        q = q.filter(Proxy.status == status_)
    if protocol and protocol != "all":
        q = q.filter(Proxy.protocol == protocol)

    total       = q.count()
    items       = q.order_by(Proxy.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    total_pages = max(1, math.ceil(total / page_size))
    return ProxyListResponse(items=items, total=total, page=page, page_size=page_size, total_pages=total_pages)


@router.post("/", response_model=ProxyOut, status_code=status.HTTP_201_CREATED)
def create_proxy(
    body: ProxyCreate,
    db:   Session = Depends(get_db),
    _:    User    = Depends(get_current_user),
):
    proxy = Proxy(**body.model_dump())
    db.add(proxy)
    db.commit()
    db.refresh(proxy)
    return proxy


@router.get("/{proxy_id}", response_model=ProxyOut)
def get_proxy(
    proxy_id: int,
    db:       Session = Depends(get_db),
    _:        User    = Depends(get_current_user),
):
    return _get_or_404(proxy_id, db)


@router.patch("/{proxy_id}", response_model=ProxyOut)
def update_proxy(
    proxy_id: int,
    body:     ProxyUpdate,
    db:       Session = Depends(get_db),
    _:        User    = Depends(get_current_user),
):
    proxy = _get_or_404(proxy_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(proxy, field, value)
    db.commit()
    db.refresh(proxy)
    return proxy


@router.delete("/{proxy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_proxy(
    proxy_id: int,
    db:       Session = Depends(get_db),
    _:        User    = Depends(get_current_user),
):
    proxy = _get_or_404(proxy_id, db)
    db.delete(proxy)
    db.commit()


# ── Check ──────────────────────────────────────────────────────────────────────

@router.post("/{proxy_id}/check", response_model=CheckResult)
def check_proxy(
    proxy_id: int,
    db:       Session = Depends(get_db),
    _:        User    = Depends(get_current_user),
):
    proxy = _get_or_404(proxy_id, db)
    proxy_url = f"{proxy.protocol}://"
    if proxy.username:
        proxy_url += f"{proxy.username}:{proxy.password or ''}@"
    proxy_url += f"{proxy.host}:{proxy.port}"

    latency_ms: Optional[int] = None
    new_status  = ProxyStatus.DEAD

    try:
        t0  = time.monotonic()
        res = requests.get(
            "https://api.ipify.org",
            proxies={"http": proxy_url, "https": proxy_url},
            timeout=10,
        )
        latency_ms = int((time.monotonic() - t0) * 1000)
        new_status = ProxyStatus.ROTATING if proxy.is_rotating else ProxyStatus.ACTIVE
    except Exception:
        pass

    from sqlalchemy.sql import func as sf
    proxy.status         = new_status
    proxy.latency_ms     = latency_ms
    proxy.last_checked_at = sf.now()
    db.commit()

    return CheckResult(status=new_status, latency_ms=latency_ms)


# ── Rotate ─────────────────────────────────────────────────────────────────────

@router.post("/{proxy_id}/rotate", response_model=RotateResult)
def rotate_proxy(
    proxy_id: int,
    db:       Session = Depends(get_db),
    _:        User    = Depends(get_current_user),
):
    proxy = _get_or_404(proxy_id, db)
    if not proxy.is_rotating or not proxy.rotate_url:
        raise HTTPException(400, "Proxy is not rotating or has no rotate_url")
    try:
        res    = requests.get(proxy.rotate_url, timeout=10)
        new_ip = res.text.strip() or "unknown"
    except Exception as e:
        raise HTTPException(502, f"Rotate failed: {e}")
    return RotateResult(new_ip=new_ip)