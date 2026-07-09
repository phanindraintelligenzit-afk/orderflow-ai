import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text, JSON, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    INTAKE = "intake"
    INVENTORY_CHECK = "inventory_check"
    ERP_SYNC = "erp_sync"
    FULFILLMENT = "fulfillment"
    INVOICE = "invoice"
    RECONCILIATION = "reconciliation"
    COMPLETED = "completed"
    FAILED = "failed"


class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_number = Column(String(50), unique=True, nullable=False, index=True)
    customer_id = Column(String(100), nullable=False, index=True)
    status = Column(String(30), default=OrderStatus.PENDING.value, nullable=False, index=True)
    total_amount = Column(Float, default=0.0)
    currency = Column(String(10), default="USD")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    workflow_states = relationship("WorkflowState", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    sku = Column(String(50), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False)
    line_total = Column(Float, nullable=False, default=0.0)

    order = relationship("Order", back_populates="items")


class WorkflowState(Base):
    __tablename__ = "workflow_states"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    agent_name = Column(String(50), nullable=False)
    status = Column(String(30), default="pending", nullable=False)
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    retry_count = Column(Integer, default=0)

    order = relationship("Order", back_populates="workflow_states")


class SystemEvent(Base):
    __tablename__ = "system_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    event_type = Column(String(50), nullable=False, index=True)
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
