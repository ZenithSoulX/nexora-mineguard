from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.dependencies import get_db
from app.models.node import Node

router = APIRouter(prefix="/api/nodes",tags=["Nodes"])

@router.get("/")
def get_nodes(db : Session = Depends(get_db)):
    return db.query(Node).all()