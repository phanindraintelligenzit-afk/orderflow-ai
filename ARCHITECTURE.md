# OrderFlow AI — Architecture Blueprint

## Stack
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0, PostgreSQL, LangGraph
- **Frontend**: React 18, TypeScript, Tailwind CSS, React Query
- **Infrastructure**: Docker, Docker Compose, GitHub Actions CI/CD
- **Agents**: LangGraph multi-agent orchestration

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                          │
│  Dashboard | Order Tracking | Agent Monitor | Config       │
└─────────────────────────┬───────────────────────────────────┘
                          │ REST API (FastAPI)
┌─────────────────────────▼───────────────────────────────────┐
│                     API Gateway Layer                        │
│  Auth (JWT) | Rate Limit | WebSocket for real-time updates  │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                  Orchestrator Agent (LangGraph)              │
│  Routes orders through the pipeline, manages state,         │
│  handles exceptions and escalations                         │
├─────────────────────────────────────────────────────────────┤
│  Agent 1: Order Intake Agent       ── Parse & validate orders│
│  Agent 2: Inventory Check Agent     ── Check stock/allocate  │
│  Agent 3: ERP Sync Agent            ── Sync to ERP system    │
│  Agent 4: Fulfillment Tracker Agent ── Track shipping status │
│  Agent 5: Invoice Agent             ── Generate & send       │
│  Agent 6: Reconciliation Agent      ── Match PO/Invoice/Pmt  │
│  Agent 7: Exception Handler Agent   ── Edge cases, escalations│
├─────────────────────────────────────────────────────────────┤
│                  Integration Layer (Adapters)                │
│  ERP Adapter | CRM Adapter | WMS Adapter | Payment Gateway  │
└─────────────────────────────────────────────────────────────┘
```

## API Design

### Core Endpoints
- `POST /api/orders` — Submit new order
- `GET /api/orders/{id}` — Get order status
- `GET /api/orders` — List orders with filters
- `GET /api/agents/status` — Agent health & metrics
- `GET /api/workflow/{order_id}/graph` — Workflow state graph
- `POST /api/workflow/{order_id}/retry` — Retry failed step
- `GET /api/metrics/dashboard` — Dashboard KPIs

## DB Schema

### orders
- id (UUID PK)
- order_number (varchar unique)
- customer_id (varchar)
- status (enum: received, validated, inventory_checked, erp_synced, fulfilled, invoiced, reconciled, exception)
- total_amount (decimal)
- currency (varchar)
- created_at, updated_at

### order_items
- id (UUID PK)
- order_id (FK → orders)
- sku (varchar)
- quantity (int)
- unit_price (decimal)
- line_total (decimal)

### workflow_states
- id (UUID PK)
- order_id (FK → orders)
- agent_name (varchar)
- status (enum: pending, running, completed, failed, skipped)
- input_data (jsonb)
- output_data (jsonb)
- error_message (text)
- started_at, completed_at
- retry_count (int)

### system_events
- id (UUID PK)
- order_id (FK → orders)
- event_type (varchar)
- payload (jsonb)
- created_at

## LangGraph Agent Design

Each agent is a LangGraph node with:
- **State**: Shared state dict passed through the graph
- **Tools**: Function calls (API adapters, DB queries, notifications)
- **Router**: Conditional edges based on agent output
- **Shared Memory**: SQLAlchemy-backed checkpointing

## Deployment
```yaml
# docker-compose.yml
services:
  api: fastapi app
  frontend: nginx + react build
  postgres: postgres:16
  redis: for agent state caching
```