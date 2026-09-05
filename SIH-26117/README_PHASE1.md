# SIH-26117 — RAG Foundation (Phase 1)

Local semantic-retrieval foundation for the **Sovereign On-Premise Agentic AI Workbench** for SIH Problem Statement 26117.

Phase 1 establishes:

```text
Documents
    ↓
Text
    ↓
Chunking
    ↓
BGE-M3
    ↓
1024-D embeddings
    ↓
Qdrant
    ↓
Semantic Search
    ↓
Relevance Gate
```

This phase is intentionally independent of Qwen3, LangGraph, vLLM, PaddleOCR-VL and the frontend. Those are integrated in later phases.

---

## 1. Phase 1 Scope

### Included

- Python 3.11 virtual environment
- Qdrant running locally in Docker
- Persistent Qdrant storage
- `mrpl_knowledge` collection
- BGE-M3 embedding model
- Text document ingestion
- Basic word-based chunking
- Semantic vector search
- Retrieval evaluation
- Initial relevance threshold / abstention gate

### Not Included Yet

- Qwen3 reasoning model
- Qwen3-Coder
- Qwen3-VL
- PaddleOCR-VL-1.6
- LangGraph orchestration
- vLLM model serving
- BGE-reranker-v2-m3
- Hybrid dense+sparse retrieval
- FastAPI integration
- React integration
- Docker code sandbox
- PostgreSQL audit/logging

---

# 2. Prerequisites

Install these before starting:

| Software | Required |
|---|---|
| Python | **3.11.x** |
| Git | Any current version |
| Docker Desktop | Required |
| VS Code | Recommended |
| Internet | Required for first-time package/model/Docker downloads |

The reference development machine used:

```text
Python          3.11.9
pip             26.2.1
Docker          29.5.2
Docker Compose  5.1.4
PyTorch         2.14.0+cpu
Qdrant Client   1.19.0
SentenceTransformers 6.0.1
```

> These versions are recorded from the working Phase-1 environment. For fully reproducible builds, the team should later pin dependencies in a lock file after the dependency set is finalized.

---

# 3. Project Structure

Expected repository structure:

```text
SIH-26117/
│
├── apps/
│   ├── web/                         # React frontend
│   └── api/                         # FastAPI backend
│       └── app/
│           ├── rag/
│           │   ├── chunker.py
│           │   └── embedder.py
│           │
│           └── vector_db/
│               └── qdrant_client.py
│
├── configs/
│
├── data/
│   ├── raw/                         # Phase-1 test documents
│   ├── processed/
│   └── metadata/
│
├── docs/
│
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.dev.yml
│   │   └── .gitkeep
│   │
│   ├── qdrant/
│   └── model-server/
│
├── scripts/
│   ├── create_collection.py
│   ├── test_bge.py
│   ├── test_chunker.py
│   ├── ingest_documents.py
│   ├── search_test.py
│   ├── evaluate_retrieval.py
│   └── test_thresholds.py
│
├── tests/
│   └── retrieval_questions.json
│
├── .venv/
├── .gitignore
├── README.md
└── Makefile
```

> `.venv/` is local to each developer machine and must **not** be committed to Git.

---

# 4. Clone the Repository on a New PC

Open PowerShell and choose a workspace:

```powershell
git clone <YOUR_REPOSITORY_URL>
cd SIH-26117
```

Verify:

```powershell
git status
```

You should be inside:

```text
SIH-26117
```

---

# 5. Verify Python 3.11

Run:

```powershell
py -0p
```

Confirm Python 3.11 is available.

Then:

```powershell
py -3.11 --version
```

Expected:

```text
Python 3.11.x
```

If Python 3.11 is not installed, install it before continuing.

---

# 6. Create the Virtual Environment

From the project root:

```powershell
py -3.11 -m venv .venv
```

Activate it:

```powershell
.\.venv\Scripts\Activate.ps1
```

Expected prompt:

```text
(.venv) PS C:\...\SIH-26117>
```

Verify:

```powershell
python --version
```

Expected:

```text
Python 3.11.x
```

Verify the active interpreter:

```powershell
where.exe python
```

The first result should be:

```text
SIH-26117\.venv\Scripts\python.exe
```

---

# 7. Upgrade pip

```powershell
python -m pip install --upgrade pip
```

Verify:

```powershell
python -m pip --version
```

---

# 8. Install Phase-1 Python Dependencies

For the current Phase-1 implementation:

```powershell
python -m pip install qdrant-client sentence-transformers torch numpy python-dotenv pypdf
```

Verify the imports:

```powershell
python -c "import qdrant_client, sentence_transformers, torch, numpy, pypdf; print('All Phase-1 packages installed successfully')"
```

Expected:

```text
All Phase-1 packages installed successfully
```

Check PyTorch:

