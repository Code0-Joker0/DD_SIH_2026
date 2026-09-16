from __future__ import annotations

import asyncio

from qdrant_client import AsyncQdrantClient

from app.core.config import settings
from app.rag.embedder import BGEEmbedder


class QdrantRetriever:
    """Retrieves candidate chunks from Qdrant.

    ``search()`` is the single public method.  It returns a list of plain
    dicts so the rest of the pipeline (reranker, context builder, tools)
    never imports Qdrant types — the vector store is fully encapsulated here.

    Return format per item::

        {
            "id":      <str | int>,   # Qdrant point id
            "score":   <float>,       # cosine similarity score
            "payload": {              # whatever was stored at ingest time
                "text": "...",
                "source": "...",
                "document_id": "...",
                ...
            }
        }
    """

    def __init__(self) -> None:
        self.client = AsyncQdrantClient(url=settings.QDRANT_URL)
        self.collection_name = settings.QDRANT_COLLECTION
        self.embedder = BGEEmbedder()

    async def search(
        self,
        query: str,
        limit: int = settings.RETRIEVAL_TOP_K,
    ) -> list[dict]:
        """Embed *query* and return the top-*limit* matching chunks as dicts.

        Retrieve generously (callers should pass a larger *limit* than they
        ultimately need) so the reranker has sufficient candidates to work on.
        """
        # BGEEmbedder is synchronous — run in thread pool to avoid blocking.
        vector = await asyncio.to_thread(self.embedder.embed_query, query)

        try:
            response = await self.client.query_points(
                collection_name=self.collection_name,
                query=vector,
                limit=limit,
                with_payload=True,
            )
        except Exception as error:
            raise RuntimeError(f"Qdrant retrieval failed: {error}") from error

        return [
            {
                "id": point.id,
                "score": point.score,
                "payload": point.payload or {},
            }
            for point in response.points
            if (point.payload or {}).get("text")  # skip points without text
        ]


retriever = QdrantRetriever()
