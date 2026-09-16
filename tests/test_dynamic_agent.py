import os
import sys
import io
import json
import base64
import reportlab.pdfgen.canvas as canvas
from PIL import Image, ImageDraw

# Ensure project root is in sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.agent import run_pipeline, extract_document_content
from backend.tools import generate_mrpl_approval_note

TEST_UPLOADS_DIR = os.path.join(project_root, "backend", "uploads")
os.makedirs(TEST_UPLOADS_DIR, exist_ok=True)


def test_1_dynamic_pdf_extraction():
    print("\n=======================================================")
    print("TEST 1: DYNAMIC PDF DOCUMENT INGESTION & 7-AGENT SWARM")
    print("=======================================================")
    
    # Generate a realistic NDT report PDF for equipment Tag V-205
    pdf_path = os.path.join(TEST_UPLOADS_DIR, "test_inspection_V205.pdf")
    c = canvas.Canvas(pdf_path)
    c.drawString(50, 780, "MANGALORE REFINERY AND PETROCHEMICALS LIMITED")
    c.drawString(50, 760, "NON-DESTRUCTIVE TESTING & ULTRASONIC INSPECTION REPORT")
    c.drawString(50, 720, "Equipment Identifier / Tag: V-205 (High-Pressure Separator)")
    c.drawString(50, 700, "Service Process Line: 08-VP-2005, Class 600")
    c.drawString(50, 680, "Shell Material: ASTM A516 Grade 70 Carbon Steel")
    c.drawString(50, 660, "Design Operating Pressure: 28.5 bar")
    c.drawString(50, 640, "Original Nominal Shell Thickness: 14.0 mm")
    c.drawString(50, 620, "Current Measured Wall Thickness: 4.8 mm")
    c.drawString(50, 600, "Corrosion Allowance Limit: 3.5 mm")
    c.drawString(50, 580, "Inspection Notes: Severe localized sour corrosion observed at bottom head knuckle radius.")
    c.save()

    print(f"Generated test PDF: {pdf_path}")
    doc_text, img_b64, file_type = extract_document_content(file_path=pdf_path)
    print(f"Extracted PDF Text Length: {len(doc_text) if doc_text else 0} chars | Type: {file_type}")
    assert doc_text and "V-205" in doc_text, "Failed to extract text from generated PDF"

    # Run sovereign 7-agent swarm with the PDF
    result = run_pipeline(input_text="Process this uploaded inspection sheet", file_path=pdf_path)
    
    print("\n--- Swarm Result for V-205 PDF ---")
    print(f"Status: {result['status']}")
    print(f"Valid Domain: {result['is_valid_domain']}")
    print(f"Extracted Data: {json.dumps(result['extracted_data'], indent=2)}")
    print(f"Sandbox Output: {result['sandbox_output']}")
    print(f"Risk Assessment: {result['risk_assessment']}")
    print(f"Artifact Path: {result['artifact_path']}")

    metrics = result["extracted_data"]
    assert result["is_valid_domain"] is True, "Expected is_valid_domain=True for V-205"
    assert "V-205" in str(metrics.get("equipment_tag", "")), f"Tag V-205 not found in {metrics}"
    assert result["sandbox_output"].get("exit_code") == 0, "Calculation script failed"
    assert result["artifact_path"] and os.path.exists(result["artifact_path"]), "Approval note not created"

    print(">>> TEST 1 PASSED: 7-Agent Swarm successfully processed V-205 PDF!")


