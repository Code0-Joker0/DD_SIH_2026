"""
setup_qdrant.py — One-shot Qdrant bootstrap script.

Creates the vector collection if it does not already exist, validates
the vector size if it does, and confirms the connection is healthy.

Usage:
    python scripts/setup_qdrant.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from app.core.config import settings
from app.vector_db.qdrant_client import ensure_collection, get_qdrant_client


def main() -> None:
    print(f"Connecting to Qdrant at {settings.QDRANT_URL} ...")
    client = get_qdrant_client()

    try:
        client.get_collections()
    except Exception as error:
        raise SystemExit(f"Cannot reach Qdrant at {settings.QDRANT_URL}: {error}") from error

    print("Connection OK.")
    ensure_collection(client)
    print(f"Collection '{settings.QDRANT_COLLECTION}' is ready.")


if __name__ == "__main__":
    main()
