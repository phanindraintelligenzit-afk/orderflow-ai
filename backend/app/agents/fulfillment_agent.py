import time
from typing import Any, Dict


def fulfillment_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """Fulfillment agent: assign warehouse and initiate picking."""
    warehouses = ["WH-US-EAST", "WH-US-WEST", "WH-EU-CENTRAL"]
    assigned_warehouse = warehouses[hash(state.get("order_id", "")) % len(warehouses)]

    time.sleep(0.7)

    return {
        **state,
        "fulfillment_initiated": True,
        "warehouse": assigned_warehouse,
        "picking_status": "assigned",
        "fulfillment_notes": f"Picking assigned to {assigned_warehouse}",
    }
