from datetime import datetime

from sqlalchemy import String, Float, BigInteger, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database.base import Base


class SensorReading(Base):
    __tablename__ = "sensor_readings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    node_id: Mapped[str] = mapped_column(String(20))
    timestamp: Mapped[int] = mapped_column(BigInteger)
    tilt_x: Mapped[float] = mapped_column(Float)
    tilt_y: Mapped[float] = mapped_column(Float)
    vibration: Mapped[float] = mapped_column(Float)
    flex_raw : Mapped[float] = mapped_column(Float)
    crack_ok : Mapped[bool] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),server_default=func.now())