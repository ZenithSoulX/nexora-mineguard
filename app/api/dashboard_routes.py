from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.dependencies import get_db
from app.models.sensor_reading import SensorReading
from app.models.alert import Alert
from app.models.risk_score import RiskScore

router = APIRouter(prefix="/api/dashboard",tags=["Dashboard"])

@router.get("/overview")
def dashboard_overview(db: Session = Depends(get_db)):
    total_nodes = (db.query(SensorReading.node_id).distinct().count())
    active_alerts = (db.query(Alert).filter(Alert.status == "ACTIVE").count())
    critical_alerts = (db.query(Alert).filter(Alert.status == "ACTIVE",Alert.severity == "RED").count())
    latest_risks = (db.query(RiskScore).order_by(RiskScore.timestamp.desc()).limit(10).all())
    risk_data = []
    for risk in latest_risks:
        risk_data.append({
            "node_id": risk.node_id,
            "score": risk.score,
            "severity": risk.severity,
            "signal": risk.signal
        })
    return {
        "total_nodes": total_nodes,
        "active_alerts": active_alerts,
        "critical_alerts": critical_alerts,
        "latest_risks": risk_data
    }
    