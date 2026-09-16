from __future__ import annotations

from typing import Any

from app.core.config import settings


class BGEReranker:
	def __init__(self, model_name: str = settings.RERANKER_MODEL, model: Any | None = None,
			 device: str = settings.RERANKER_DEVICE):
		self.model_name = model_name
		self._model = model
		self.device = device

	@property
	def model(self) -> Any:
		if self._model is None:
			from sentence_transformers import CrossEncoder
			self._model = CrossEncoder(self.model_name, device=self.device)
		return self._model

	def rerank(self, query: str, candidates: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
		if not candidates:
			return []
		pairs = [(query, item.get("payload", {}).get("text", "")) for item in candidates]
		scores = self.model.predict(pairs)
		ranked = []
		for item, score in zip(candidates, scores):
			result = dict(item)
			result["rerank_score"] = float(score)
			ranked.append(result)
		return sorted(ranked, key=lambda item: item["rerank_score"], reverse=True)[:limit]