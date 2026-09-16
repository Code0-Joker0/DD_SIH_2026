"""health_check.py — Service liveness and registry/Qdrant reconciliation.

Usage::

    # Basic liveness check (Qdrant + Postgres)
    python scripts/health_check.py

    # Reconcile registry against Qdrant (detect drift)
    python scripts/health_check.py --reconcile
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

import psycopg
from qdrant_client.models import Filter, FieldCondition, MatchValue

from app.core.config import settings
from app.repositories.document_repository import DocumentRepository
from app.vector_db.qdrant_client import get_qdrant_client


# ── Liveness checks ──────────────────────────────────────────────────────────

def check_qdrant() -> bool:
    """Ping Qdrant.  Returns True if healthy."""
    try:
        client = get_qdrant_client()
        client.get_collections()
        print(f"  ✓ Qdrant   healthy at {settings.QDRANT_URL}")
        return True
    except Exception as error:
        print(f"  ✗ Qdrant   unavailable at {settings.QDRANT_URL}: {error}", file=sys.stderr)
        return False


async def check_postgres() -> bool:
    """Ping Postgres.  Returns True if healthy."""
    try:
        async with await psycopg.AsyncConnection.connect(
            settings.POSTGRES_DSN, connect_timeout=5
        ) as conn:
            await conn.execute("SELECT 1")
        print(f"  ✓ Postgres healthy at {settings.POSTGRES_DSN.split('@')[-1]}")
        return True
    except Exception as error:
        print(f"  ✗ Postgres unavailable: {error}", file=sys.stderr)
        return False


# ── Reconciliation ───────────────────────────────────────────────────────────

async def reconcile() -> int:
    """Compare the document registry against actual Qdrant chunk counts.

    For every document in the registry, counts Qdrant points whose
    ``document_id`` payload matches, then compares against the registered
    ``chunk_count``.  Reports three categories:

    - **OK**: registry chunk_count matches Qdrant.
    - **DRIFT**: registry and Qdrant disagree on chunk count.
      Possible causes: partial write failure (Qdrant write succeeded, registry
      write failed), or manual Qdrant manipulation.
    - **ORPHANED**: chunks exist in Qdrant for a document_id that has no
      registry entry.  Possible cause: registry write failed after Qdrant
      upsert succeeded.  Re-ingest the original file to fix.

    Returns the number of problems found (exit-code friendly).
    """
    qdrant_client = get_qdrant_client()
    repo = DocumentRepository()

    # ── 1. Check all registry entries against Qdrant ─────────────────────────
    print("\nReconciling registry → Qdrant ...")
    docs = await repo.list_all()

    if not docs:
        print("  Registry is empty — nothing to reconcile.")
    
    problems = 0
    registered_ids: set[str] = set()

    for doc in docs:
        doc_id = doc["document_id"]
        registered_ids.add(doc_id)
        registered_count = doc["chunk_count"]

        result = qdrant_client.count(
            collection_name=settings.QDRANT_COLLECTION,
            count_filter=Filter(
                must=[FieldCondition(key="document_id", match=MatchValue(value=doc_id))]
            ),
            exact=True,
        )
        qdrant_count = result.count

        if qdrant_count == registered_count:
            print(f"  ✓ {doc['filename']:<40} registry={registered_count}  qdrant={qdrant_count}")
        else:
            problems += 1
            print(
                f"  ✗ DRIFT   {doc['filename']:<36} "
                f"registry={registered_count}  qdrant={qdrant_count}"
                f"  →  re-ingest: python scripts/ingest_documents.py {doc['source_path']}"
            )

    # ── 2. Check for orphaned Qdrant chunks (no registry entry) ──────────────
    # Scroll all distinct document_ids from Qdrant payloads.
    print("\nChecking for orphaned Qdrant chunks ...")
    seen_qdrant_ids: set[str] = set()
    offset = None

    while True:
        scroll_result = qdrant_client.scroll(
            collection_name=settings.QDRANT_COLLECTION,
            limit=100,
            offset=offset,
            with_payload=["document_id"],
            with_vectors=False,
        )
        points, next_offset = scroll_result
        for point in points:
            doc_id = (point.payload or {}).get("document_id")
            if doc_id:
                seen_qdrant_ids.add(doc_id)
        if next_offset is None:
            break
        offset = next_offset

    orphaned = seen_qdrant_ids - registered_ids
    if orphaned:
        for doc_id in sorted(orphaned):
            result = qdrant_client.count(
                collection_name=settings.QDRANT_COLLECTION,
                count_filter=Filter(
                    must=[FieldCondition(key="document_id", match=MatchValue(value=doc_id))]
                ),
                exact=True,
            )
            problems += 1
            print(
                f"  ✗ ORPHANED  document_id={doc_id}  qdrant_chunks={result.count}"
                f"  →  delete: python scripts/ingest_documents.py --delete {doc_id}"
            )
    else:
        print("  ✓ No orphaned chunks found.")

    return problems


# ── Entry point ───────────────────────────────────────────────────────────────

async def async_main(reconcile_flag: bool) -> int:
    print("── Service health ──────────────────────────────────────────")
    qdrant_ok = check_qdrant()
    postgres_ok = await check_postgres()

    if not (qdrant_ok and postgres_ok):
        return 1

    if reconcile_flag:
        print("\n── Registry reconciliation ─────────────────────────────────")
        problems = await reconcile()
        if problems:
            print(f"\n{problems} problem(s) found.")
            return 1
        print("\nAll documents consistent. ✓")

    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--reconcile", action="store_true",
        help="Check registry chunk counts against actual Qdrant counts and report drift.",
    )
    args = parser.parse_args()
    raise SystemExit(asyncio.run(async_main(args.reconcile)))


if __name__ == "__main__":
    main()
