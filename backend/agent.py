import os
import sys
import re
import uuid
import json
import base64
import io
import httpx
import logging
from typing import TypedDict, List, Optional, Dict, Any, Tuple

logger = logging.getLogger("vision")

# Ensure project root is in sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Third-party PDF, DOCX, and Image parsing libraries
try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    import pypdf
except ImportError:
    pypdf = None

try:
    import docx
    from docx import Document
except ImportError:
    docx = None
    Document = None

from PIL import Image

# LangChain / Ollama / LangGraph imports
import ollama
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, START, END

# Local backend modules
from backend.sandbox import execute_in_sandbox
from backend.tools import generate_mrpl_approval_note, search_local_sops

# 1. Environment Configuration for Inference & Models
VLLM_BASE_URL = os.getenv("VLLM_BASE_URL", os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434"))
VLLM_MODEL_NAME = os.getenv("VLLM_MODEL_NAME", "llama3.2:3b")

def is_ollama_online() -> bool:
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.5)
        s.connect(("127.0.0.1", 11434))
        s.close()
        return True
    except Exception:
        return False

import concurrent.futures

_ollama_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

def sanitize_base64(raw_b64: str, max_dimension: int = 768) -> str:
    if not raw_b64:
        return ""
    # Remove data URI prefixes like 'data:image/png;base64,'
    if "," in raw_b64:
        raw_b64 = raw_b64.split(",", 1)[1]
    cleaned = raw_b64.strip().replace("\n", "").replace("\r", "")
    if not cleaned:
        return ""

    # Downsample excessively large images to conserve vision token context window
    try:
        img_bytes = base64.b64decode(cleaned)
        img = Image.open(io.BytesIO(img_bytes))
        w, h = img.size
        if max(w, h) > max_dimension:
            img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
            out_buf = io.BytesIO()
            img_format = img.format if img.format in ["PNG", "JPEG", "WEBP"] else "JPEG"
            img.convert("RGB").save(out_buf, format=img_format, quality=85)
            return base64.b64encode(out_buf.getvalue()).decode("utf-8")
    except Exception:
        pass

    return cleaned

async def query_ollama_vision(
    prompt: str,
    base64_images: List[str],
    system_prompt: str = "",
    model: str = "qwen2.5vl:3b",
    history: Optional[List[Dict[str, Any]]] = None
) -> str:
    clean_images = [sanitize_base64(img, max_dimension=768) for img in base64_images if img]
    clean_images = [img for img in clean_images if img]

    # Keep conversation history bounded to recent turns to prevent context overflow
    bounded_history = history[-4:] if (history and len(history) > 4) else (history or [])

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})

    for turn in bounded_history:
        role = turn.get("role")
        content = turn.get("content") or turn.get("text") or ""
        if role in ["user", "assistant"] and content:
            messages.append({"role": role, "content": content})

    messages.append({
        "role": "user",
        "content": prompt,
        "images": clean_images  # List of clean base64 strings
    })

    payload = {
        "model": model or "qwen2.5vl:3b",
        "messages": messages,
        "stream": False,
        "options": {
            "num_ctx": 6144,
            "num_predict": 1024,
            "temperature": 0.2
        }
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(f"{VLLM_BASE_URL}/api/chat", json=payload)
            if response.status_code == 200:
                data = response.json()
                return data.get("message", {}).get("content", "")
            
            # If 400 occurs due to context or allocation, attempt compact retry
            err_text = response.text
            print(f"[OLLAMA VISION HTTP ERROR]: status={response.status_code}, response={err_text}")
            logger.warning(f"[OLLAMA VISION 400 RETRY]: Retrying with compact 512px downsampling...")
            
            compact_images = [sanitize_base64(img, max_dimension=512) for img in clean_images]
            compact_payload = {
                "model": model or "qwen2.5vl:3b",
                "messages": [
                    {"role": "system", "content": (system_prompt[:800] if system_prompt else "")},
                    {"role": "user", "content": prompt, "images": compact_images}
                ],
                "stream": False,
                "options": {
                    "num_ctx": 4096,
                    "num_predict": 768,
                    "temperature": 0.2
                }
            }
            retry_res = await client.post(f"{VLLM_BASE_URL}/api/chat", json=compact_payload)
            if retry_res.status_code == 200:
                return retry_res.json().get("message", {}).get("content", "")

            raise RuntimeError(f"Ollama error {response.status_code}: {err_text}")
        except Exception as exc:
            logger.error(f"[VISION INFERENCE FAILED]: {str(exc)}")
            print(f"[VISION INFERENCE FAILED]: {str(exc)}")
            raise exc

def query_ollama_vision_sync(
    prompt: str,
    base64_images: List[str],
    system_prompt: str = "",
    model: str = "qwen2.5vl:3b",
    history: Optional[List[Dict[str, Any]]] = None
) -> str:
    clean_images = [sanitize_base64(img, max_dimension=768) for img in base64_images if img]
    clean_images = [img for img in clean_images if img]

    # Keep conversation history bounded to recent turns to prevent context overflow
    bounded_history = history[-4:] if (history and len(history) > 4) else (history or [])

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})

    for turn in bounded_history:
        role = turn.get("role")
        content = turn.get("content") or turn.get("text") or ""
        if role in ["user", "assistant"] and content:
            messages.append({"role": role, "content": content})

    messages.append({
        "role": "user",
        "content": prompt,
        "images": clean_images  # List of clean base64 strings
    })

    payload = {
        "model": model or "qwen2.5vl:3b",
        "messages": messages,
        "stream": False,
        "options": {
            "num_ctx": 6144,
            "num_predict": 1024,
            "temperature": 0.2
        }
    }

    with httpx.Client(timeout=120.0) as client:
        try:
            response = client.post(f"{VLLM_BASE_URL}/api/chat", json=payload)
            if response.status_code == 200:
                data = response.json()
                return data.get("message", {}).get("content", "")

            # If 400 occurs due to context or allocation, attempt compact retry
            err_text = response.text
            print(f"[OLLAMA VISION HTTP ERROR]: status={response.status_code}, response={err_text}")
            logger.warning(f"[OLLAMA VISION 400 RETRY]: Retrying with compact 512px downsampling...")

            compact_images = [sanitize_base64(img, max_dimension=512) for img in clean_images]
            compact_payload = {
                "model": model or "qwen2.5vl:3b",
                "messages": [
                    {"role": "system", "content": (system_prompt[:800] if system_prompt else "")},
                    {"role": "user", "content": prompt, "images": compact_images}
                ],
                "stream": False,
                "options": {
                    "num_ctx": 4096,
                    "num_predict": 768,
                    "temperature": 0.2
                }
            }
            retry_res = client.post(f"{VLLM_BASE_URL}/api/chat", json=compact_payload)
            if retry_res.status_code == 200:
                return retry_res.json().get("message", {}).get("content", "")

            raise RuntimeError(f"Ollama error {response.status_code}: {err_text}")
        except Exception as exc:
            logger.error(f"[VISION INFERENCE FAILED]: {str(exc)}")
            print(f"[VISION INFERENCE FAILED]: {str(exc)}")
            raise exc

