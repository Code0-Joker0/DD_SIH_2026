# vLLM + Qdrant Operations Guide (Linux)
### Reproducible setup, customizable storage paths, on/off resource management

> **Current implementation status:** the FastAPI health, document chunking, and
> `/rag/query` endpoints are implemented. The BGE-M3, Qdrant, reranking, context,
> prompt, and local vLLM path is runnable. Agent orchestration and frontend
> modules remain outside this vertical slice.

## Local RAG pipeline

The implemented vertical path is:

`BGE-M3 -> Qdrant -> bge-reranker-v2-m3 -> grounded prompt -> local vLLM -> sources`

On the local RTX 5070 profile, vLLM uses the GPU and BGE-M3/reranking use CPU
to avoid exhausting the 12 GiB card. Runtime data is stored under
`/home/ved/.cache/sih_2026`; no `/data` directory or sudo is required.

Install the missing document parser in the existing virtual environment:

```bash
source apps/api/.venv/bin/activate
uv pip install --constraint constraints.txt python-docx
```

Start required services:

```bash
set -a; source .env; set +a
./scripts/qdrant_up.sh
./scripts/vllm_up.sh
```

Verify the local model and Qdrant:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/v1/models
curl http://127.0.0.1:6333/collections/sih_documents
```

Create or verify the collection without replacing existing data, then ingest
TXT, PDF, or DOCX files:

```bash
PYTHONPATH=apps/api python scripts/create_collection.py
PYTHONPATH=apps/api python scripts/ingest_documents.py data/raw
```

Run the API:

```bash
PYTHONPATH=apps/api uvicorn app.main:app --host 127.0.0.1 --port 8080
```

Query it from another terminal:

```bash
curl -X POST http://127.0.0.1:8080/rag/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"Which embedding model does this system use?"}'
```

Run tests:

```bash
PYTHONPATH=apps/api pytest -q apps/api/tests
PYTHONPATH=apps/api RUN_REAL_RAG=1 \
  RAG_TEST_QUERY='Which embedding model and vector database does this architecture use?' \
  pytest -q apps/api/tests/test_real_rag.py -s
```

Configuration is read from `.env`: `VLLM_BASE_URL`, `VLLM_MODEL`,
`VLLM_API_KEY`, `BGE_M3_MODEL`, `RERANKER_MODEL`, `BGE_DEVICE`,
`RERANKER_DEVICE`, `QDRANT_COLLECTION`, and `RERANK_MIN_SCORE`. Keep `.env`
untracked and never place real credentials in committed files.

The local profile uses `BGE_DEVICE=cpu` and `RERANKER_DEVICE=cpu` because the
RTX 5070 is reserved for vLLM. The A100 profile sets both values to `cuda`, so
embedding and reranking run on the A100. Verify after selecting it:

```bash
ln -sfn .env.server .env
set -a; source .env; set +a
source apps/api/.venv/bin/activate
python -c "import torch; print(torch.cuda.get_device_name(0), torch.cuda.is_available())"
python -c "from app.core.config import EMBEDDING_DEVICE, RERANKER_DEVICE; print(EMBEDDING_DEVICE, RERANKER_DEVICE)"
```

**Target environment:** Linux throughout — no PowerShell, no Windows paths.
This folds in the Phase 1 RAG pipeline (previously PowerShell-only) so
there's one document that works end to end, whether that's your local dev
GPU right now or the A100 server later.

**Python version: 3.11 throughout** (dev machine and A100 both), matching
your original working log and your Phase 1 README's own pin.

**Your situation, stated plainly:** you're proving the full pipeline on a
small local GPU with a 7B model first, because that's fast to iterate on.
Moving to the A100 later should be a config change, not a re-learning
exercise — same scripts, same `.env` pattern, different values.

**How this version is organized differently:** rather than a "known issues"
section bolted on at the end, the three things that previously showed up as
warnings — `deep_gemm`'s `CUDA_HOME` error, the mixed `cu12`/`cu13`
packages, and the dev-GPU-vs-A100 split — are handled at the exact step
where they'd otherwise occur. Follow the guide in order and none of them
should appear at all.

---

## 1. Prerequisites (Linux)

```bash
# NVIDIA driver + max supported CUDA version
nvidia-smi

# uv
uv --version || curl -LsSf https://astral.sh/uv/install.sh | sh

# Docker Engine + Compose plugin (not Docker Desktop — this is a server/Linux box)
docker --version || {
  sudo apt update
  sudo apt install -y docker.io docker-compose-plugin
  sudo usermod -aG docker "$USER"
  # log out and back in for the group change to take effect
}
docker compose version   # note the space, not `docker-compose` — that's the old standalone binary

