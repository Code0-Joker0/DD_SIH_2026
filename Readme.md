# Sovereign AI Agentic Workbench — SIH 2026

A sovereign, self-hosted agentic RAG workbench. The system runs **entirely on local/private infrastructure** — no third-party APIs, no data leaving your machines.

**Architecture overview:**

```
User Query
  │
  ▼
FastAPI  ──►  LangGraph Planner
                    │
          ┌─────────┴──────────┐
          ▼                    ▼
   Retrieval Agent       Analysis Agent
   (BGE-M3 + Qdrant)    (context QA)
          │                    │
          ▼                    ▼
   Reranker (BGE)       Validation Agent
   bge-reranker-v2-m3         │
          │                    ▼
          └────────► Generation Agent
                         (vLLM)
                              │
                              ▼
                       Grounded Answer + Sources
```

**Current implementation status:**
- ✅ RAG pipeline: BGE-M3 → Qdrant → reranker → grounded prompt → vLLM → sources
- ✅ FastAPI: `/health`, `/documents/chunks`, `/rag/query`
- ✅ Document ingestion: TXT, PDF, DOCX
- ✅ `scripts/setup_qdrant.py`, `scripts/create_indexes.py`, `scripts/ingest_documents.py`
- 🔧 LangGraph agent orchestration — scaffolded, implementation in progress
- 🔧 Frontend — scaffolded

---

## Repository layout

```
SIH_2026/
├── apps/
│   ├── api/                    # FastAPI backend
│   │   ├── app/
│   │   │   ├── agents/         # LangGraph agent nodes (planner, router, specialists)
│   │   │   ├── api/routes/     # HTTP endpoints (chat, documents, health)
│   │   │   ├── core/           # config.py  (reads all env vars)
│   │   │   ├── rag/            # RAG pipeline (embedder, retriever, reranker, …)
│   │   │   ├── repositories/   # data access layer (future)
│   │   │   ├── schemas/        # Pydantic request/response models (future)
│   │   │   ├── services/       # ingestion_service (document → Qdrant)
│   │   │   ├── utils/          # shared helpers (future)
│   │   │   ├── vector_db/      # qdrant_client.py
│   │   │   ├── workflows/      # LangGraph graph, nodes, edges, state
│   │   │   └── main.py
│   │   ├── tests/
│   │   └── requirements.txt
│   └── web/                    # Frontend (future)
├── configs/
│   ├── agents.yaml             # LangGraph agent configuration reference
│   ├── models.yaml             # Model configuration reference
│   └── qdrant.yaml             # Qdrant configuration reference
├── data/
│   ├── raw/                    # Drop documents here before ingestion
│   ├── processed/
│   └── metadata/
├── infrastructure/
│   ├── docker/
│   │   └── docker-compose.yml  # Qdrant container
│   ├── model-server/           # vLLM Dockerfile (future)
│   └── qdrant/
├── scripts/
│   ├── dev.sh                  # up / down / status orchestrator
│   ├── setup_qdrant.py         # create/verify Qdrant collection
│   ├── create_indexes.py       # create payload indexes
│   ├── ingest_documents.py     # ingest TXT / PDF / DOCX into Qdrant
│   ├── health_check.py         # verify Qdrant is reachable
│   ├── qdrant_up.sh / _down.sh
│   └── vllm_up.sh / _down.sh
├── .env                        # active config (gitignored) — copy from .env.example
├── .env.dev                    # dev machine profile
├── .env.server                 # server / A100 profile
├── .env.example                # committed template
├── constraints.txt             # uv pip version pins (always pass with --constraint)
└── Readme.md
```

---

## 1. Prerequisites

### 1.1 NVIDIA driver

```bash
nvidia-smi
# Column "CUDA Version" must be ≥ 13.x for vLLM 0.28 + torch 2.13+cu132
```

### 1.2 GCC / G++

