# ERP Mocks: Business Context

## Overview

The mocks simulate a lightweight ERP (Enterprise Resource Planning) system for a distribution company managing inventory across multiple warehouse locations. They provide realistic test data and business logic for demonstrating AI agent capabilities in enterprise scenarios.

---

## Business Challenges Addressed

### 1. Multi-Location Inventory Visibility

**Challenge:** Companies with multiple warehouses struggle to get a unified view of stock levels. The same product exists in different quantities across locations, making it hard to answer simple questions like "Do we have enough widgets to fulfill this order?"

**Solution:** The inventory service aggregates stock data across all locations for any SKU, showing:
- Total on-hand quantity across all warehouses
- Total available (on-hand minus reserved)
- Breakdown by location

This lets an AI agent answer questions like "How much of WIDGET-001 do we have?" with a complete picture, not just one warehouse's view.

---

### 2. Stockout Prevention

**Challenge:** Running out of stock means lost sales, unhappy customers, and expedited shipping costs to fix the problem. Companies need early warning when items are running low.

**Solution:** The low stock alert system compares available quantity against reorder points at each location. It identifies:
- Which SKUs are below threshold
- Which specific locations need replenishment
- How far below the threshold they are

An AI agent can proactively warn: "GADGET-002 is below reorder point at WH-WEST. Only 8 units available, threshold is 15."

---

### 3. Dead Stock / Carrying Cost

**Challenge:** Inventory that sits without selling ties up cash and incurs storage costs. Companies often don't realize they have thousands of dollars sitting in products that haven't moved in months.

**Solution:** The dead stock report identifies items with no movement beyond a threshold (default 90 days) and calculates estimated carrying cost using a 25% annual rate. This surfaces:
- Which items haven't moved
- How long they've been sitting
- The financial impact of holding them

An AI agent can report: "You have $2,340 in carrying costs from dead stock. The top item is WIDGET-003 at WH-EAST with no movement for 145 days."

---

### 4. Inter-Warehouse Balancing

**Challenge:** Stock imbalances between locations lead to stockouts in one warehouse while another has excess. Manual transfers are slow and error-prone.

**Solution:** The transfer function moves stock between locations with validation:
- Checks if source location has the item
- Verifies sufficient available quantity (not reserved)
- Updates both locations atomically
- Records the movement date

An AI agent can execute: "Transfer 50 units of GADGET-002 from WH-EAST to WH-WEST" and confirm success or explain why it failed.

---

### 5. Order Lifecycle Management

**Challenge:** Orders move through multiple stages (pending → processing → shipped → delivered). Tracking status, knowing what's stuck, and updating correctly requires careful coordination.

**Solution:** The order service manages the complete lifecycle:
- Creates orders with automatic ID generation and total calculation
- Validates status transitions against allowed values
- Automatically timestamps when orders ship
- Provides summary analytics by status

An AI agent can answer: "How many orders are stuck in processing?" or execute "Ship order ORD-10003."

---

### 6. Customer Context in Orders

**Challenge:** Order data alone doesn't tell you where to ship or who to contact. You need customer information joined with order details.

**Solution:** The order detail endpoint enriches orders with customer data:
- Customer name
- Email address
- Shipping address

An AI agent can provide: "Order ORD-10001 is for Acme Corp, shipping to 123 Main St, contact john@acme.com."

---

### 7. Business Analytics

**Challenge:** Managers need quick answers about overall business health without running complex reports.

**Solution:** The order summary provides instant analytics:
- Count of orders by status
- Total number of orders
- Total revenue value

An AI agent can report: "You have 47 orders totaling $12,450. 12 are pending, 8 are processing, 27 are shipped."

---

## Why Mocks Instead of Real ERP?

1. **Demo without dependencies** - No need to set up SAP, Oracle, or NetSuite
2. **Predictable data** - Same test scenarios every time
3. **Fast iteration** - Change business logic without vendor constraints
4. **Safe experimentation** - AI agents can't accidentally modify production data
5. **Clear patterns** - Controller-service-repository is easy to understand and extend

---

## Typical AI Agent Interactions

The mocks enable natural language queries like:

- "What's our inventory situation for WIDGET-001?"
- "Show me items that need reordering"
- "Find dead stock costing us money"
- "Move 20 units of GADGET-002 from East to Central warehouse"
- "Create an order for customer CUST-001 with 50 widgets"
- "What's the status of order ORD-10003?"
- "How many orders are pending?"
- "Ship order ORD-10005"

Each of these maps to one or more API calls that the agent can discover and execute.
