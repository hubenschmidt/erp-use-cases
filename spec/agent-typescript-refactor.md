# TypeScript Agent Refactor Plan

## Overview

Refactor `modules/agent` from Python to TypeScript using Express + ws and the official OpenAI SDK.

**Target:** `modules/agent-ts/`

---

## Phase 1: Project Setup

1. Initialize `modules/agent-ts/` with `package.json`, `tsconfig.json`, `eslint.config.js`
2. Install dependencies:
   - `openai`, `express`, `ws`, `zod`, `dotenv`
   - `@sendgrid/mail`, `serpapi`
   - Dev: `typescript`, `vitest`, `eslint`, `@types/*`
3. Set up directory structure mirroring Python module

---

## Phase 2: Core Types & Models

**File:** `src/models.ts`

- Define `WorkerType` enum: `SEARCH`, `EMAIL`, `GENERAL`, `NONE`
- Define Zod schemas:
  - `OrchestratorDecision` - worker_type, task_description, parameters, success_criteria
  - `EvaluatorResult` - passed, score, feedback, suggestions
  - `WorkerResult` - success, output, error
  - `EmailParams` - to, subject, body
  - `SearchParams` - query, num_results

---

## Phase 3: Agent Abstraction

**File:** `src/lib/agent.ts`

- Create lightweight agent factory wrapping OpenAI SDK (functional, no classes)
- Implement `run()` pattern for structured output parsing
- Handle streaming responses via OpenAI chat completions

```typescript
interface AgentConfig {
  name: string;
  instructions: string;
  model: string;
  outputSchema?: ZodSchema;
}

// Factory function pattern - no classes
const createAgent = (config: AgentConfig) => ({
  run: async (input: string): Promise<AgentOutput> => { ... }
})
```

---

## Phase 4: Prompts Migration

**Files:** `src/prompts/` (7 files)

| Python File | TypeScript File |
|-------------|-----------------|
| `prompts/frontline.py` | `prompts/frontline.ts` |
| `prompts/orchestrator.py` | `prompts/orchestrator.ts` |
| `prompts/evaluator.py` | `prompts/evaluator.ts` |
| `prompts/workers/search.py` | `prompts/workers/search.ts` |
| `prompts/workers/email.py` | `prompts/workers/email.ts` |
| `prompts/workers/general.py` | `prompts/workers/general.ts` |

Direct port of system prompts as exported constants.

---

## Phase 5: Core Agent Logic

| Python File | TypeScript File | Key Functions |
|-------------|-----------------|---------------|
| `frontline.py` | `src/frontline.ts` | `process()` - Request classifier |
| `orchestrator.py` | `src/orchestrator.ts` | `process()`, `_route()`, `_executeWithEvaluation()` |
| `evaluator.py` | `src/evaluator.ts` | `evaluate()` - Quality evaluator |
| `runner.py` | `src/runner.ts` | `handleChat()` - WebSocket handler + conversation store |

---

## Phase 6: Workers

**Files:** `src/workers/`

| Python File | TypeScript File | Description |
|-------------|-----------------|-------------|
| `workers/__init__.py` | `workers/index.ts` | Worker registry/dispatcher |
| `workers/search_worker.py` | `workers/searchWorker.ts` | SerpAPI integration |
| `workers/email_worker.py` | `workers/emailWorker.ts` | SendGrid integration |
| `workers/general_worker.py` | `workers/generalWorker.ts` | Generic task handler |

**Worker Function Type (functional, no classes):**
```typescript
type WorkerFn = (
  taskDescription: string,
  parameters: Record<string, unknown>,
  feedback?: string
) => Promise<WorkerResult>

// Registry as Map<WorkerType, WorkerFn>
const workerRegistry = new Map<WorkerType, WorkerFn>([
  [WorkerType.SEARCH, executeSearch],
  [WorkerType.EMAIL, executeEmail],
  [WorkerType.GENERAL, executeGeneral],
])
```

---

## Phase 7: Mocks (ERP Integration)

**Files:** `src/mocks/`

### Controllers (Express Routers)
- `controllers/inventoryController.ts`
- `controllers/orderController.ts`
- `controllers/reportController.ts`

### Services
- `services/inventoryService.ts`
- `services/orderService.ts`

### Repositories
- `repositories/customerRepo.ts`
- `repositories/inventoryRepo.ts`
- `repositories/orderRepo.ts`
- `repositories/productRepo.ts`

---

## Phase 8: Server & Integration

| Python File | TypeScript File | Description |
|-------------|-----------------|-------------|
| `server.py` | `src/server.ts` | Express app + WebSocket upgrade |
| `logging_config.py` | `src/loggingConfig.ts` | Structured logging |
| `__init__.py` | `src/index.ts` | Entry point |

**WebSocket Protocol (unchanged):**
- Receives: `{"init": bool, "uuid": string, "message": string | array}`
- Sends: `{"on_chat_model_stream": string}`, `{"on_chat_model_end": true}`

---

## Phase 9: Tests

**Files:** `tests/`

- Port integration and unit tests using Vitest
- `tests/setup.ts` - Test fixtures (equivalent to conftest.py)
- `tests/integration/` - End-to-end agent flow tests
- `tests/unit/` - Component tests

---

## Environment Variables

Same as Python implementation:
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (defaults: gpt-5-chat-latest for frontline/orchestrator, gpt-4o-mini for workers/evaluator)
- `SERPAPI_KEY`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`

---

## File Count Summary

| Category | Files |
|----------|-------|
| Core Flow | 5 |
| Workers | 4 |
| Data Models | 1 |
| Prompts | 7 |
| Infrastructure | 3 |
| Mocks | 9 |
| Tests | 3+ |
| **Total** | **~32 files** |

---

## Dependencies

```json
{
  "dependencies": {
    "openai": "^4.x",
    "express": "^4.x",
    "ws": "^8.x",
    "zod": "^3.x",
    "dotenv": "^16.x",
    "@sendgrid/mail": "^8.x",
    "serpapi": "^2.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vitest": "^1.x",
    "eslint": "^9.x",
    "@types/express": "^4.x",
    "@types/ws": "^8.x",
    "@types/node": "^20.x"
  }
}
```

---

## Migration Notes

1. **Pydantic → Zod**: Use Zod for runtime validation and type inference
2. **async/await**: Direct port, TypeScript has native async support
3. **Type annotations**: Leverage TypeScript's static typing throughout
4. **Conversation store**: Use `Map<string, Message[]>` instead of Python dict
5. **Error handling**: Use typed errors and Result pattern where appropriate
6. **Functional style**: Use factory functions over classes, pure functions where possible
7. **Guard clauses**: Use early returns, avoid `else`/`switch`/nested conditionals
8. **No break/continue**: Refactor loops with `.map()`, `.filter()`, `.reduce()` or early returns