> [!WARNING]
> **GCC 16 (system default on this machine) is too new for CUDA 13.3's `nvcc`.** The
> `vllm_up.sh` script detects this automatically and adds
> `-allow-unsupported-compiler` to `NVCC_PREPEND_FLAGS`, but you must also install
> **G++ 15** so that `nvcc` can use a supported host compiler for JIT kernel
> compilation (FlashInfer, custom ops):
>
> ```bash
> sudo apt install -y g++-15
> ```
>
> Verify both are present:
> ```bash
> g++-15 --version   # must print "15.x.x"
> g++ --version      # may print 16.x.x — that's the system default, leave it
> ```
>
> `vllm_up.sh` sets `NVCC_CCBIN=/usr/bin/g++-15` when g++-15 is found,
> directing `nvcc` to use the compatible compiler while your system g++ remains
> GCC 16.

### 1.3 uv

```bash
uv --version || curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 1.4 Docker Engine + Compose plugin

```bash
docker --version || {
  sudo apt update
  sudo apt install -y docker.io docker-compose-plugin
  sudo usermod -aG docker "$USER"
  # log out and back in for the group change to take effect
}
docker compose version   # must show "v2.x" (space, not hyphen)
```

### 1.5 Git

```bash
git --version
```

---

## 2. Clone and configure

```bash
git clone <YOUR_REPOSITORY_URL>
cd SIH_2026
```

### 2.1 Environment file

All runtime paths and model names live in `.env`. Copy the example and edit:

```bash
cp .env.example .env
```

Key variables — edit these for your machine:

| Variable | Dev (local RTX 5070) | Server (A100 80 GB) |
|---|---|---|
| `DATA_ROOT` | `/mnt/shared_drive` | `/data/sih26117` |
| `VLLM_MODEL` | `Qwen/Qwen2.5-Coder-7B-Instruct-AWQ` | `Qwen/Qwen3-Coder-30B-A3B-Instruct` |
| `VLLM_MAX_MODEL_LEN` | `8192` | `32768` |
| `BGE_DEVICE` | `cpu` | `cuda` |
| `RERANKER_DEVICE` | `cpu` | `cuda` |

> [!NOTE]
> `VLLM_USE_DEEP_GEMM=0` is set in all profiles. `deep_gemm` is vLLM's
> optional FP8 block-quantized GEMM kernel for DeepSeek-style models. Nothing
> in this stack (AWQ Qwen, BGE, Qdrant) uses that path, so disabling it prevents
> the `CUDA_HOME AssertionError` from ever appearing.

Load the env now and create storage directories:

```bash
set -a; source .env; set +a
mkdir -p "$HF_HOME" "$QDRANT_STORAGE" "$LOG_DIR"
```

---

## 3. Python environment

### 3.1 `constraints.txt` — always pass on every `uv pip install`

vLLM's precompiled CUDA kernels are linked against `libcudart.so.12` (cu12)
even though vLLM 0.28's headline wheel targets CUDA 13. The cu12 packages are
genuine runtime dependencies. `constraints.txt` pins them so a future install
never silently drops them:

```
nvidia-cuda-runtime-cu12>=12.4
nvidia-cublas-cu12>=12.4
nvidia-cudnn-cu12>=9.1
```

### 3.2 Create the venv

```bash
cd apps/api
uv venv --python 3.11 --seed
source .venv/bin/activate
```

**Python 3.11 throughout** — dev and server both. vLLM 0.28 supports 3.10–3.14.
Pinning to 3.11 means `uv.lock` resolves identically on every machine.

### 3.3 Install all dependencies

Install in this exact order so `uv` resolves torch, LangChain, and vLLM
together in a single pass and avoids incompatible intermediate states:

```bash
# Step 1 — LangChain/LangGraph first (establishes pydantic, httpx, anyio pins)
uv pip install --constraint ../../constraints.txt \
  langgraph>=0.2 \
  langchain>=0.3 \
  langchain-community>=0.3

# Step 2 — Core RAG + API dependencies
uv pip install --constraint ../../constraints.txt \
  fastapi>=0.115 \
  "uvicorn[standard]>=0.30" \
  qdrant-client>=1.12 \
  sentence-transformers>=3.0 \
  transformers>=4.40 \
  numpy>=1.26 \
  python-dotenv>=1.0 \
  pypdf>=5.0 \
  python-docx>=1.1 \
  openai>=1.50 \
  httpx>=0.27 \
  pydantic>=2.7 \
  pytest>=8.0

