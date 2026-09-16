"""migrate_table.py — One-shot migration: rename sih_documents -> document_registry."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

import psycopg
from app.core.config import settings


async def main() -> None:
    async with await psycopg.AsyncConnection.connect(
        settings.POSTGRES_DSN, autocommit=True
    ) as conn:
        row = await (await conn.execute(
            "SELECT 1 FROM pg_tables WHERE tablename = 'sih_documents' AND schemaname = 'public'"
        )).fetchone()

        if row:
            await conn.execute("ALTER TABLE sih_documents RENAME TO document_registry")
            print("Renamed sih_documents -> document_registry.")
        else:
            print("sih_documents not found — checking for document_registry ...")
            row2 = await (await conn.execute(
                "SELECT 1 FROM pg_tables WHERE tablename = 'document_registry' AND schemaname = 'public'"
            )).fetchone()
            if row2:
                print("document_registry already exists. Nothing to do.")
            else:
                print("Neither table exists — run setup_checkpointer.py to create it.")


if __name__ == "__main__":
    asyncio.run(main())
