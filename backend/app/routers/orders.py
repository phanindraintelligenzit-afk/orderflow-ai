from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional
from datetime import datetime, timezone
from app.database import get_db
from app.models import Order, OrderItem, WorkflowState, SystemEvent
from app.schemas import (
    OrderCreate,
    OrderResponse,
    OrderListResponse,
)
from app.agents.graph_builder import run_order_workflow
import uuid

router = APIRouter(prefix="/api/orders", tags=["orders"])


def generate_order_number(db: Session) -> str:
    count = db.query(func.count(Order.id)).scalar() or 0
    now = datetime.now(timezone.utc)
    return f"OF-{now.strftime('%Y%m%d')}-{count + 1:04d}"


@router.post("", response_model=OrderResponse, status_code=201)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    total = sum(item.unit_price * item.quantity for item in payload.items)
    order = Order(
        id=uuid.uuid4(),
        order_number=generate_order_number(db),
        customer_id=payload.customer_id,
        status="received",
        total_amount=total,
        notes=payload.notes,
    )
    db.add(order)
    db.flush()

    for item in payload.items:
        order_item = OrderItem(
            id=uuid.uuid4(),
            order_id=order.id,
            sku=item.sku,
            quantity=item.quantity,
            unit_price=item.unit_price,
            line_total=item.unit_price * item.quantity,
        )
        db.add(order_item)

    event = SystemEvent(
        order_id=order.id,
        event_type="order_created",
        payload={"customer_id": payload.customer_id, "items_count": len(payload.items)},
    )
    db.add(event)
    db.commit()
    db.refresh(order)

    # Kick off async workflow in background
    import threading
    thread = threading.Thread(target=run_order_workflow, args=(str(order.id),), daemon=True)
    thread.start()

    return order


@router.get("", response_model=list[OrderListResponse])
def list_orders(
    status: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Order)

    if status:
        query = query.filter(Order.status == status)
    if customer_id:
        query = query.filter(Order.customer_id.ilike(f"%{customer_id}%"))
    if search:
        query = query.filter(
            Order.order_number.ilike(f"%{search}%")
            | Order.customer_id.ilike(f"%{search}%")
        )

    query = query.order_by(desc(Order.created_at)).offset(offset).limit(limit)
    orders = query.all()

    results = []
    for o in orders:
        results.append(OrderListResponse(
            id=o.id,
            order_number=o.order_number,
            customer_id=o.customer_id,
            status=o.status,
            total_amount=o.total_amount,
            currency=o.currency,
            created_at=o.created_at,
            items_count=len(o.items),
        ))
    return results


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: str, db: Session = Depends(get_db)):
    try:
        uid = uuid.UUID(order_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid order ID")
    order = db.query(Order).filter(Order.id == uid).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.get("/{order_id}/graph")
def get_order_graph(order_id: str, db: Session = Depends(get_db)):
    try:
        uid = uuid.UUID(order_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid order ID")
    order = db.query(Order).filter(Order.id == uid).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    states = db.query(WorkflowState).filter(WorkflowState.order_id == uid).order_by(WorkflowState.started_at).all()

    nodes = [
        {"id": s.agent_name, "label": s.agent_name.replace("_", " ").title(), "status": s.status}
        for s in states
    ]
    edges = []
    agent_order = ["intake_agent", "inventory_agent", "erp_sync_agent", "fulfillment_agent", "invoice_agent", "reconciliation_agent"]
    for i in range(len(agent_order) - 1):
        edges.append({"from": agent_order[i], "to": agent_order[i + 1]})

    return {"order_status": order.status, "nodes": nodes, "edges": edges}
