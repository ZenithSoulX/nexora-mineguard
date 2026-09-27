from datetime import UTC, datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.dependencies import get_db
from app.models.alert import Alert
from app.models.risk_score import RiskScore
from app.models.sensor_reading import SensorReading
from types import SimpleNamespace
from app.ai.pipeline import pipeline

router = APIRouter(prefix="/api/risk",tags=["Risk"])

@router.get("/{node_id}")
def get_risk_scores(node_id: str, limit: int = 200, db: Session = Depends(get_db)):
    return (
        db.query(RiskScore)
        .filter(RiskScore.node_id == node_id)
        .order_by(RiskScore.timestamp.desc())
        .limit(limit)
        .all()
    )

@router.post("/calculate/{node_id}")
def calculate_node_risk(
    node_id: str,
    db: Session = Depends(get_db)
):
    reading = (
        db.query(SensorReading)
        .filter(SensorReading.node_id == node_id)
        .order_by(SensorReading.node_timestamp.desc())
        .first()
    )

    if not reading:
        return {"error": "No reading found for the given node ID"}

    ai_reading = SimpleNamespace(
        node_id=reading.node_id,
        ts=reading.node_timestamp,
        tilt_x=reading.tilt_x,
        tilt_y=reading.tilt_y,
        vib_rms=reading.vib_rms,
        flex_raw=reading.flex_raw,
        crack_ok=reading.crack_ok,
        rssi=reading.rssi,
    )

    results = pipeline.process_packet([ai_reading])
    result = results[0]

    score = round(result["fusion_score"] * 100, 2)

    risk_entry = RiskScore(
        node_id=node_id,
        score=score,
        signal=result["progression"],
        severity=result["severity"],
        node_timestamp=reading.node_timestamp,
    )

    db.add(risk_entry)
    db.commit()
    db.refresh(risk_entry)

    return {
        "node_id": node_id,
        "risk_score": score,
        "severity": result["severity"],
        "progression": result["progression"],
        "corroborated": result["corroborated"],
    }