```powershell
python -c "import torch; print('Torch:', torch.__version__); print('CUDA available:', torch.cuda.is_available())"
```

### Development laptop

`CUDA available: False` is acceptable during Phase 1 because the laptop is used for CPU development.

### College A100 server

A separate GPU environment will be configured later. Do not reuse this CPU-only PyTorch environment as the final A100 inference environment.

---

# 9. Start Qdrant Locally

Phase 1 uses **self-hosted/local Qdrant**, not Qdrant Cloud.

Navigate to:

```powershell
cd infrastructure\docker
```

Verify:

```powershell
dir
```

The file below must exist:

```text
docker-compose.dev.yml
```

Expected content:

```yaml
services:
  qdrant:
    image: qdrant/qdrant:latest
    container_name: mrpl-qdrant
    restart: unless-stopped

    ports:
      - "127.0.0.1:6333:6333"
      - "127.0.0.1:6334:6334"

    volumes:
      - qdrant_data:/qdrant/storage

volumes:
  qdrant_data:
```

Start Qdrant:

```powershell
docker compose -f docker-compose.dev.yml up -d
```

Verify:

```powershell
docker ps
```

Expected:

```text
mrpl-qdrant    Up ...
```

---

# 10. Verify Qdrant API

Use `curl.exe` on Windows:

```powershell
curl.exe http://localhost:6333/collections
```

Immediately after first startup, an empty collection list is expected:

```json
{
  "result": {
    "collections": []
  },
  "status": "ok"
}
```

Open the dashboard:

```text
http://localhost:6333/dashboard
```

---

# 11. Qdrant Persistence

Qdrant uses the Docker named volume:

```text
qdrant_data
```

mounted to:

```text
/qdrant/storage
```

This allows vectors to survive container restarts.

Check Docker volumes:

```powershell
docker volume ls
```

Restart Qdrant:

```powershell
docker restart mrpl-qdrant
```

The collection and points must remain available after restart.

---

# 12. Create the Qdrant Collection

Return to the project root:

```powershell
cd ..\..
```

Create/verify:

```text
scripts/create_collection.py
```

Collection configuration:

```text
Collection:  mrpl_knowledge
Vector size: 1024
Distance:    Cosine
```

Run:

```powershell
python scripts/create_collection.py
```

Possible outputs:

```text
Created collection: mrpl_knowledge
```

or:

```text
Collection already exists: mrpl_knowledge
```

Verify:

```powershell
curl.exe http://localhost:6333/collections
```

Expected:

```json
{
  "result": {
    "collections": [
      {
        "name": "mrpl_knowledge"
      }
    ]
  },
  "status": "ok"
}
```

---

# 13. BGE-M3 Embedding Model

Phase 1 uses:

```text
BAAI/bge-m3
```

For the dense vector currently implemented:

```text
Vector dimension = 1024
```

First load downloads the model into the Hugging Face cache.

Run:

```powershell
python scripts/test_bge.py
```

Expected:

```text
Loading model: BAAI/bge-m3
Embedding shape: (3, 1024)
Vector dimension: 1024
```

### First-time download

The first run may take several minutes and uses disk space.

Later runs use the local cache.

---

# 14. Hugging Face Cache on Windows

A warning such as:

```text
machine does not support symlinks
```

is not a model failure.

It means Hugging Face may use more disk space because Windows is not using symlinks for the cache.

Another possible warning is:

```text
You are sending unauthenticated requests to the HF Hub
```

This does not prevent public model downloads.

A Hugging Face token can be configured later if the team needs authenticated downloads or higher rate limits.

---

# 15. Add Phase-1 Test Documents

Place test documents in:

```text
data/raw/
```

Current test files:

```text
data/raw/
├── emergency_shutdown.txt
├── pump_maintenance.txt
├── safety_procedure.txt
└── inspection_procedure.txt
```

These are synthetic development documents.

Do not commit confidential MRPL documents to Git.

---

# 16. Test the Chunker

The initial implementation uses a simple word-based chunking strategy.

Run:

```powershell
$env:PYTHONPATH="apps/api"
python scripts/test_chunker.py
```

Expected for the short development documents:

```text
Total chunks: 1
```

This is normal because the files are very small.

The chunker will later be upgraded for:

- headings
- PDF structure
- tables
- OCR output
- section boundaries
- larger industrial documents

---

# 17. Ingest Documents into Qdrant

Run:

```powershell
$env:PYTHONPATH="apps/api"
python scripts/ingest_documents.py
```

The pipeline is:

```text
TXT document
   ↓
Text extraction
   ↓
Chunking
   ↓
BGE-M3
   ↓
1024-D vector
   ↓
Qdrant upsert
```

Expected output:

