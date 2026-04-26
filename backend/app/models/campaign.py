from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(Enum(CampaignStatus), default=CampaignStatus.DRAFT)

    # Seeding config
    target_accounts = Column(JSON, default=list)   # list of FB account IDs
    proxy_pool = Column(JSON, default=list)         # list of proxy strings
    schedule_at = Column(DateTime(timezone=True))
    max_concurrent = Column(Integer, default=5)
    delay_min = Column(Integer, default=3)          # seconds
    delay_max = Column(Integer, default=10)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    video = relationship("Video", back_populates="campaigns")
    analytics = relationship("VideoAnalytics", back_populates="campaign")
