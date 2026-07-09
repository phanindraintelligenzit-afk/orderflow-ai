import time
from typing import Any, Dict


def intake_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """Intake agent: validate and enrich the incoming order data."""
    items = state.get("items", [])

    if not items:
        return {**state, "error": "No items in order"}

    total_qty = sum(i.get("quantity", 0) for i in items)
    total_value = sum(
        i.get("quantity", 0) * i.get("unit_price", 0) for i in items
    )

    time.sleep(0.5)

    return {
        **state,
        "intake_validated": True,
        "total_items": len(items),
        "total_quantity": total_qty,
        "total_value": total_value,
        "intake_notes": f"Order validated: {len(items)} SKUs, {total_qty} units",
    }