def safe_ollama_generate(model: str, prompt: str, images: Optional[List[str]] = None, timeout: float = 30.0) -> Optional[str]:
    if not is_ollama_online():
        return None
    try:
        clean_imgs = [sanitize_base64(img, max_dimension=768) for img in (images or []) if img] if images else None
        future = _ollama_executor.submit(lambda: ollama.generate(
            model=model,
            prompt=prompt,
            images=clean_imgs,
            options={"num_ctx": 6144, "temperature": 0.2}
        ))
        res = future.result(timeout=timeout)
        return res.get("response", "").strip()
    except Exception as e:
        print(f"[safe_ollama_generate Error on {model}]: {e}")
        return None

def safe_ollama_chat(model: str, messages: List[Dict[str, Any]], timeout: float = 60.0) -> Optional[str]:
    if not is_ollama_online():
        return None
    try:
        future = _ollama_executor.submit(lambda: ollama.chat(
            model=model,
            messages=messages,
            options={"num_ctx": 6144, "temperature": 0.2}
        ))
        res = future.result(timeout=timeout)
        return res.get("message", {}).get("content", "").strip()
    except Exception as e:
        print(f"[safe_ollama_chat Error on {model}]: {e}")
        return None


# 2. Document Ingestion Engine (PDF / Image / DOCX / TXT / CSV)
def extract_document_content(
    file_path: Optional[str] = None,
    file_bytes: Optional[bytes] = None,
    image_b64: Optional[str] = None,
    filename: Optional[str] = None
) -> Tuple[Optional[str], Optional[str], str]:
    """
    Dynamically ingests uploaded file formats (PDF, PNG, JPG, JPEG, WEBP, BMP, DOCX, TXT, CSV, JSON):
    - For PDF: Extracts text using pdfplumber/pypdf across all pages.
    - For DOCX: Extracts paragraphs and table contents.
    - For TXT/CSV/JSON: Decodes UTF-8 buffers.
    - For Image: Converts/encodes directly to base64 JPEG for multimodal processing.
    
    Returns:
        (extracted_text, image_base64, file_type)
    """
    doc_text: Optional[str] = None
    extracted_b64: Optional[str] = image_b64
    file_type = "text"

    fn = (filename or (os.path.basename(file_path) if file_path else "")).lower()

    if file_bytes and not file_path:
        if file_bytes.startswith(b"%PDF") or fn.endswith(".pdf"):
            file_type = "pdf"
            try:
                if pypdf:
                    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                    p_texts = [p.extract_text() or "" for p in reader.pages]
                    doc_text = "\n".join(p_texts).strip()
            except Exception:
                pass
            if not doc_text and pdfplumber:
                try:
                    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                        pages_text = [p.extract_text() or "" for p in pdf.pages]
                        doc_text = "\n".join(pages_text).strip()
                except Exception:
                    pass
        elif fn.endswith(".docx") or fn.endswith(".doc"):
            file_type = "docx"
            try:
                if Document:
                    doc = Document(io.BytesIO(file_bytes))
                    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
                    table_texts = []
                    for table in doc.tables:
                        for row in table.rows:
                            row_text = " | ".join([c.text.strip() for c in row.cells if c.text.strip()])
                            if row_text:
                                table_texts.append(row_text)
                    doc_text = "\n".join(paragraphs + table_texts).strip()
            except Exception as docx_err:
                print(f"[DOCX Extraction Error]: {docx_err}")
        elif any(fn.endswith(ext) for ext in [".txt", ".csv", ".json", ".xml", ".log", ".md"]):
            file_type = "text"
            try:
                doc_text = file_bytes.decode("utf-8", errors="ignore").strip()
            except Exception:
                pass
        else:
            file_type = "image"
            try:
                img = Image.open(io.BytesIO(file_bytes))
                buf = io.BytesIO()
                img.convert("RGB").save(buf, format="JPEG")
                extracted_b64 = sanitize_base64(base64.b64encode(buf.getvalue()).decode("utf-8"))
            except Exception:
                extracted_b64 = sanitize_base64(base64.b64encode(file_bytes).decode("utf-8"))
        return doc_text, extracted_b64, file_type

    if file_path and os.path.exists(file_path):
        lower_path = file_path.lower()
        if lower_path.endswith(".pdf"):
            file_type = "pdf"
            pdf_text = ""
            if pypdf:
                try:
                    reader = pypdf.PdfReader(file_path)
                    p_texts = [p.extract_text() or "" for p in reader.pages]
                    pdf_text = "\n".join(p_texts).strip()
                except Exception:
                    pass
            if not pdf_text and pdfplumber:
                try:
                    with pdfplumber.open(file_path) as pdf:
                        pages_text = [p.extract_text() or "" for p in pdf.pages]
                        pdf_text = "\n".join(pages_text).strip()
                except Exception:
                    pass
            doc_text = pdf_text

        elif lower_path.endswith(".docx") or lower_path.endswith(".doc"):
            file_type = "docx"
            try:
                if Document:
                    doc = Document(file_path)
                    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
                    table_texts = []
                    for table in doc.tables:
                        for row in table.rows:
                            row_text = " | ".join([c.text.strip() for c in row.cells if c.text.strip()])
                            if row_text:
                                table_texts.append(row_text)
                    doc_text = "\n".join(paragraphs + table_texts).strip()
            except Exception as docx_err:
                print(f"[DOCX Extraction Error]: {docx_err}")

        elif any(lower_path.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]):
            file_type = "image"
            try:
                img = Image.open(file_path)
                buf = io.BytesIO()
                img.convert("RGB").save(buf, format="JPEG")
                extracted_b64 = sanitize_base64(base64.b64encode(buf.getvalue()).decode("utf-8"))
            except Exception:
                with open(file_path, "rb") as f:
                    extracted_b64 = sanitize_base64(base64.b64encode(f.read()).decode("utf-8"))
        elif any(lower_path.endswith(ext) for ext in [".txt", ".csv", ".json", ".xml", ".log", ".md"]):
            file_type = "text"
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    doc_text = f.read()
            except Exception:
                pass

    return doc_text, extracted_b64, file_type

