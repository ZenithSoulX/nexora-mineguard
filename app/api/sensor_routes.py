from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.dependencies import get_db
from app.models.sensor_reading import SensorReading
from app.schemas.sensor import SensorReadingCreate

router = APIRouter(prefix="/api",tags=["sensor"])
@router.post("/ingest")
def ingest(data : SensorReadingCreate,db : Session = Depends(get_db)):
    reading = SensorReading(
        node_id=data.node_id,
        timestamp=data.timestamp,
        tilt_x=data.tilt_x,
        tilt_y=data.tilt_y,
        vibration=data.vibration,
        flex_raw = data.flex_raw,
        crack_ok = data.crack_ok
    )

    db.add(reading)
    db.commit()
    db.refresh(reading)
    return {
        "message": "saved",
        "id": reading.id
    }

@router.get("/latest")
def get_latest_redings(db: Session=Depends(get_db)):
    return (
        db.query(SensorReading).order_by(SensorReading.timestamp.desc()).limit(20).all()
    )