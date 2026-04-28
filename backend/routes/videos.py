"""
Video routes — delegates to app.api.videos router.

Fr routes mapped -> api actions:
  GET    /api/videos/           list_videos    (dashboard/videos/page.tsx)
  POST   /api/videos/upload     upload_video   (dashboard/videos/new/page.tsx)
  GET    /api/videos/{id}       get_video      (dashboard/videos/[id]/page.tsx)
  DELETE /api/videos/{id}       delete_video   (dashboard/videos/[id]/page.tsx)
"""
from app.api.videos import router

__all__ = ["router"]