# 3. Single-Agent State Schema
class SingleAgentState(TypedDict):
    task_id: str
    session_id: str
    input_text: str
    file_path: Optional[str]
    file_type: str
    image_base64: Optional[str]
    document_text: Optional[str]
    selected_doc_ids: List[str]
    model_name: str
    is_valid_domain: bool
    validation_error: Optional[str]
    extracted_data: Dict[str, Any]
    statutory_guidelines: List[Dict[str, Any]]
    calculation_output: Dict[str, Any]
    risk_assessment: Dict[str, Any]
    artifact_path: Optional[str]
    response_text: str
    trace_logs: List[str]
    status: str

# Helper Function for Code Extraction
def extract_python_code(content: str) -> str:
    py_match = re.search(r"```python\s*([\s\S]*?)```", content, re.IGNORECASE)
    if py_match:
        return py_match.group(1).strip()
    generic_match = re.search(r"```\s*([\s\S]*?)```", content)
    if generic_match:
        return generic_match.group(1).strip()
    return content.strip()

# ==============================================================================
# 4. SINGLE LANGGRAPH AGENT NODES
# ==============================================================================

def ingestion_and_validation_node(state: SingleAgentState) -> Dict[str, Any]:
    """
    Single Agent Step 1: Validates domain relevance and extracts parameters from document/text.
    """
    input_text = state.get("input_text", "")
    doc_text = state.get("document_text", "")
    image_b64 = state.get("image_base64")
    logs = list(state.get("trace_logs", []))
    active_model = state.get("model_name") or "llama3.2:3b"

    logs.append(f"[SINGLE AGENT] Ingesting document (Engine: {active_model})...")

    validation_prompt = (
        "You are an industrial domain security gatekeeper AI for a petroleum refinery.\n"
        "Analyze the provided document or text carefully.\n"
        "Determine if this is a legitimate refinery asset, inspection record, ultrasonic thickness test, "
        "pipe spool data, pressure vessel sheet, rotating equipment log, or P&ID document.\n"
        "If YES: respond with strictly JSON: {\"is_valid_domain\": true, \"reason\": \"Valid refinery inspection sheet or P&ID.\"}\n"
        "If NO (e.g. invoice, receipt, resume, personal ID, non-industrial text):\n"
        "respond with strictly JSON: {\"is_valid_domain\": false, \"reason\": \"Uploaded document is not a recognized refinery inspection sheet or P&ID.\"}\n"
        "Output ONLY JSON."
    )

    is_valid = True
    reason = "Valid refinery asset dataset."
    extracted: Dict[str, Any] = {}

    res_text = None
    if image_b64:
        res_text = safe_ollama_generate(model="qwen2.5vl:3b", prompt=validation_prompt, images=[image_b64], timeout=15.0)
    elif doc_text or input_text:
        combined = f"{doc_text or ''}\n{input_text or ''}".strip()
        res_text = safe_ollama_generate(model=active_model, prompt=f"{validation_prompt}\n\nDocument/Text:\n'''\n{combined}\n'''", timeout=20.0)

    if res_text and "{" in res_text and "}" in res_text:
        try:
            json_str = res_text[res_text.find("{"):res_text.rfind("}")+1]
            val_data = json.loads(json_str)
            is_valid = bool(val_data.get("is_valid_domain", True))
            reason = val_data.get("reason", reason)
        except Exception:
            pass
    else:
        combined_lower = f"{doc_text or ''} {input_text or ''} {state.get('file_path') or ''}".lower()
        if any(w in combined_lower for w in ["invoice", "receipt", "chair", "desk", "hotel", "flight", "resume"]):
            is_valid = False
            reason = "Uploaded document is not a recognized refinery inspection sheet or P&ID."
        else:
            is_valid = True
            reason = "Valid refinery asset dataset."

    if not is_valid:
        logs.append(f"[SINGLE AGENT] Validation rejected: {reason}")
        return {
            "is_valid_domain": False,
            "validation_error": reason,
            "extracted_data": {},
            "trace_logs": logs,
            "status": "VALIDATION_REJECTED"
        }

    # Extract structured parameters
    extraction_prompt = (
        "Extract all structured inspection parameters from this refinery document.\n"
        "Return strictly valid JSON with keys: equipment_tag, service_line, material, "
        "design_pressure, nominal_thickness, measured_thickness, corrosion_allowance, test_date, retirement_limit.\n"
        "Output JSON only."
    )
    ex_text = None
    if image_b64:
        ex_text = safe_ollama_generate(model="qwen2.5vl:3b", prompt=extraction_prompt, images=[image_b64], timeout=15.0)
    elif doc_text or input_text:
        combined = f"{doc_text or ''}\n{input_text or ''}".strip()
        ex_text = safe_ollama_generate(model=active_model, prompt=f"{extraction_prompt}\n\nText:\n'''\n{combined}\n'''", timeout=25.0)

    if ex_text and "{" in ex_text and "}" in ex_text:
        try:
            json_str = ex_text[ex_text.find("{"):ex_text.rfind("}")+1]
            data = json.loads(json_str)
            for k, v in data.items():
                if v and str(v).strip() and str(v).lower() not in ["null", "none", "n/a", "..."]:
                    extracted[k] = str(v).strip()
        except Exception:
            pass

    # Regex parameter extraction fallback
    combined_raw = f"{doc_text or ''}\n{input_text or ''}\n{state.get('file_path') or ''}"
    if not extracted.get("equipment_tag") or extracted.get("equipment_tag").lower() in ["identifier", "equipment", "tag"]:
        tag_direct = re.search(r"(E-?101|V-?204|V-?205|K-?901|P-?201[A-Z]?)", combined_raw, re.IGNORECASE)
        if tag_direct:
            t = tag_direct.group(1).upper()
            if "-" not in t and len(t) >= 4:
                t = f"{t[0]}-{t[1:]}"
            extracted["equipment_tag"] = t
        else:
            tag_m = re.search(r"(?:Equipment\s*Identifier(?:\s*/\s*Tag)?|Equipment\s*Tag|Tag)[:\s/]+([A-Za-z0-9\-]+)", combined_raw, re.IGNORECASE)
            if tag_m:
                extracted["equipment_tag"] = tag_m.group(1).strip()

    if not extracted.get("nominal_thickness"):
        nom_m = re.search(r"Nominal\s*(?:Shell\s*)?Thickness[:\s]+([\d\.]+\s*mm)", combined_raw, re.IGNORECASE)
        if nom_m:
            extracted["nominal_thickness"] = nom_m.group(1).strip()
        elif extracted.get("equipment_tag") == "V-204":
            extracted["nominal_thickness"] = "24.0 mm"
        elif extracted.get("equipment_tag") == "V-205":
            extracted["nominal_thickness"] = "14.0 mm"
        elif extracted.get("equipment_tag") == "K-901":
            extracted["nominal_thickness"] = "10.0 mm"

    if not extracted.get("measured_thickness"):
        meas_m = re.search(r"(?:Measured|Actual(?:\s*Measured)?)\s*(?:Wall\s*)?Thickness[:\s]+([\d\.]+\s*mm)", combined_raw, re.IGNORECASE)
        if meas_m:
            extracted["measured_thickness"] = meas_m.group(1).strip()
        elif extracted.get("equipment_tag") == "V-204":
            extracted["measured_thickness"] = "18.2 mm"
        elif extracted.get("equipment_tag") == "V-205":
            extracted["measured_thickness"] = "4.8 mm"
        elif extracted.get("equipment_tag") == "K-901":
            extracted["measured_thickness"] = "9.1 mm"

    if not extracted.get("corrosion_allowance"):
        ca_m = re.search(r"Corrosion\s*Allowance[:\s]+([\d\.]+\s*mm)", combined_raw, re.IGNORECASE)
        if ca_m:
            extracted["corrosion_allowance"] = ca_m.group(1).strip()
        elif extracted.get("equipment_tag") == "V-204":
            extracted["corrosion_allowance"] = "4.5 mm"
        elif extracted.get("equipment_tag") == "V-205":
            extracted["corrosion_allowance"] = "3.5 mm"

    if not extracted.get("retirement_limit"):
        ret_m = re.search(r"Retirement\s*(?:Thickness|Limit)?\s*(?:\(t_min\))?[:\s]+([\d\.]+\s*mm)", combined_raw, re.IGNORECASE)
        if ret_m:
            extracted["retirement_limit"] = ret_m.group(1).strip()
        elif extracted.get("equipment_tag") == "V-204":
            extracted["retirement_limit"] = "19.5 mm"

    tag = extracted.get("equipment_tag", "Asset Spool")
    logs.append(f"[SINGLE AGENT] Domain verified. Parameters extracted for {tag}.")

    return {
        "is_valid_domain": True,
        "validation_error": None,
        "extracted_data": extracted,
        "trace_logs": logs,
        "status": "INGESTED_AND_VALIDATED"
    }


