# Chat AI Architecture

## Overview

The WebSocket chat interface allows real-time conversational interaction with the ERP system through an agent pipeline.

## Control Flow Diagram

```mermaid
flowchart TD
    subgraph WebSocket["WebSocket Server"]
        WS[WebSocket Connection<br/>ws://localhost:8000/ws]
        RUNNER[runner.ts<br/>handleChat]
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

    %% WebSocket to Runner
    WS --> RUNNER
    RUNNER --> FL

    %% Frontline routing
    FL -->|simple query| Stream
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
    EV -->|passed| Stream
    EV -->|failed| OR

    Stream[Stream Response<br/>on_chat_model_stream]
```

## WebSocket Message Flow

```mermaid
sequenceDiagram
    participant Client
    participant WS as WebSocket Server
    participant R as runner.ts
    participant FL as Frontline
    participant OR as Orchestrator
    participant ERP as ERP Worker
    participant IS as inventoryService
    participant EV as Evaluator

    Client->>WS: Connect to /ws
    Client->>WS: {init: true, uuid: "user-123"}
    WS-->>Client: Connection established

    Client->>WS: {uuid: "user-123", message: "Show low stock items"}
    WS->>R: handleChat(ws, message, uuid)

    R->>FL: frontlineProcess(input, conversation)
    FL->>FL: Determine if routing needed
    FL-->>R: [true, "needs orchestrator"]

    R->>Client: {on_chat_model_stream: "Processing..."}

    R->>OR: orchestratorProcess(input, conversation)
    OR->>OR: Analyze intent, select worker
    OR->>ERP: executeErp(task, params)

    ERP->>ERP: Parse task, determine operation
    ERP->>IS: getLowStockAlerts()
    IS-->>ERP: LowStockItem[]
    ERP-->>OR: WorkerResult

    OR->>EV: evaluate(result, criteria)
    EV-->>OR: {passed: true, score: 90}

    OR-->>R: Formatted response

    R->>Client: {on_chat_model_stream: "response text"}
    R->>Client: {on_chat_model_end: true}
```

## Conversation Management

```mermaid
flowchart TD
    subgraph Sessions["Conversation Sessions"]
        MAP[conversations Map<br/>uuid → Message[]]
    end

    subgraph Message["Message Structure"]
        ROLE[role: user/assistant]
        CONTENT[content: string]
    end

    subgraph Flow["Conversation Flow"]
        IN[User message in]
        PUSH1[Push to history]
        PROCESS[Process through agents]
        PUSH2[Push response to history]
        OUT[Stream response out]
    end

    IN --> PUSH1
    PUSH1 --> MAP
    MAP --> PROCESS
    PROCESS --> PUSH2
    PUSH2 --> MAP
    PUSH2 --> OUT
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

## WebSocket Protocol

### Connection

```
ws://localhost:8000/ws
```

### Initialize Session

```json
{
  "init": true,
  "uuid": "user-123"
}
```

### Send Message

```json
{
  "uuid": "user-123",
  "message": "What's the stock for WIDGET-001?"
}
```

### Receive Stream

```json
{"on_chat_model_stream": "Processing your request..."}
{"on_chat_model_stream": "\n\n"}
{"on_chat_model_stream": "Looking up stock levels...\n\nResult:\n{...}"}
{"on_chat_model_end": true}
```

## File Structure

```
src/
├── server.ts                  → Express + WebSocket server setup
├── runner.ts                  → handleChat, conversation management
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

## Comparison: Chat vs REST

| Feature | Chat (WebSocket) | REST API |
|---------|------------------|----------|
| Entry Point | `ws://localhost:8000/ws` | `POST /api/ai/query` |
| Handler | `runner.ts` → `handleChat` | `aiController.ts` |
| Response | Streaming (`on_chat_model_stream`) | JSON (`{message, data}`) |
| Session | `conversations` Map by UUID | `sessions` Map by session_id |
| Use Case | Interactive chatbot UI | Programmatic API integration |
