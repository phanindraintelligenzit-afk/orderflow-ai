from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.config import settings
from app.routers import orders, workflow, dashboard

app = FastAPI(
    title="OrderFlow AI",
    description="Multi-Agent Order-to-Cash Orchestration Engine",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "orderflow-ai", "version": "1.0.0"}


app.include_router(orders.router)
app.include_router(workflow.router)
app.include_router(dashboard.router)
