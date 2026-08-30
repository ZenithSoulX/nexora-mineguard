from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.dependencies import get_db
from app.models.risk_score import RiskScore

router = APIRouter(prefix="/api/risk",tags=["Risk"])

@router.get("/")
def get_risk_scores(db: Session = Depends(get_db)):
    return db.query(RiskScore).all()