from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any
from uuid import uuid5, NAMESPACE_URL

from qdrant_client.models import PointStruct

from app.core.config import CHUNK_OVERLAP, CHUNK_SIZE, QDRANT_COLLECTION
from app.rag.chunker import chunk_text
from app.rag.embedder import BGEEmbedder
from app.vector_db.qdrant_client import ensure_collection, get_qdrant_client


def extract_text(path: Path) -> str:
	suffix = path.suffix.lower()
	if suffix in {".txt", ".md"}:
		return path.read_text(encoding="utf-8")
	if suffix == ".pdf":
		from pypdf import PdfReader
		return "\n".join(page.extract_text() or "" for page in PdfReader(path).pages)
	if suffix == ".docx":
		from docx import Document
		return "\n".join(paragraph.text for paragraph in Document(path).paragraphs)
	raise ValueError(f"unsupported document type: {suffix}")


class IngestionService:
	def __init__(self, embedder: Any | None = None, client: Any | None = None):
		self.embedder = embedder or BGEEmbedder()
		self.client = client or get_qdrant_client()

	def ingest_file(self, path: str | Path) -> int:
		file_path = Path(path)
		text = extract_text(file_path)
		chunks = chunk_text(text, CHUNK_SIZE, CHUNK_OVERLAP)
		if not chunks:
			return 0
		ensure_collection(self.client)
		document_id = hashlib.sha256(str(file_path.resolve()).encode()).hexdigest()[:16]
		vectors = self.embedder.embed(chunks)
		points = []
		for index, (chunk, vector) in enumerate(zip(chunks, vectors)):
			chunk_id = f"{document_id}:{index}"
			point_id = str(uuid5(NAMESPACE_URL, chunk_id))
			points.append(PointStruct(id=point_id, vector=vector, payload={
				"source": str(file_path), "document_id": document_id,
				"chunk_id": chunk_id, "chunk_index": index, "text": chunk,
			}))
		self.client.upsert(collection_name=QDRANT_COLLECTION, points=points)
		return len(points)
