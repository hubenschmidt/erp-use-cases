# Agent Control Flow

## High-Level Architecture

```mermaid
flowchart TD
    subgraph Client
        WS[WebSocket Client]
    end

    subgraph Server["server.ts"]
        WSS[WebSocket Server]
        API[Express API]
    end

    subgraph Core["Core Agent Flow"]
        R[runner.ts]
        F[frontline.ts]
        O[orchestrator.ts]
        E[evaluator.ts]
    end

    subgraph Workers["workers/"]
        WR[Worker Registry]
        SW[searchWorker]
        EW[emailWorker]
        GW[generalWorker]
    end

    subgraph External["External Services"]
        OAI[OpenAI API]
        SERP[SerpAPI]
        SG[SendGrid]
    end

    WS <-->|JSON messages| WSS
    WSS --> R
    R --> F
    F -->|route_to_orchestrator: true| O
    F -->|route_to_orchestrator: false| R
    O --> WR
    WR --> SW
    WR --> EW
    WR --> GW
    O <--> E

    F --> OAI
    O --> OAI
    E --> OAI
    SW --> OAI
    EW --> OAI
    GW --> OAI

    SW --> SERP
    EW --> SG
```

## WebSocket Message Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant S as server.ts
    participant R as runner.ts
    participant F as frontline.ts
    participant O as orchestrator.ts

    C->>S: {"init": true, "uuid": "user-123"}
    S-->>C: (logged, no response)

    C->>S: {"uuid": "user-123", "message": "hello"}
    S->>R: handleChat(ws, message, uuid)
    R->>F: process(userInput, history)
    F-->>R: [false, "Hi! How can I help?"]
    R-->>S: send stream + end
    S-->>C: {"on_chat_model_stream": "Hi! How can I help?"}
    S-->>C: {"on_chat_model_end": true}

    C->>S: {"uuid": "user-123", "message": "search for AI news"}
    S->>R: handleChat(ws, message, uuid)
    R->>F: process(userInput, history)
    F-->>R: [true, "Web search needed"]
    R->>O: process(userInput, history)
    Note over O: Orchestrator-Worker-Evaluator loop
    O-->>R: "Here are the latest AI news..."
    R-->>S: send stream + end
    S-->>C: {"on_chat_model_stream": "..."}
    S-->>C: {"on_chat_model_end": true}
```

## Orchestrator-Worker-Evaluator Loop

```mermaid
flowchart TD
    START([User Request]) --> ROUTE[Route to Worker]
    ROUTE --> DECISION{Worker Type}

    DECISION -->|SEARCH| SW[Search Worker]
    DECISION -->|EMAIL| EW[Email Worker]
    DECISION -->|GENERAL| GW[General Worker]
    DECISION -->|NONE| ERROR[Return Error]

    SW --> EVAL[Evaluator]
    EW --> EVAL
    GW --> EVAL

    EVAL --> CHECK{Passed?}
    CHECK -->|Yes| DONE([Return Output])
    CHECK -->|No| RETRY{Attempts < 3?}
    RETRY -->|Yes| FEEDBACK[Add Feedback]
    FEEDBACK --> SW
    FEEDBACK --> EW
    FEEDBACK --> GW
    RETRY -->|No| PARTIAL([Return Partial Result])
```

## Detailed Orchestrator Flow

```mermaid
sequenceDiagram
    participant O as orchestrator.ts
    participant A as Agent (OpenAI)
    participant W as Worker
    participant E as evaluator.ts

    O->>A: Route request (get OrchestratorDecision)
    A-->>O: {worker_type, task_description, parameters, success_criteria}

    loop Max 3 attempts
        O->>W: execute(task, params, feedback?)
        W-->>O: WorkerResult {success, output, error}

        alt Worker Failed
            O-->>O: Return error
        else Worker Succeeded
            O->>E: evaluate(output, task, criteria)
            E-->>O: EvaluatorResult {passed, score, feedback}

            alt Passed
                O-->>O: Return output
            else Failed & attempts remaining
                O->>O: Set feedback for retry
            else Failed & max attempts
                O-->>O: Return partial result with note
            end
        end
    end
```

## Frontline Decision Flow

```mermaid
flowchart TD
    INPUT[User Input] --> AGENT[Frontline Agent]
    AGENT --> PARSE[Parse JSON Response]

    PARSE --> CHECK{route_to_orchestrator?}
    CHECK -->|true| ROUTE[Return: route=true, reason]
    CHECK -->|false| DIRECT[Return: route=false, response]

    ROUTE --> ORCHESTRATOR[→ Orchestrator]
    DIRECT --> WEBSOCKET[→ WebSocket Response]

    subgraph "Route to Orchestrator"
        R1[Web search requests]
        R2[Email sending]
        R3[Current data needs]
    end

    subgraph "Handle Directly"
        D1[Greetings]
        D2[Simple questions]
        D3[Conversation]
    end
```

## Worker Implementations

```mermaid
flowchart LR
    subgraph searchWorker
        S1[Get query from params]
        S2[Call SerpAPI]
        S3[Format results]
        S4[Agent synthesizes response]
        S1 --> S2 --> S3 --> S4
    end

    subgraph emailWorker
        E1[Extract to/subject/body]
        E2[Agent composes email]
        E3[Send via SendGrid]
        E4[Return confirmation]
        E1 --> E2 --> E3 --> E4
    end

    subgraph generalWorker
        G1[Get task description]
        G2[Agent generates response]
        G1 --> G2
    end
```

## Data Models

```mermaid
classDiagram
    class OrchestratorDecision {
        +WorkerType worker_type
        +string task_description
        +Record parameters
        +string success_criteria
    }

    class EvaluatorResult {
        +boolean passed
        +number score
        +string feedback
        +string suggestions
    }

    class WorkerResult {
        +boolean success
        +string output
        +string? error
    }

    class Message {
        +role: user|assistant|system
        +string content
    }

    OrchestratorDecision --> WorkerResult : produces
    WorkerResult --> EvaluatorResult : evaluated by
```

## File Dependencies

```mermaid
flowchart BT
    index[index.ts] --> server
    server[server.ts] --> runner
    runner[runner.ts] --> frontline
    runner --> orchestrator
    frontline[frontline.ts] --> agent
    orchestrator[orchestrator.ts] --> agent
    orchestrator --> evaluator
    orchestrator --> workers
    evaluator[evaluator.ts] --> agent
    workers[workers/index.ts] --> searchWorker
    workers --> emailWorker
    workers --> generalWorker
    searchWorker[searchWorker.ts] --> agent
    emailWorker[emailWorker.ts] --> agent
    generalWorker[generalWorker.ts] --> agent
    agent[lib/agent.ts] --> models
    models[models.ts]
```
