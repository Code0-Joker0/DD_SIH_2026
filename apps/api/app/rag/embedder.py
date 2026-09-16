from __future__ import annotations

from typing import Any

from app.core.config import settings


class BGEEmbedder:
	def __init__(self, model_name: str = settings.EMBEDDING_MODEL, model: Any | None = None,
			 device: str = settings.EMBEDDING_DEVICE):
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
		"""Embed a list of texts. Returns a list of float vectors."""
		if not texts:
			return []
		vectors = self.model.encode(texts, normalize_embeddings=True, convert_to_numpy=True)
		return vectors.tolist() if hasattr(vectors, "tolist") else [list(v) for v in vectors]

	# Aliases used by the ingestion pipeline and demo scripts.
	def encode_documents(self, texts: list[str]) -> list[list[float]]:
		"""Alias for embed() — encodes passage/document texts."""
		return self.embed(texts)

	def encode_queries(self, texts: list[str]) -> list[list[float]]:
		"""Alias for embed() — encodes query texts (same model for BGE-M3)."""
		return self.embed(texts)

	def embed_query(self, query: str) -> list[float]:
		"""Embed a single query string."""
		if not query.strip():
			raise ValueError("query must not be empty")
		return self.embed([query])[0]
