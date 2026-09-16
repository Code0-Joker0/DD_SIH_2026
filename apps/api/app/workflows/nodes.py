import re
import json
import uuid
import logging
import asyncio
import aiohttp
import tiktoken
from typing import Literal

from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, SystemMessage, ToolMessage, HumanMessage
from langchain_core.messages import trim_messages

from app.core.config import settings
from app.workflows.state import AgentState
from app.models.llm.model_config import MODEL_REGISTRY
from app.workflows.tools import TOOLS
from app.core.model_manager import _ensure_model_running

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are the SIH Agent, a highly capable AI assistant that can execute Python code, "
    "search a vector knowledge base, and generate markdown documents.\n"
    "CRITICAL INSTRUCTIONS:\n"
    "1. ALWAYS RESPOND ENTIRELY IN ENGLISH, regardless of what model you are using.\n"
    "2. Only use tools when explicitly necessary to fulfill a request. "
    "If the user is saying hello, asking who you are, or making small talk, "
    "DO NOT use any tools. Just reply conversationally.\n"
    "3. BE CONCISE AND DIRECT in your final answers. Answer exactly what is asked without "
    "extraneous details, introductory fluff, or unnecessary elaboration.\n"
    "4. If the user provides file paths to images, you MUST use your vision tools "
    "(e.g., analyze_image, analyze_multiple_images, extract_visual_text, analyze_diagram, inspect_image) "
    "to read them from the filesystem. DO NOT ask the user to upload the images; "
    "the paths they provided are the images.\n"
    "5. When asked to compare, cross-reference, or analyze multiple images together, use 'analyze_multiple_images'.\n"
    "6. STRICTLY use 'extract_visual_text' with mode='paddle' for fine OCR tasks (e.g., reading nameplates, P&ID tags). General visual analysis is weak at fine OCR.\n"
    "7. Keep visual facts distinct from document interpretation before cross-referencing."
)

# Summarization fires when raw message history exceeds this count.
SUMMARIZE_THRESHOLD = 20

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _char_token_counter(messages: list) -> int:
    """Accurate token counting using tiktoken to prevent context overflows with JSON payloads."""
    enc = tiktoken.get_encoding("cl100k_base")
    total = 0
    for m in messages:
        content = m.content if isinstance(m.content, str) else str(m.content)
        total += len(enc.encode(content))
    return total


def _apply_system_prompt(messages: list) -> list:
    """Prepend the system prompt if the first message is not already a system message."""
    if messages and getattr(messages[0], "type", "") == "system":
        return messages
    return [SystemMessage(content=SYSTEM_PROMPT)] + messages


# ---------------------------------------------------------------------------
# route_task node
# ---------------------------------------------------------------------------

def route_task(state: AgentState) -> dict:
    """
    Keyword-driven model router. Explicit keywords always win.
    Falls back to the currently active model, or 'reasoning' on a fresh thread.
    """
    latest_msg = state["messages"][-1].content.lower() if state.get("messages") else ""

    if any(k in latest_msg for k in ["code", "python", "sandbox", "script", "plot", "program"]):
        return {"required_model": "coding"}
    elif any(k in latest_msg for k in ["reason", "think"]):
        return {"required_model": "reasoning"}

    current = state.get("required_model") or "reasoning"
    # Never route to VL directly as the main agent, since it lacks Hermes tool-use training.
    # The VL model is managed internally by vision_service.py when tools are called.
    if current == "vl":
        current = "reasoning"
        
    return {"required_model": current}


# ---------------------------------------------------------------------------
# manage_context node
# ---------------------------------------------------------------------------

