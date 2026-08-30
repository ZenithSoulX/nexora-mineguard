from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.dependencies import get_db
from app.schemas.gateway import GatewayPacket
from app.services.ingestion_service import (ingest_gateway_packet)

router = APIRouter(prefix="/api/ingest",tags=["Ingestion"])

@router.post("/gateway")
def ingest_gateway(packet: GatewayPacket,db: Session = Depends(get_db)):
    return ingest_gateway_packet(packet,db)