from fastapi import FastAPI
from app.api.sensor_routes import router as sensor_router
from app.api.node_routes import router as node_router
from app.api.alert_routes import router as alert_router
from app.api.ingestion_routes import router as ingestion_router
from app.api.risk_routes import router as risk_router
from app.api.dashboard_routes import router as dashboard_router
from app.api.gis_routes import router as gis_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.include_router(sensor_router)
app.include_router(node_router)
app.include_router(alert_router)
app.include_router(ingestion_router)
app.include_router(risk_router)
app.include_router(dashboard_router)
app.include_router(gis_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)