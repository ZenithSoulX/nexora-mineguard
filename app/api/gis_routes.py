from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.dependencies import get_db
from app.models.node import Node
from app.models.risk_score import RiskScore
from app.models.sensor_reading import SensorReading
import time

router = APIRouter(prefix="/api/map", tags=["GIS"])

@router.get("/live")
def get_live_map(db: Session = Depends(get_db)):
    nodes = db.query(Node).all()
    current_time = int(time.time())
    response = []
    for node in nodes:
        latest_reading = (
            db.query(SensorReading).filter(SensorReading.node_id == node.node_id).order_by(SensorReading.node_timestamp.desc()).first()
        )

        latest_risk = (
            db.query(RiskScore).filter(RiskScore.node_id == node.node_id).order_by(RiskScore.node_timestamp.desc()).first()
        )

        if latest_reading:
            age = current_time - latest_reading.node_timestamp
            if age < 300:
                status = "ONLINE"
            elif age < 1800:
                status = "DELAYED"
            else:
                status = "OFFLINE"
        else:
            status = "NO DATA"

        response.append(
            {
                "node_id": node.node_id,
                "latitude": node.latitude,
                "longitude": node.longitude,
                "status": status,
                "risk_score":
                    latest_risk.score
                    if latest_risk
                    else None,
                "severity":
                    latest_risk.severity
                    if latest_risk
                    else None
            }
        )

    return response