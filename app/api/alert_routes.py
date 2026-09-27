from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.dependencies import get_db
from app.models.alert import Alert
from app.models.risk_score import RiskScore
from datetime import UTC, datetime
from app.services.alert_service import generate_alert_for_node

router = APIRouter(prefix="/api/alerts",tags=["Alerts"])
@router.get("/")
def get_alerts(db: Session = Depends(get_db)):
    return db.query(Alert).all()
@router.post("/generate/{node_id}")
def generate_alert(node_id: str, db: Session = Depends(get_db)):
    return generate_alert_for_node(node_id, db)

@router.patch("/{alert_id}/ack")
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = (
        db.query(Alert).filter(Alert.id == alert_id).first()
    )
    if not alert:
        return {"error": "Alert not found"}
    alert.acknowledged = True
    db.commit()
    return {"message": "Alert acknowledged successfully", "alert_id": alert.id}

@router.patch("/{alert_id}/resolve")
def resolve_alert(alert_id: int,db: Session = Depends(get_db)):
    alert = (
        db.query(Alert).filter(Alert.id == alert_id).first()
    )
    if not alert:
        return {"error": "Alert not found"}
    alert.status = "RESOLVED"
    alert.resolved_at = datetime.now(UTC)
    db.commit()
    return {
        "message": "Alert resolved",
        "alert_id": alert.id
    }

@router.get("/active")
def get_active_alerts(db: Session = Depends(get_db)):
    return (
        db.query(Alert).filter(Alert.status == "ACTIVE").all()
    )