# git
git --version
```

---

## 2. `.env` — set up both machine profiles now, including the deep_gemm fix

This is the one file that changes between machines. `VLLM_USE_DEEP_GEMM=0`
is in it from the start: `deep_gemm` is vLLM's optional fast-kernel module
for FP8 block-quantized GEMM (the kind of kernel DeepSeek-style models use)
— nothing in your stack (AWQ-quantized Qwen models, PaddleOCR, BGE) touches
that code path, so there's no reason to let vLLM attempt the import in the
first place. Setting this before vLLM ever runs means the `CUDA_HOME`
`AssertionError` never appears — there's nothing to fix afterward.

```bash
# .env.dev  — your current local GPU (~12GB card, 7B model)
DATA_ROOT=/data/sih26117
HF_HOME=${DATA_ROOT}/hf_cache
QDRANT_STORAGE=${DATA_ROOT}/qdrant_storage
LOG_DIR=${DATA_ROOT}/logs

QDRANT_PORT=6333
QDRANT_GRPC_PORT=6334
QDRANT_CONTAINER_NAME=sih-qdrant

VLLM_MODEL=Qwen/Qwen2.5-Coder-7B-Instruct-AWQ
VLLM_PORT=8000
VLLM_GPU_MEM_UTIL=0.85
VLLM_MAX_MODEL_LEN=8192
VLLM_QUANTIZATION=awq
VLLM_USE_DEEP_GEMM=0
```

```bash
# .env.server — A100 80GB
DATA_ROOT=/data/sih26117
HF_HOME=${DATA_ROOT}/hf_cache
QDRANT_STORAGE=${DATA_ROOT}/qdrant_storage
LOG_DIR=${DATA_ROOT}/logs

QDRANT_PORT=6333
QDRANT_GRPC_PORT=6334
QDRANT_CONTAINER_NAME=sih-qdrant

VLLM_MODEL=Qwen/Qwen3-Coder-30B-A3B-Instruct
VLLM_PORT=8000
VLLM_GPU_MEM_UTIL=0.85
VLLM_MAX_MODEL_LEN=32768
VLLM_QUANTIZATION=awq
VLLM_USE_DEEP_GEMM=0
```

This is also the dev-GPU-vs-A100 fix: the *only* differences between the
two files are the model name and max context length. Every script from
here on sources whichever file is symlinked as `.env`:

```bash
ln -sf .env.dev .env       # while developing locally
# later, on the A100:
ln -sf .env.server .env
```

Load it now and keep it loaded for the rest of this session:
```bash
set -a; source .env; set +a
mkdir -p "$HF_HOME" "$QDRANT_STORAGE" "$LOG_DIR"
```

---

## 3. `constraints.txt` — create this before your first `uv pip install`

vLLM's precompiled CUDA kernels — including the Marlin AWQ kernel you'll
see in use once the model loads (`Using MarlinLinearKernel for
AutoAWQMarlinLinearMethod`) and flash-attention — are linked against
`libcudart.so.12`, even though vLLM 0.28's headline wheel targets CUDA 13.
That means `nvidia-cuda-runtime-cu12` and a few neighbors are genuine
runtime dependencies that will sit alongside the `cu13`-line packages in
your `uv pip list` — that's correct, not a mistake to clean up later. The
only real risk is a *future* install silently resolving them away. Pin them
now, before that can happen:

```bash
cat > constraints.txt << 'EOF'
nvidia-cuda-runtime-cu12>=12.4
nvidia-cublas-cu12>=12.4
nvidia-cudnn-cu12>=9.1
EOF
```

Use `--constraint constraints.txt` on every `uv pip install` from this
point on (the venv creation below is the first one) — it costs nothing when
there's no conflict, and prevents a later package from downgrading or
dropping something vLLM's compiled kernels need.

---

## 4. Create the venv and install — with `nvcc` made available up front

```bash
git clone <YOUR_REPOSITORY_URL>
cd SIH-26117/apps/api

