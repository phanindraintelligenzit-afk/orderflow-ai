import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Order, OrderItem, WorkflowState, SystemEvent, OrderStatus
from app.schemas import OrderCreate, OrderItemCreate
from app.agents.intake_agent import intake_agent
from app.agents.inventory_agent import inventory_agent
from app.agents.erp_sync_agent import erp_sync_agent
from app.agents.fulfillment_agent import fulfillment_agent
from app.agents.invoice_agent import invoice_agent
from app.agents.reconciliation_agent import reconciliation_agent
from app.agents.exception_agent import exception_agent


AGENT_PIPELINE = [
    ("intake", intake_agent),
    ("inventory", inventory_agent),
    ("erp_sync", erp_sync_agent),
    ("fulfillment", fulfillment_agent),
    ("invoice", invoice_agent),
    ("reconciliation", reconciliation_agent),
]


def create_workflow_state(order_id: uuid.UUID, agent_name: str, db: Session) -> WorkflowState:
    state = WorkflowState(
        id=uuid.uuid4(),
        order_id=order_id,
        agent_name=agent_name,
        status="pending",
        retry_count=0,
    )
    db.add(state)
    db.commit()
    return state


def log_event(order_id: Optional[uuid.UUID], event_type: str, payload: Dict[str, Any], db: Session):
    event = SystemEvent(
        id=uuid.uuid4(),
        order_id=order_id,
        event_type=event_type,
        payload=payload,
    )
    db.add(event)
    db.commit()


def run_workflow(order_id: uuid.UUID, order_data: OrderCreate, db: Session):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return

    state: Dict[str, Any] = {
        "order_id": str(order_id),
        "customer_id": order_data.customer_id,
        "items": [i.model_dump() for i in order_data.items],
        "notes": order_data.notes,
        "current_agent": None,
        "error": None,
        "retry_count": 0,
        "max_retries": 3,
    }

    for agent_name, agent_fn in AGENT_PIPELINE:
        ws = create_workflow_state(order_id, agent_name, db)

        state["current_agent"] = agent_name
        ws.status = "running"
        ws.input_data = {k: v for k, v in state.items() if k != "items"}
        ws.started_at = datetime.now(timezone.utc)
        order.status = getattr(OrderStatus, agent_name.upper(), OrderStatus.PENDING).value
        db.commit()

        try:
            result = agent_fn(state)

            if result.get("error"):
                raise Exception(result["error"])

            ws.status = "completed"
            ws.output_data = result
            ws.completed_at = datetime.now(timezone.utc)
            state.update(result)
            state["error"] = None
            db.commit()

            log_event(order_id, f"{agent_name}_completed", {
                "agent": agent_name,
                "order_id": str(order_id),
            }, db)

        except Exception as e:
            ws.status = "failed"
            ws.error_message = str(e)
            ws.output_data = {"error": str(e)}
            ws.completed_at = datetime.now(timezone.utc)
            order.status = OrderStatus.FAILED.value
            db.commit()

            log_event(order_id, "workflow_error", {
                "agent": agent_name,
                "error": str(e),
                "order_id": str(order_id),
            }, db)

            exception_agent(state, str(e), agent_name)
            return

    order.status = OrderStatus.COMPLETED.value
    order.updated_at = datetime.now(timezone.utc)
    db.commit()

    log_event(order_id, "workflow_completed", {
        "order_id": str(order_id),
        "order_number": order.order_number,
    }, db)
