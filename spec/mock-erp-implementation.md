# Mock ERP Implementation Plan

## Overview

Mock ERP implementation to demonstrate inventory optimization, order management, and reporting capabilities during interview scenarios. Provides REST API endpoints that can be called to show problem-solving and solution architecture skills.

---

## Architecture

### Mock Data (`mocks/data/`)

- `inventory.json` - Stock levels across warehouses, SKUs, locations
- `orders.json` - Orders with statuses (quote → order → ship → invoice)
- `products.json` - Products with tags, categories, barcodes
- `customers.json` - Customers with tags, billing/shipping addresses

### Service Layer (`mocks/services/`)

- `inventory_service.py` - Stock queries, transfers, reorder calculations
- `order_service.py` - Order lifecycle, status transitions

### REST API (`modules/agent/src/agent/server.py`)

Added alongside existing WebSocket endpoint.

---

## API Endpoints

### Inventory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory` | List stock levels (optional `?location=` filter) |
| GET | `/api/inventory/{sku}` | Stock by SKU across all locations |
| POST | `/api/inventory/transfer` | Transfer stock between locations |
| GET | `/api/locations` | List warehouse locations |

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | List orders (optional `?status=` and `?customer_id=` filters) |
| GET | `/api/orders/summary` | Order counts by status and total value |
| GET | `/api/orders/{id}` | Order detail with items and customer info |
| POST | `/api/orders` | Create new order |
| PATCH | `/api/orders/{id}/status` | Update order status |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/low-stock` | SKUs below reorder point by location |
| GET | `/api/reports/dead-stock` | Inventory with no movement (default 90 days) |

### Customers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List all customers |

---

## Interview Demo Scenarios

### Scenario 1: Dead Stock Analysis
**Customer Problem**: "We're losing money on inventory that's just sitting there"

```bash
curl http://localhost:8000/api/reports/dead-stock?days=90
```

Shows: LEGACY-004 and SEASONAL-005 with days since movement and estimated carrying cost.

### Scenario 2: Reorder Alerts
**Customer Problem**: "We keep running out of stock at certain locations"

```bash
curl http://localhost:8000/api/reports/low-stock
```

Shows: SKUs below reorder point with specific locations flagged.

### Scenario 3: Stock Transfer
**Customer Problem**: "I have excess in one warehouse but shortage in another"

```bash
curl -X POST http://localhost:8000/api/inventory/transfer \
  -H "Content-Type: application/json" \
  -d '{"sku": "GADGET-002", "from_location": "WH-EAST", "to_location": "WH-CENTRAL", "qty": 10}'
```

### Scenario 4: Order Lifecycle
**Customer Problem**: "I need visibility into where my orders are in the process"

```bash
curl http://localhost:8000/api/orders/summary
curl http://localhost:8000/api/orders?status=pending
```

---

## Data Model Notes

### Inventory
- Tracks `qty_on_hand` and `qty_reserved` separately
- `reorder_point` per SKU per location
- `last_movement` date for dead stock analysis

### Orders
- Status flow: `quote` → `pending` → `processing` → `shipped` → `invoiced`
- Can also be `cancelled`
- Items include location for multi-warehouse fulfillment

### Products
- Tags for filtering (e.g., "high-velocity", "discontinued", "seasonal")
- Barcode field (CODE128 compatible)

### Customers
- Tier tags for pricing/terms
- Credit limit and current balance
- Separate billing/shipping addresses

---

## Running the API

```bash
cd /home/hubenschmidt/erp-use-cases/modules/agent
uvicorn agent.server:app --reload --port 8000
```

API docs available at: `http://localhost:8000/docs`
