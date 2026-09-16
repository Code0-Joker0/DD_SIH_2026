import asyncio
import aiohttp
from app.core.config import settings
from app.models.llm.model_config import MODEL_REGISTRY

async def _ensure_model_running(required_model_name: str) -> None:
    """Stops the running vLLM process and boots the required model."""
    model_spec = MODEL_REGISTRY.get(required_model_name)
    if not model_spec:
        return

    target_served_name = model_spec.served_name

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{settings.VLLM_BASE_URL}/models",
                headers={"Authorization": f"Bearer {settings.VLLM_API_KEY}"}
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get("data") and data["data"][0]["id"] == target_served_name:
                        return  # Already loaded
    except Exception:
        pass

    print(f"\n[System] Hot-swapping model to: {target_served_name}...")
    print("         Shutting down current vLLM instance...")
    shutdown = await asyncio.create_subprocess_shell("./scripts/vllm_down.sh")
    await shutdown.wait()

    print(f"         Booting vLLM with {target_served_name} (this may take a minute)...")
    startup = await asyncio.create_subprocess_shell(
        f'./scripts/vllm_up.sh "{target_served_name}" --daemon'
    )
    await startup.wait()

    if startup.returncode != 0:
        raise RuntimeError(f"Failed to hot-swap vLLM to {target_served_name}. See logs.")

    print("         Hot-swap complete! vLLM is healthy.\n")
