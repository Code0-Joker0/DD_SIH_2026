"""ingest_documents.py — Ingest files into the Qdrant knowledge base.

Usage examples::

    # Ingest a single file
    python scripts/ingest_documents.py path/to/document.pdf

    # Ingest all supported files in a directory
    python scripts/ingest_documents.py path/to/docs/

    # Preview what would be ingested without writing anything
    python scripts/ingest_documents.py path/to/docs/ --dry-run

    # Delete a document from both Qdrant and the registry
    python scripts/ingest_documents.py --delete <document_id>
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from qdrant_client.models import Filter, FieldCondition, MatchValue

from app.core.config import settings
from app.services.ingestion_service import IngestionService, _document_id
from app.vector_db.qdrant_client import get_qdrant_client

SUPPORTED_SUFFIXES = {".txt", ".md", ".pdf", ".docx"}


def _qdrant_chunk_count(document_id: str) -> int:
    """Count Qdrant points matching *document_id* — used to assert post-ingest."""
    client = get_qdrant_client()
    result = client.count(
        collection_name=settings.QDRANT_COLLECTION,
        count_filter=Filter(
            must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]
        ),
        exact=True,
    )
    return result.count


def _collect_files(path: Path) -> list[Path]:
    if path.is_file():
        return [path] if path.suffix.lower() in SUPPORTED_SUFFIXES else []
    if path.is_dir():
        return sorted(
            item for item in path.rglob("*")
            if item.is_file() and item.suffix.lower() in SUPPORTED_SUFFIXES
        )
    return []


def cmd_ingest(path: Path, dry_run: bool) -> None:
    if not path.exists():
        raise SystemExit(f"path not found: {path}")

    files = _collect_files(path)
    if not files:
        raise SystemExit(
            f"no supported files found under {path}  "
            f"(supported: {', '.join(sorted(SUPPORTED_SUFFIXES))})"
        )

    print(f"Found {len(files)} file(s) to ingest.\n")

    if dry_run:
        for f in files:
            doc_id = _document_id(f)
            print(f"  [DRY-RUN] {f.name}  →  document_id={doc_id}")
        print("\nDry-run complete. No data was written.")
        return

    service = IngestionService()
    total_chunks = 0
    results: list[tuple[str, int, str]] = []  # (filename, chunks, document_id)

    for file in files:
        doc_id = _document_id(file)
        print(f"  Ingesting {file.name} ...", end=" ", flush=True)
        try:
            chunks_written = service.ingest_file(file)
        except Exception as exc:
            print(f"FAILED  ({exc})")
            results.append((file.name, -1, doc_id))
            continue

        # Post-ingest assertion: Qdrant count must match what we wrote.
        qdrant_count = _qdrant_chunk_count(doc_id)
        if qdrant_count != chunks_written:
            print(
                f"WARNING — wrote {chunks_written} chunks but Qdrant reports "
                f"{qdrant_count}. Possible partial write."
            )
        else:
            print(f"OK  ({chunks_written} chunks, verified in Qdrant)")

        total_chunks += chunks_written
        results.append((file.name, chunks_written, doc_id))

    # ── Summary table ────────────────────────────────────────────────────────
    print(f"\n{'─' * 66}")
    print(f"{'File':<35} {'Chunks':>8}  {'Document ID'}")
    print(f"{'─' * 66}")
    for name, count, doc_id in results:
        status = str(count) if count >= 0 else "ERROR"
        print(f"{name:<35} {status:>8}  {doc_id}")
    print(f"{'─' * 66}")
    print(f"{'TOTAL':<35} {total_chunks:>8}\n")


def cmd_delete(document_id: str) -> None:
    service = IngestionService()
    print(f"Deleting document_id={document_id!r} from Qdrant and registry ...")
    service.delete_document(document_id)
    print("Done.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest documents into the Qdrant knowledge base.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "path", nargs="?",
        help="File or directory to ingest.",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Preview what would be ingested without writing anything.",
    )
    parser.add_argument(
        "--delete", metavar="DOCUMENT_ID",
        help="Delete a document by its document_id (removes from Qdrant + registry).",
    )

    args = parser.parse_args()

    if args.delete:
        cmd_delete(args.delete)
    elif args.path:
        cmd_ingest(Path(args.path), dry_run=args.dry_run)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
