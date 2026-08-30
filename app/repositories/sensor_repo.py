from sqlalchemy.orm import Session
from app.models.sensor_reading import SensorReading

def create_sensor_readings(db: Session,readings: list[SensorReading]):
    db.add_all(readings)
    db.commit()