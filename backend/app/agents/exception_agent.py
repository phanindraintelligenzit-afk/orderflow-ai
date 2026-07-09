import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)


def exception_agent(state: Dict[str, Any], error_message: str, failed_agent: str) -> Dict[str, Any]:
    """Exception agent: handle workflow failures with escalation logic."""
    logger.error(
        f"Workflow exception in agent '{failed_agent}' "
        f"for order {state.get('order_id')}: {error_message}"
    )

    retry_count = state.get("retry_count", 0)
    max_retries = state.get("max_retries", 3)

    if retry_count < max_retries:
        state["retry_count"] = retry_count + 1
        state["error"] = None
        state["escalation"] = "retry"
        logger.info(f"Auto-retry #{retry_count + 1} scheduled for agent '{failed_agent}'")
    else:
        state["escalation"] = "manual_review"
        logger.warning(
            f"Max retries ({max_retries}) exceeded for agent '{failed_agent}'. "
            f"Order {state.get('order_id')} requires manual review."
        )

    return {
        **state,
        "exception_handled": True,
        "failed_agent": failed_agent,
        "error_message": error_message,
    }
