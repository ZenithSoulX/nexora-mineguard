from app.database.db import engine
from app.database.base import Base
from app.models.alert import Alert
from app.models.node import Node
from app.models.risk_score import RiskScore
from app.models.sensor_reading import SensorReading

Base.metadata.create_all(bind=engine)

print("Tables Created")