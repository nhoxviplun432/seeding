"""
Campaign routes — delegates to app.api.campaigns router.

Fr routes mapped -> api actions:
  GET    /api/campaigns/          list_campaigns   (dashboard/campaigns/page.tsx)
  POST   /api/campaigns/          create_campaign  (dashboard/campaigns/new/page.tsx)
  GET    /api/campaigns/{id}      get_campaign     (dashboard/campaigns/[id]/page.tsx)
  PATCH  /api/campaigns/{id}      update_campaign  (dashboard/campaigns/[id]/page.tsx)
  DELETE /api/campaigns/{id}      delete_campaign  (dashboard/campaigns/[id]/page.tsx)
"""
from app.api.campaigns import router

__all__ = ["router"]
