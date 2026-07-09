from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import WorkflowState, Order
from app.agents.graph_builder import run_order_workflow_step
import uuid

router = APIRouter(prefix="/api/workflow", tags=["workflow"])


@router.post("/{order_id}/retry")
def retry_workflow(order_id: str, db: Session = Depends(get_db)):
    try:
        uid = uuid.UUID(order_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid order ID")

    order = db.query(Order).filter(Order.id == uid).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Find failed step
    failed = (
        db.query(WorkflowState)
        .filter(WorkflowState.order_id == uid, WorkflowState.status == "failed")
        .order_by(WorkflowState.started_at.desc())
        .first()
    )

    if not failed:
        raise HTTPException(status_code=400, detail="No failed steps to retry")

    # Reset it
    failed.status = "pending"
    failed.error_message = None
    failed.retry_count += 1
    db.commit()

    # Execute the retry
    import threading
    thread = threading.Thread(
        target=run_order_workflow_step, args=(str(order.id), failed.agent_name), daemon=True
    )
    thread.start()

    return {"message": f"Retrying {failed.agent_name}", "agent": failed.agent_name}