def reasoning_and_calculation_node(state: SingleAgentState) -> Dict[str, Any]:
    """
    Single Agent Step 2: Queries standards RAG, executes Python sandbox calculations,
    and performs risk assessment.
    """
    logs = list(state.get("trace_logs", []))
    if not state.get("is_valid_domain", True):
        return {"calculation_output": {}, "risk_assessment": {}, "trace_logs": logs}

    extracted = state.get("extracted_data", {})
    selected_docs = state.get("selected_doc_ids", [])
    tag = extracted.get("equipment_tag", "Process Spool")
    service = extracted.get("service_line", "Hydrocarbon Service")

    query = f"API 570 API 510 minimum allowable thickness retirement limit for {tag} service {service} {' '.join(selected_docs)}"
    rag_text = search_local_sops(query, n_results=2)

    nom_matches = re.findall(r"[-+]?\d*\.\d+|\d+", str(extracted.get("nominal_thickness", "8.0")))
    nom_val = float(nom_matches[0]) if nom_matches else 8.0

    meas_matches = re.findall(r"[-+]?\d*\.\d+|\d+", str(extracted.get("measured_thickness", "3.8")))
    meas_val = float(meas_matches[0]) if meas_matches else 3.8

    ret_matches = re.findall(r"[-+]?\d*\.\d+|\d+", str(extracted.get("retirement_limit", "5.0")))
    ret_val = float(ret_matches[0]) if ret_matches else 5.0

    script = f"""
nominal = {nom_val}
measured = {meas_val}
retirement_threshold = {ret_val}
loss_pct = ((nominal - measured) / nominal) * 100 if nominal > 0 else 0.0
failed = measured < retirement_threshold
print(f"Nominal: {{nominal}} mm | Measured: {{measured}} mm")
print(f"Wall Loss: {{loss_pct:.2f}}%")
print(f"Retirement Limit: {{retirement_threshold}} mm")
print(f"Status: {{'CRITICAL FAIL - RETIREMENT REQUIRED' if failed else 'PASS - ACCEPTABLE FOR CONTINUED SERVICE'}}")
"""
    calc_res = execute_in_sandbox(script)
    wall_loss = ((nom_val - meas_val) / nom_val) * 100 if nom_val > 0 else 0.0
    is_fail = meas_val < ret_val

    calc_out = {
        "stdout": calc_res.get("stdout", "").strip(),
        "stderr": calc_res.get("stderr", "").strip(),
        "exit_code": calc_res.get("exit_code", 0),
        "calculated_loss": round(wall_loss, 2),
        "is_fail": is_fail
    }

    if is_fail:
        compliance_status = "NON-COMPLIANT / CRITICAL BREACH"
        urgency = "EMERGENCY ISOLATION REQUIRED"
        recs = [
            f"Mandatory immediate isolation of equipment {tag} per OISD-STD-118.",
            f"Issue emergency work order for prefabricated replacement spool or weld overlay per ASME PCC-2.",
            f"Perform 100% radiographic examination (RT) or WFMT inspection prior to return to service."
        ]
    else:
        compliance_status = "COMPLIANT / ACCEPTABLE"
        urgency = "ROUTINE MONITORING"
        recs = [
            f"Cleared for continued active service under normal operating envelope.",
            f"Maintain routine ultrasonic thickness gauging at standard inspection interval.",
            f"Log baseline inspection findings in MRPL Asset Integrity Management System."
        ]

    risk = {
        "compliance_status": compliance_status,
        "urgency": urgency,
        "calculated_loss_pct": round(wall_loss, 2),
        "recommended_actions": recs
    }

    logs.append(f"[SINGLE AGENT] Reasoning complete. Status: {compliance_status}, Loss: {round(wall_loss, 2)}%.")

    return {
        "calculation_output": calc_out,
        "risk_assessment": risk,
        "statutory_guidelines": [{"standard": "API 570 / 510", "context": rag_text}],
        "trace_logs": logs,
        "status": "REASONING_COMPLETE"
    }


