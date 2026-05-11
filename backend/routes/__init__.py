from fastapi import APIRouter

from routes.auth import router as auth_router
from routes.videos import router as videos_router
from routes.campaigns import router as campaigns_router
from routes.analytics import router as analytics_router
from app.api.users import router as users_router
from app.api.social_accounts import router as social_accounts_router

router = APIRouter()

# auth prefix is owned by app.api.auth (prefix="/api/auth")
router.include_router(auth_router)

# remaining routers are prefix-free in app/api/ — prefix applied here
router.include_router(users_router,           prefix="/api/users",           tags=["users"])
router.include_router(social_accounts_router, prefix="/api/accounts/facebook", tags=["social-accounts"])
router.include_router(videos_router,          prefix="/api/videos",          tags=["videos"])
router.include_router(campaigns_router,       prefix="/api/campaigns",       tags=["campaigns"])
router.include_router(analytics_router,       prefix="/api/analytics",       tags=["analytics"])
