from datetime import datetime
from sqlalchemy import Integer, String, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.database.base import Base


class RiskScore(Base):
    __tablename__ = "risk_scores"

    id : Mapped[int] = mapped_column(Integer,primary_key=True)
    node_id: Mapped[str] = mapped_column(String(20))
    score: Mapped[float] = mapped_column(Float)
    signal: Mapped[str] = mapped_column(String(20))
    severity: Mapped[str] = mapped_column(String(20))
    node_timestamp: Mapped[int] = mapped_column(BigInteger)         
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True),server_default=func.now())
