# Feature: Refactor Agent to OpenAI Agents SDK

## Overview

Refactor the `modules/agent` module from LangGraph to OpenAI Agents SDK, removing all LangGraph dependencies and the observability stack (langfuse, langfuse-worker, clickhouse, minio, redis). Simplify infrastructure while preserving postgres for future application use and maintaining WebSocket compatibility with the React frontend.

## User Story

As a developer, I want to use OpenAI Agents SDK as the core AI backend so that I have a simpler, more maintainable foundation for building agentic AI features.

---

## Scenarios

### Scenario 1: Basic Chat Conversation with Streaming

**Given** the agent service is running and connected to OpenAI
**When** a user sends a message via WebSocket
**Then** the agent streams tokens back using `on_chat_model_stream` events and completes with `on_chat_model_end`

### Scenario 2: Multi-turn Conversation with Memory

**Given** a conversation has existing message history
**When** the user sends a follow-up message
**Then** the agent maintains context from previous turns and responds appropriately

### Scenario 3: Docker Deployment

**Given** a developer runs `docker-compose up`
**When** the services start
**Then** only `agent`, `client`, and `postgres` services are running (no langfuse stack)

### Scenario 4: Frontend Compatibility

**Given** the React frontend connects to `ws://localhost:8000/ws`
**When** messages are exchanged
**Then** the existing WebSocket protocol works without frontend changes

---

## Verification Checklist

### Functional Requirements

- [ ] Agent responds to chat messages with streaming tokens
- [ ] WebSocket protocol unchanged (`on_chat_model_stream`, `on_chat_model_end`)
- [ ] Multi-turn conversation memory works within a session
- [ ] OpenAI API key configuration via environment variable
- [ ] Docker compose starts successfully with simplified services

### Non-Functional Requirements

- [ ] Performance: First token response < 2s
- [ ] Security: No hardcoded API keys; environment variable only
- [ ] Maintainability: No LangGraph/Langfuse imports remain in codebase

### Edge Cases

- [ ] Handles missing OpenAI API key gracefully
- [ ] Handles WebSocket disconnection mid-stream
- [ ] Handles empty message input

---

## Implementation Notes

### Estimate of Scope

Medium - Primary work is creating `runner.py` (replacing `graph.py`) and cleaning up docker/dependencies

### Files to Modify

**Core Agent Refactor:**
- `modules/agent/src/agent/graph.py` → `modules/agent/src/agent/runner.py` - Rename and rewrite: replace LangGraph StateGraph with OpenAI Agents SDK Runner, maintain WebSocket streaming interface
- `modules/agent/pyproject.toml` - Remove `langgraph`, `langfuse`, `langgraph-cli`; add `openai-agents`
- `modules/agent/src/agent/__init__.py` - Update imports from `runner` instead of `graph`
- `modules/agent/start.sh` - Replace `uv run langgraph dev` with `uv run uvicorn`

**Infrastructure Cleanup:**
- `docker-compose.yml` - Remove services: langfuse (lines 42-79), langfuse-worker (lines 81-124), clickhouse (lines 126-162), minio (lines 164-184), redis (lines 186-208)
- `modules/agent/Dockerfile` - Update CMD to uvicorn, remove port 2024 exposure
- `.env.example` - Remove all langfuse-related variables, keep only OPENAI_API_KEY and POSTGRES connection
- `modules/agent/.env.example` - Remove LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_HOST

**Delete:**
- `modules/agent/langgraph.json` - No longer needed

**Optional:**
- `modules/agent/tests/unit_tests/test_configuration.py` - Remove langgraph.pregel import
- `modules/agent/tests/integration_tests/test_graph.py` → `test_runner.py` - Rename and update for new agent structure
- `README.md` - Update setup instructions
- `modules/agent/README.md` - Update module documentation

### Dependencies

**Add:**
- `openai-agents` (OpenAI Agents SDK)

**Remove:**
- `langgraph>=1.0,<2`
- `langfuse>=3,<4`
- `langgraph-cli[inmem]>=0.4.4,<1`

**Keep:**
- `openai>=2.6.0,<3`
- `fastapi>=0.119.1,<1`
- `uvicorn>=0.38,<1`
- `websockets>=15,<16`
- `python-dotenv>=1.0,<2`

### WebSocket Protocol (Preserve)

Frontend expects these events:
```json
// Outgoing (from client)
{ "uuid": "session-id", "init": true }
{ "uuid": "session-id", "message": "user text" }

// Incoming (to client)
{ "event": "on_chat_model_stream", "data": "token" }
{ "event": "on_chat_model_end", "data": "" }
{ "event": "custom", "data": "notification" }
```

### Out of Scope

- Re-implementing observability (will be done later)
- Adding agent tools/function calling
- Database schema design for application data
- Authentication/authorization
- Production deployment configuration