```text
Connecting to Qdrant...
Loading BGE-M3...

Processing: emergency_shutdown.txt
Chunks created: 1

Processing: inspection_procedure.txt
Chunks created: 1

Processing: pump_maintenance.txt
Chunks created: 1

Processing: safety_procedure.txt
Chunks created: 1

Uploading 4 points to Qdrant...

Ingestion completed successfully.
```

---

# 18. Verify Qdrant Points

Run:

```powershell
curl.exe http://localhost:6333/collections/mrpl_knowledge
```

Confirm:

```text
status = green
optimizer_status = ok
points_count > 0
vector size = 1024
distance = Cosine
```

To inspect point `1`:

```powershell
curl.exe "http://localhost:6333/collections/mrpl_knowledge/points/1"
```

A point should contain:

```text
id
vector
document_id
chunk_id
source
document_type
department
access_level
chunk_index
text
```

---

# 19. Semantic Search Test

Run:

```powershell
$env:PYTHONPATH="apps/api"
python scripts/search_test.py
```

Try:

```text
What should be done during an emergency shutdown?
```

Expected top result:

```text
emergency_shutdown.txt
```

A successful result demonstrates:

```text
User query
    ↓
BGE-M3
    ↓
Query vector
    ↓
Qdrant
    ↓
Ranked chunks
```

---

# 20. Relevance Gate

The current development implementation uses an initial threshold:

```text
0.60
```

This was calibrated only against the current small synthetic test set.

It is **not a universal BGE-M3 threshold**.

Current validation demonstrated a useful separation between the tested relevant and irrelevant queries, but the final threshold must be recalibrated on the real industrial corpus.

Test:

```powershell
$env:PYTHONPATH="apps/api"
python scripts/search_test.py
```

Relevant query:

```text
What should be done during an emergency shutdown?
```

Expected behavior:

```text
Best similarity score: 0.7426
Relevance threshold: 0.60
Relevant knowledge found.
```

Irrelevant query:

```text
What is the capital of France?
```

Expected behavior:

```text
Best similarity score: 0.1867
Relevance threshold: 0.60
No relevant information found in the knowledge base.
```

---

# 21. Retrieval Evaluation

Test data is stored at:

```text
tests/retrieval_questions.json
```

Current evaluation contains:

- 7 relevant queries
- 3 irrelevant queries

Run:

```powershell
$env:PYTHONPATH="apps/api"
python scripts/evaluate_retrieval.py
```

Current reference result:

```text
Recall@1: 85.71%
Recall@3: 100.00%
Recall@5: 100.00%
```

The one Rank-1 miss is an intentionally ambiguous query:

```text
When should equipment be isolated?
```

Both emergency shutdown and pump maintenance contain isolation-related concepts, demonstrating why the later reranker is needed.

---

# 22. Threshold Evaluation

Run:

```powershell
$env:PYTHONPATH="apps/api"
python scripts/test_thresholds.py
```

Candidate thresholds currently tested:

```text
0.30
0.35
0.40
0.45
0.50
0.55
0.60
```

On the current 10-question synthetic set, all tested thresholds from 0.30 through 0.60 achieved 100% recall and 100% specificity.

Therefore:

```text
0.60 = current development baseline
```

It is not a permanent production value.

---

# 23. Environment Variable for Python Path

The current scripts import application modules from:

```text
apps/api
```

For direct script execution in PowerShell:

```powershell
$env:PYTHONPATH="apps/api"
```

This only affects the current PowerShell session.

A future cleanup should make application installation/imports package-based so developers do not need to set `PYTHONPATH` manually.

---

# 24. Useful Daily Commands

### Activate environment

```powershell
.\.venv\Scripts\Activate.ps1
```

### Start Qdrant

```powershell
cd infrastructure\docker
docker compose -f docker-compose.dev.yml up -d
cd ..\..
```

### Stop Qdrant

```powershell
cd infrastructure\docker
docker compose -f docker-compose.dev.yml down
cd ..\..
```

### Check Qdrant

```powershell
curl.exe http://localhost:6333/collections
```

### Check containers

```powershell
docker ps
```

### Check Git

```powershell
git status
```

---

# 25. Important Docker Data Warning

Do NOT run:

```powershell
docker compose down -v
```

unless you intentionally want to delete the Qdrant volume.

For normal shutdown:

```powershell
docker compose -f docker-compose.dev.yml down
```

This stops/removes the container and network while preserving the named data volume unless the volume is explicitly removed.

---

# 26. Troubleshooting

## `python` points to the wrong version

Check:

```powershell
where.exe python
python --version
```

The first path must be:

```text
SIH-26117\.venv\Scripts\python.exe
```

If not:

```powershell
.\.venv\Scripts\Activate.ps1
```

---

## PowerShell blocks activation

Run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then:

```powershell
.\.venv\Scripts\Activate.ps1
```

---

## Qdrant container is not running

Run:

```powershell
docker ps -a
```

Then:

```powershell
docker logs mrpl-qdrant
```

Try:

