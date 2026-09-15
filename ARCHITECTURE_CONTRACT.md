# ENTERPRISE SPECIFICATION: Sovereign On-Premise Industrial AI Workbench
**Client Target:** Mangalore Refinery and Petrochemicals Limited (MRPL)
**Problem Statement ID:** 26117
**Compute Target:** Local Workstation (Intel Core i5-12450HX, 16GB System RAM, Nvidia RTX 3060 Laptop 6GB VRAM, Windows 11).
**Inference Engine:** Local Ollama (`http://127.0.0.1:11434`) with dynamic memory loading.

---

## 1. HARD ARCHITECTURAL CONSTRAINTS (Zero-Violation Rules)
1. **ZERO EXTERNAL CALLS / ZERO EGRESS:** 
   - No cloud SDKs (strictly ban `google.generativeai`, `openai` cloud endpoint, `anthropic`, or cloud telemetry).
   - All AI inference MUST resolve strictly to local Ollama (`http://127.0.0.1:11434`).
2. **CLIENT-SERVER SEPARATION:**
   - **Client (Frontend):** React.js + TypeScript (Vite). Pure presentation layer. ZERO OCR, ZERO vector math, ZERO local data processing. It only accepts uploads, streams Server-Sent Events (SSE), displays checklists, and offers file download links.
   - **Server (Backend):** Python + Flask + LangGraph. Handles the state machine, tools, local RAG, sandbox execution, and dynamic model routing.
3. **ISOLATED EXECUTION:**
   - Calculations and generated scripts must run inside an isolated temporary directory via a timeout-bounded subprocess (`subprocess.run([sys.executable, script_path], timeout=10, capture_output=True)`).
4. **TANGIBLE DELIVERABLES (Artifacts):**
   - The system must not stop at chat answers. It must output real corporate deliverables: `.docx` (Inter-Office Approval Notes), `.xlsx` (Calculations sheets), or verified code files.

---

## 2. HARDWARE & INFERENCE TOPOLOGY (RTX 3060 6GB + Ollama)
The backend routes to specialized open-weight models loaded dynamically by Ollama at `http://127.0.0.1:11434`:
- **Vision & P&ID Extraction:** `qwen2.5vl:3b` (for scanned inspection reports, equipment drawings).
- **Code Sandbox & Calculations:** `qwen2.5-coder:1.5b` (for formula verification and data processing scripts).
- **Reasoning, SOP RAG & Document Generation:** `llama3.2:3b` (for API standards synthesis and Inter-Office Note drafting).
- **Host CPU / RAM (Intel i5):** Runs local ChromaDB vector store + `BAAI/bge-small-en-v1.5` embeddings.

*(Note for prototype resilience: If Ollama is temporarily paused or loading, include deterministic local fallback mocks so the end-to-end UI demo never crashes on stage).*

---

## 3. CORE DEMO WORKFLOW (The "Golden Path" for Judges)
The system will execute this 4-step pipeline:
1. **Input:** User uploads a scanned ultrasonic pipe thickness inspection sheet (`sample_inspection.png` or `.pdf`).
2. **Step 1 (Vision Tool):** Model extracts nominal wall thickness (8.0 mm), measured thickness (3.8 mm), corrosion allowance (3.0 mm), and equipment tag (`E-101`).
3. **Step 2 (Local RAG Tool):** Agent queries local ChromaDB containing API 570 / API 510 standards to retrieve the minimum allowable retirement thickness (5.0 mm).
4. **Step 3 (Sandbox Execution Tool):** Agent writes a Python verification script, executes it in the local sandbox, and confirms that the pipe has failed safety margins (exit code 0).
5. **Step 4 (Artifact Tool):** Agent calls `python-docx` to generate a formatted MRPL Inter-Office Approval Note (`MRPL_E101_Replacement_Approval_Note.docx`).
6. **Sovereignty Badge:** A live network listener verifies 0 external WAN packets were sent during the transaction.

---

## 4. DIRECTORY & CODE STRUCTURE
```text
sih2026/
├── ARCHITECTURE_CONTRACT.md    <-- System truth document
├── backend/
│   ├── app.py                  <-- Flask API, SSE streaming, /api/network-status
│   ├── agent.py                <-- LangGraph state machine with Ollama connector
│   ├── sandbox.py              <-- Subprocess isolated code execution
│   ├── tools.py                <-- Word (.docx) generator & local RAG retriever
│   ├── uploads/                <-- Stored input inspection scans
│   └── outputs/                <-- Generated .docx / .xlsx artifacts
└── frontend/                   <-- React + TypeScript (Vite + Tailwind)
    ├── src/
    │   ├── App.tsx             <-- Split-screen workbench dashboard
    │   └── main.tsx
    └── package.json


##5. CODE GENERATION RULES FOR ANTIGRAVITY
Work file-by-file.

Do NOT alter this contract.

Always include working verification tests (if __name__ == '__main__': or CLI test checks) for every component.

Never write placeholder comments like # TODO: implement later inside core tools.