from __future__ import annotations

from typing import Any

from app.core.config import RERANK_MIN_SCORE, RERANK_TOP_K, RETRIEVAL_TOP_K
from app.rag.context_builder import ContextBuilder
from app.rag.embedder import BGEEmbedder
from app.rag.llm_provider import LLMProvider
from app.rag.prompt_builder import build_grounded_prompt
from app.rag.reranker import BGEReranker
from app.rag.retriever import QdrantRetriever
from app.rag.vllm_provider import VLLMProvider


class RAGService:
	def __init__(self, embedder: Any | None = None, retriever: Any | None = None,
			 reranker: Any | None = None, context_builder: Any | None = None,
			 llm: LLMProvider | None = None):
		self.embedder = embedder or BGEEmbedder()
		self.retriever = retriever or QdrantRetriever()
		self.reranker = reranker or BGEReranker()
		self.context_builder = context_builder or ContextBuilder()
		self.llm = llm or VLLMProvider()

	def query(self, query: str) -> dict[str, Any]:
		if not query or not query.strip():
			raise ValueError("query must not be empty")
		candidates = self.retriever.search(self.embedder.embed_query(query), RETRIEVAL_TOP_K)
		if not candidates:
			return {"answer": "No relevant documents were found.", "sources": [], "context_used": []}
		ranked = self.reranker.rerank(query, candidates, RERANK_TOP_K)
		ranked = [item for item in ranked if item.get("rerank_score", 0) >= RERANK_MIN_SCORE]
		context, context_used = self.context_builder.build(ranked)
		if not context_used:
			return {"answer": "No relevant context was found.", "sources": [], "context_used": []}
		answer = self.llm.generate(build_grounded_prompt(query, context))
		return {"answer": answer, "sources": context_used, "context_used": context_used}