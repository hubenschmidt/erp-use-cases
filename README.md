# ERP Use Cases

A demonstration of AI-powered ERP (Enterprise Resource Planning) system integration using an agentic architecture. This project showcases how large language models can interpret natural language queries and execute business operations against mock ERP data.

## Overview

This project implements a multi-agent system that:

- Accepts natural language queries via REST API or WebSocket chat
- Routes requests through a pipeline of specialized AI agents
- Executes ERP operations (inventory, orders, customers)
- Evaluates responses for quality and completeness

## Architecture

```
User Query -> Frontline -> Orchestrator -> Worker -> Evaluator -> Response
                                |            ^
                           [ERP Services]    |
                                |            |
                           [Mock Data]  (feedback loop)
```

### Agent Pipeline

1. **Frontline Agent** - Initial routing decision (handle directly or send to orchestrator)
2. **Orchestrator Agent** - Analyzes intent and selects appropriate worker
3. **Worker Agents** - Execute specialized tasks:
   - ERP Worker - Inventory queries, stock transfers, order management
   - Search Worker - Web searches
   - Email Worker - Email composition
   - General Worker - Conversation and simple queries
4. **Evaluator Agent** - Validates worker output against success criteria

### Mock ERP System

The project includes a complete mock ERP with:

- **Inventory Management** - Stock levels, locations, transfers, reorder alerts
- **Order Management** - Order creation, status tracking, fulfillment
- **Customer Data** - Customer records and order history
- **Reporting** - Low stock alerts, dead stock analysis

## Getting Started

### Prerequisites

- Node.js 22+
- Docker & Docker Compose
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd erp-use-cases

# Copy environment file
cp .env.example .env
# Add your OPENAI_API_KEY to .env

# Start with Docker Compose
docker compose up
```

### API Endpoints

#### AI Query (Natural Language)

```bash
POST /api/ai/query
Content-Type: application/json

{
  "query": "What's the stock level for WIDGET-001?",
  "session_id": "demo-session"
}
```

#### REST API (Direct Access)

- `GET /api/inventory` - List all inventory
- `GET /api/inventory/:sku` - Get stock by SKU
- `POST /api/inventory/transfer` - Transfer stock between locations
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `GET /api/reports/low-stock` - Low stock alerts

#### WebSocket Chat

```
ws://localhost:8000/ws
```

## Model Configuration

Models are configured in `src/llm-models/modelConfig.json`:

```json
{
  "frontline": { "model": "gpt-5-chat-latest" },
  "orchestrator": { "model": "gpt-5" },
  "evaluator": { "model": "gpt-5" },
  "workers": {
    "erp": { "model": "gpt-5-mini" },
    "search": { "model": "gpt-5-mini" },
    "email": { "model": "gpt-5-mini" },
    "general": { "model": "gpt-5-mini" }
  }
}
```

## Project Structure

```
modules/agent/
├── src/
│   ├── llm-models/        # Centralized model configuration
│   ├── lib/               # Agent factory and utilities
│   ├── prompts/           # System prompts for each agent
│   ├── workers/           # Worker implementations
│   ├── mocks/
│   │   ├── controllers/   # REST API routes
│   │   ├── services/      # Business logic
│   │   ├── repositories/  # Data access
│   │   └── data/          # JSON data files
│   ├── frontline.ts       # Initial routing agent
│   ├── orchestrator.ts    # Worker coordination
│   ├── evaluator.ts       # Output validation
│   └── server.ts          # Express + WebSocket server
├── docs/                  # Architecture documentation
└── tests/                 # Test files
```

## Documentation

- `docs/mocks-architecture.md` - REST API architecture diagrams
- `docs/mocks-ai-rest-architecture.md` - AI REST endpoint flow
- `docs/mocks-chat-ai-architecture.md` - WebSocket chat flow
- `docs/mocks-business-context.md` - Business challenges addressed
- `docs/agent-control-flow.md` - Agent pipeline diagrams

## Example Queries

```
"What's the stock level for WIDGET-001?"
"Show me all pending orders"
"Transfer 10 units of GADGET-002 from WH-EAST to WH-WEST"
"Which items are below their reorder point?"
"Give me an order analytics summary"
"What is the demand forecast for WIDGET-001 for the next 30 days?"
"Which products are at risk of stockout? Show me recommendations"
"Analyze the seasonal demand patterns for SEASONAL-005"
```

## Testing

```bash
# Run tests
npm test

# Type check
npm run typecheck
```

## Postman Collection

Import `postman_collection.json` for pre-configured API requests including AI query examples.

## License

MIT
