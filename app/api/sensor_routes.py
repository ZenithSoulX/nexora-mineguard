from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.dependencies import get_db
from app.models.sensor_reading import SensorReading
from sqlalchemy import func

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

@router.get("/node/{node_id}")
def get_node_readings(node_id: str,db: Session = Depends(get_db)):
    return (
        db.query(SensorReading)
        .filter(SensorReading.node_id == node_id)
        .order_by(SensorReading.node_timestamp.desc())
        .limit(50)
        .all()
    )

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total_readings = db.query(SensorReading).count()
    total_nodes = (db.query(SensorReading.node_id).distinct().count())

    return {
        "total_readings": total_readings,
        "nodes": total_nodes
    }