#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
if [[ "$EUID" -eq 0 ]]; then
  echo "Do not run vllm_up.sh with sudo; activate Docker access for your user instead." >&2
  exit 1
fi

VLLM_BIN="${VLLM_BIN:-$PWD/apps/api/.venv/bin/vllm}"
if [[ ! -x "$VLLM_BIN" ]]; then
  echo "vLLM executable not found at $VLLM_BIN; activate or create apps/api/.venv first." >&2
  exit 1
fi
export PATH="$PWD/apps/api/.venv/bin:$PATH"

CUDA_ROOT="${CUDA_HOME:-$PWD/apps/api/.venv/lib/python3.11/site-packages/nvidia/cu13}"
if [[ -x "$CUDA_ROOT/bin/nvcc" ]]; then
  export CUDA_HOME="$CUDA_ROOT"
  export PATH="$CUDA_HOME/bin:$PATH"
  export LD_LIBRARY_PATH="$CUDA_HOME/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
  if [[ ! -e "$CUDA_HOME/lib64" ]]; then
    ln -s "$CUDA_HOME/lib" "$CUDA_HOME/lib64"
  fi
  if [[ ! -e "$CUDA_HOME/lib/libcudart.so" && -e "$CUDA_HOME/lib/libcudart.so.13" ]]; then
    ln -s "$CUDA_HOME/lib/libcudart.so.13" "$CUDA_HOME/lib/libcudart.so"
  fi
  nvcc_flags="-DCCCL_DISABLE_CTK_COMPATIBILITY_CHECK"
  if [[ -x /usr/bin/g++-15 ]]; then
    export NVCC_CCBIN=/usr/bin/g++-15
    echo "Using GCC 15 for CUDA compilation."
  else
    gcc_major="$(gcc -dumpversion | cut -d. -f1)"
  fi
  if [[ -z "${NVCC_CCBIN:-}" ]] && [[ "$gcc_major" =~ ^[0-9]+$ ]] && (( gcc_major > 15 )); then
    echo "GCC $gcc_major is newer than CUDA 13.3's supported range; allowing nvcc to continue." >&2
    nvcc_flags+=" -allow-unsupported-compiler"
  fi
  export NVCC_PREPEND_FLAGS="${NVCC_PREPEND_FLAGS:+$NVCC_PREPEND_FLAGS }$nvcc_flags"
else
  echo "CUDA compiler not found at $CUDA_ROOT/bin/nvcc; FlashInfer JIT compilation may fail." >&2
fi

mkdir -p "$LOG_DIR" "$HF_HOME"
: > "$LOG_DIR/vllm.log"

# Allow overriding the model from the first argument (used for hot-swapping)
TARGET_MODEL="${1:-${VLLM_MODEL}}"

# Select the correct tool-call parser for the model being served.
if echo "$TARGET_MODEL" | grep -qi "qwen3.*coder\|coder.*qwen3"; then
  TOOL_CALL_PARSER="qwen3_coder"
else
  TOOL_CALL_PARSER="hermes"
fi
echo "Using tool-call parser: $TOOL_CALL_PARSER for model: $TARGET_MODEL"

# Dynamically adjust memory utilization and context length for the heavier VL model
if echo "$TARGET_MODEL" | grep -qi "VL"; then
  VLLM_GPU_MEM_UTIL="0.95"
  VLLM_MAX_MODEL_LEN="12288"
  echo "Detected VL model: Automatically adjusting GPU Mem Util to $VLLM_GPU_MEM_UTIL and Max Context to $VLLM_MAX_MODEL_LEN"
fi

nohup "$VLLM_BIN" serve "$TARGET_MODEL" \
  --host "${VLLM_HOST:-127.0.0.1}" \
  --quantization "$VLLM_QUANTIZATION" \
  --gpu-memory-utilization "$VLLM_GPU_MEM_UTIL" \
  --trust-remote-code \
  --max-model-len "$VLLM_MAX_MODEL_LEN" \
  --enable-auto-tool-choice \
  --tool-call-parser "$TOOL_CALL_PARSER" \
  --port "$VLLM_PORT" \
  --download-dir "$HF_HOME" \
  > "$LOG_DIR/vllm.log" 2>&1 &

echo $! > "$LOG_DIR/vllm.pid"
echo "vLLM starting (PID $(cat "$LOG_DIR/vllm.pid")) - logs at $LOG_DIR/vllm.log"

cleanup_on_interrupt() {
  echo ""
  echo "Startup interrupted; stopping vLLM." >&2
  ./scripts/vllm_down.sh
  exit 130
}
trap cleanup_on_interrupt INT TERM

echo -n "Waiting for health check"
deadline=$((SECONDS + ${VLLM_STARTUP_TIMEOUT:-300}))
while ! curl -sf "http://127.0.0.1:${VLLM_PORT}/health" > /dev/null 2>&1; do
  if ! kill -0 "$(cat "$LOG_DIR/vllm.pid")" 2>/dev/null; then
    echo ""
    echo "vLLM exited before becoming healthy; see $LOG_DIR/vllm.log" >&2
    rm -f "$LOG_DIR/vllm.pid"
    exit 1
  fi
  if (( SECONDS >= deadline )); then
    echo ""
    echo "vLLM did not become healthy within ${VLLM_STARTUP_TIMEOUT:-300}s; see $LOG_DIR/vllm.log" >&2
    exit 1
  fi
  echo -n "."
  sleep 2
done
trap - INT TERM
echo " - vLLM is up on port $VLLM_PORT"

# Verify the model that's actually running matches what we asked for.
RUNNING_MODEL=$(curl -sf "http://127.0.0.1:${VLLM_PORT}/v1/models" -H "Authorization: Bearer ${VLLM_API_KEY:-local-vllm}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['id'])" 2>/dev/null || echo "")
if [[ -n "$RUNNING_MODEL" && "$RUNNING_MODEL" != "$TARGET_MODEL" ]]; then
  echo "" >&2
  echo "ERROR: vLLM health check passed but serving '$RUNNING_MODEL', expected '$TARGET_MODEL'." >&2
  echo "       A stale vLLM process is still occupying port $VLLM_PORT." >&2
  echo "       Run ./scripts/vllm_down.sh and retry." >&2
  exit 1
fi

# If --daemon was passed as the second argument, exit now and leave it in background.
if [[ "${2:-}" == "--daemon" ]]; then
  echo "vLLM is running in daemon mode. Exiting startup script."
  exit 0
fi

# Block so the script doesn't exit and kill the background process
wait "$(cat "$LOG_DIR/vllm.pid")"
