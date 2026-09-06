import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from app.core.config import QDRANT_URL
from app.vector_db.qdrant_client import get_qdrant_client


def main() -> int:
	try:
		client = get_qdrant_client()
		client.get_collections()
	except Exception as error:
		print(f"Qdrant unavailable at {QDRANT_URL}: {error}", file=sys.stderr)
		return 1
	print(f"Qdrant healthy at {QDRANT_URL}")
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