uv venv --python 3.11 --seed
source .venv/bin/activate
```

vLLM 0.28 officially supports Python 3.10–3.14, so 3.11 is fully within
range and matches what your working log and Phase 1 README already use —
one Python version across both machines means `uv.lock` resolves
identically on each.

One venv, not two — your Phase 1 RAG dependencies (`qdrant-client`,
`sentence-transformers`) and vLLM both end up in the same FastAPI backend
process eventually, so they share an environment from the start.

```bash
uv pip install --constraint ../../constraints.txt qdrant-client sentence-transformers numpy python-dotenv pypdf
uv pip install --constraint ../../constraints.txt vllm --torch-backend=auto
```

`--torch-backend=auto` inspects your installed driver and picks the
matching PyTorch/CUDA build automatically. Both `sentence-transformers` and
`vllm` pull in `torch` transitively; resolving it once here, together,
avoids ending up with two different torch builds in the same venv.

**Make `nvcc` discoverable now, in case you add an FP8 model later** (this
is the other half of the `deep_gemm` fix — you've already disabled the
speculative import in step 2, so this step is optional, but it's one line
and means the capability is there if you need it rather than something to
debug under time pressure mid-hackathon):

```bash
export PATH="$(python -c 'import nvidia.cuda_nvcc, os; print(os.path.join(nvidia.cuda_nvcc.__path__[0], "bin"))'):$PATH"
```
Add this line to your shell's activation, e.g. append it to
`.venv/bin/activate`, so it's set every time you activate this venv rather
than something to remember by hand. The `nvidia-cuda-nvcc` pip package
already installed provides a real `nvcc` — no full CUDA Toolkit install
needed.

**Verify the install before writing anything else — this is where you
confirm the cu12/cu13 fix actually took, immediately, not as an
afterthought:**

```bash
python -c "import torch; print(torch.__version__, torch.version.cuda, torch.cuda.is_available())"
python -c "import vllm; print(vllm.__version__)"

# no missing shared libraries in vLLM's compiled kernels
VLLM_DIR="$(python -c 'import vllm, os; print(os.path.dirname(vllm.__file__))')"
find "$VLLM_DIR" -name "*.so" -exec ldd {} \; 2>/dev/null | grep "not found" \
  && echo "MISSING LIBS ABOVE — reinstall nvidia-cuda-runtime-cu12" \
  || echo "clean — no missing shared libraries"
```

If this prints "clean," the cu12/cu13 mix is exactly as it should be and
you never need to think about it again unless this check changes after a
future install (in which case: `uv pip install --constraint constraints.txt nvidia-cuda-runtime-cu12`).

---

## 5. Qdrant — bind-mounted storage, Linux Docker Compose

`infrastructure/docker/docker-compose.yml`:
```yaml
services:
  qdrant:
    image: qdrant/qdrant:latest
    container_name: ${QDRANT_CONTAINER_NAME:-sih-qdrant}
    restart: unless-stopped
    ports:
      - "127.0.0.1:${QDRANT_PORT:-6333}:6333"
      - "127.0.0.1:${QDRANT_GRPC_PORT:-6334}:6334"
    volumes:
      - ${QDRANT_STORAGE}:/qdrant/storage
```

The bind mount (a real path from `.env`) replaces a Docker-managed named
volume, so you can `du -sh`, back up, or move `$QDRANT_STORAGE` directly on
either machine.

---

## 6. Phase 1 RAG pipeline — ported from PowerShell to bash

```bash
# from SIH_2026/ (project root), venv already activated
python scripts/create_collection.py

export PYTHONPATH=apps/api
python scripts/ingest_documents.py
```

The ingestion script is currently a placeholder. The implemented API smoke
checks are available with `PYTHONPATH=apps/api pytest -q apps/api/tests`.

Start the implemented FastAPI slice with:
```bash
PYTHONPATH=apps/api uvicorn app.main:app --host 127.0.0.1 --port 8080
```
Then check `curl http://localhost:8080/health`.

---

## 7. vLLM as a standalone server

```bash
vllm serve "$VLLM_MODEL" \
  --quantization "$VLLM_QUANTIZATION" \
  --trust-remote-code \
  --max-model-len "$VLLM_MAX_MODEL_LEN" \
  --gpu-memory-utilization "$VLLM_GPU_MEM_UTIL" \
  --port "$VLLM_PORT" \
  --download-dir "$HF_HOME"
```

`VLLM_USE_DEEP_GEMM=0` is already exported from `.env`, so this starts
clean — no warning to see. Your FastAPI backend talks to this over HTTP
(`base_url=http://localhost:8000/v1` via the `openai` client) rather than
importing `vllm` directly.

---

## 8. Start/stop scripts

