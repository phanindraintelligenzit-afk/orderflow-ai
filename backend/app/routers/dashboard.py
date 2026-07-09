from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timezone, timedelta
from app.database import get_db
from app.models import Order, WorkflowState, SystemEvent
from app.schemas import DashboardMetrics

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get("/dashboard", response_model=DashboardMetrics)
def get_dashboard(db: Session = Depends(get_db)):
    total_orders = db.query(func.count(Order.id)).scalar() or 0

    status_counts = (
        db.query(Order.status, func.count(Order.id))
        .group_by(Order.status)
        .all()
    )
    orders_by_status = {s: c for s, c in status_counts}

    revenue = db.query(func.coalesce(func.sum(Order.total_amount), 0)).scalar() or 0.0

    # Avg processing time for completed orders
    avg_result = (
        db.query(
            func.avg(
                func.extract("epoch", WorkflowState.completed_at - WorkflowState.started_at) / 3600
            )
        )
        .filter(WorkflowState.status == "completed")
        .scalar()
    )
    avg_time = round(float(avg_result), 2) if avg_result else None

    # Recent exceptions (last 24h)
    day_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    recent_exceptions = (
        db.query(func.count(WorkflowState.id))
        .filter(
            WorkflowState.status == "failed",
            WorkflowState.updated_at >= day_ago,
        )
        .scalar()
        or 0
    )

    return DashboardMetrics(
        total_orders=total_orders,
        orders_by_status=orders_by_status,
        total_revenue=revenue,
        avg_processing_time_hours=avg_time,
        recent_exceptions=recent_exceptions,
    )
