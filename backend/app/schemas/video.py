from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.models.video import VideoStatus


class VideoBase(BaseModel):
    title: str
    description: Optional[str] = None
    tags: Optional[List[str]] = []


class VideoCreate(VideoBase):
    pass


class VideoResponse(VideoBase):
    id: int
    facebook_video_id: Optional[str] = None
    page_id: str
    file_size: Optional[int] = None
    duration: Optional[int] = None
    thumbnail_path: Optional[str] = None
    status: VideoStatus
    scheduled_time: Optional[datetime] = None
    published_time: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class VideoListResponse(BaseModel):
    items: List[VideoResponse]
    total: int
