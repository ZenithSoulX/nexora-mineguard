from datetime import datetime
from sqlalchemy import Integer, String, Boolean, DateTime, BigInteger, Float
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.database.base import Base

class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    node_id: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
    severity: Mapped[str] = mapped_column(String(20))
    signal: Mapped[str] = mapped_column(String(50))                                                                                  
    score: Mapped[float] = mapped_column(Float)                                                                                            
    message: Mapped[str] = mapped_column(String(255))
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)  
    resolved_at : Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True) 
    sms_sent: Mapped[bool] = mapped_column(Boolean, default=False)      
    email_sent: Mapped[bool] = mapped_column(Boolean, default=False)    
    node_timestamp: Mapped[int] = mapped_column(BigInteger)                                                                              
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
                                                                                                                                      
