<div align="center">
  <h1>OrderFlow AI</h1>
  <p><strong>Open-Source Multi-Agent Order-to-Cash Orchestration Engine</strong></p>
  <p>
    <a href="#features">Features</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#api">API</a> •
    <a href="#agents">Agents</a> •
    <a href="#deployment">Deployment</a>
  </p>
  <p>
    <img src="https://img.shields.io/github/license/phanindraintelligenzit-afk/orderflow-ai" alt="License" />
    <img src="https://img.shields.io/github/stars/phanindraintelligenzit-afk/orderflow-ai" alt="Stars" />
    <img src="https://img.shields.io/github/languages/top/phanindraintelligenzit-afk/orderflow-ai" alt="Top Language" />
  </p>
</div>

## Overview

OrderFlow AI is a production-ready, open-source multi-agent system that orchestrates the complete Order-to-Cash (O2C) lifecycle. Powered by LangGraph agents, it automates order intake, inventory verification, ERP synchronization, fulfillment tracking, invoicing, and reconciliation -- reducing manual effort, eliminating data drift, and accelerating cash conversion.

Enterprises lose millions to order mismatches, delayed invoices, and cross-system data inconsistencies. OrderFlow AI solves this with an intelligent multi-agent pipeline that coordinates across ERP, CRM, WMS, and billing systems.

## Features

- **7 Specialized LangGraph Agents** -- Each stage of O2C has a dedicated agent with well-defined responsibilities
- **Real-Time Workflow Visualization** -- Watch orders flow through the pipeline with live status updates
- **Automated Exception Handling** -- Edge cases and mismatches are detected and escalated automatically
- **Cross-System Integration** -- Adapters for ERP, inventory, fulfillment, and billing systems
- **Interactive Dashboard** -- Real-time metrics, charts, and agent monitoring
- **RESTful API** -- Fully documented API for integration with existing systems
- **Dockerized Deployment** -- One-command deployment with Docker Compose
- **Retry & Recovery** -- Failed steps can be retried without restarting the full pipeline

## Architecture

```
Frontend (React/TypeScript)  →  API Gateway (FastAPI)  →  LangGraph Agent Pipeline
                                                                  │
                ┌─────────────────────────────────────────────────┤
                ▼                         ▼                       ▼
         Order Intake              Inventory Check           ERP Sync
                ▼                         ▼                       ▼
         Fulfillment                Invoice Gen.           Reconciliation
                ▼
         Exception Handler (when things go wrong)
```

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.0 |
| Agents | LangGraph, LangChain Core |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Charts | Recharts |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Container | Docker, Docker Compose |

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker & Docker Compose (optional, for production)

### Local Development

```bash
# Clone the repository
git clone https://github.com/phanindraintelligenzit-afk/orderflow-ai.git
cd orderflow-ai

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # or: venv\Scripts\activate (Windows)
pip install -r requirements.txt
cp .env.example .env   # Edit .env with your settings

# Start the backend
uvicorn app.main:app --reload

# In another terminal: Frontend setup
cd frontend
npm install
npm run dev
```

### Docker Deployment

```bash
# From the project root
docker compose up -d

# Services:
#   API:        http://localhost:8000
#   Frontend:   http://localhost:3000
#   PostgreSQL: localhost:5432
#   Redis:      localhost:6379
```

## API

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Create a new order and start workflow |
| GET | `/api/orders` | List orders with filters |
| GET | `/api/orders/{id}` | Get order details |
| GET | `/api/orders/{id}/graph` | Get workflow DAG |

### Workflow

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workflow/{order_id}/retry` | Retry a failed step |

### Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/metrics/dashboard` | Dashboard KPIs |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |

### Example: Create an Order

```json
POST /api/orders
{
  "customer_id": "acme-corp",
  "items": [
    {"sku": "SKU-001", "quantity": 5, "unit_price": 29.99},
    {"sku": "SKU-002", "quantity": 2, "unit_price": 149.99}
  ],
  "notes": "Rush order"
}
```

## Agents

Each agent is a LangGraph node with typed state transitions:

| Agent | Function | On Success | On Failure |
|-------|----------|------------|------------|
| **Order Intake** | Parse, validate, record order | Next: Inventory | Exception Handler |
| **Inventory Check** | Verify stock, allocate items | Next: ERP Sync | Exception Handler |
| **ERP Sync** | Sync order to ERP system | Next: Fulfillment | Exception Handler |
| **Fulfillment** | Track shipping and delivery | Next: Invoice | Exception Handler |
| **Invoice** | Generate and send invoice | Next: Reconciliation | Exception Handler |
| **Reconciliation** | Match PO / Invoice / Payment | Completed | Exception Handler |
| **Exception Handler** | Escalate edge cases | Completed | -- |

## Project Structure

```
orderflow-ai/
├── backend/
│   ├── app/
│   │   ├── agents/          # LangGraph agent implementations
│   │   │   ├── orchestrator.py
│   │   │   ├── graph_builder.py
│   │   │   ├── intake_agent.py
│   │   │   ├── inventory_agent.py
│   │   │   ├── erp_sync_agent.py
│   │   │   ├── fulfillment_agent.py
│   │   │   ├── invoice_agent.py
│   │   │   ├── reconciliation_agent.py
│   │   │   └── exception_agent.py
│   │   ├── routers/          # FastAPI route handlers
│   │   ├── models.py         # SQLAlchemy models
│   │   ├── schemas.py        # Pydantic schemas
│   │   ├── config.py         # Configuration
│   │   ├── database.py       # DB connection
│   │   └── main.py           # FastAPI app entry point
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/            # React pages
│   │   ├── components/       # Shared components
│   │   └── api/              # API client
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Configuration

Key environment variables (see `backend/.env.example`):

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+psycopg2://postgres:postgres@localhost:5432/orderflow` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `OPENAI_API_KEY` | OpenAI API key (optional) | -- |
| `SECRET_KEY` | JWT signing key | `change-this-in-production` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000,http://localhost:5173` |

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Built by AgentsFactory

OrderFlow AI is an open-source project by AgentsFactory -- building intelligent multi-agent systems for enterprise automation.

---

<p align="center">Made with by the AgentsFactory Team</p>