# Mocks Architecture

## Control Flow Diagram

```mermaid
flowchart TD
    subgraph Controllers["Controllers (Express Routers)"]
        IC[inventoryController]
        OC[orderController]
        RC[reportController]
    end

    subgraph Services["Services (Business Logic)"]
        IS[inventoryService]
        OS[orderService]
    end

    subgraph Repositories["Repositories (Data Access)"]
        IR[inventoryRepo]
        OR[orderRepo]
        CR[customerRepo]
        PR[productRepo]
    end

    subgraph Data["JSON Data Files"]
        INV[(inventory.json)]
        ORD[(orders.json)]
        CUST[(customers.json)]
        PROD[(products.json)]
    end

    %% Controller to Service
    IC --> IS
    OC --> OS
    RC --> IS

    %% Service to Repository
    IS --> IR
    IS --> PR
    OS --> OR
    OS --> CR

    %% Repository to Data
    IR --> INV
    OR --> ORD
    CR --> CUST
    PR --> PROD
```

## API Endpoints

```mermaid
flowchart LR
    subgraph Inventory
        GET1[GET /api/inventory]
        GET2[GET /api/inventory/:sku]
        POST1[POST /api/inventory/transfer]
        GET3[GET /api/locations]
    end

    subgraph Orders
        GET4[GET /api/orders]
        GET5[GET /api/orders/summary]
        GET6[GET /api/orders/:id]
        POST2[POST /api/orders]
        PATCH1[PATCH /api/orders/:id/status]
        GET7[GET /api/customers]
    end

    subgraph Reports
        GET8[GET /api/reports/low-stock]
        GET9[GET /api/reports/dead-stock]
    end
```

## Inventory Flow Detail

```mermaid
sequenceDiagram
    participant Client
    participant IC as inventoryController
    participant IS as inventoryService
    participant IR as inventoryRepo
    participant PR as productRepo

    Client->>IC: GET /api/inventory/:sku
    IC->>IS: getStockBySku(sku)
    IS->>IR: findStockBySku(sku)
    IR-->>IS: StockItem[]
    IS-->>IC: {sku, total_on_hand, by_location}
    IC-->>Client: JSON response

    Client->>IC: POST /api/inventory/transfer
    IC->>IS: transferStock(sku, from, to, qty)
    IS->>IR: findStockItem(sku, from)
    IR-->>IS: StockItem
    IS->>IR: updateStockItem(sku, from, updates)
    IS->>IR: updateStockItem(sku, to, updates)
    IS-->>IC: {success, transfer}
    IC-->>Client: JSON response
```

## Order Flow Detail

```mermaid
sequenceDiagram
    participant Client
    participant OC as orderController
    participant OS as orderService
    participant OR as orderRepo
    participant CR as customerRepo

    Client->>OC: POST /api/orders
    OC->>OS: createOrder(customer_id, items)
    OS->>CR: findCustomerById(customer_id)
    CR-->>OS: Customer
    OS->>OR: getOrderCount()
    OR-->>OS: count
    OS->>OR: appendOrder(newOrder)
    OR-->>OS: Order
    OS-->>OC: Order
    OC-->>Client: JSON response

    Client->>OC: GET /api/orders/:id
    OC->>OS: getOrderDetail(order_id)
    OS->>OR: findOrderById(order_id)
    OR-->>OS: Order
    OS->>CR: findCustomerById(customer_id)
    CR-->>OS: Customer
    OS-->>OC: {order + customer details}
    OC-->>Client: JSON response
```

## File Structure

```
src/mocks/
├── data/
│   ├── customers.json
│   ├── inventory.json
│   ├── orders.json
│   └── products.json
├── controllers/
│   ├── inventoryController.ts  → /api/inventory, /api/locations
│   ├── orderController.ts      → /api/orders, /api/customers
│   └── reportController.ts     → /api/reports
├── services/
│   ├── inventoryService.ts     → stock operations, transfers, alerts
│   └── orderService.ts         → order CRUD, customer lookup
└── repositories/
    ├── customerRepo.ts         → Customer data access
    ├── inventoryRepo.ts        → Stock & Location data access
    ├── orderRepo.ts            → Order data access
    └── productRepo.ts          → Product data access
```
