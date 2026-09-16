"""
create_indexes.py — Create payload indexes on the Qdrant collection.

Payload indexes allow efficient server-side filtering (e.g. filter by
source file or document_id) without scanning every vector.

Run this once after setup_qdrant.py, or re-run it safely at any time —
Qdrant is idempotent for index creation.

Usage:
    python scripts/create_indexes.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from qdrant_client.models import PayloadSchemaType

from app.core.config import settings
from app.vector_db.qdrant_client import get_qdrant_client

# (field_name, PayloadSchemaType) pairs to index.
# Matches the payload fields written by IngestionService.
INDEXES: list[tuple[str, PayloadSchemaType]] = [
    ("source", PayloadSchemaType.KEYWORD),
    ("document_id", PayloadSchemaType.KEYWORD),
    ("chunk_index", PayloadSchemaType.INTEGER),
]


def main() -> None:
    print(f"Connecting to Qdrant at {settings.QDRANT_URL} ...")
    client = get_qdrant_client()

    for field, schema_type in INDEXES:
        client.create_payload_index(
            collection_name=settings.QDRANT_COLLECTION,
            field_name=field,
            field_schema=schema_type,
        )
        print(f"  Indexed payload field: {field!r} ({schema_type.value})")

    print(f"All indexes created on collection '{settings.QDRANT_COLLECTION}'.")


if __name__ == "__main__":
    main()
