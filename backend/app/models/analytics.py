from sqlalchemy import Column, Integer, DateTime, ForeignKey, BigInteger
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class VideoAnalytics(Base):
    __tablename__ = "video_analytics"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)

    views = Column(BigInteger, default=0)
    likes = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    reach = Column(BigInteger, default=0)

    collected_at = Column(DateTime(timezone=True), server_default=func.now())

    video = relationship("Video", back_populates="analytics")
    campaign = relationship("Campaign", back_populates="analytics")
