from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database import Base

class VideoStatus(str, enum.Enum):
    DRAFT = "draft"
    PROCESSING = "processing"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    FAILED = "failed"

class Video(Base):
    __tablename__ = "videos"
    
    id = Column(Integer, primary_key=True, index=True)
    facebook_video_id = Column(String(100), unique=True)
    page_id = Column(String(50), nullable=False)
    
    # File info
    file_path = Column(Text, nullable=False)
    file_size = Column(Integer)
    duration = Column(Integer)
    thumbnail_path = Column(Text)
    
    # Content
    title = Column(String(255), nullable=False)
    description = Column(Text)
    tags = Column(JSON, default=list)
    
    # Metadata
    status = Column(Enum(VideoStatus), default=VideoStatus.DRAFT)
    scheduled_time = Column(DateTime(timezone=True))
    published_time = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    campaigns = relationship("Campaign", back_populates="video")
    analytics = relationship("VideoAnalytics", back_populates="video")