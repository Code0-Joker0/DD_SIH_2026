# 🛡️ Singularity Sovereign Industrial AI Workbench (MRPL SIH26117)

> **Zero-WAN Sovereign Asset Integrity Evaluation, Multi-Tier Egress Defense & Air-Gapped Enterprise Vault**

[![Architecture](https://img.shields.io/badge/Architecture-Sovereign%20Air--Gap-0052CC.svg)](#system-architecture)
[![Firewall](https://img.shields.io/badge/Defense-Multi--Tier%20Zero--WAN-00875A.svg)](#sovereign-multi-tier-firewall--perimeter-defense)
[![Encryption](https://img.shields.io/badge/Storage-AES--256--GCM%20%2B%20PGlite-FF5630.svg)](#enterprise-cryptographic-vault--pglite-storage)
[![LangGraph](https://img.shields.io/badge/Agent-Single%20LangGraph%20Workflow-6554C0.svg)](#autonomous-asset-integrity-langgraph-agent)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite%208-61DAFB.svg)](#frontend-architecture)

---

## 📌 Executive Overview & Problem Statement

In mission-critical downstream petroleum refining installations such as **Mangalore Refinery and Petrochemicals Limited (MRPL)**, operational continuity, asset reliability, and data confidentiality are paramount. Statutory regulations (OISD, API, ISO) mandate rigorous, routine structural integrity assessments of high-pressure piping, reactors, heat exchangers, pressure vessels, and rotating pumps.

However, deploying modern Agentic AI and Large Language Models inside critical refining networks introduces acute cybersecurity vulnerabilities:
1. **Cloud Data Exfiltration Risks:** Proprietary P&ID drawings, metallurgical ultrasonic thickness logs, and critical operational bottlenecks must never leave the on-premise security boundary.
2. **Host OS & Operational Disruption:** Altering host-level networking (`ufw`, `iptables`, eBPF) on shared workstations or industrial SCADA consoles often disrupts existing industrial protocols, third-party historians, and enterprise browsing.
3. **Malicious & Non-Industrial Ingestion:** Ingestion systems must identify and reject irrelevant or malicious inputs before processing.
4. **Calculated Trust & Arbitrary Code Execution:** Autonomous AI agents executing engineering formulas must run within tightly bounded sandboxes with mathematical verification and zero network reach.

**Singularity** solves these challenges by combining an **autonomous single LangGraph agent pipeline**, an **embedded cryptographic database and file vault (PGlite + AES-256-GCM)**, and a **multi-tier application-layer perimeter firewall**. It achieves **100% sovereign air-gapped zero-WAN egress** entirely within user space and runtime hooks.

---

## 🏛️ System Architecture

Singularity is architected into three decoupled, secure tiers:

```
                                 [ BROWSER / OPERATOR CLIENT ]
                                    http://localhost:5173
                                              │
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ TIER 2: NODE.JS SOVEREIGN API GATEWAY (Port :3000)                                        │
│                                                                                           │
│   ├── [CORS Whitelist Lockdown] -> Only http://localhost:5173 & http://127.0.0.1:5173     │
│   ├── [Ingress IP Firewall]     -> Checks remoteAddress (127.0.0.1, 10.x, 192.168.x)      │
│   ├── [Telemetry Header]        -> Injects `X-Sovereign-Airgap: Active-Zero-WAN`          │
│   ├── [Tier 1 Egress Guard]     -> Hooks `net.Socket.connect` & `http/https.request`      │
│   │                                Drops any WAN-bound TCP/HTTP packet immediately        │
│   ├── [Enterprise Auth Router]  -> Bcrypt (12 rounds), 7-Day JWT, RBAC, 1-Click Demo SSO  │
│   ├── [Encrypted File Vault]    -> AES-256-GCM + SHA-256 Checksum + Tamper Detection     │
│   └── [Embedded PGlite DB]      -> In-process WASM PostgreSQL (/gateway/data/pglite)      │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │ Internal IPC / HTTP Loopback
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ TIER 1 & AI ENGINE: PYTHON FASTAPI WORKBENCH (Port :8000)                                 │
│                                                                                           │
│   ├── [Kernel Socket Interceptor] -> Monkey-patches `socket.connect` & `socket.getaddrinfo`│
│   │                                  Strictly restricts to RFC 1122 & RFC 1918 subnets    │
│   │                                  External DNS/IP calls raise socket.gaierror/PermError│
│   ├── [Air-Gap Audit Probe]       -> Active canary probe to 8.8.8.8:53 verifies 0-WAN      │
│   ├── [ChromaDB Vector Store]     -> Air-Gapped 64-dim deterministic offline embeddings   │
│   │                                  Stores API 570, API 510, ISO 10816, OISD standards   │
│   ├── [LangGraph Single Agent]    -> Ingestion & Validation -> Reason & Calc -> Deliverable│
│   ├── [Execution Sandbox]         -> AST analysis, network module bans, 10s timeout       │
│   ├── [Docx Deliverable Engine]   -> Generates statutory MRPL executive Approval Notes    │
│   └── [Local LLM / vLLM Engine]   -> Ollama (llama3.2:3b, qwen2.5vl:3b) on port :11434    │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Sovereign Multi-Tier Firewall & Perimeter Defense

Singularity implements perimeter defense directly at the application and runtime layer without altering the host operating system's global network routing tables.

### 1. Tier 1: Low-Level Socket Interceptors & DNS Blackholing
Both runtime environments (Python and Node.js) intercept low-level operating system network calls at process boot:

* **Python Backend (`backend/app.py`):**
  * Hooks `socket.socket.connect` and `socket.getaddrinfo`.
  * Evaluates all connection targets against authorized RFC 1122 and RFC 1918 CIDR blocks:
    * `127.0.0.0/8` (IPv4 Loopback)
    * `::1/128` (IPv6 Loopback)
    * `10.0.0.0/8` (Enterprise OT Subnet)
    * `192.168.0.0/16` (Enterprise Local Subnet)
  * External DNS queries (e.g. attempting to resolve public domains) are immediately aborted with `socket.gaierror: [TIER 1 SOVEREIGN FIREWALL] External domain lookup blocked`.
  * Outbound TCP connections targeting external WAN IPs immediately trigger `PermissionError: [TIER 1 ZERO-WAN EGRESS VIOLATION] Dropped packet to WAN target`.

* **Node.js Gateway (`gateway/server.js`):**
  * Monkey-patches `net.Socket.prototype.connect` to inspect connection targets. Outbound WAN connections are destroyed on `process.nextTick` with `ECONNREFUSED`.
  * Monkey-patches `http.request` and `https.request` via `enforceEgressGuard()`, emitting `ENETUNREACH` before any TCP handshake can be initiated.

### 2. Tier 2: Application Ingress Firewall & CORS Lockdown
* **Strict Origin Whitelisting:** The Gateway restricts browser origins strictly to local frontend endpoints (`http://localhost:5173` and `http://127.0.0.1:5173`). Foreign web origins are dropped immediately.
* **Remote Socket Ingress Validation:** Client connections to port `3000` are validated against `req.socket.remoteAddress` and `req.ip`. External ingress is rejected with `HTTP 403 Forbidden`.
* **Telemetry Verification:** Valid requests that pass perimeter checks have the sovereign signature attached:
  ```http
  X-Sovereign-Airgap: Active-Zero-WAN
  ```

### 3. Tier 3: AST-Enforced Execution Sandbox (`backend/sandbox.py`)
When the autonomous AI agent writes Python scripts to verify engineering formulas (e.g., remaining corrosion life or minimum allowable wall thickness), the code must pass the static AST analyzer before execution:
* **Forbidden Network Imports:** The AST tree explicitly rejects imports of `socket`, `requests`, `urllib`, `http`, `httpx`, `ftplib`, and `telnetlib`.
* **Command Neutralization:** Dangerous shell operations (`os.system`, `shutil.rmtree`) are automatically neutralized.
* **Ephemeral Process Isolation:** Scripts execute in dedicated temporary folders (`tempfile.mkdtemp(prefix="mrpl_sandbox_")`) under an unprivileged child process with a hard **10-second timeout**.

### 4. Active Air-Gap Network Audit (`GET /api/network-status`)
The gateway and backend provide an active canary audit endpoint. The backend deliberately issues a raw socket connection probe to a public DNS resolver (`8.8.8.8:53`). Because the Tier 1 socket hook drops the packet, the test passes and returns:
```json
{
  "egress_packets": 0,
  "wan_status": "SECURE_AIR_GAPPED",
  "active_ip": "127.0.0.1",
  "mode": "ON_PREMISE_SOVEREIGN"
}
```

---

## 🧠 Autonomous Asset Integrity LangGraph Agent

The core analytical pipeline in `backend/agent.py` uses a single **LangGraph StateGraph** designed for high reliability, explainability, and zero hallucination.

```
       [ START ]
           │
           ▼
┌──────────────────────────────────────┐
│  ingest_and_validate                 │
│  - Multimodal parsing (PDF / Vision) │
│  - Refinery Domain Gatekeeper AI     │
│  - Filters out resumes/invoices      │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  reason_and_calculate                │
│  - Extracts Tag, Service, Thickness  │
│  - Generates Python verification code│
│  - Executes code in AST Sandbox      │
│  - Queries statutory limits (API 570)│
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  generate_deliverable                │
│  - Synthesizes risk matrix & findings│
│  - Formats MRPL Statutory Note       │
│  - Builds styled .docx with sign-off │
└──────────────────┬───────────────────┘
                   │
                   ▼
        [ END / STREAM DOCX ]
```

### Statutory Engineering Standards Covered
* **API 570 (Piping Inspection Code):** Minimum structural allowable thickness $t_{\text{min}} = \frac{P \cdot D}{2 \cdot S \cdot E + 2 \cdot P \cdot Y} + c$. Immediate isolation trigger if $t_{\text{actual}} < t_{\text{min}}$ (e.g. $3.8\,\text{mm} < 5.0\,\text{mm}$ for 8.0 mm nominal hydrocarbon lines).
* **API 510 (Pressure Vessel Code):** In-service remaining life $RL = \frac{t_{\text{actual}} - t_{\text{min}}}{\text{Corrosion Rate}}$. Automatic inspection interval escalation if $RL < 2\,\text{years}$.
* **ISO 10816-3 (Rotating Equipment Vibration):** Zone A/B/C/D threshold evaluation for centrifugal pumps (e.g., P-201 A/B). Emergency shutdown recommendation above $7.1\,\text{mm/s RMS}$.
* **OISD-164 & Statutory Norms:** Mandated risk matrices, emergency containment clamping, and non-destructive testing (NDT) logs.

---

## 🔐 Enterprise Cryptographic Vault & PGlite Storage

Instead of requiring external database installations, Singularity embeds **PGlite** (`@electric-sql/pglite`), running a complete WASM-compiled PostgreSQL engine locally inside the Node.js runtime (`gateway/data/pglite`).

### Cryptographic Security Specs (`gateway/utils/fileCrypto.js`)
* **Algorithm:** AES-256-GCM (Authenticated Encryption with Associated Data).
* **Initialization Vector (IV):** Cryptographically secure, unique 96-bit (12-byte) hex-encoded IV per file.
* **Authentication Tag:** 128-bit (16-byte) GCM authentication tag for tamper and bit-flipping detection.
* **Integrity Hash:** Cryptographic SHA-256 digest computed over the plaintext pre-encryption and re-verified post-decryption.
* **Database Storage:** Ciphertext is stored directly inside the PostgreSQL `company_files` table as a binary `BYTEA` payload.
* **Audit Logging:** Every upload, download, permission change, and decryption attempt is logged to `file_audit_logs`.

---

## 💻 Frontend Architecture

Built with **React 19, TypeScript, Vite 8, and Tailwind CSS 4**, the Singularity interface provides an industrial-grade cockpit:

* **Live Sovereign Air-Gap Badge:** Real-time polling of `/api/network-status` showcasing 0 egress packets and loopback isolation.
* **Conversation Workspace (`ConversationWorkspaceView.tsx`):** Multi-turn conversational copilot grounded against uploaded inspection sheets and refinery standards.
* **Encrypted Documents Vault (`DocumentsView.tsx`):** Client-side drag-and-drop file upload with live AES-256-GCM status indicators, download streaming, and departmental filtering.
* **Automated Task Execution (`NewTaskView.jsx` / `TaskProgressView.jsx`):** One-click execution of the LangGraph agent swarm, streaming back completed `.docx` Approval Notes.
* **Admin Management Suite:**
  * `AdminConsoleView.jsx`: System overview and quick actions.
  * `AdminAIServicesView.jsx`: Local model health and vLLM/Ollama parameter tuning.
  * `AdminAuditView.jsx`: Immutable cryptographic audit trail.
  * `AdminSystemHealthView.jsx`: Gateway and backend diagnostics.
  * `AdminUsersView.jsx`: Enterprise RBAC user management.

---

## 📂 Workspace Directory Structure

```
.
├── backend/
│   ├── agent.py               # LangGraph single-agent pipeline & domain gatekeeper
│   ├── app.py                 # FastAPI engine with Tier 1 kernel socket firewall
│   ├── sandbox.py             # AST-verified isolated Python execution sandbox
│   ├── tools.py               # ChromaDB RAG vector store & .docx generator
│   ├── schema.sql             # Chat sessions and memory schema
│   ├── test_swarm.py          # Standalone verification script for agent tasks
│   ├── chroma_db/             # Local air-gapped vector embeddings
│   ├── outputs/               # Generated statutory docx Approval Notes
│   └── uploads/               # Temporary uploads for ingestion
├── frontend/
│   ├── src/
│   │   ├── components/        # UI Views (Dashboard, Workspace, Documents, Admin)
│   │   ├── context/           # Theme and state contexts
│   │   ├── utils/             # api.ts (JWT client) & encryption.js
│   │   ├── App.jsx            # Main view router and authentication check
│   │   └── main.jsx           # Entry point
│   ├── package.json           # React 19, Vite 8, Tailwind 4 dependencies
│   └── vite.config.ts         # Vite configuration with proxy definitions
├── gateway/
│   ├── data/pglite/           # Embedded WASM PostgreSQL cluster data files
│   ├── db/index.js            # PGlite client and migration runner
│   ├── middleware/auth.js     # JWT validation and RBAC middleware
│   ├── routes/
│   │   ├── auth.js            # User registration, bcrypt login, and demo SSO
│   │   └── files.js           # AES-256-GCM vault upload/download routes
│   ├── utils/fileCrypto.js    # Master key derivation, GCM cipher/decipher
│   ├── schema.sql             # Enterprise users, company_files, and audit schema
│   ├── server.js              # Express 5 gateway with Tier 1 & 2 ingress/egress firewall
│   ├── package.json           # Node dependencies (@electric-sql/pglite, express, etc.)
│   └── test/
│       ├── crypto-and-api.test.js # Unit test suite for crypto and PGlite
│       └── firewall.test.js       # Integration tests for CORS and IP firewall
├── tests/
│   ├── test_chat_copilot.py   # Multi-turn conversational grounding tests
│   └── test_dynamic_agent.py  # End-to-end PDF ingestion and LangGraph pipeline tests
└── README.md                  # Comprehensive system documentation
```

---

## 🚀 Getting Started & Quick Start Guide

### Prerequisites
* **Node.js:** v20.x or higher
* **Python:** v3.10 or higher
* **Ollama (or local vLLM):** Running locally on `http://127.0.0.1:11434` with `llama3.2:3b` pulled:
  ```bash
  ollama pull llama3.2:3b
  ```

---

### Step 1: Initialize the Sovereign Gateway & Embedded Database

```bash
cd gateway
npm install

# (Optional) Run the cryptographic and database test suite
npm test

# Launch the gateway in development mode (port 3000)
npm run dev
```

The gateway will automatically initialize the embedded PGlite PostgreSQL database inside `gateway/data/pglite`.

---

### Step 2: Initialize the Sovereign AI Engine & Backend

```bash
cd ../backend

# Create and activate Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install backend dependencies
pip install fastapi uvicorn pydantic python-docx chromadb langchain-ollama langgraph pdfplumber pypdf pillow reportlab requests

# Launch the FastAPI sovereign backend (port 8000)
python app.py
```

---

### Step 3: Launch the Frontend Cockpit

```bash
cd ../frontend
npm install

# Launch Vite development server (port 5173)
npm run dev
```

Navigate to **`http://localhost:5173`** in your browser. Use the **1-Click Demo Login** button to instantly authenticate as Lead Inspection Engineer *Reva Kulkarni*.

---

## 🧪 Verification & Testing

### 1. Manual cURL Testing Vectors

#### A. Verify Legitimate Local Loopback Ingress
```bash
curl -i -X GET http://127.0.0.1:3000/api/health
```
**Expected Response:** HTTP 200 OK with the telemetry header:
```http
X-Sovereign-Airgap: Active-Zero-WAN
```

#### B. Verify CORS Unauthorized Origin Block
```bash
curl -i -X GET http://127.0.0.1:3000/api/health \
  -H "Origin: http://unauthorized-attacker.com"
```
**Expected Response:** Blocked with `Blocked by CORS: Untrusted Origin`.

#### C. Verify Air-Gap Status and Egress Block
```bash
curl -s http://127.0.0.1:8000/api/network-status | jq .
```
**Expected Response:**
```json
{
  "egress_packets": 0,
  "wan_status": "SECURE_AIR_GAPPED",
  "active_ip": "127.0.0.1",
  "mode": "ON_PREMISE_SOVEREIGN"
}
```

---

### 2. Automated Test Suites

| Target Layer | Test Script | Command | Purpose |
| :--- | :--- | :--- | :--- |
| **Cryptography & PGlite** | `gateway/test/crypto-and-api.test.js` | `cd gateway && npm test` | Tests AES-256-GCM, bit-flip detection, SHA-256 verification, and PGlite queries |
| **Firewall & CORS** | `gateway/test/firewall.test.js` | `cd gateway && node --test test/firewall.test.js` | Tests origin locking, telemetry header attachment, and non-local IP handling |
| **Execution Sandbox** | `backend/sandbox.py` | `python backend/sandbox.py` | Tests AST forbidden import stripping, `os.system` neutralizing, and timeouts |
| **Chat Copilot RAG** | `tests/test_chat_copilot.py` | `pytest tests/test_chat_copilot.py` | Validates multi-turn context retention and grounding on API 570 standards |
| **End-to-End Agent** | `tests/test_dynamic_agent.py` | `pytest tests/test_dynamic_agent.py` | Tests automated PDF generation, parameter extraction, and `.docx` generation |

---

## 📄 License & Confidentiality

**Confidential & Proprietary:** Developed specifically for **Mangalore Refinery and Petrochemicals Limited (MRPL)** under **Smart India Hackathon 2026 (Problem Statement SIH26117)**. 

All rights reserved. Unauthorized external reproduction, distribution, or WAN deployment is strictly prohibited.
