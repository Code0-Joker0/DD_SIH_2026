import re
import subprocess
import tempfile
from pathlib import Path

class SandboxService:
    def _sanitize_code(self, code: str) -> str:
        """
        Repairs common LLM code generation hallucinations before execution.
        - Fixes broken triple-quoted docstrings: `\"\"\"text.\"\"` -> `\"\"\"text.\"\"\"`
        """
        # Fix docstrings closed with only two quotes: """text."" -> """text."""
        code = re.sub(r'(""".*?)""\s*$', r'\1"""', code, flags=re.MULTILINE | re.DOTALL)
        return code

    async def run_code(self, code: str, timeout: int = 15) -> str:
        """
        Executes Python code in an isolated Docker container with no network access.
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            code = self._sanitize_code(code)
            script_path = Path(temp_dir) / "script.py"
            script_path.write_text(code)

            try:
                # Run the python script inside a secure, network-isolated docker container
                result = subprocess.run(
                    [
                        "docker", "run", "--rm",
                        "--network", "none",
                        "--memory", "512m",
                        "--cpus", "1.0",
                        "-v", f"{temp_dir}:/workspace",
                        "-w", "/workspace",
                        "python:3.11-slim",
                        "python", "script.py"
                    ],
                    capture_output=True,
                    text=True,
                    timeout=timeout,
                )
                
                output = result.stdout
                if result.stderr:
                    output += f"\n[Errors]\n{result.stderr}"
                    
                if result.returncode != 0:
                    output += f"\n[Process exited with code {result.returncode}]"
                    
                return output.strip() or "Code executed successfully with no output."
                
            except subprocess.TimeoutExpired:
                return f"Error: Execution timed out after {timeout} seconds."
            except Exception as e:
                return f"Sandbox execution failed: {e}"

sandbox_service = SandboxService()
