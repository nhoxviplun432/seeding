import asyncio
import time
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.video import Video
from app.schemas.video import VideoListResponse, VideoResponse
from app.tasks.upload import process_and_upload_video

router = APIRouter()

_ALLOWED_EXTS = {"mp4", "mov", "avi"}


@router.get("/", response_model=VideoListResponse)
async def list_videos(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    total = db.query(Video).count()
    items = db.query(Video).offset(skip).limit(limit).all()
    return {"items": items, "total": total}


@router.post("/upload", response_model=VideoResponse, status_code=201)
async def upload_video(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    ext = Path(file.filename or "").suffix.lower().lstrip(".")
    if ext not in _ALLOWED_EXTS:
        raise HTTPException(400, f"Unsupported format. Allowed: {', '.join(_ALLOWED_EXTS)}")

    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / f"{int(time.time())}_{file.filename}"

    # Run blocking file I/O in thread pool to avoid blocking the event loop
    contents = await file.read()
    await asyncio.get_event_loop().run_in_executor(
        None, file_path.write_bytes, contents
    )

    video = Video(
        page_id=settings.FACEBOOK_PAGE_ID,
        file_path=str(file_path),
        file_size=len(contents),
        title=title,
        description=description,
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    process_and_upload_video.delay(video.id)

    return video


@router.get("/{video_id}", response_model=VideoResponse)
async def get_video(
    video_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    return video


@router.delete("/{video_id}", status_code=204)
async def delete_video(
    video_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    db.delete(video)
    db.commit()
