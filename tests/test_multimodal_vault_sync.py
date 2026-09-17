import os
import sys
import io
import json
import base64
import requests

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

FASTAPI_URL = "http://127.0.0.1:8000"
GATEWAY_URL = "http://localhost:3000"

def create_sample_pdf(text: str) -> bytes:
    try:
        import pypdf
        from pypdf import PdfWriter
        from reportlab.pdfgen import canvas
        buf = io.BytesIO()
        c = canvas.Canvas(buf)
        c.drawString(100, 750, "MRPL ULTRASONIC THICKNESS REPORT")
        c.drawString(100, 730, text)
        c.save()
        return buf.getvalue()
    except Exception:
        # Fallback minimal valid PDF binary
        return (
            b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
            b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
            b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\n"
            b"xref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000102 00000 n \n"
            b"trailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF"
        )

def create_sample_image() -> bytes:
    from PIL import Image
    img = Image.new("RGB", (100, 100), color=(200, 50, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

def create_sample_docx(text: str) -> bytes:
    try:
        import docx
        doc = docx.Document()
        doc.add_heading("Equipment Inspection Log - Tag V-204", 0)
        doc.add_paragraph(text)
        buf = io.BytesIO()
        doc.save(buf)
        return buf.getvalue()
    except Exception as e:
        print("DOCX creation fallback:", e)
        return b""

def test_fastapi_multimodal():
    print("\n--- [TEST 1] Testing FastAPI POST /api/analyze/multi-modal ---")
    pdf_bytes = create_sample_pdf("Equipment Tag: E-101. Measured thickness: 3.4 mm. Minimum retirement: 5.0 mm.")
    docx_bytes = create_sample_docx("Vessel V-204 internal inspection: severe localized corrosion on bottom head.")
    img1_bytes = create_sample_image()
    img2_bytes = create_sample_image()

    files = [
        ("documents", ("E101_UT_Inspection.pdf", pdf_bytes, "application/pdf")),
        ("documents", ("V204_Log.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")),
        ("images", ("Flange_Pit_Image_01.jpg", img1_bytes, "image/jpeg")),
        ("images", ("Weld_Crack_Image_02.jpg", img2_bytes, "image/jpeg"))
    ]
    data = {
        "prompt": "Evaluate wall loss and degradation for E-101 and V-204 cross-referencing inspection images and report.",
        "session_id": "test_multimodal_session_01",
        "model_name": "auto"
    }

    try:
        resp = requests.post(f"{FASTAPI_URL}/api/analyze/multi-modal", data=data, files=files, timeout=90)
    except Exception:
        # Fallback to TestClient if standalone
        import importlib.util
        from fastapi.testclient import TestClient
        app_path = os.path.join(project_root, "backend", "app.py")
        spec = importlib.util.spec_from_file_location("backend_app_main", app_path)
        backend_app_main = importlib.util.module_from_spec(spec)
        sys.modules["backend_app_main"] = backend_app_main
        spec.loader.exec_module(backend_app_main)
        client = TestClient(backend_app_main.app)
        resp = client.post("/api/analyze/multi-modal", data=data, files=files)

    print("FastAPI Response Status:", resp.status_code)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    result = resp.json()
    print("Status:", result.get("status"))
    print("Resolved Model:", result.get("resolved_model"))
    print("Processed Docs:", result.get("processed_documents"))
    print("Processed Images:", result.get("processed_images"))
    preview = result.get("analysis", "")[:250]
    print("Analysis Preview:\n", preview.encode("utf-8", errors="replace").decode("utf-8", errors="replace"), "...")
    assert len(result.get("processed_documents", [])) >= 2, "Should process at least 2 documents"
    assert len(result.get("processed_images", [])) >= 2, "Should process at least 2 images"
    assert result.get("analysis"), "Analysis output should not be empty"
    print(">>> [TEST 1 PASS] FastAPI Multi-Modal Endpoint Verified Successfully!")

def test_gateway_vault_pipeline():
    print("\n--- [TEST 2] Testing Node Gateway POST /api/chat/message & Vault Sync ---")
    pdf_bytes = create_sample_pdf("Equipment Tag: E-101. Ultrasonic Thickness Survey: 3.2 mm.")
    img1_bytes = create_sample_image()
    img2_bytes = create_sample_image()

    files = [
        ("documents", ("E101_Field_Report.pdf", pdf_bytes, "application/pdf")),
        ("images", ("Corrosion_Visual_1.jpg", img1_bytes, "image/jpeg")),
        ("images", ("Corrosion_Visual_2.jpg", img2_bytes, "image/jpeg"))
    ]
    data = {
        "message": "Verify asset integrity for E-101 based on attached report and inspection photographs.",
        "session_id": "test_gateway_session_99",
        "model_name": "auto",
        "chatTitle": "E-101 Emergency Assessment"
    }

    resp = requests.post(f"{GATEWAY_URL}/api/chat/message", data=data, files=files, timeout=60)
    print("Gateway Response Status:", resp.status_code)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    gw_result = resp.json()
    print("Gateway Vault Sync Result:", gw_result.get("vault_sync"))
    print("Gateway Resolved Model:", gw_result.get("resolved_model"))
    assert gw_result.get("vault_sync", {}).get("persisted_files_count", 0) >= 3, "All 3 files must be persisted to company_files vault"

    print("\n--- [TEST 3] Verifying GET /api/files in Gateway Vault ---")
    files_resp = requests.get(f"{GATEWAY_URL}/api/files", timeout=10)
    assert files_resp.status_code == 200, f"Expected 200, got {files_resp.status_code}"
    files_data = files_resp.json()
    print(f"Total files in vault: {files_data.get('count')}")
    vault_file_names = [f["name"] for f in files_data.get("files", [])]
    print("Recent files:", vault_file_names[:5])
    assert "E101_Field_Report.pdf" in vault_file_names, "E101_Field_Report.pdf must be in vault list"
    assert "Corrosion_Visual_1.jpg" in vault_file_names, "Corrosion_Visual_1.jpg must be in vault list"
    assert "Corrosion_Visual_2.jpg" in vault_file_names, "Corrosion_Visual_2.jpg must be in vault list"
    print(">>> [TEST 2 & 3 PASS] Gateway Vault Pipeline & Sync Verified Successfully!")

if __name__ == "__main__":
    test_fastapi_multimodal()
    test_gateway_vault_pipeline()
    print("\n==========================================")
    print("ALL MULTI-MODAL & VAULT SYNC TESTS PASSED!")
    print("==========================================")
