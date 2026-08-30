from datetime import datetime
from sqlalchemy import (
    Integer,
    String,
    Float,
    Boolean,
    BigInteger,
    DateTime
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.database.base import Base

class SensorReading(Base):
    __tablename__ = "sensor_readings"
    id: Mapped[int] = mapped_column(Integer,primary_key=True)
    gateway_id: Mapped[str] = mapped_column(String(20))
    bridge_id: Mapped[str] = mapped_column(String(20))
    node_id: Mapped[str] = mapped_column(String(20))
    node_timestamp: Mapped[int] = mapped_column(BigInteger)
    gateway_received_timestamp: Mapped[int] = mapped_column(BigInteger)
    tilt_x: Mapped[float] = mapped_column(Float)
    tilt_y: Mapped[float] = mapped_column(Float)
    vib_rms: Mapped[float] = mapped_column(Float)
    flex_raw: Mapped[int] = mapped_column(Integer)
    crack_ok: Mapped[bool] = mapped_column(Boolean)
    rssi: Mapped[float | None] = mapped_column(Float,nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),server_default=func.now())