def test_2_dynamic_image_vision_extraction():
    print("\n=======================================================")
    print("TEST 2: MULTIMODAL IMAGE VISION EXTRACTION VIA QWEN2.5-VL")
    print("=======================================================")

    # Create a synthetic NDT report image for Spool Tag K-901
    img_path = os.path.join(TEST_UPLOADS_DIR, "test_inspection_K901.jpg")
    img = Image.new("RGB", (900, 650), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    try:
        from PIL import ImageFont
        font = ImageFont.truetype("arial.ttf", 22)
    except Exception:
        font = None

    d.text((50, 40), "MRPL ASSET INTEGRITY MANAGEMENT - NDT RECORD", fill=(0, 0, 0), font=font)
    d.text((50, 80), "Equipment Tag: K-901 (Kerosene Hydrotreater Spool)", fill=(0, 0, 0), font=font)
    d.text((50, 120), "Service Line: 06-KH-3001, Class 300", fill=(0, 0, 0), font=font)
    d.text((50, 160), "Material: 316L Stainless Steel", fill=(0, 0, 0), font=font)
    d.text((50, 200), "Design Pressure: 16.0 bar", fill=(0, 0, 0), font=font)
    d.text((50, 240), "Nominal Wall Thickness: 10.0 mm", fill=(0, 0, 0), font=font)
    d.text((50, 280), "Measured Wall Thickness: 9.1 mm", fill=(0, 0, 0), font=font)
    d.text((50, 320), "Corrosion Allowance: 2.0 mm", fill=(0, 0, 0), font=font)
    img.save(img_path, format="JPEG")

    print(f"Generated test image: {img_path}")
    doc_text, img_b64, file_type = extract_document_content(file_path=img_path)
    assert img_b64 is not None, "Failed to encode image to base64"

    # Run sovereign pipeline with the image
    result = run_pipeline(input_text="Analyze uploaded ultrasonic image", file_path=img_path)

    print("\n--- Swarm Result for K-901 Image ---")
    print(f"Status: {result['status']}")
    print(f"Valid Domain: {result['is_valid_domain']}")
    print(f"Extracted Data: {json.dumps(result['extracted_data'], indent=2)}")
    print(f"Artifact Path: {result['artifact_path']}")

    metrics = result["extracted_data"]
    assert result["is_valid_domain"] is True, "Expected is_valid_domain=True for K-901"
    assert "K-901" in str(metrics.get("equipment_tag", "")), f"Tag K-901 not extracted in {metrics}"
    assert result["sandbox_output"].get("exit_code") == 0, "Missing sandbox calculation"
    assert result["artifact_path"] and os.path.exists(result["artifact_path"]), "Missing generated docx"

    print(">>> TEST 2 PASSED: Multimodal Vision dynamically extracted K-901 parameters!")


def test_3_domain_validation_rejection():
    print("\n=======================================================")
    print("TEST 3: GATEKEEPER SHORT-CIRCUIT ON NON-INDUSTRIAL FILE")
    print("=======================================================")

    # Create a non-industrial document (e.g. invoice/receipt)
    fake_pdf = os.path.join(TEST_UPLOADS_DIR, "office_invoice.pdf")
    c = canvas.Canvas(fake_pdf)
    c.drawString(50, 750, "GLOBAL TECH SUPPLIES INC - COMMERCIAL INVOICE")
    c.drawString(50, 720, "Invoice Number: INV-2026-90412")
    c.drawString(50, 690, "Item: Ergonomic Office Chairs (Qty: 10) - Price: $2,500.00")
    c.drawString(50, 660, "Payment Due: 15-October-2026")
    c.save()

    print(f"Generated invalid test document: {fake_pdf}")
    result = run_pipeline(input_text="Check this document", file_path=fake_pdf)

    print("\n--- Pipeline Result for Commercial Invoice ---")
    print(f"Status: {result['status']}")
    print(f"Valid Domain: {result['is_valid_domain']}")
    print(f"Validation Error: {result['validation_error']}")
    print(f"Artifact: {result['artifact_path']}")

    assert result["is_valid_domain"] is False, "Expected is_valid_domain=False for office invoice"
    assert result["status"] == "VALIDATION_REJECTED", f"Expected status=VALIDATION_REJECTED, got {result['status']}"
    assert result["artifact_path"] is None, "Artifact should NOT be created for non-industrial file"
    assert len(result["extracted_data"]) == 0, f"Extracted data should be empty, got {result['extracted_data']}"

    print(">>> TEST 3 PASSED: Gatekeeper Agent strictly short-circuited non-industrial file!")


if __name__ == "__main__":
    test_1_dynamic_pdf_extraction()
    test_2_dynamic_image_vision_extraction()
    test_3_domain_validation_rejection()
    print("\n=======================================================")
    print(">>> ALL 7-AGENT AUTONOMOUS SWARM TESTS PASSED! <<<")
    print("=======================================================")