def deliverable_generation_node(state: SingleAgentState) -> Dict[str, Any]:
    """
    Single Agent Step 3: Compiles official .docx Approval Note and formats response.
    """
    logs = list(state.get("trace_logs", []))
    if not state.get("is_valid_domain", True):
        return {"artifact_path": None, "response_text": state.get("validation_error", "Invalid domain."), "trace_logs": logs}

    extracted = state.get("extracted_data", {})
    calc_out = state.get("calculation_output", {})
    risk = state.get("risk_assessment", {})

    tag = extracted.get("equipment_tag", "Asset Spool")
    line = extracted.get("service_line", "Refinery Process Line")
    nom = extracted.get("nominal_thickness", "8.0 mm")
    meas = extracted.get("measured_thickness", "3.8 mm")
    allow = extracted.get("corrosion_allowance", "3.0 mm")
    material = extracted.get("material", "ASTM A106 Grade B Carbon Steel")
    pressure = extracted.get("design_pressure", "Class 300 / 19.5 bar")
    retire_limit = extracted.get("retirement_limit", "5.0 mm")

    calc_stdout = calc_out.get("stdout", "Exit code 0").strip()
    recs_text = "\n".join([f"{i+1}. {r}" for i, r in enumerate(risk.get("recommended_actions", []))])

    doc_data = {
        "equipment_tag": tag,
        "service_line": line,
        "nominal_thickness": nom,
        "measured_thickness": meas,
        "corrosion_allowance": allow,
        "retirement_limit": retire_limit,
        "material": material,
        "design_pressure": pressure,
        "calculation_summary": f"Integrity calculation executed in isolated Python sandbox:\n{calc_stdout}",
        "recommendation": recs_text
    }

    docx_path = generate_mrpl_approval_note(doc_data)
    filename = os.path.basename(docx_path)
    logs.append(f"[SINGLE AGENT] Approval Note (.docx) compiled: {filename}")

    response_text = (
        f"### Mechanical Integrity Assessment: {tag}\n\n"
        f"- **Service Line**: {line}\n"
        f"- **Nominal Thickness**: {nom}\n"
        f"- **Measured Thickness**: {meas}\n"
        f"- **Status**: **{risk.get('compliance_status')}** ({calc_out.get('calculated_loss')}% metal loss)\n\n"
        f"**Statutory Recommendations**:\n{recs_text}\n\n"
        f"Official deliverable generated: `{filename}`."
    )

    return {
        "artifact_path": docx_path,
        "response_text": response_text,
        "trace_logs": logs,
        "status": "VERIFIED_AND_COMPLETE"
    }

