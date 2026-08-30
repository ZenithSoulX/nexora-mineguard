from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.dependencies import get_db
from app.models.risk_score import RiskScore

router = APIRouter(prefix="/api/risk",tags=["Risk"])

@router.get("/{node_id}")
def get_risk_scores(node_id: str, limit: int = 200, db: Session = Depends(get_db)):
    return (
        db.query(RiskScore)
        .filter(RiskScore.node_id == node_id)
        .order_by(RiskScore.ts.desc())
        .limit(limit)
        .all()
    )
