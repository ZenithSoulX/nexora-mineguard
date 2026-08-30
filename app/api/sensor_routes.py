from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.dependencies import get_db
from app.models.sensor_reading import SensorReading

router = APIRouter(prefix="/api/sensors",tags=["Sensors"])

@router.get("/latest")
def get_latest_readings(db: Session = Depends(get_db)):
    readings = (
        db.query(SensorReading)
        .order_by(
            SensorReading.node_timestamp.desc()
        )
        .limit(20)
        .all()
    )

    return readings