from datetime import datetime
from sqlalchemy import Integer,String,Float,DateTime,Boolean
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.database.base import Base

class Node(Base):
    __tablename__="nodes"
    id : Mapped[int] = mapped_column(Integer, primary_key=True)
    node_id : Mapped[str] = mapped_column(String(20),unique=True)
    status : Mapped[str] = mapped_column(String(20),default="ONLINE")
    battery_level : Mapped[float] = mapped_column(Float, default=100.0)
    last_seen : Mapped[datetime] = mapped_column(DateTime(timezone=True),server_default=func.now())