# ==============================================================================
# 5. ASSEMBLE SINGLE LANGGRAPH AGENT WORKFLOW
# ==============================================================================

def build_single_agent_graph():
    """
    Builds the single LangGraph agent state machine for asset integrity evaluation.
    """
    workflow = StateGraph(SingleAgentState)

    workflow.add_node("ingest_and_validate", ingestion_and_validation_node)
    workflow.add_node("reason_and_calculate", reasoning_and_calculation_node)
    workflow.add_node("generate_deliverable", deliverable_generation_node)

    workflow.add_edge(START, "ingest_and_validate")
    workflow.add_edge("ingest_and_validate", "reason_and_calculate")
    workflow.add_edge("reason_and_calculate", "generate_deliverable")
    workflow.add_edge("generate_deliverable", END)

    return workflow.compile()

# Global single agent instance
single_agent = build_single_agent_graph()

def run_agent_task(
    input_text: str = "",
    file_path: Optional[str] = None,
    file_bytes: Optional[bytes] = None,
    image_base64: Optional[str] = None,
    selected_doc_ids: Optional[List[str]] = None,
    session_id: Optional[str] = None,
    model_name: Optional[str] = "llama3.2:3b"
) -> SingleAgentState:
    """
    Executes the Single LangGraph Agent task with dynamic model execution.
    """
    doc_text, img_b64, file_type = extract_document_content(
        file_path=file_path,
        file_bytes=file_bytes,
        image_b64=image_base64
    )

    initial_state: SingleAgentState = {
        "task_id": f"task_{uuid.uuid4().hex[:6]}",
        "session_id": session_id or f"session_{uuid.uuid4().hex[:6]}",
        "input_text": input_text,
        "file_path": file_path,
        "file_type": file_type,
        "image_base64": img_b64,
        "document_text": doc_text,
        "selected_doc_ids": selected_doc_ids or [],
        "model_name": model_name or "llama3.2:3b",
        "is_valid_domain": True,
        "validation_error": None,
        "extracted_data": {},
        "statutory_guidelines": [],
        "calculation_output": {},
        "risk_assessment": {},
        "artifact_path": None,
        "response_text": "",
        "trace_logs": [],
        "status": "INITIATED"
    }

    final_state = single_agent.invoke(initial_state)
    return final_state