```powershell
docker compose -f infrastructure/docker/docker-compose.dev.yml up -d
```

---

## Port 6333 is already in use

Check:

```powershell
netstat -ano | findstr :6333
```

Also:

```powershell
docker ps
```

Do not start a second Qdrant instance on the same port.

---

## `mrpl_knowledge` already exists

Normally this is fine:

```powershell
python scripts/create_collection.py
```

The script is designed to leave an existing collection untouched.

---

## BGE-M3 download warning

Warnings related to:

```text
HF_TOKEN
symlinks
```

are not automatically errors.

The decisive test is:

```powershell
python scripts/test_bge.py
```

finishing with:

```text
Vector dimension: 1024
```

---

## `FileNotFoundError: tests\retrieval_questions.json`

Ensure this file exists:

```text
tests/retrieval_questions.json
```

Check:

```powershell
dir tests
```

---

## `ModuleNotFoundError: No module named 'app'`

From the project root:

```powershell
$env:PYTHONPATH="apps/api"
```

Then rerun the script.

---

# 27. Git Rules

Commit source/configuration files:

```text
scripts/
apps/api/app/rag/
apps/api/app/vector_db/
tests/
infrastructure/docker/
configs/
README.md
requirements files
```

Do NOT commit:

```text
.venv/
model weights
Hugging Face cache
Qdrant storage/volumes
private documents
secrets
.env
large generated outputs
```

Recommended `.gitignore` entries:

```gitignore
.venv/
__pycache__/
*.pyc
.env
qdrant_storage/
models/
.cache/
.pytest_cache/
```

---

# 28. Phase 1 Architecture

```text
                  TEST DOCUMENTS
                        │
                        ▼
                  TEXT EXTRACTION
                        │
                        ▼
                     CHUNKING
                        │
                        ▼
                     BGE-M3
                        │
                        ▼
                1024-D EMBEDDINGS
                        │
                        ▼
                     QDRANT
                 ┌──────┴──────┐
                 │             │
              Vectors       Payload
                 │             │
                 └──────┬──────┘
                        ▼
                 Semantic Search
                        │
                        ▼
                 Relevance Gate
                  /           \
               PASS            FAIL
                ↓                ↓
        Relevant context     No relevant
                             knowledge
```

---

# 29. Phase 1 Completion Criteria

Phase 1 is complete when:

- Qdrant runs locally and persistently.
- `mrpl_knowledge` exists with 1024-D cosine vectors.
- BGE-M3 generates embeddings successfully.
- Documents are chunked and ingested.
- Qdrant stores vectors and source metadata.
- Natural-language queries retrieve relevant chunks.
- Retrieval evaluation runs automatically.
- A relevance gate rejects clearly unrelated queries.
- The setup can be reproduced on another developer PC using this README.

---

# 30. What Comes Next — Phase 2

Once Phase 1 is frozen, the next stage is the full RAG pipeline:

```text
PDF / DOC / TXT
      ↓
Document Parsing
      ↓
Structure-Aware Chunking
      ↓
BGE-M3
      ↓
Dense + Sparse Retrieval
      ↓
Qdrant
      ↓
BGE-reranker-v2-m3
      ↓
Context Builder
      ↓
Qwen3
      ↓
Grounded Answer + Sources
```

Later, scanned industrial documents will follow:

```text
Scanned PDF
    ↓
PaddleOCR-VL-1.6
    ↓
Structured text / tables
    ↓
RAG
```

Phase 2 should also replace the initial relevance baseline with a threshold calibrated using a larger and more realistic evaluation corpus.

---

# 31. Development Philosophy

The project is intentionally layered so normal laptop development continues even when A100 access is limited.

```text
Developer Laptop
  ├── Qdrant
  ├── BGE-M3 retrieval
  ├── chunking
  ├── ingestion
  └── evaluation

A100 On-Prem Server — later
  ├── Qwen3
  ├── Qwen3-Coder
  ├── Qwen3-VL
  ├── PaddleOCR-VL
  └── vLLM
```

The frontend/backend should not directly depend on a specific model. Later model calls should go through capability-based interfaces and the project model registry.

---

# 32. Quick Start — Existing Phase-1 Setup

For a developer who already has Python 3.11, Git and Docker:

```powershell
git clone <YOUR_REPOSITORY_URL>
cd SIH-26117

py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
python -m pip install qdrant-client sentence-transformers torch numpy python-dotenv pypdf

cd infrastructure\docker
docker compose -f docker-compose.dev.yml up -d
cd ..\..

python scripts/create_collection.py

python scripts/test_bge.py

$env:PYTHONPATH="apps/api"
python scripts/ingest_documents.py
python scripts/search_test.py
python scripts/evaluate_retrieval.py
python scripts/test_thresholds.py
```

If all commands complete successfully, the Phase-1 retrieval foundation is operational.
