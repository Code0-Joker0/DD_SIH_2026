"""verify_pipeline.py — End-to-end verification of the RAG pipeline."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from app.rag.retriever import QdrantRetriever
from app.repositories.document_repository import DocumentRepository


async def main() -> None:
    # ── 1. Retriever ─────────────────────────────────────────────────────────
    print("=" * 60)
    print("1. Testing retriever ...")
    retriever = QdrantRetriever()
    results = await retriever.search("BHEL PSU engineering")

    assert len(results) > 0, "Expected at least 1 result from Qdrant"
    item = results[0]
    assert isinstance(item, dict), f"Expected dict, got {type(item)}"
    assert "payload" in item
    assert "score" in item
    assert "text" in item["payload"]
    assert "filename" in item["payload"]
    assert "document_type" in item["payload"]
    assert "document_id" in item["payload"]

    print(f"  Got {len(results)} result(s).")
    print(f"  score    : {item['score']:.4f}")
    print(f"  filename : {item['payload']['filename']}")
    print(f"  doc_type : {item['payload']['document_type']}")
    print(f"  text     : {item['payload']['text'][:100]}...")
    print("  ✓ Retriever returns list[dict] — no Qdrant types leaked.\n")

    # ── 2. Document registry ─────────────────────────────────────────────────
    print("=" * 60)
    print("2. Testing document registry ...")
    repo = DocumentRepository()
    docs = await repo.list_all()
    assert len(docs) > 0, "Expected at least 1 document in registry"
    doc = docs[0]
    print(f"  Found {len(docs)} document(s) in registry.")
    print(f"  document_id  : {doc['document_id']}")
    print(f"  filename     : {doc['filename']}")
    print(f"  chunk_count  : {doc['chunk_count']}")
    print(f"  ingested_at  : {doc['ingested_at']}")
    print("  ✓ Document registry is populated.\n")

    # ── 3. Re-ingest idempotency (dry) ───────────────────────────────────────
    print("=" * 60)
    print("3. Checking chunk count consistency ...")
    from qdrant_client.models import Filter, FieldCondition, MatchValue
    from app.vector_db.qdrant_client import get_qdrant_client
    from app.core.config import settings

    client = get_qdrant_client()
    count_result = client.count(
        collection_name=settings.QDRANT_COLLECTION,
        count_filter=Filter(
            must=[FieldCondition(key="document_id", match=MatchValue(value=doc["document_id"]))]
        ),
        exact=True,
    )
    qdrant_count = count_result.count
    registry_count = doc["chunk_count"]
    assert qdrant_count == registry_count, (
        f"Mismatch: Qdrant has {qdrant_count} chunks, registry says {registry_count}"
    )
    print(f"  Qdrant count ({qdrant_count}) matches registry ({registry_count}). ✓\n")

    print("=" * 60)
    print("All verifications passed! ✓")


if __name__ == "__main__":
    asyncio.run(main())
