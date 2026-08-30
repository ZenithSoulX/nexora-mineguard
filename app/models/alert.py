from datetime import datetime
from sqlalchemy import Integer, String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.database.base import Base

class Alert(Base):
    __tablename__ = "alerts"

    id : Mapped[int] = mapped_column(Integer,primary_key=True)
    node_id: Mapped[str] = mapped_column(String(20))
    severity: Mapped[str] = mapped_column(String(20))
    message: Mapped[str] = mapped_column(String(255))
    acknowledged: Mapped[bool] = mapped_column(Boolean,default=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True),server_default=func.now())