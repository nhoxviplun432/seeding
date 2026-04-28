"""
Analytics routes — delegates to app.api.analytics router.

Fr routes mapped -> api actions:
  GET /api/analytics/video/{video_id}        get_video_analytics     (dashboard/analytics/page.tsx)
  GET /api/analytics/campaign/{campaign_id}  get_campaign_analytics  (dashboard/analytics/page.tsx)
"""
from app.api.analytics import router

__all__ = ["router"]
