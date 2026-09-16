import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from psycopg_pool import AsyncConnectionPool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from app.core.config import settings
from app.repositories.document_repository import DocumentRepository


async def main() -> None:
    print(f"Connecting to PostgreSQL at {settings.POSTGRES_DSN} ...")

    try:
        # ── LangGraph checkpointer tables ────────────────────────────────────
        async with AsyncConnectionPool(
            conninfo=settings.POSTGRES_DSN,
            min_size=1,
            max_size=10,
            kwargs={"autocommit": True},
            open=False,
        ) as pool:
            await pool.open()
            checkpointer = AsyncPostgresSaver(pool)
            print("Creating LangGraph checkpoint tables ...")
            await checkpointer.setup()
            print("  ✓ Checkpoint tables ready.")

        # ── Document registry table ───────────────────────────────────────────
        print("Creating document registry table ...")
        repo = DocumentRepository()
        await repo.setup()
        print("  ✓ sih_documents table ready.")

    except Exception as exc:
        print(f"Setup failed: {exc}", file=sys.stderr)
        sys.exit(1)

    print("\nAll Postgres tables are ready.")


if __name__ == "__main__":
    asyncio.run(main())
