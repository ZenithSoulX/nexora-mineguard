from fastapi import FastAPI
from app.api.sensor_routes import router as sensor_router
from app.api.node_routes import router as node_router
from app.api.alert_routes import router as alert_router
app = FastAPI()
app.include_router(sensor_router,node_router,alert_router)
