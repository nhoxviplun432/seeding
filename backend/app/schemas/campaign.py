from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.models.campaign import CampaignStatus


class CampaignBase(BaseModel):
    name: str
    description: Optional[str] = None
    target_accounts: List[str] = []
    proxy_pool: List[str] = []
    schedule_at: Optional[datetime] = None
    max_concurrent: int = 5
    delay_min: int = 3
    delay_max: int = 10


class CampaignCreate(CampaignBase):
    video_id: int


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target_accounts: Optional[List[str]] = None
    proxy_pool: Optional[List[str]] = None
    schedule_at: Optional[datetime] = None
    max_concurrent: Optional[int] = None
    delay_min: Optional[int] = None
    delay_max: Optional[int] = None
    status: Optional[CampaignStatus] = None


class CampaignResponse(CampaignBase):
    id: int
    video_id: int
    status: CampaignStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class CampaignListResponse(BaseModel):
    items: List[CampaignResponse]
    total: int
