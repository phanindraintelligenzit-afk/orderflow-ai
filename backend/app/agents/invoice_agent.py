import time
from typing import Any, Dict


def invoice_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """Invoice agent: generate invoice for the order."""
    items = state.get("items", [])
    total = sum(i.get("quantity", 0) * i.get("unit_price", 0) for i in items)

    invoice_number = f"INV-{state.get('order_id', '')[:8].upper()}"

    time.sleep(0.6)

    return {
        **state,
        "invoice_generated": True,
        "invoice_number": invoice_number,
        "invoice_total": total,
        "invoice_currency": "USD",
        "invoice_notes": f"Invoice {invoice_number} generated for ${total:.2f}",
    }
