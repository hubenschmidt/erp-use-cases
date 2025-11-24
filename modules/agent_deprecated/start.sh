#!/usr/bin/env bash
set -euo pipefail

# Start FastAPI websocket server with hot-reload
exec uv run python -m uvicorn agent.server:app \
  --host 0.0.0.0 \
  --port 8000 \
  --reload \
  --reload-delay 0.5 \
  --log-level warning