**`scripts/qdrant_up.sh`**
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
mkdir -p "$QDRANT_STORAGE"
docker compose -f infrastructure/docker/docker-compose.yml up -d
echo "Qdrant up on port $QDRANT_PORT, storage at $QDRANT_STORAGE"
```

**`scripts/qdrant_down.sh`**
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
docker compose -f infrastructure/docker/docker-compose.yml down
echo "Qdrant stopped (data preserved at $QDRANT_STORAGE)"
```

**`scripts/vllm_up.sh`**
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
mkdir -p "$LOG_DIR" "$HF_HOME"

nohup vllm serve "$VLLM_MODEL" \
  --quantization "$VLLM_QUANTIZATION" \
  --trust-remote-code \
  --max-model-len "$VLLM_MAX_MODEL_LEN" \
  --gpu-memory-utilization "$VLLM_GPU_MEM_UTIL" \
  --port "$VLLM_PORT" \
  --download-dir "$HF_HOME" \
  > "$LOG_DIR/vllm.log" 2>&1 &

echo $! > "$LOG_DIR/vllm.pid"
echo "vLLM starting (PID $(cat "$LOG_DIR/vllm.pid")) — logs at $LOG_DIR/vllm.log"

echo -n "Waiting for health check"
until curl -sf "http://localhost:${VLLM_PORT}/health" > /dev/null 2>&1; do
  echo -n "."
  sleep 2
done
echo " — vLLM is up on port $VLLM_PORT"
```

**`scripts/vllm_down.sh`**
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
PIDFILE="$LOG_DIR/vllm.pid"

if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE")
  kill "$PID" 2>/dev/null || echo "process $PID already stopped"
  rm -f "$PIDFILE"
  echo "vLLM stopped — GPU memory released."
else
  echo "No PID file at $PIDFILE — is vLLM running under this script?"
fi
```

**`scripts/dev.sh`**
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

case "${1:-}" in
  up)
    ./scripts/qdrant_up.sh
    ./scripts/vllm_up.sh
    ;;
  down)
    ./scripts/vllm_down.sh    # free the GPU first
    ./scripts/qdrant_down.sh
    ;;
  status)
    docker ps --filter "name=${QDRANT_CONTAINER_NAME:-sih-qdrant}"
    curl -sf "http://localhost:${VLLM_PORT}/health" >/dev/null 2>&1 \
      && echo "vLLM: healthy on port $VLLM_PORT" \
      || echo "vLLM: not running"
    ;;
  *)
    echo "usage: $0 {up|down|status}"
    exit 1
    ;;
esac
```

```bash
chmod +x scripts/*.sh
```

---

## 9. Full checklist for a fresh clone (new machine, or the A100 later)

Everything above, in the order you'd actually run it:

```bash
git clone <YOUR_REPOSITORY_URL>
cd SIH-26117

ln -sf .env.dev .env            # or .env.server on the A100
set -a; source .env; set +a
mkdir -p "$HF_HOME" "$QDRANT_STORAGE" "$LOG_DIR"

cd apps/api
uv venv --python 3.11 --seed
source .venv/bin/activate
export PATH="$(python -c 'import nvidia.cuda_nvcc, os; print(os.path.join(nvidia.cuda_nvcc.__path__[0], "bin"))'):$PATH"

uv pip install --constraint ../../constraints.txt qdrant-client sentence-transformers numpy python-dotenv pypdf
uv pip install --constraint ../../constraints.txt vllm --torch-backend=auto

# verify — should all come back clean, nothing to fix
python -c "import torch, vllm, qdrant_client, sentence_transformers; print('imports OK')"
VLLM_DIR="$(python -c 'import vllm, os; print(os.path.dirname(vllm.__file__))')"
find "$VLLM_DIR" -name "*.so" -exec ldd {} \; 2>/dev/null | grep "not found" || echo "clean — no missing shared libraries"

cd ../..
chmod +x scripts/*.sh
./scripts/dev.sh up
./scripts/dev.sh status
curl -s http://localhost:${QDRANT_PORT}/collections
curl -s http://localhost:${VLLM_PORT}/v1/models
```

---

## 10. `.gitignore`

```gitignore
.env
.env.dev
.env.server
scripts/*.pid
/data/
*.log
.venv/
__pycache__/
*.pyc
```

Keep `.env.example` and `constraints.txt` committed as templates; keep the
real `.env.dev` / `.env.server` untracked.

---

## Quick reference

```bash
# one-time, per machine
ln -sf .env.dev .env            # or .env.server on the A100
chmod +x scripts/*.sh
mkdir -p "$DATA_ROOT"

# every session
./scripts/dev.sh up
./scripts/dev.sh status
# ... work ...
./scripts/dev.sh down
```