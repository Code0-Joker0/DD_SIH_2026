from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.rag.context_builder import ContextBuilder
from app.rag.reranker import BGEReranker
from app.rag.retriever import QdrantRetriever


class RAGService:
    """Retrieve → rerank → build context.  Does NOT generate an answer.

    Responsibility boundary
    -----------------------
    RAGService is responsible for finding relevant chunks and building a grounded
    context string.  *Answer generation is the agent's responsibility* — it lives
    in ``run_agent`` (``nodes.py``) which has access to the LLM, tool loop, and
    conversation history.  Putting generation here would create a parallel code
    path that bypasses the agent's context management, model-swap logic, and
    tool-call loop.

    Return value of ``query()``::

        {
            "context":      str,             # formatted [Source N] blocks
            "sources":      list[dict],      # one entry per cited chunk
            "context_used": list[dict],      # same list (alias kept for compat)
        }

    Callers that need a final answer should feed ``context`` into the agent
    via ``search_knowledge_base`` or a dedicated prompt, not call this directly.

    Retrieval design
    ----------------
    - Retrieve broadly (RETRIEVAL_TOP_K, default 20) so the reranker has
      sufficient candidates.  Cosine similarity is a weak ranking signal.
    - Rerank with a cross-encoder — the authoritative ranking step.
    - Filter by rerank score *after* reranking (RERANK_MIN_SCORE).  Filtering
      by retrieval score before reranking would discard chunks the reranker
      would have promoted.
    """

    def __init__(
        self,
        retriever: Any | None = None,
        reranker: Any | None = None,
        context_builder: Any | None = None,
    ):
        self.retriever = retriever or QdrantRetriever()
        self.reranker = reranker or BGEReranker()
        self.context_builder = context_builder or ContextBuilder()

    async def query(self, query: str) -> dict[str, Any]:
        """Retrieve, rerank, and build context for *query*.

        Does not call an LLM.  Returns context and source metadata only.
        """
        if not query or not query.strip():
            raise ValueError("query must not be empty")

        # ── 1. Retrieve broadly ──────────────────────────────────────────────
        candidates = await self.retriever.search(query, limit=settings.RETRIEVAL_TOP_K)
        if not candidates:
            return {"context": "", "sources": [], "context_used": []}

        # ── 2. Rerank — cross-encoder is the authoritative ranking signal ────
        ranked = self.reranker.rerank(query, candidates, limit=settings.RERANK_TOP_K)

        # ── 3. Filter by rerank score and take top 3 ─────────────────────────────
        ranked = [item for item in ranked if item.get("rerank_score", 0.0) >= settings.RERANK_MIN_SCORE]
        ranked = ranked[:3]
        if not ranked:
            return {"context": "", "sources": [], "context_used": []}

        # ── 4. Build context string + source list ────────────────────────────
        context, context_used = self.context_builder.build(ranked)
        return {"context": context, "sources": context_used, "context_used": context_used}
