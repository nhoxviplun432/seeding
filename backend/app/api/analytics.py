from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.analytics import VideoAnalytics
from app.models.video import Video
from app.schemas.analytics import AnalyticsResponse, AnalyticsSummary

router = APIRouter()


@router.get("/video/{video_id}", response_model=AnalyticsSummary)
async def get_video_analytics(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")

    data_points = (
        db.query(VideoAnalytics)
        .filter(VideoAnalytics.video_id == video_id)
        .order_by(VideoAnalytics.collected_at.desc())
        .all()
    )

    if not data_points:
        return AnalyticsSummary(
            video_id=video_id,
            total_views=0, total_likes=0, total_shares=0,
            total_comments=0, total_reach=0, data_points=[]
        )

    agg = db.query(
        func.sum(VideoAnalytics.views).label("views"),
        func.sum(VideoAnalytics.likes).label("likes"),
        func.sum(VideoAnalytics.shares).label("shares"),
        func.sum(VideoAnalytics.comments).label("comments"),
        func.sum(VideoAnalytics.reach).label("reach"),
    ).filter(VideoAnalytics.video_id == video_id).one()

    return AnalyticsSummary(
        video_id=video_id,
        total_views=agg.views or 0,
        total_likes=agg.likes or 0,
        total_shares=agg.shares or 0,
        total_comments=agg.comments or 0,
        total_reach=agg.reach or 0,
        data_points=data_points,
    )


@router.get("/campaign/{campaign_id}", response_model=list[AnalyticsResponse])
async def get_campaign_analytics(campaign_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(VideoAnalytics)
        .filter(VideoAnalytics.campaign_id == campaign_id)
        .order_by(VideoAnalytics.collected_at.desc())
        .all()
    )
    return rows
