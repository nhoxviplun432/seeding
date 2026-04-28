"""
Auth routes — delegates to app.api.auth router.

Fr routes mapped -> api actions:
  POST /api/auth/register       register        (auth/register/page.tsx)
  POST /api/auth/login          login           (auth/login/page.tsx)
  POST /api/auth/logout         logout          (dashboard header)
  GET  /api/auth/me             me              (auth.tsx AuthGuard)
  PUT  /api/auth/profile        update_profile  (dashboard/settings)
  POST /api/auth/avatar         update_avatar   (dashboard/settings)
  PUT  /api/auth/reset-password reset_password  (auth/reset-password/page.tsx)
"""
from app.api.auth import router

__all__ = ["router"]
