import os
import sys
import json

# Ensure project root is in sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.app import app

def test_chat_copilot_endpoint():
    print("==================================================================")
    print("TEST: INTERACTIVE MULTI-TURN ASSET INTEGRITY COPILOT (/api/chat)")
    print("==================================================================")

    client = app.test_client()

    # Turn 1: Grounded question about an uploaded pipe spool
    turn_1_payload = {
        "session_id": "test-session-101",
        "message": "Why is pipe spool E-101 failing API 570 inspection?",
        "history": [],
        "document_context": (
            "Equipment Tag: E-101 (10-HC-4001)\n"
            "Service Line: 10-HC-4001, Class 300\n"
            "Nominal Wall Thickness: 8.0 mm\n"
            "Measured Wall Thickness: 3.8 mm\n"
            "Corrosion Allowance: 3.0 mm\n"
            "Calculated Wall Loss: 52.50%\n"
            "Status: CRITICAL FAIL (Below API 570 minimum retirement limit of 5.0 mm)"
        )
    }

    print("\n[Turn 1] Sending Query: 'Why is pipe spool E-101 failing API 570 inspection?'")
    resp1 = client.post("/api/chat", json=turn_1_payload)
    assert resp1.status_code == 200, f"Expected status 200, got {resp1.status_code}"
    res1 = resp1.get_json()
    ans1 = res1.get("response", "")
    print(f"  -> Copilot Response ({len(ans1)} chars):\n{ans1}\n")
    assert len(ans1) > 20, "Response 1 too short"
    assert "E-101" in ans1 or "3.8" in ans1 or "570" in ans1 or "5.0" in ans1 or "fail" in ans1.lower(), "Missing grounded facts in Response 1"

    # Turn 2: Follow-up question relying on prior conversational memory
    turn_2_payload = {
        "session_id": "test-session-101",
        "message": "What immediate statutory actions must the refinery take for this line?",
        "history": [
            {"role": "user", "content": turn_1_payload["message"]},
            {"role": "assistant", "content": ans1}
        ],
        "document_context": turn_1_payload["document_context"]
    }

    print("[Turn 2] Sending Multi-Turn Follow-Up: 'What immediate statutory actions must the refinery take for this line?'")
    resp2 = client.post("/api/chat", json=turn_2_payload)
    assert resp2.status_code == 200, f"Expected status 200, got {resp2.status_code}"
    res2 = resp2.get_json()
    ans2 = res2.get("response", "")
    print(f"  -> Copilot Follow-up Response ({len(ans2)} chars):\n{ans2}\n")
    assert len(ans2) > 20, "Response 2 too short"

    print("==================================================================")
    print(">>> COPILOT MULTI-TURN & DOCUMENT GROUNDING TEST PASSED! <<<")
    print("==================================================================")

if __name__ == "__main__":
    test_chat_copilot_endpoint()
