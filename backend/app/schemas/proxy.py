from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.proxy import ProxyProtocol, ProxyStatus


class ProxyCreate(BaseModel):
    label:       str
    protocol:    ProxyProtocol = ProxyProtocol.HTTP
    host:        str
    port:        int = Field(..., ge=1, le=65535)
    username:    Optional[str] = None
    password:    Optional[str] = None
    is_rotating: bool          = False
    rotate_url:  Optional[str] = None
    country:     Optional[str] = None


class ProxyUpdate(BaseModel):
    label:       Optional[str]          = None
    protocol:    Optional[ProxyProtocol] = None
    host:        Optional[str]          = None
    port:        Optional[int]          = Field(None, ge=1, le=65535)
    username:    Optional[str]          = None
    password:    Optional[str]          = None
    is_rotating: Optional[bool]         = None
    rotate_url:  Optional[str]          = None
    country:     Optional[str]          = None
    status:      Optional[ProxyStatus]  = None
    latency_ms:  Optional[int]          = None


class ProxyOut(BaseModel):
    id:             int
    label:          str
    protocol:       ProxyProtocol
    host:           str
    port:           int
    username:       Optional[str]      = None
    password:       Optional[str]      = None
    is_rotating:    bool
    rotate_url:     Optional[str]      = None
    country:        Optional[str]      = None
    status:         ProxyStatus
    latency_ms:     Optional[int]      = None
    last_checked_at: Optional[datetime] = None
    assigned_count: int
    created_at:     datetime
    updated_at:     Optional[datetime] = None

    model_config = {"from_attributes": True}


class ProxyListResponse(BaseModel):
    items:       list[ProxyOut]
    total:       int
    page:        int
    page_size:   int
    total_pages: int


class CheckResult(BaseModel):
    status:     ProxyStatus
    latency_ms: Optional[int] = None


class RotateResult(BaseModel):
    new_ip: str