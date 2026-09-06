import os

import pytest

from app.rag.rag_service import RAGService


@pytest.mark.skipif(os.getenv("RUN_REAL_RAG") != "1", reason="set RUN_REAL_RAG=1 for local service integration")
def test_real_local_rag_pipeline() -> None:
    result = RAGService().query(os.environ["RAG_TEST_QUERY"])
    assert result["answer"]
    assert result["sources"]
    assert {"source", "document_id", "chunk_id", "rerank_score"} <= set(result["sources"][0])