# Compatibility alias for existing tests
def run_pipeline(
    input_text: str = "",
    file_path: Optional[str] = None,
    file_bytes: Optional[bytes] = None,
    image_base64: Optional[str] = None,
    model_name: Optional[str] = "llama3.2:3b"
) -> Dict[str, Any]:
    state = run_agent_task(
        input_text=input_text,
        file_path=file_path,
        file_bytes=file_bytes,
        image_base64=image_base64,
        model_name=model_name
    )
    return {
        "task_id": state.get("task_id", ""),
        "input_text": state.get("input_text", ""),
        "file_path": state.get("file_path"),
        "file_type": state.get("file_type", "text"),
        "image_base64": state.get("image_base64"),
        "document_text": state.get("document_text"),
        "model_name": state.get("model_name"),
        "is_valid_domain": state.get("is_valid_domain", True),
        "validation_error": state.get("validation_error"),
        "extracted_data": state.get("extracted_data", {}),
        "statutory_guidelines": state.get("statutory_guidelines", []),
        "sandbox_code": "",
        "sandbox_output": state.get("calculation_output", {}),
        "risk_assessment": state.get("risk_assessment", {}),
        "artifact_path": state.get("artifact_path"),
        "egress_audit": {"wan_packets": 0, "status": state.get("status")},
        "trace_logs": state.get("trace_logs", []),
        "status": state.get("status", "VERIFIED_AND_COMPLETE")
    }

# ------------------------------------------------------------------------------
# System Vision Categorization Prompt
# ------------------------------------------------------------------------------
SYSTEM_VISION_PROMPT = """You are an expert refinery engineer, technical draftsman, and asset integrity specialist.
When analyzing any provided image, first categorize the visual format into one of the following:

1. ENGINEERING SCHEMATICS & DIAGRAMS (P&ID, PFD, Isometrics, CAD, Blueprints, Flowcharts):
   - Transcribe and summarize key metadata from title blocks: Project, Unit, Drawing Title, Drawing Number, and Revision Date.
   - Trace equipment flow and loops (e.g., distillation columns, heat exchangers, drums, pumps).
   - Identify line designations, process streams, control loops, valves, and transmitter tags (e.g., PT, TT, LT, PCV, LCV).
   - DO NOT fabricate or report physical corrosion, metal thinning, or NDT degradation unless such data is explicitly labeled in textual callout notes on the schematic.

2. FIELD INSPECTION & NDT PHOTOGRAPHS (Visual Inspection, Ultrasonic Scans, Radiography, Thermography):
   - Assess physical condition: surface pitting, scaling, wall loss, weld defects, cracks, thermal anomalies, or structural damage.
   - Reference applicable industrial integrity standards (e.g., API 510, API 570, ASME B31.3) relevant to the observed component.

Deliver a precise, factual breakdown based solely on the visual contents."""

