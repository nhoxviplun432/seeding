from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class AnalyticsResponse(BaseModel):
    id: int
    video_id: int
    campaign_id: Optional[int] = None
    views: int
    likes: int
    shares: int
    comments: int
    reach: int
    collected_at: datetime

    model_config = {"from_attributes": True}


class AnalyticsSummary(BaseModel):
    video_id: int
    total_views: int
    total_likes: int
    total_shares: int
    total_comments: int
    total_reach: int
    data_points: List[AnalyticsResponse]
