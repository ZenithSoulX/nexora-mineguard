from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.dependencies import get_db
from app.models.alert import Alert

router = APIRouter(prefix="/api/alerts",tags=["Alerts"])
@router.get("/")
def get_alerts(db: Session = Depends(get_db)):
    return db.query(Alert).all()