async def manage_context(state: AgentState) -> dict:
    """
    Runs before run_agent every turn.
    1. If history > SUMMARIZE_THRESHOLD messages: summarize older half, keep recent 6 verbatim.
    2. Always trim to the model's token budget using trim_messages.
    Stores the trimmed slice in _trimmed_messages to avoid double-work in the tools loop.
    """
    required_model = state.get("required_model", "reasoning")
    model_spec = MODEL_REGISTRY.get(required_model, MODEL_REGISTRY["reasoning"])

    raw_messages = list(state.get("messages", []))
    context_summary = state.get("context_summary", "") or ""

    # -- Step 1: Summarization --
    if _char_token_counter(raw_messages) > model_spec.max_context_tokens * 0.65:
        keep_recent = 6
        to_summarize = raw_messages[:-keep_recent]
        recent = raw_messages[-keep_recent:]

        # Ensure the model is running before we attempt to summarize, preventing Connection Errors
        await _ensure_model_running(required_model)

        summarizer_llm = ChatOpenAI(
            base_url=settings.VLLM_BASE_URL,
            api_key=settings.VLLM_API_KEY,
            model=model_spec.served_name,
            temperature=0.0,
            max_tokens=512,
        )
        summary_prompt = [
            SystemMessage(content=(
                "You are a concise summarizer. Summarize the following conversation history "
                "into 3-5 bullet points, preserving any important facts, constraints, or "
                "decisions the user stated. Be brief."
            )),
            HumanMessage(content="\n\n".join(
                f"[{m.type.upper()}]: {m.content}"
                for m in to_summarize
                if isinstance(m.content, str)
            )),
        ]
        try:
            summary_response = await summarizer_llm.ainvoke(summary_prompt)
            new_summary = summary_response.content.strip()
            context_summary = (
                f"{context_summary}\n\n[Later summary]:\n{new_summary}"
                if context_summary else new_summary
            )
            raw_messages = recent
        except Exception as e:
            logging.warning(f"Summarization failed, falling back to trimming only: {e}")

    # -- Step 2: Token-aware trimming --
    with_system = _apply_system_prompt(raw_messages)

    if context_summary:
        summary_msg = SystemMessage(content=f"[Conversation Summary so far]:\n{context_summary}")
        with_system = [with_system[0], summary_msg] + with_system[1:]

    trimmed = trim_messages(
        with_system,
        max_tokens=model_spec.max_context_tokens,
        token_counter=_char_token_counter,
        strategy="last",
        allow_partial=False,
        include_system=True,
        start_on="human",
    )

    return {
        "context_summary": context_summary,
        "_trimmed_messages": trimmed,
    }


# ---------------------------------------------------------------------------
# run_agent node
# ---------------------------------------------------------------------------

async def run_agent(state: AgentState) -> dict:
    """
    Ensures the required model is loaded (live vLLM endpoint is the source of truth),
    then invokes the LLM with the trimmed message list from manage_context.
    """
    required_model = state.get("required_model", "reasoning")
    model_spec = MODEL_REGISTRY.get(required_model, MODEL_REGISTRY["reasoning"])

    # Ensure the model is running (this is a no-op if manage_context already booted it)
    await _ensure_model_running(required_model)

    loaded_model = model_spec.served_name

    # Use the pre-trimmed slice from manage_context when available.
    # Falls back to inline trimming when called from the tools loop (manage_context
    # only runs at the start of each user turn, not between tool call iterations).
    messages = state.get("_trimmed_messages")
    if not messages:
        raw = list(state.get("messages", []))
        with_system = _apply_system_prompt(raw)
        messages = trim_messages(
            with_system,
            max_tokens=model_spec.max_context_tokens,
            token_counter=_char_token_counter,
            strategy="last",
            allow_partial=False,
            include_system=True,
            start_on="human",
        )

    llm = ChatOpenAI(
        base_url=settings.VLLM_BASE_URL,
        api_key=settings.VLLM_API_KEY,
        model=model_spec.served_name,
        temperature=0.0,
    )
    llm_with_tools = llm.bind_tools(TOOLS)
    response = await llm_with_tools.ainvoke(messages)

    # Fallback: catch XML / markdown-JSON tool calls from models that bypass vLLM's parser
    if isinstance(response, AIMessage) and not response.tool_calls and isinstance(response.content, str):
        match = re.search(
            r'<(?:response|tool_call|tools)>\s*(.*?)\s*</(?:response|tool_call|tools)>',
            response.content, re.DOTALL
        )
        if not match:
            match = re.search(
                r'```json\s*(\{.*?"name"\s*:.*?"arguments"\s*:.*?})\s*```',
                response.content, re.DOTALL
            )
        if match:
            raw_json = match.group(1).strip()
            raw_json = re.sub(r'\},?\s*"arguments":', r', "arguments":', raw_json)
            open_b = raw_json.count("{")
            close_b = raw_json.count("}")
            if open_b > close_b:
                raw_json += "}" * (open_b - close_b)
            try:
                tool_data = json.loads(raw_json)
                if "name" in tool_data and "arguments" in tool_data:
                    logging.warning(f"Using XML fallback parser for tool call: {tool_data['name']}")
                    response.tool_calls = [{
                        "name": tool_data["name"],
                        "args": tool_data["arguments"],
                        "id": f"call_{uuid.uuid4().hex[:8]}",
                        "type": "tool_call",
                    }]
            except json.JSONDecodeError:
                pass

    # Clear _trimmed_messages so it doesn't pollute the tools-loop iterations
    return {"messages": [response], "loaded_model": loaded_model, "_trimmed_messages": None}


# ---------------------------------------------------------------------------
# should_continue edge
# ---------------------------------------------------------------------------

def should_continue(state: AgentState) -> Literal["tools", "END"]:
    """Routes to tools if the agent emitted a tool call, otherwise ends."""
    last_message = state["messages"][-1]
    if isinstance(last_message, AIMessage) and last_message.tool_calls:
        return "tools"
    return "END"