# Step 3 — vLLM last (largest dependency footprint, resolves torch)
uv pip install --constraint ../../constraints.txt \
  vllm>=0.28 \
  --torch-backend=auto
```

> [!IMPORTANT]
> `--torch-backend=auto` inspects your installed driver and selects the matching
> PyTorch/CUDA build. Installing LangChain before vLLM lets uv resolve
> `pydantic`, `httpx`, and `anyio` shared pins before torch is pulled in.

### 3.4 Make `nvcc` available in the venv

vLLM's FlashInfer JIT compilation needs `nvcc`. The `nvidia-cuda-nvcc` pip
package (pulled in by vLLM) provides a real `nvcc` — no CUDA Toolkit install
needed. Wire it up once:

```bash
# Find and export nvcc from the pip-installed package
NVCC_PATH=$(python -c 'import nvidia.cuda_nvcc, os; print(os.path.join(nvidia.cuda_nvcc.__path__[0], "bin"))')
echo "export PATH=\"${NVCC_PATH}:\$PATH\"" >> .venv/bin/activate
source .venv/bin/activate    # reload to pick up the change
nvcc --version               # should print "Cuda compilation tools, release 13.x"
```

### 3.5 Verify the install

```bash
python -c "
import torch, vllm, qdrant_client, sentence_transformers, langgraph, langchain
print('torch:             ', torch.__version__)
print('CUDA available:    ', torch.cuda.is_available())
print('GPU:               ', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A')
print('vllm:              ', vllm.__version__)
print('qdrant-client:     ', qdrant_client.__version__)
print('sentence-transformers:', sentence_transformers.__version__)
print('langgraph:         ', langgraph.__version__)
print('langchain:         ', langchain.__version__)
"

# Confirm no missing shared libraries in vLLM's compiled kernels
VLLM_DIR=$(python -c 'import vllm, os; print(os.path.dirname(vllm.__file__))')
find "$VLLM_DIR" -name "*.so" -exec ldd {} \; 2>/dev/null | grep "not found" \
  && echo "MISSING LIBS ABOVE — run: uv pip install --constraint ../../constraints.txt nvidia-cuda-runtime-cu12" \
  || echo "clean — no missing shared libraries"
```

---

## 4. Storage layout (`/mnt/shared_drive`)

The shared drive is mounted at `/mnt/shared_drive` and holds all runtime data
so nothing large goes into the repo or the system drive:

```
/mnt/shared_drive/
├── hf_cache/          ← HuggingFace model weights (BGE-M3, reranker, Qwen)
│                        HF_HOME points here; models download once and persist.
├── qdrant_storage/    ← Qdrant's on-disk vector data (bind-mounted into container)
└── logs/              ← vLLM stdout/stderr + PID file
```

These directories are created automatically by `scripts/dev.sh up`.  
To check usage:

```bash
du -sh /mnt/shared_drive/*
```

---

## 5. Qdrant setup

### 5.1 Start the container

```bash
./scripts/qdrant_up.sh
```

This runs `docker compose -f infrastructure/docker/docker-compose.yml up -d`
with `$QDRANT_STORAGE` bind-mounted, so all data persists on the shared drive.

### 5.2 Create the collection and indexes

Run once (idempotent — safe to re-run):

```bash
# from project root, venv activated
PYTHONPATH=apps/api python scripts/setup_qdrant.py
PYTHONPATH=apps/api python scripts/create_indexes.py
```

`setup_qdrant.py` — creates the `sih_documents` collection (1024-dim cosine)
if it does not exist; validates the vector size if it does.

`create_indexes.py` — creates Qdrant payload indexes on `source`,
`document_id`, and `chunk_index` for efficient server-side filtering.

### 5.3 Verify

```bash
curl -s http://localhost:6333/collections | python -m json.tool
PYTHONPATH=apps/api python scripts/health_check.py
```

---

## 6. Ingest documents

Drop files into `data/raw/` (TXT, PDF, DOCX supported), then:

```bash
# ingest a whole directory
PYTHONPATH=apps/api python scripts/ingest_documents.py data/raw

# or a single file
PYTHONPATH=apps/api python scripts/ingest_documents.py data/raw/my_doc.pdf
```

Each file is split into 800-character overlapping chunks (configurable via
`CHUNK_SIZE` / `CHUNK_OVERLAP` in `.env`), embedded with BGE-M3, and upserted
into Qdrant. Re-ingesting the same file is idempotent (UUIDs are derived from
file path + chunk index).

---

## 7. vLLM setup

### 7.1 Start vLLM

```bash
./scripts/vllm_up.sh
```

The script:
1. Detects the CUDA libraries installed in the venv and wires up `CUDA_HOME`
2. Sets `NVCC_CCBIN=/usr/bin/g++-15` if g++-15 exists (avoids the GCC 16
   "unsupported compiler" warning from nvcc)
3. Adds `-DCCCL_DISABLE_CTK_COMPATIBILITY_CHECK` to silence CTK compatibility
   noise from newer GCC versions
4. Launches `vllm serve` in the background, writes a PID file, and polls
   `/health` until the model is up

Model weights download from HuggingFace into `$HF_HOME` on first run (~14 GB
for the 7B AWQ model). Subsequent starts use the cache.

### 7.2 Verify

```bash
curl http://127.0.0.1:${VLLM_PORT}/health
curl http://127.0.0.1:${VLLM_PORT}/v1/models
```

### 7.3 Stop

```bash
./scripts/vllm_down.sh
```

---

## 8. Run the API

```bash
# from project root, venv activated
PYTHONPATH=apps/api uvicorn app.main:app \
  --host "${API_HOST:-127.0.0.1}" \
  --port "${API_PORT:-8080}" \
  --reload   # omit --reload in production
```

### Available endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Returns `{"status":"ok","qdrant_url":"..."}` |
| `POST` | `/documents/chunks` | Split text into chunks (no persistence) |
| `POST` | `/rag/query` | Full RAG query → grounded answer + sources |

### Example — RAG query

```bash
curl -X POST http://127.0.0.1:8080/rag/query \
  -H 'Content-Type: application/json' \
  -d '{"query": "Which embedding model does this system use?"}'
```

Response:

```json
{
  "answer": "The system uses BAAI/bge-m3 ...",
  "sources": [
    {
      "source": "data/raw/architecture.txt",
      "document_id": "a1b2c3d4",
      "chunk_id": "a1b2c3d4:0",
      "rerank_score": 0.91
    }
  ],
  "context_used": [...]
}
```

---

## 9. Run tests

```bash
# unit + smoke tests (no services required)
cd apps/api
PYTHONPATH=. pytest tests/ -v

# integration test (requires Qdrant + vLLM to be running)
PYTHONPATH=. RUN_REAL_RAG=1 \
  RAG_TEST_QUERY="Which embedding model and vector database does this architecture use?" \
  pytest tests/test_real_rag.py -v -s
```

---

## 10. Full one-shot setup checklist (new machine / server)

Run these in order on a fresh clone:

```bash
# ── 0. System packages ──────────────────────────────────────────────────────
sudo apt update
sudo apt install -y docker.io docker-compose-plugin g++-15
sudo usermod -aG docker "$USER"
# log out and back in so the docker group takes effect

# ── 1. Clone ────────────────────────────────────────────────────────────────
git clone <YOUR_REPOSITORY_URL>
cd SIH_2026

# ── 2. Storage ──────────────────────────────────────────────────────────────
# On the dev machine the drive is already mounted at /mnt/shared_drive.
# On the server, mount the data disk or adjust DATA_ROOT in .env accordingly.
cp .env.example .env
# Edit .env: set DATA_ROOT, VLLM_MODEL, BGE_DEVICE, RERANKER_DEVICE for this machine.
set -a; source .env; set +a
mkdir -p "$HF_HOME" "$QDRANT_STORAGE" "$LOG_DIR"

# ── 3. Python venv ──────────────────────────────────────────────────────────
cd apps/api
uv venv --python 3.11 --seed
source .venv/bin/activate

# Step 1: LangChain/LangGraph (sets shared pydantic/httpx/anyio pins)
uv pip install --constraint ../../constraints.txt \
  "langgraph>=0.2" "langchain>=0.3" "langchain-community>=0.3"

# Step 2: Core dependencies
uv pip install --constraint ../../constraints.txt \
  "fastapi>=0.115" "uvicorn[standard]>=0.30" "qdrant-client>=1.12" \
  "sentence-transformers>=3.0" "transformers>=4.40" "numpy>=1.26" \
  "python-dotenv>=1.0" "pypdf>=5.0" "python-docx>=1.1" \
  "openai>=1.50" "httpx>=0.27" "pydantic>=2.7" "pytest>=8.0"

# Step 3: vLLM (resolves torch)
uv pip install --constraint ../../constraints.txt \
  "vllm>=0.28" --torch-backend=auto

# Wire nvcc into the venv activation
NVCC_PATH=$(python -c 'import nvidia.cuda_nvcc, os; print(os.path.join(nvidia.cuda_nvcc.__path__[0], "bin"))')
echo "export PATH=\"${NVCC_PATH}:\$PATH\"" >> .venv/bin/activate
source .venv/bin/activate

# Verify
python -c "import torch, vllm, langgraph; print(torch.version.cuda, vllm.__version__, langgraph.__version__, torch.cuda.is_available())"
VLLM_DIR=$(python -c 'import vllm, os; print(os.path.dirname(vllm.__file__))')
find "$VLLM_DIR" -name "*.so" -exec ldd {} \; 2>/dev/null | grep "not found" || echo "clean"

cd ../..

# ── 4. Qdrant ───────────────────────────────────────────────────────────────
chmod +x scripts/*.sh
./scripts/qdrant_up.sh
PYTHONPATH=apps/api python scripts/setup_qdrant.py
PYTHONPATH=apps/api python scripts/create_indexes.py

# ── 5. vLLM ─────────────────────────────────────────────────────────────────
./scripts/vllm_up.sh          # downloads model weights on first run (~14 GB)

# ── 6. Verify services ──────────────────────────────────────────────────────
./scripts/dev.sh status
PYTHONPATH=apps/api python scripts/health_check.py
curl -s http://localhost:${VLLM_PORT}/health
curl -s http://localhost:${VLLM_PORT}/v1/models | python -m json.tool

# ── 7. Ingest and test ───────────────────────────────────────────────────────
PYTHONPATH=apps/api python scripts/ingest_documents.py data/raw
cd apps/api && PYTHONPATH=. pytest tests/ -v
```

---

## 11. Daily workflow

```bash
# start everything
./scripts/dev.sh up

# check status
./scripts/dev.sh status

# run API
PYTHONPATH=apps/api uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload

# ... work ...

# stop everything (vLLM first to free GPU, then Qdrant)
./scripts/dev.sh down
```

---

## 12. Configuration reference

All configuration is read at startup from `.env` via `apps/api/app/core/config.py`.
See `configs/` for annotated YAML references.

| Variable | Default | Description |
|---|---|---|
| `DATA_ROOT` | `/mnt/shared_drive` | Root for all runtime data |
| `HF_HOME` | `${DATA_ROOT}/hf_cache` | HuggingFace model cache |
| `QDRANT_STORAGE` | `${DATA_ROOT}/qdrant_storage` | Qdrant bind-mount host path |
| `LOG_DIR` | `${DATA_ROOT}/logs` | vLLM log + PID files |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant REST URL |
| `QDRANT_PORT` | `6333` | Qdrant REST port |
| `QDRANT_GRPC_PORT` | `6334` | Qdrant gRPC port |
| `QDRANT_COLLECTION` | `sih_documents` | Vector collection name |
| `VLLM_MODEL` | `Qwen/Qwen2.5-Coder-7B-Instruct-AWQ` | Model ID for vLLM |
| `VLLM_HOST` | `127.0.0.1` | vLLM bind address |
| `VLLM_BASE_URL` | `http://127.0.0.1:8000/v1` | OpenAI-compatible endpoint |
| `VLLM_PORT` | `8000` | vLLM HTTP port |
| `VLLM_GPU_MEM_UTIL` | `0.85` | GPU memory fraction for KV cache |
| `VLLM_MAX_MODEL_LEN` | `8192` | Maximum context length (tokens) |
| `VLLM_QUANTIZATION` | `awq` | Quantization scheme |
| `VLLM_USE_DEEP_GEMM` | `0` | Disable FP8 GEMM kernel (keep at 0) |
| `BGE_M3_MODEL` | `BAAI/bge-m3` | Embedding model |
| `RERANKER_MODEL` | `BAAI/bge-reranker-v2-m3` | Cross-encoder reranker |
| `BGE_DEVICE` | `cpu` | Device for embedding (`cpu` or `cuda`) |
| `RERANKER_DEVICE` | `cpu` | Device for reranking (`cpu` or `cuda`) |
| `EMBEDDING_DIMENSION` | `1024` | Must match Qdrant collection vector size |
| `RETRIEVAL_TOP_K` | `12` | Candidates fetched from Qdrant |
| `RERANK_TOP_K` | `5` | Top N after reranking |
| `RERANK_MIN_SCORE` | `0.0` | Minimum rerank score threshold |
| `CHUNK_SIZE` | `800` | Characters per chunk |
| `CHUNK_OVERLAP` | `100` | Overlap between chunks |
| `API_HOST` | `127.0.0.1` | FastAPI bind address |
| `API_PORT` | `8080` | FastAPI port |

---

## 13. Troubleshooting

### nvcc "unsupported compiler" with GCC 16

```
nvcc warning: The version of gcc (16.x) is not supported
```

This is expected — GCC 16 is newer than CUDA 13.3's supported range.
`vllm_up.sh` handles it automatically by setting `NVCC_CCBIN=/usr/bin/g++-15`.
If you run `nvcc` manually, add `-ccbin /usr/bin/g++-15`.

Install g++-15 if missing:
```bash
sudo apt install -y g++-15
```

### `CUDA_HOME AssertionError` from deep_gemm

`VLLM_USE_DEEP_GEMM=0` in `.env` prevents this entirely. If you see it, verify
the variable is exported:
```bash
echo $VLLM_USE_DEEP_GEMM   # must print 0
```

### Missing shared libraries in vLLM kernels

```bash
VLLM_DIR=$(python -c 'import vllm, os; print(os.path.dirname(vllm.__file__))')
find "$VLLM_DIR" -name "*.so" -exec ldd {} \; 2>/dev/null | grep "not found"
```

If any are found:
```bash
uv pip install --constraint constraints.txt nvidia-cuda-runtime-cu12 nvidia-cublas-cu12 nvidia-cudnn-cu12
```

### Qdrant not reachable

```bash
docker ps | grep sih-qdrant          # is the container running?
docker logs sih-qdrant               # check for startup errors
./scripts/qdrant_up.sh               # restart if needed
PYTHONPATH=apps/api python scripts/health_check.py
```

### vLLM OOM on RTX 5070 (12 GB)

Reduce `VLLM_GPU_MEM_UTIL` in `.env` (try `0.75`) or lower `VLLM_MAX_MODEL_LEN`.
The 7B AWQ model needs ~8 GB at `0.85` utilization.

---

## 14. Security notes

- `.env`, `.env.dev`, `.env.server` are gitignored — **never commit real credentials**
- `.env.example` and `constraints.txt` are committed as templates
- Qdrant binds to `127.0.0.1` only — not exposed to the network
- vLLM binds to `127.0.0.1` only — not exposed to the network
- The FastAPI server defaults to `127.0.0.1`; change `API_HOST=0.0.0.0` in `.env.server` for server deployment behind a reverse proxy