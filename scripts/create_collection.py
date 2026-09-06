import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from qdrant_client.models import Distance, VectorParams

from app.vector_db.qdrant_client import ensure_collection, get_qdrant_client


def main() -> None:
	ensure_collection(get_qdrant_client())
	print("collection verified without modifying existing compatible data")


if __name__ == "__main__":
	main()
