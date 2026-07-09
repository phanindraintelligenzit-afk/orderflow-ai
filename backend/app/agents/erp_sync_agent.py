import time
from typing import Any, Dict


def erp_sync_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """ERP Sync agent: synchronize order with external ERP system."""
    time.sleep(0.8)

    erp_order_id = f"ERP-{state.get('order_id', '')[:8].upper()}"

    return {
        **state,
        "erp_synced": True,
        "erp_order_id": erp_order_id,
        "erp_status": "synced",
        "erp_notes": f"Order synced to ERP as {erp_order_id}",
    }
