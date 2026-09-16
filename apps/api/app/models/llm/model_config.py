from typing import Dict
from pydantic import BaseModel

from app.core.config import settings

class ModelSpec(BaseModel):
    name: str
    served_name: str
    max_context_tokens: int  # derived from VLLM_MAX_MODEL_LEN × CONTEXT_BUDGET_RATIO

# Compute once at import time — same for all models since they share one vLLM instance
_token_budget = int(settings.VLLM_MAX_MODEL_LEN * settings.CONTEXT_BUDGET_RATIO)

MODEL_REGISTRY: Dict[str, ModelSpec] = {
    # Dynamically reads the hot-swap target models from the active environment
    "reasoning": ModelSpec(
        name="reasoning",
        served_name=settings.VLLM_MODEL_REASONING,
        max_context_tokens=_token_budget,
    ),
    "coding": ModelSpec(
        name="coding",
        served_name=settings.VLLM_MODEL_CODING,
        max_context_tokens=_token_budget,
    ),
    "vl": ModelSpec(
        name="vl",
        served_name=settings.VLLM_MODEL_VL,
        max_context_tokens=_token_budget,
    ),
}
