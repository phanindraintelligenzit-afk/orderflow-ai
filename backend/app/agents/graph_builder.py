"""Graph builder for OrderFlow AI LangGraph workflow.

Builds a StateGraph with nodes for each agent in the pipeline
and conditional routing based on agent outputs.
"""
from typing import Any, Dict, Literal, TypedDict
from app.agents.intake_agent import intake_agent
from app.agents.inventory_agent import inventory_agent
from app.agents.erp_sync_agent import erp_sync_agent
from app.agents.fulfillment_agent import fulfillment_agent
from app.agents.invoice_agent import invoice_agent
from app.agents.reconciliation_agent import reconciliation_agent


class AgentState(TypedDict):
    order_id: str
    customer_id: str
    items: list
    notes: str
    current_agent: str
    error: str
    retry_count: int
    max_retries: int
    escalation: str


def route_after_agent(state: AgentState) -> Literal["next", "exception", "retry"]:
    """Determine next step based on agent output."""
    if state.get("error"):
        if state.get("retry_count", 0) < state.get("max_retries", 3):
            return "retry"
        return "exception"
    return "next"


def build_workflow_graph():
    """Build and return a compiled LangGraph workflow.

    Uses the standard sequential pipeline:
    intake -> inventory -> erp_sync -> fulfillment -> invoice -> reconciliation
    with conditional error handling at each step.
    """
    try:
        from langgraph.graph import StateGraph, END

        workflow = StateGraph(AgentState)

        workflow.add_node("intake", intake_agent)
        workflow.add_node("inventory", inventory_agent)
        workflow.add_node("erp_sync", erp_sync_agent)
        workflow.add_node("fulfillment", fulfillment_agent)
        workflow.add_node("invoice", invoice_agent)
        workflow.add_node("reconciliation", reconciliation_agent)

        agent_pipeline = [
            ("intake", "inventory"),
            ("inventory", "erp_sync"),
            ("erp_sync", "fulfillment"),
            ("fulfillment", "invoice"),
            ("invoice", "reconciliation"),
        ]

        for source, target in agent_pipeline:
            workflow.add_conditional_edges(
                source,
                route_after_agent,
                {
                    "next": target,
                    "exception": END,
                    "retry": source,
                },
            )

        workflow.set_entry_point("intake")
        workflow.add_conditional_edges(
            "reconciliation",
            route_after_agent,
            {
                "next": END,
                "exception": END,
                "retry": "reconciliation",
            },
        )

        return workflow.compile()

    except ImportError:
        return None


compiled_graph = build_workflow_graph()


