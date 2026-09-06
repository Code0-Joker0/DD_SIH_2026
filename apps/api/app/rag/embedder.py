from __future__ import annotations

from typing import Any

from app.core.config import EMBEDDING_DEVICE, EMBEDDING_MODEL


class BGEEmbedder:
	def __init__(self, model_name: str = EMBEDDING_MODEL, model: Any | None = None,
			 device: str = EMBEDDING_DEVICE):
		self.model_name = model_name
		self._model = model
		self.device = device

	@property
	def model(self) -> Any:
		if self._model is None:
			from sentence_transformers import SentenceTransformer
			self._model = SentenceTransformer(self.model_name, device=self.device)
		return self._model

	def embed(self, texts: list[str]) -> list[list[float]]:
		if not texts:
			return []
		vectors = self.model.encode(texts, normalize_embeddings=True, convert_to_numpy=True)
		return vectors.tolist() if hasattr(vectors, "tolist") else [list(vector) for vector in vectors]

	def embed_query(self, query: str) -> list[float]:
		if not query.strip():
			raise ValueError("query must not be empty")
		return self.embed([query])[0]