from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime
import uuid


class OrderItemCreate(BaseModel):
    sku: str
    quantity: int = Field(ge=1)
    unit_price: float = Field(gt=0)


class OrderCreate(BaseModel):
    customer_id: str
    items: List[OrderItemCreate]
    notes: Optional[str] = None


class OrderItemResponse(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    sku: str
    quantity: int
    unit_price: float
    line_total: float

    model_config = {"from_attributes": True}


class WorkflowStateResponse(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    agent_name: str
    status: str
    input_data: Optional[Dict[str, Any]] = None
    output_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    retry_count: int = 0

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    id: uuid.UUID
    order_number: str
    customer_id: str
    status: str
    total_amount: float
    currency: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse] = []
    workflow_states: List[WorkflowStateResponse] = []

    model_config = {"from_attributes": True}


class OrderListResponse(BaseModel):
    id: uuid.UUID
    order_number: str
    customer_id: str
    status: str
    total_amount: float
    currency: str
    created_at: datetime
    updated_at: datetime
    item_count: int = 0

    model_config = {"from_attributes": True}


class DashboardMetrics(BaseModel):
    total_orders: int = 0
    orders_by_status: Dict[str, int] = {}
    avg_processing_time_seconds: Optional[float] = None
    recent_exceptions: List[Dict[str, Any]] = []


class GraphNode(BaseModel):
    id: str
    label: str
    status: str
    duration_seconds: Optional[float] = None


class GraphEdge(BaseModel):
    source: str
    target: str


class WorkflowGraph(BaseModel):
    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []
