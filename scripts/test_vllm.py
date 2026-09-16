#!/usr/bin/env python3
"""
scripts/test_vllm.py — Interactive chat with the local vLLM server.

Connects directly to the vLLM OpenAI-compatible endpoint (no RAG, no Qdrant).
Useful for testing the model, tuning the system prompt, and verifying the
server is up before running the full pipeline.

Usage (from project root, venv activated):
    python scripts/test_vllm.py                  # uses .env settings
    python scripts/test_vllm.py --model Qwen/... # override model
    python scripts/test_vllm.py --no-stream      # disable token streaming

Commands inside the chat:
    /help    — show this command list
    /clear   — reset conversation history
    /history — print the full conversation so far
    /model   — show active model and endpoint
    /exit    — quit  (Ctrl-D and Ctrl-C also work)
"""
from __future__ import annotations

import argparse
import os
import sys
import textwrap
from pathlib import Path


# ── Load .env from project root ──────────────────────────────────────────────
_ROOT = Path(__file__).resolve().parents[1]
_ENV_FILE = _ROOT / ".env"

try:
    from dotenv import load_dotenv
    load_dotenv(_ENV_FILE, override=False)
except ImportError:
    # Fall back to a minimal manual loader if python-dotenv is not installed
    if _ENV_FILE.exists():
        for _line in _ENV_FILE.read_text().splitlines():
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _, _v = _line.partition("=")
                os.environ.setdefault(_k.strip(), _v.strip())


# ── Defaults from env ─────────────────────────────────────────────────────────
_BASE_URL = os.getenv("settings.VLLM_BASE_URL", "http://127.0.0.1:8000/v1")
_API_KEY  = os.getenv("settings.VLLM_API_KEY",  "local-vllm")
_MODEL    = os.getenv("settings.VLLM_MODEL",    "Qwen/Qwen2.5-Coder-7B-Instruct-AWQ")
_PORT     = os.getenv("VLLM_PORT",     "8000")

_SYSTEM_PROMPT = (
    "You are a helpful sovereign AI assistant that runs entirely on local "
    "infrastructure. You are knowledgeable, concise, and accurate. "
    "If you are unsure, say so rather than guessing."
)

# ── ANSI colour helpers ───────────────────────────────────────────────────────
_USE_COLOUR = sys.stdout.isatty()

def _c(code: str, text: str) -> str:
    return f"\033[{code}m{text}\033[0m" if _USE_COLOUR else text

CYAN   = lambda t: _c("36",    t)
GREEN  = lambda t: _c("32",    t)
YELLOW = lambda t: _c("33",    t)
BOLD   = lambda t: _c("1",     t)
DIM    = lambda t: _c("2",     t)
RED    = lambda t: _c("31",    t)


# ── Argument parser ───────────────────────────────────────────────────────────
def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Interactive chat with the local vLLM server.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument("--base-url", default=_BASE_URL,
                   help=f"vLLM base URL (default: {_BASE_URL})")
    p.add_argument("--api-key",  default=_API_KEY,
                   help="API key (default: from settings.VLLM_API_KEY)")
    p.add_argument("--model",    default=_MODEL,
                   help=f"Model ID (default: {_MODEL})")
    p.add_argument("--system",   default=_SYSTEM_PROMPT,
                   help="System prompt (default: built-in)")
    p.add_argument("--temperature", type=float, default=0.7,
                   help="Sampling temperature (default: 0.7)")
    p.add_argument("--max-tokens", type=int, default=2048,
                   help="Max tokens per reply (default: 2048)")
    p.add_argument("--no-stream", action="store_true",
                   help="Disable streaming (wait for full reply)")
    return p.parse_args()


# ── Health check ──────────────────────────────────────────────────────────────
def _check_server(base_url: str) -> None:
    """Ping the vLLM health endpoint and abort early with a clear message."""
    import urllib.request
    import urllib.error

    health_url = base_url.rstrip("/v1").rstrip("/") + "/health"
    try:
        urllib.request.urlopen(health_url, timeout=5)
    except urllib.error.URLError as err:
        print(RED(f"\n✗  Cannot reach vLLM at {health_url}"))
        print(DIM(f"   {err}"))
        print(DIM(f"\n   Start vLLM first:  ./scripts/vllm_up.sh"))
        sys.exit(1)


