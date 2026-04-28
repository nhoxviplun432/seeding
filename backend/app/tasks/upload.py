import logging

from app.database import SessionLocal
from app.models.video import Video, VideoStatus
from app.services.facebook import facebook_service
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_and_upload_video(self, video_id: int):
    db = SessionLocal()
    video = None
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise ValueError(f"Video {video_id} not found")

        video.status = VideoStatus.PROCESSING
        db.commit()

        result = facebook_service.upload_video(
            video_path=video.file_path,
            title=video.title,
            description=video.description or "",
            tags=video.tags or [],
        )

        if result["success"]:
            video.facebook_video_id = result["video_id"]
            video.status = VideoStatus.PUBLISHED
        else:
            video.status = VideoStatus.FAILED
            logger.error("Facebook upload failed for video %d: %s", video_id, result.get("error"))

        db.commit()
        return result

    except Exception as exc:
        logger.exception("Task failed for video %d", video_id)
        if video is not None:
            video.status = VideoStatus.FAILED
            db.commit()
        raise self.retry(exc=exc)
    finally:
        db.close()
