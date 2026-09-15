import os
import sys
import re
import tempfile
import subprocess
import shutil
import uuid
from typing import Dict, Any

def sanitize_code(code_str: str) -> str:
    """
    Strips dangerous execution calls such as os.system, shutil.rmtree, 
    and unauthorized system command attempts before running in the sandbox.
    """
    sanitized_lines = []
    for line in code_str.splitlines():
        # Strip os.system calls
        line_clean = re.sub(r'os\.system\s*\([^)]*\)', 'print("[SANDBOX SECURITY: os.system call stripped]")', line)
        # Strip shutil.rmtree calls
        line_clean = re.sub(r'shutil\.rmtree\s*\([^)]*\)', 'print("[SANDBOX SECURITY: shutil.rmtree call stripped]")', line_clean)
        
        # If line directly attempts shell or raw rmtree execution, neutralize it
        if "os.system" in line_clean:
            line_clean = re.sub(r'os\.system', '# os.system stripped', line_clean)
        if "shutil.rmtree" in line_clean:
            line_clean = re.sub(r'shutil\.rmtree', '# shutil.rmtree stripped', line_clean)
            
        sanitized_lines.append(line_clean)
    
    return "\n".join(sanitized_lines)


def execute_in_sandbox(code_str: str) -> Dict[str, Any]:
    """
    Executes Python code in an isolated temporary directory via subprocess.
    Enforces a strict 10s timeout and strips forbidden operations.
    
    Returns:
        {
            "stdout": str,
            "stderr": str,
            "exit_code": int,
            "timed_out": bool
        }
    """
    # 1. Sanitize code to strip dangerous operations
    safe_code = sanitize_code(code_str)

    # 2. Create isolated temp directory
    temp_dir = tempfile.mkdtemp(prefix="mrpl_sandbox_")
    script_filename = f"calc_{uuid.uuid4().hex[:8]}.py"
    script_path = os.path.join(temp_dir, script_filename)

    try:
        # Write sanitized script
        with open(script_path, "w", encoding="utf-8") as f:
            f.write(safe_code)

        # 3. Execute in isolated subprocess with 10s timeout
        # sys.executable guarantees using the active sovereign Python environment
        proc = subprocess.run(
            [sys.executable, script_path],
            capture_output=True,
            text=True,
            timeout=10,
            cwd=temp_dir
        )

        return {
            "stdout": proc.stdout,
            "stderr": proc.stderr,
            "exit_code": proc.returncode,
            "timed_out": False
        }

    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": "Execution timed out (10s limit).",
            "exit_code": -1,
            "timed_out": True
        }
    except Exception as e:
        return {
            "stdout": "",
            "stderr": f"Sandbox execution error: {str(e)}",
            "exit_code": 1,
            "timed_out": False
        }
    finally:
        # 4. Clean up isolated sandbox directory and script
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


if __name__ == "__main__":
    print("=== TESTING ENTERPRISE PYTHON SANDBOX ===")
    
    # Test 1: Standard engineering calculation
    calc_script = """
nominal_thickness = 8.0
measured_thickness = 3.8
retirement_limit = 5.0

loss_pct = ((nominal_thickness - measured_thickness) / nominal_thickness) * 100
failed = measured_thickness < retirement_limit

print(f"Loss: {loss_pct:.1f}%")
print(f"Status: {'FAIL' if failed else 'PASS'}")
"""
    res1 = execute_in_sandbox(calc_script)
    print("\n[Test 1] Standard Calculation Result:")
    print(res1)
    assert res1["exit_code"] == 0, f"Expected 0, got {res1['exit_code']}"
    assert "Loss: 52.5%" in res1["stdout"]
    assert "Status: FAIL" in res1["stdout"]
    assert res1["timed_out"] is False

    # Test 2: Security Sanitization (strip os.system & shutil.rmtree)
    malicious_script = """
import os
import shutil

os.system("echo unauthorized_cmd")
shutil.rmtree("C:/important_data")
print("Sanitization Verified: Execution completed without harmful operations.")
"""
    res2 = execute_in_sandbox(malicious_script)
    print("\n[Test 2] Security Stripping Result:")
    print(res2)
    assert res2["exit_code"] == 0
    assert "SANDBOX SECURITY" in res2["stdout"]
    assert "Sanitization Verified" in res2["stdout"]

    # Test 3: Timeout handling
    timeout_script = """
import time
time.sleep(15)
"""
    res3 = execute_in_sandbox(timeout_script)
    print("\n[Test 3] Timeout Result:")
    print(res3)
    assert res3["timed_out"] is True
    assert res3["exit_code"] == -1
    assert "timed out" in res3["stderr"]

    print("\n>>> ALL SANDBOX TESTS PASSED SUCCESSFULLY! <<<")
