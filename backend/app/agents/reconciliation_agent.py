import time
import random
from typing import Any, Dict


def reconciliation_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """Reconciliation agent: final reconciliation of order, inventory, and invoice."""
    time.sleep(0.5)

    invoice_total = state.get("invoice_total", 0)
    total_value = state.get("total_value", 0)
    matched = abs(invoice_total - total_value) < 0.01

    return {
        **state,
        "reconciled": True,
        "reconciliation_status": "passed" if matched else "flagged",
        "reconciliation_notes": (
            "All records reconciled successfully" if matched
            else "Total mismatch detected — manual review required"
        ),
        "audit_trail": {
            "order_value": total_value,
            "invoice_total": invoice_total,
            "inventory_match": state.get("all_in_stock", False),
            "erp_sync": state.get("erp_synced", False),
            "fulfillment_initiated": state.get("fulfillment_initiated", False),
        },
    }
