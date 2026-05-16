import enum

from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class ProxyProtocol(str, enum.Enum):
    HTTP   = "http"
    HTTPS  = "https"
    SOCKS4 = "socks4"
    SOCKS5 = "socks5"


class ProxyStatus(str, enum.Enum):
    ACTIVE   = "active"
    DEAD     = "dead"
    UNTESTED = "untested"
    ROTATING = "rotating"


class Proxy(Base):
    __tablename__ = "proxies"

    id    = Column(Integer, primary_key=True, index=True)

    label    = Column(String(255), nullable=False)
    protocol = Column(
        Enum(ProxyProtocol, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=ProxyProtocol.HTTP,
    )
    host     = Column(String(255), nullable=False)
    port     = Column(Integer,     nullable=False)

    username = Column(String(255), nullable=True)
    password = Column(String(255), nullable=True)

    is_rotating = Column(Boolean, default=False, nullable=False)
    rotate_url  = Column(String(500), nullable=True)

    country = Column(String(2), nullable=True)

    status = Column(
        Enum(ProxyStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=ProxyStatus.UNTESTED,
    )
    latency_ms     = Column(Integer,              nullable=True)
    last_checked_at = Column(DateTime(timezone=True), nullable=True)

    assigned_count = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
