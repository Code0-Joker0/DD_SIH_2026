from types import SimpleNamespace

from app.rag.context_builder import ContextBuilder
from app.rag.embedder import BGEEmbedder
from app.rag.rag_service import RAGService
from app.rag.reranker import BGEReranker


def test_embedder_normalizes_and_returns_vectors() -> None:
    model = SimpleNamespace(encode=lambda texts, **kwargs: [[1.0, 0.0] for _ in texts])
    assert BGEEmbedder(model=model).embed(["hello"]) == [[1.0, 0.0]]


def test_reranker_orders_candidates() -> None:
    model = SimpleNamespace(predict=lambda pairs: [0.2, 0.9])
    result = BGEReranker(model=model).rerank("q", [
        {"payload": {"text": "a"}}, {"payload": {"text": "b"}}
    ], 2)
    assert result[0]["payload"]["text"] == "b"
    assert result[0]["rerank_score"] == 0.9


def test_context_preserves_source_metadata() -> None:
    context, sources = ContextBuilder().build([{"id": "p1", "rerank_score": 0.8, "payload": {
        "text": "evidence", "source": "doc.txt", "document_id": "d1", "chunk_id": "d1:0"
    }}])
    assert "evidence" in context
    assert sources[0] == {"source": "doc.txt", "document_id": "d1", "chunk_id": "d1:0", "rerank_score": 0.8}


def test_rag_service_uses_mocked_llm() -> None:
    class Embedder:
        def embed_query(self, query): return [0.1, 0.2]

    class Retriever:
        def search(self, vector, limit): return [{"id": "p1", "payload": {"text": "answer", "source": "a.txt"}}]

    class Reranker:
        def rerank(self, query, candidates, limit):
            candidates[0]["rerank_score"] = 0.9
            return candidates

    class LLM:
        def generate(self, prompt): return "grounded answer"

    result = RAGService(Embedder(), Retriever(), Reranker(), ContextBuilder(), LLM()).query("question")
    assert result["answer"] == "grounded answer"
    assert result["sources"][0]["source"] == "a.txt"