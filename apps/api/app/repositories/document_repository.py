from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.core.config import settings

_TABLE = "document_registry"

_DDL = f"""
CREATE TABLE IF NOT EXISTS {_TABLE} (
    document_id   TEXT        PRIMARY KEY,
    filename      TEXT        NOT NULL,
    source_path   TEXT        NOT NULL,
    document_type TEXT        NOT NULL,
    chunk_count   INTEGER     NOT NULL,
    ingested_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""



class DocumentRepository:
    """Postgres-backed registry of ingested documents.

    Table: ``document_registry``  (deliberately different from the Qdrant
    collection name ``sih_documents`` — they are different stores and must be
    unambiguous in debugging).

    document_id scheme
    ------------------
    IDs are a 16-char hex prefix of SHA-256(resolved_file_path).  This is a
    *path-based* scheme: the same file at the same absolute path always
    produces the same ID across runs (stable, cheap, no file-read needed).
    Trade-off: renaming or moving a file produces a new ID and orphans the old
    chunks.  This is acceptable for a controlled ingestion workflow where files
    are treated as immutable after ingest.  If content-addressing is needed
    later (SHA-256 of file bytes), swap ``_document_id`` in ingestion_service.

    Advisory vs. authoritative
    --------------------------
    ``list_all()`` and ``get()`` are *advisory* — they reflect what was
    registered at ingest time.  Qdrant is the source of truth for what is
    actually retrievable.  Use ``health_check.py --reconcile`` to detect drift.

    Connections are created on demand and closed after each operation —
    suitable for the low-frequency calls this repository handles.
    """


    def __init__(self, conninfo: str = settings.POSTGRES_DSN) -> None:
        self.conninfo = conninfo

    # ── Schema bootstrap ────────────────────────────────────────────────────

    async def setup(self) -> None:
        """Create the ``document_registry`` table if it does not already exist."""
        async with await psycopg.AsyncConnection.connect(
            self.conninfo, autocommit=True
        ) as conn:
            await conn.execute(_DDL)


    # ── Write ────────────────────────────────────────────────────────────────

    async def upsert(
        self,
        document_id: str,
        filename: str,
        source_path: str,
        document_type: str,
        chunk_count: int,
    ) -> None:
        """Insert or update the registry entry for *document_id*."""
        now = datetime.now(tz=timezone.utc)
        async with await psycopg.AsyncConnection.connect(
            self.conninfo, autocommit=True
        ) as conn:
            await conn.execute(
                f"""
                INSERT INTO {_TABLE}
                    (document_id, filename, source_path, document_type, chunk_count,
                     ingested_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (document_id) DO UPDATE SET
                    filename      = EXCLUDED.filename,
                    source_path   = EXCLUDED.source_path,
                    document_type = EXCLUDED.document_type,
                    chunk_count   = EXCLUDED.chunk_count,
                    updated_at    = now()
                """,
                (document_id, filename, source_path, document_type, chunk_count, now, now),
            )


    async def delete(self, document_id: str) -> bool:
        """Remove *document_id* from the registry.  Returns True if a row was deleted."""
        async with await psycopg.AsyncConnection.connect(
            self.conninfo, autocommit=True
        ) as conn:
            result = await conn.execute(
                f"DELETE FROM {_TABLE} WHERE document_id = %s",
                (document_id,),
            )
            return (result.rowcount or 0) > 0


    # ── Read ─────────────────────────────────────────────────────────────────

    async def get(self, document_id: str) -> dict[str, Any] | None:
        """Return the registry row for *document_id*, or None if not found."""
        async with await psycopg.AsyncConnection.connect(
            self.conninfo, row_factory=dict_row
        ) as conn:
            row = await conn.execute(
                f"SELECT * FROM {_TABLE} WHERE document_id = %s",
                (document_id,),
            )
            return await row.fetchone()

    async def get_by_path(self, source_path: str) -> dict[str, Any] | None:
        """Look up a document by its original file path."""
        async with await psycopg.AsyncConnection.connect(
            self.conninfo, row_factory=dict_row
        ) as conn:
            row = await conn.execute(
                f"SELECT * FROM {_TABLE} WHERE source_path = %s",
                (source_path,),
            )
            return await row.fetchone()


    async def list_all(self) -> list[dict[str, Any]]:
        """Return all registry rows ordered by most-recently updated first.

        Advisory: reflects what was registered at ingest time.  Qdrant is the
        source of truth for what is actually retrievable.  Run
        ``health_check.py --reconcile`` to surface any drift.
        """
        async with await psycopg.AsyncConnection.connect(
            self.conninfo, row_factory=dict_row
        ) as conn:
            cursor = await conn.execute(
                f"SELECT * FROM {_TABLE} ORDER BY updated_at DESC"
            )
            return await cursor.fetchall()

