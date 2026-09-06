from __future__ import annotations

from openai import OpenAI

from app.core.config import VLLM_API_KEY, VLLM_BASE_URL, VLLM_MODEL, VLLM_TIMEOUT
from app.rag.llm_provider import LLMProvider


class VLLMProvider(LLMProvider):
	def __init__(self, client: object | None = None):
		self.client = client or OpenAI(base_url=VLLM_BASE_URL, api_key=VLLM_API_KEY, timeout=VLLM_TIMEOUT)

	def generate(self, prompt: str) -> str:
		try:
			response = self.client.chat.completions.create(
				model=VLLM_MODEL,
				messages=[{"role": "user", "content": prompt}],
				temperature=0.2,
			)
			content = response.choices[0].message.content
		except Exception as error:
			raise RuntimeError("vLLM generation failed") from error
		if not isinstance(content, str) or not content.strip():
			raise RuntimeError("vLLM returned an invalid model response")
		return content.strip()