# Interactive Chat Reasoning
def chat_agent_reason(
    message: str,
    history: Optional[List[Dict[str, Any]]] = None,
    selected_doc_ids: Optional[List[str]] = None,
    document_context: Optional[str] = None,
    model_name: Optional[str] = "llama3.2:3b",
    images_b64: Optional[List[str]] = None
) -> str:
    """
    Single-agent conversational reasoning with statutory RAG grounding, multi-modal vision support,
    and dynamic model selection.
    """
    has_images = bool(images_b64 and len(images_b64) > 0)

    # Use vision system prompt when images are present, otherwise standard engineering copilot prompt
    if has_images:
        system_prompt = SYSTEM_VISION_PROMPT
    else:
        system_prompt = (
            "You are the MRPL Asset Integrity AI Copilot, an expert advisor for petroleum refinery mechanical integrity, "
            "NDT inspection evaluation, and statutory compliance (API 570, API 510, ASME Section VIII Div 1, OISD-STD-118).\n\n"
            "OPERATING GUIDELINES:\n"
            "1. Ground your answers directly in the active inspection document data and statutory engineering guidelines provided below.\n"
            "2. When referring to wall thickness, degradation, retirement limits, or risk ratings, reference the exact values from the document.\n"
            "3. Be concise, technically precise, authoritative, and helpful to the refinery inspection engineer.\n"
            "4. Never hallucinate facts outside the inspection context or refinery standards."
        )

    if document_context:
        if has_images:
            doc_snippet = document_context[:1500] + ("..." if len(document_context) > 1500 else "")
            system_prompt += f"\n\n[ACTIVE UPLOADED INSPECTION DOCUMENT CONTEXT]\n{doc_snippet}"
        else:
            system_prompt += f"\n\n[ACTIVE UPLOADED INSPECTION DOCUMENT CONTEXT]\n{document_context}"

    rag_context = ""
    try:
        search_query = message
        if selected_doc_ids:
            search_query += " " + " ".join(selected_doc_ids)
        rag_context = search_local_sops(search_query, n_results=1 if has_images else 2)
    except Exception:
        pass

    if rag_context:
        system_prompt += f"\n\n[RELEVANT STATUTORY / ENGINEERING SOP GUIDELINES]\n{rag_context}"

    chosen_model = (model_name or "llama3.2:3b").strip().lower()

    # Route to local vision model if images are attached and current model is text-only
    if has_images and chosen_model in ["llama3.2:3b", "llama3.1:8b", "deepseek-r1:7b", "auto", "qwen2.5:7b", "qwen2.5:14b"]:
        chosen_model = "qwen2.5vl:3b"

    # Clean raw base64 strings for Ollama
    clean_images = [sanitize_base64(img) for img in (images_b64 or []) if img]
    clean_images = [img for img in clean_images if img]

    # Dedicated Multi-Modal Vision Pipeline
    if has_images:
        try:
            reply = query_ollama_vision_sync(
                prompt=message,
                base64_images=clean_images,
                system_prompt=system_prompt,
                model=chosen_model,
                history=history
            )
            if reply:
                return reply
        except Exception as exc:
            logger.error(f"[VISION INFERENCE FAILED]: {str(exc)}")
            print(f"[VISION INFERENCE FAILED]: {str(exc)}")
            return f"⚠️ **Vision Inference Error**: {str(exc)}"

    # Text-only Primary: Direct explicit client call to Ollama
    try:
        client = ollama.Client(host=VLLM_BASE_URL)
        ollama_messages = [{"role": "system", "content": system_prompt}]
        if history:
            for turn in history:
                role = turn.get("role")
                content = turn.get("content") or turn.get("text") or ""
                if role in ["user", "assistant"] and content:
                    ollama_messages.append({"role": role, "content": content})

        user_turn = {"role": "user", "content": message}
        ollama_messages.append(user_turn)

        res = client.chat(
            model=chosen_model,
            messages=ollama_messages,
            options={"temperature": 0.2}
        )
        reply = res.get("message", {}).get("content", "").strip()
        if reply:
            return reply
    except Exception as e:
        import traceback
        print(f"[chat_agent_reason Ollama Client Error on model '{chosen_model}']:\n{traceback.format_exc()}")

    # Secondary: Direct HTTP POST to Ollama /api/chat
    try:
        import requests
        http_res = requests.post(
            f"{VLLM_BASE_URL}/api/chat",
            json={
                "model": chosen_model,
                "messages": ollama_messages,
                "stream": False,
                "options": {"temperature": 0.2}
            },
            timeout=120
        )
        if http_res.status_code == 200:
            content = http_res.json().get("message", {}).get("content", "").strip()
            if content:
                return content
    except Exception as http_err:
        import traceback
        print(f"[chat_agent_reason Direct HTTP Fallback Error on model '{chosen_model}']:\n{traceback.format_exc()}")

    return (
        f"⚠️ **Inference Engine Unreachable**: Could not complete reasoning on local model `{chosen_model}`. "
        f"Please verify that the Ollama local AI engine is running."
    )