# AI Architecture

## Overview

The AI endpoint allows natural language queries to interact with the ERP system through an agent pipeline.

## Control Flow Diagram

```mermaid
flowchart TD
    subgraph REST["REST API"]
        AI[aiController<br/>POST /api/ai/query]
    end

    subgraph Agent["Agent Pipeline"]
        FL[Frontline Agent]
        OR[Orchestrator Agent]
        EV[Evaluator Agent]
    end

    subgraph Workers["Specialized Workers"]
        ERP[ERP Worker]
        SEARCH[Search Worker]
        EMAIL[Email Worker]
        GEN[General Worker]
    end

    subgraph Services["ERP Services"]
        IS[inventoryService]
        OS[orderService]
    end

    %% REST to Agent
    AI --> FL

    %% Frontline routing
    FL -->|simple query| Response
    FL -->|complex query| OR

    %% Orchestrator to Workers
    OR --> ERP
    OR --> SEARCH
    OR --> EMAIL
    OR --> GEN

    %% Worker to Evaluator
    ERP --> EV
    SEARCH --> EV
    EMAIL --> EV
    GEN --> EV

    %% ERP Worker to Services
    ERP --> IS
    ERP --> OS

    %% Evaluator feedback loop
    EV -->|passed| Response
    EV -->|failed| OR

    Response[JSON Response]
```

## Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant AC as aiController
    participant FL as Frontline
    participant OR as Orchestrator
    participant ERP as ERP Worker
    participant IS as inventoryService
    participant EV as Evaluator

    Client->>AC: POST /api/ai/query<br/>{"query": "What's the stock for WIDGET-001?"}
    AC->>FL: frontlineProcess(query, conversation)
    FL->>FL: Determine if routing needed
    FL-->>AC: [true, "needs orchestrator"]

    AC->>OR: orchestratorProcess(query, conversation)
    OR->>OR: Analyze intent, select worker
    OR->>ERP: executeErp(task, params)

    ERP->>ERP: Parse task, determine operation
    ERP->>IS: getStockBySku("WIDGET-001")
    IS-->>ERP: StockItem data
    ERP-->>OR: WorkerResult

    OR->>EV: evaluate(result, criteria)
    EV->>EV: Check completeness, accuracy
    EV-->>OR: {passed: true, score: 95}

    OR-->>AC: Formatted response
    AC->>AC: parseResponse(response)
    AC-->>Client: {success, message, data}
```

## ERP Worker Operations

```mermaid
flowchart LR
    subgraph Operations
        GS[GET_STOCK]
        GLS[GET_LOW_STOCK]
        GDS[GET_DEAD_STOCK]
        TS[TRANSFER_STOCK]
        GL[GET_LOCATIONS]
        GO[GET_ORDERS]
        GOD[GET_ORDER_DETAIL]
        CO[CREATE_ORDER]
        UOS[UPDATE_ORDER_STATUS]
        GOS[GET_ORDER_SUMMARY]
        GC[GET_CUSTOMERS]
    end

    subgraph Services
        IS[inventoryService]
        OS[orderService]
    end

    GS --> IS
    GLS --> IS
    GDS --> IS
    TS --> IS
    GL --> IS
    GO --> OS
    GOD --> OS
    CO --> OS
    UOS --> OS
    GOS --> OS
    GC --> OS
```

## Response Format

```mermaid
flowchart TD
    subgraph Input
        RAW[Raw Agent Response<br/>"Explanation...\n\nResult:\n{json}"]
    end

    subgraph Processing
        PARSE[parseResponse]
    end

    subgraph Output
        MSG[message: string]
        DATA[data: object]
    end

    RAW --> PARSE
    PARSE --> MSG
    PARSE --> DATA
```

## API Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/query` | Process natural language query |
| DELETE | `/api/ai/session/:id` | Clear session history |

### Request Body

```json
{
  "query": "What items are below reorder point?",
  "session_id": "optional-session-id"
}
```

### Response Body

```json
{
  "success": true,
  "message": "Fetching items below their reorder threshold",
  "data": [
    {
      "sku": "WIDGET-001",
      "location": "WH-WEST",
      "qty_on_hand": 30,
      "reorder_point": 50
    }
  ],
  "session_id": "demo-session",
  "routed_to_orchestrator": true
}
```

## File Structure

```
src/
├── mocks/controllers/
│   └── aiController.ts        → POST /api/ai/query, DELETE /api/ai/session
├── frontline.ts               → Initial routing decision
├── orchestrator.ts            → Worker selection and coordination
├── evaluator.ts               → Output validation
├── workers/
│   ├── index.ts               → Worker registry
│   ├── erpWorker.ts           → ERP operations (imports services directly)
│   ├── searchWorker.ts        → Web search
│   ├── emailWorker.ts         → Email composition
│   └── generalWorker.ts       → General conversation
└── prompts/
    ├── frontline.ts           → Frontline system prompt
    ├── orchestrator.ts        → Orchestrator system prompt
    ├── evaluator.ts           → Evaluator system prompt
    └── workers/
        └── erp.ts             → ERP worker system prompt
```