# ── Chat helpers ──────────────────────────────────────────────────────────────
def _print_header(model: str, base_url: str, stream: bool) -> None:
    print()
    print(BOLD("─" * 60))
    print(BOLD("  SIH 2026 — vLLM Chat"))
    print(BOLD("─" * 60))
    print(DIM(f"  endpoint : {base_url}"))
    print(DIM(f"  model    : {model}"))
    print(DIM(f"  streaming: {'on' if stream else 'off'}"))
    print(DIM(f"  commands : /help  /clear  /history  /model  /exit"))
    print(BOLD("─" * 60))
    print()


def _print_help() -> None:
    print(DIM(textwrap.dedent("""\
        ┌──────────────────────────────────────────┐
        │  Commands                                │
        │  /help     show this message             │
        │  /clear    reset conversation history    │
        │  /history  print full conversation       │
        │  /model    show model and endpoint       │
        │  /exit     quit  (Ctrl-D / Ctrl-C)       │
        └──────────────────────────────────────────┘
    """)))


def _stream_reply(client, model: str, messages: list, temperature: float,
                  max_tokens: int) -> str:
    """Stream tokens as they arrive; return the full accumulated reply."""
    print(GREEN(BOLD("Assistant: ")), end="", flush=True)
    full = []
    stream = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            print(delta, end="", flush=True)
            full.append(delta)
    print()  # newline after stream ends
    return "".join(full)


def _blocking_reply(client, model: str, messages: list, temperature: float,
                    max_tokens: int) -> str:
    """Fetch a complete reply in one shot."""
    print(DIM("  (thinking…)"), end="\r", flush=True)
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=False,
    )
    reply = (response.choices[0].message.content or "").strip()
    print(f"\r{' ' * 16}\r", end="")          # clear the "thinking" line
    print(GREEN(BOLD("Assistant: ")) + reply)
    return reply


# ── Main REPL ─────────────────────────────────────────────────────────────────
def main() -> None:
    args = _parse_args()

    try:
        from openai import OpenAI
    except ImportError:
        print(RED("✗  openai package not installed."))
        print(DIM("   Run: uv pip install 'openai>=1.50'"))
        sys.exit(1)

    _check_server(args.base_url)

    client = OpenAI(base_url=args.base_url, api_key=args.api_key, timeout=120)
    messages: list[dict] = [{"role": "system", "content": args.system}]

    _print_header(args.model, args.base_url, not args.no_stream)

    while True:
        # ── Prompt ────────────────────────────────────────────────────────────
        try:
            user_input = input(CYAN(BOLD("You: "))).strip()
        except (EOFError, KeyboardInterrupt):
            print(DIM("\n  bye."))
            break

        if not user_input:
            continue

        # ── Built-in commands ─────────────────────────────────────────────────
        cmd = user_input.lower()
        if cmd in ("/exit", "/quit", "/q"):
            print(DIM("  bye."))
            break

        if cmd == "/help":
            _print_help()
            continue

        if cmd == "/clear":
            messages = [{"role": "system", "content": args.system}]
            print(DIM("  ✓ Conversation cleared."))
            continue

        if cmd == "/history":
            print()
            for msg in messages:
                role = msg["role"].capitalize()
                colour = CYAN if msg["role"] == "user" else GREEN
                print(colour(f"{role}: ") + DIM(msg["content"]))
            print()
            continue

        if cmd == "/model":
            print(DIM(f"  endpoint : {args.base_url}"))
            print(DIM(f"  model    : {args.model}"))
            continue

        # ── Send to vLLM ──────────────────────────────────────────────────────
        messages.append({"role": "user", "content": user_input})

        try:
            if args.no_stream:
                reply = _blocking_reply(
                    client, args.model, messages,
                    args.temperature, args.max_tokens,
                )
            else:
                reply = _stream_reply(
                    client, args.model, messages,
                    args.temperature, args.max_tokens,
                )
        except Exception as err:
            print(RED(f"\n  ✗ Error: {err}"))
            print(DIM("    (your last message was not added to history)"))
            messages.pop()          # don't pollute history with failed turn
            continue

        messages.append({"role": "assistant", "content": reply})
        print()


if __name__ == "__main__":
    main()
