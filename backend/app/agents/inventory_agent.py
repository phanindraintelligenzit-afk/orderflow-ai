import time
import random
from typing import Any, Dict


def inventory_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """Inventory agent: check stock levels for each SKU."""
    items = state.get("items", [])
    inventory_results = []

    for item in items:
        available = random.randint(5, 100)
        requested = item.get("quantity", 1)
        in_stock = available >= requested

        inventory_results.append({
            "sku": item["sku"],
            "requested": requested,
            "available": available,
            "in_stock": in_stock,
        })

    time.sleep(0.5)

    all_in_stock = all(r["in_stock"] for r in inventory_results)

    return {
        **state,
        "inventory_checked": True,
        "inventory_results": inventory_results,
        "all_in_stock": all_in_stock,
        "inventory_notes": "All items in stock" if all_in_stock else "Some items low on stock",
    }
