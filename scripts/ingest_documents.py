import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from app.services.ingestion_service import IngestionService


def main() -> None:
	if len(sys.argv) != 2:
		raise SystemExit("usage: python scripts/ingest_documents.py PATH")
	path = Path(sys.argv[1])
	service = IngestionService()
	if path.is_file():
		print(f"ingested {service.ingest_file(path)} chunks")
		return
	if path.is_dir():
		count = sum(service.ingest_file(item) for item in sorted(path.rglob("*")) if item.is_file())
		print(f"ingested {count} chunks")
		return
	raise SystemExit(f"path not found: {path}")


if __name__ == "__main__":
	main()