def run_order_workflow(order_id: str):
    """Execute the full pipeline of agents for an order."""
    from app.database import SessionLocal
    from app.models import Order, WorkflowState, SystemEvent
    import uuid
    from datetime import datetime, timezone
    from app.agents.orchestrator import PIPELINE, AGENT_MAP

    db = SessionLocal()
    try:
        uid = uuid.UUID(order_id)
        order = db.query(Order).filter(Order.id == uid).first()
        if not order:
            return
        order.status = "processing"
        items = [{"sku": i.sku, "quantity": i.quantity, "unit_price": i.unit_price} for i in order.items]
        db.commit()
    finally:
        db.close()

    state = {
        "order_id": order_id,
        "customer_id": order.customer_id if order else "",
        "items": items if order else [],
        "notes": getattr(order, "notes", "") or "",
        "current_agent": "",
        "error": "",
        "retry_count": 0,
        "max_retries": 3,
        "escalation": "",
    }

    for agent_name in PIPELINE:
        agent_func = AGENT_MAP.get(agent_name)
        if not agent_func:
            continue

        state["current_agent"] = agent_name
        state["error"] = ""

        db = SessionLocal()
        try:
            uid = uuid.UUID(order_id)
            ws = db.query(WorkflowState).filter(
                WorkflowState.order_id == uid, WorkflowState.agent_name == agent_name
            ).first()
            if not ws:
                ws = WorkflowState(
                    id=uuid.uuid4(), order_id=uid, agent_name=agent_name,
                    status="running", input_data=dict(state),
                    started_at=datetime.now(timezone.utc),
                )
                db.add(ws)
            else:
                ws.status = "running"
                ws.started_at = datetime.now(timezone.utc)
            db.commit()
        finally:
            db.close()

        try:
            state = agent_func(state)
            success = not state.get("error")

            db = SessionLocal()
            try:
                uid = uuid.UUID(order_id)
                ws = db.query(WorkflowState).filter(
                    WorkflowState.order_id == uid, WorkflowState.agent_name == agent_name
                ).first()
                if ws:
                    ws.status = "completed" if success else "failed"
                    ws.output_data = dict(state)
                    ws.error_message = state.get("error") if not success else None
                    ws.completed_at = datetime.now(timezone.utc)
                ev = SystemEvent(
                    order_id=uid,
                    event_type="agent_completed" if success else "agent_failed",
                    payload={"agent": agent_name, "status": ws.status if ws else "unknown"},
                )
                db.add(ev)
                db.commit()
            finally:
                db.close()

            if not success:
                db = SessionLocal()
                try:
                    uid = uuid.UUID(order_id)
                    o = db.query(Order).filter(Order.id == uid).first()
                    if o:
                        o.status = "exception"
                    db.commit()
                finally:
                    db.close()
                return

        except Exception as e:
            db = SessionLocal()
            try:
                uid = uuid.UUID(order_id)
                ws = db.query(WorkflowState).filter(
                    WorkflowState.order_id == uid, WorkflowState.agent_name == agent_name
                ).first()
                if ws:
                    ws.status = "failed"
                    ws.error_message = str(e)
                    ws.completed_at = datetime.now(timezone.utc)
                o = db.query(Order).filter(Order.id == uid).first()
                if o:
                    o.status = "exception"
                db.commit()
            finally:
                db.close()
            return

    db = SessionLocal()
    try:
        uid = uuid.UUID(order_id)
        o = db.query(Order).filter(Order.id == uid).first()
        if o:
            o.status = "reconciled"
        ev = SystemEvent(order_id=uid, event_type="workflow_completed", payload={"status": "reconciled"})
        db.add(ev)
        db.commit()
    finally:
        db.close()


def run_order_workflow_step(order_id: str, agent_name: str):
    """Retry a single agent step."""
    from app.database import SessionLocal
    from app.models import WorkflowState, Order, SystemEvent
    from datetime import datetime, timezone
    from app.agents.orchestrator import AGENT_MAP
    import uuid

    agent_func = AGENT_MAP.get(agent_name)
    if not agent_func:
        return

    db = SessionLocal()
    try:
        uid = uuid.UUID(order_id)
        ws = db.query(WorkflowState).filter(
            WorkflowState.order_id == uid, WorkflowState.agent_name == agent_name
        ).first()
        state = ws.input_data or {} if ws else {}
    finally:
        db.close()

    state["retry_count"] = state.get("retry_count", 0) + 1
    state["error"] = ""

    db = SessionLocal()
    try:
        uid = uuid.UUID(order_id)
        ws = db.query(WorkflowState).filter(
            WorkflowState.order_id == uid, WorkflowState.agent_name == agent_name
        ).first()
        if ws:
            ws.status = "running"
            ws.started_at = datetime.now(timezone.utc)
        o = db.query(Order).filter(Order.id == uid).first()
        if o:
            o.status = "processing"
        db.commit()
    finally:
        db.close()

    try:
        state = agent_func(state)
        db = SessionLocal()
        try:
            uid = uuid.UUID(order_id)
            ws = db.query(WorkflowState).filter(
                WorkflowState.order_id == uid, WorkflowState.agent_name == agent_name
            ).first()
            if ws:
                ws.status = "completed"
                ws.output_data = dict(state)
                ws.completed_at = datetime.now(timezone.utc)
            ev = SystemEvent(order_id=uid, event_type="agent_retried", payload={"agent": agent_name, "result": "success"})
            db.add(ev)
            db.commit()
        finally:
            db.close()
    except Exception as e:
        db = SessionLocal()
        try:
            uid = uuid.UUID(order_id)
            ws = db.query(WorkflowState).filter(
                WorkflowState.order_id == uid, WorkflowState.agent_name == agent_name
            ).first()
            if ws:
                ws.status = "failed"
                ws.error_message = str(e)
                ws.completed_at = datetime.now(timezone.utc)
            db.commit()
        finally:
            db.close()