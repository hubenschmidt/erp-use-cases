# runner.py — OpenAI Agents SDK + WebSocket streaming
# Replaces the LangGraph-based graph.py with a simpler runner pattern.
# Maintains the same WebSocket protocol for frontend compatibility.

import os
import json
import logging
from typing import Dict, List

from dotenv import load_dotenv
from fastapi import WebSocket
from agents import Agent, Runner
from agents.items import TResponseInputItem
from agents.stream_events import RawResponsesStreamEvent

# -----------------------------------------------------------------------------
# Setup
# -----------------------------------------------------------------------------
logger = logging.getLogger("app.runner")
load_dotenv(override=True)

API_KEY = os.getenv("OPENAI_API_KEY")
if not API_KEY:
    logger.warning("OPENAI_API_KEY is missing. Agent will not function until configured.")

MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-5-chat-latest")
SYSTEM_PROMPT = os.getenv(
    "SYSTEM_PROMPT",
    "You are a helpful assistant. Your goal is to give contemplative, yet concise answers.",
)

# -----------------------------------------------------------------------------
# In-memory conversation storage (keyed by user_uuid)
# -----------------------------------------------------------------------------
_conversations: Dict[str, List[TResponseInputItem]] = {}


def get_conversation(user_uuid: str) -> List[TResponseInputItem]:
    """Get or create conversation history for a user."""
    if user_uuid not in _conversations:
        _conversations[user_uuid] = []
    return _conversations[user_uuid]


# -----------------------------------------------------------------------------
# Agent setup
# -----------------------------------------------------------------------------
def create_agent() -> Agent:
    """Create a simple chat agent with the configured model and prompt."""
    return Agent(
        name="ChatAgent",
        instructions=SYSTEM_PROMPT,
        model=MODEL_NAME,
    )


def _extract_user_input(data: str | List[Dict[str, str]]) -> str:
    """Extract user input from message data."""
    if not isinstance(data, list):
        return str(data)
    user_messages = [m for m in data if m.get("role") == "user"]
    if not user_messages:
        return ""
    return user_messages[-1]["content"]


def _extract_token(event) -> str | None:
    """Extract text delta token from stream event."""
    if not isinstance(event, RawResponsesStreamEvent):
        return None
    if event.data.type != "response.output_text.delta":
        return None
    return event.data.delta or None


# -----------------------------------------------------------------------------
# WebSocket entrypoint (called by server.py)
# -----------------------------------------------------------------------------
async def handle_chat(
    websocket: WebSocket, data: str | List[Dict[str, str]], user_uuid: str
):
    """
    Main entry point called by server.py.
    Streams tokens back to the frontend via WebSocket.

    Args:
        websocket: FastAPI WebSocket connection
        data: User message (string) or list of messages
        user_uuid: Conversation identifier for memory
    """
    if not API_KEY:
        logger.warning("handle_chat called without API_KEY configured")
        error_msg = "OPENAI_API_KEY is not configured. Please set it in your environment."
        await websocket.send_text(json.dumps({"on_chat_model_stream": error_msg}))
        await websocket.send_text(json.dumps({"on_chat_model_end": True}))
        return

    user_input = _extract_user_input(data)
    if not user_input:
        logger.warning("Empty user input, skipping")
        return

    logger.info(f"Processing message: {user_input[:50]}")

    agent = create_agent()
    conversation = get_conversation(user_uuid)
    conversation.append({"role": "user", "content": user_input})

    pieces: List[str] = []

    try:
        logger.info("Starting Runner.run_streamed")
        result = Runner.run_streamed(
            agent,
            input=conversation,
        )
        logger.info("Streaming events...")

        async for event in result.stream_events():
            token = _extract_token(event)
            if token:
                pieces.append(token)
                await websocket.send_text(
                    json.dumps({"on_chat_model_stream": token})
                )

        await websocket.send_text(json.dumps({"on_chat_model_end": True}))

        full_response = "".join(pieces)
        conversation.append({"role": "assistant", "content": full_response})

    except Exception as e:
        logger.exception(f"Agent run failed: {e}")
        error_msg = "Sorry—there was an error generating the response."
        await websocket.send_text(
            json.dumps({"on_chat_model_stream": error_msg})
        )
        await websocket.send_text(json.dumps({"on_chat_model_end": True}))
        conversation.append({"role": "assistant", "content": error_msg})
