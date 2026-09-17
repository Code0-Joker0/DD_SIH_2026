import os
import sys
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

from backend.agent import chat_agent_reason, SYSTEM_VISION_PROMPT

def test_diagram_vision_inference():
    print("\n--- [TEST] Dynamic Vision Inference on P&ID Diagram ---")
    diagram_path = os.path.join(project_root, "frontend", "public", "assets", "diagram.png")
    assert os.path.exists(diagram_path), f"Diagram asset not found at {diagram_path}"

    with open(diagram_path, "rb") as f:
        diagram_b64 = base64.b64encode(f.read()).decode("utf-8")

    response = chat_agent_reason(
        message="What is this image?",
        images_b64=[diagram_b64],
        model_name="auto"
    )

    print("\n--- Model Output Preview ---")
    print(response[:400])
    print("...\n----------------------------")

    # Verify no false corrosion / surface pitting canned text
    assert "surface pitting and localized corrosion distress" not in response.lower(), (
        "FAIL: Found hardcoded corrosion template text in non-photographic diagram output!"
    )

    # Verify recognition of schematic / diagram / flow
    lower_resp = response.lower()
    has_diagram_keywords = any(kw in lower_resp for kw in [
        "diagram", "schematic", "flow", "p&id", "pfd", "piping", "instrumentation", "unit", "system", "process"
    ])
    assert has_diagram_keywords, f"FAIL: Expected schematic/diagram identification, got:\n{response}"
    print(">>> [PASS] Genuine Vision Inference verified on P&ID Diagram with zero false corrosion claims!")

def test_unreachable_model_error_handling():
    print("\n--- [TEST] Error Handling with Invalid Model ---")
    diagram_path = os.path.join(project_root, "frontend", "public", "assets", "diagram.png")
    with open(diagram_path, "rb") as f:
        diagram_b64 = base64.b64encode(f.read()).decode("utf-8")

    # Pass a nonexistent model name
    response = chat_agent_reason(
        message="What is this image?",
        images_b64=[diagram_b64],
        model_name="nonexistent_model_xyz:99b"
    )

    print("\n--- Error Response Preview ---")
    print(response.encode("utf-8", errors="replace").decode("utf-8", errors="replace"))
    print("------------------------------")

    # Should report an explicit error, NOT a canned technical corrosion finding
    assert "surface pitting" not in response.lower()
    assert "error" in response.lower() or "unreachable" in response.lower()
    print(">>> [PASS] Explicit error payload returned on model failure rather than mock technical findings!")

if __name__ == "__main__":
    test_diagram_vision_inference()
    test_unreachable_model_error_handling()
    print("\n==============================================")
    print("ALL VISION CATEGORIZATION & MOCK REMOVAL TESTS PASSED!")
    print("==============================================")
