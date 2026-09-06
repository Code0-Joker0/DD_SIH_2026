from __future__ import annotations

from typing import Any

from app.core.config import QDRANT_COLLECTION, RETRIEVAL_TOP_K
from app.vector_db.qdrant_client import get_qdrant_client


class QdrantRetriever:
	def __init__(self, client: Any | None = None, collection_name: str = QDRANT_COLLECTION):
		self.client = client or get_qdrant_client()
		self.collection_name = collection_name

	def search(self, vector: list[float], limit: int = RETRIEVAL_TOP_K) -> list[dict[str, Any]]:
		try:
			response = self.client.query_points(
				collection_name=self.collection_name,
				query=vector,
				limit=limit,
				with_payload=True,
			)
		except Exception as error:
			raise RuntimeError("Qdrant retrieval failed") from error
		return [
			{"id": str(point.id), "score": float(point.score), "payload": point.payload or {}}
			for point in response.points
		]