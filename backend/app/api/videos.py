from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.video import Video
from app.tasks.upload import process_and_upload_video
from app.config import settings
from pathlib import Path
import shutil
import time

router = APIRouter()

@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(None),
    db: Session = Depends(get_db)
):
    # Validate file
    file_ext = Path(file.filename).suffix.lower().replace('.', '')
    if file_ext not in ['mp4', 'mov', 'avi']:
        raise HTTPException(400, "Invalid file format")
    
    # Save file
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = upload_dir / f"{int(time.time())}_{file.filename}"
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Create database record
    video = Video(
        page_id=settings.FACEBOOK_PAGE_ID,
        file_path=str(file_path),
        title=title,
        description=description
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    
    # Trigger background task
    task = process_and_upload_video.delay(video.id)
    
    return {
        "success": True,
        "video_id": video.id,
        "task_id": task.id
    }

@router.get("/{video_id}")
async def get_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    return video