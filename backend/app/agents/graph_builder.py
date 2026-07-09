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