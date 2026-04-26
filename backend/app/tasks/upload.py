from celery import Celery
from app.config import settings
from app.database import SessionLocal
from app.models.video import Video, VideoStatus
from app.services.facebook import facebook_service
import logging

logger = logging.getLogger(__name__)

celery_app = Celery(
    "seeding_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

@celery_app.task(bind=True, max_retries=3)
def process_and_upload_video(self, video_id: int):
    """Background task to upload video to Facebook"""
    db = SessionLocal()
    
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise Exception(f"Video {video_id} not found")
        
        # Update status
        video.status = VideoStatus.PROCESSING
        db.commit()
        
        # Upload to Facebook
        result = facebook_service.upload_video(
            video_path=video.file_path,
            title=video.title,
            description=video.description or "",
            tags=video.tags or []
        )
        
        if result['success']:
            video.facebook_video_id = result['video_id']
            video.status = VideoStatus.PUBLISHED
        else:
            video.status = VideoStatus.FAILED
        
        db.commit()
        return result
        
    except Exception as e:
        logger.error(f"Error: {e}")
        video.status = VideoStatus.FAILED
        db.commit()
        raise self.retry(exc=e, countdown=60)
    finally:
        db.close()