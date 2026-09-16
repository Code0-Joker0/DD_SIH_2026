from __future__ import annotations

import asyncio
import hashlib
from pathlib import Path
from typing import Any
from uuid import uuid5, NAMESPACE_URL

from qdrant_client.models import PointStruct, Filter, FieldCondition, MatchValue

from app.core.config import settings
from app.rag.chunker import chunk_text
from app.rag.embedder import BGEEmbedder
from app.repositories.document_repository import DocumentRepository
from app.vector_db.qdrant_client import ensure_collection, get_qdrant_client


def extract_text(path: Path) -> str:
	"""Extract plain text from .txt, .md, .pdf, or .docx files."""
	suffix = path.suffix.lower()
	if suffix in {".txt", ".md"}:
		return path.read_text(encoding="utf-8")
	if suffix == ".pdf":
		from pypdf import PdfReader
		return "\n".join(page.extract_text() or "" for page in PdfReader(path).pages)
	if suffix == ".docx":
		from docx import Document
		return "\n".join(paragraph.text for paragraph in Document(path).paragraphs)
	raise ValueError(f"unsupported document type: {suffix!r}")


def _document_id(path: Path) -> str:
	"""Return a stable 16-char hex document ID for *path*.

	Scheme: SHA-256 of the resolved absolute path string.

	This is *path-based*: the same file at the same absolute path always
	produces the same ID across runs (stable, cheap, requires no file-read).
	Trade-off: renaming or moving the file produces a new ID and orphans the
	old Qdrant chunks.  This is acceptable for a controlled ingestion workflow
	where files are treated as immutable once ingested.  To switch to
	content-addressing (hash of file bytes), replace this function body with
	``hashlib.sha256(path.read_bytes()).hexdigest()[:16]`` and re-ingest all
	existing documents to rebuild the index consistently.
	"""
	return hashlib.sha256(str(path.resolve()).encode()).hexdigest()[:16]



class IngestionService:
	"""Chunks, embeds, and indexes documents into Qdrant.

	Write order
	-----------
	Writes are ordered Qdrant-first, registry-second.  If the registry write
	fails after a successful Qdrant upsert, the chunks are live in retrieval
	but absent from the registry.  ``health_check.py --reconcile`` detects
	this drift.  The reverse (registry written but Qdrant failed) would make
	the agent return stale or empty results for a document that appears in
	the registry — harder to notice.  Qdrant-first makes partial failures
	observable rather than silent.

	Re-ingest policy
	----------------
	Before upserting new chunks, all existing Qdrant points for the same
	*document_id* are deleted.  This prevents orphaned chunks when a file
	shrinks (e.g. was 10 chunks, now 6 — old chunks 6-9 would otherwise
	remain and confuse retrieval).

	Payload written per chunk
	-------------------------
	::

	    {
	        "source":        "/absolute/path/to/file.pdf",
	        "filename":      "file.pdf",
	        "document_id":   "a1b2c3d4e5f60718",
	        "document_type": "pdf",
	        "chunk_id":      "a1b2c3d4e5f60718:3",
	        "chunk_index":   3,
	        "total_chunks":  42,
	        "text":          "...",
	    }
	"""

	def __init__(self, embedder: Any | None = None, client: Any | None = None) -> None:
		self.embedder = embedder or BGEEmbedder()
		self.client = client or get_qdrant_client()
		self.doc_repo = DocumentRepository()

	# ── Core sync path (used by the CLI script) ─────────────────────────────

	def ingest_file(self, path: str | Path) -> int:
		"""Ingest a single file synchronously.  Returns the number of chunks written."""
		file_path = Path(path).resolve()
		text = extract_text(file_path)
		chunks = chunk_text(text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)
		if not chunks:
			return 0

		ensure_collection(self.client)
		doc_id = _document_id(file_path)

		# Delete-before-upsert: remove stale chunks from a previous ingest.
		self._delete_qdrant_chunks(doc_id)

		vectors = self.embedder.encode_documents(chunks)
		total = len(chunks)
		points = []
		for index, (chunk, vector) in enumerate(zip(chunks, vectors)):
			chunk_id = f"{doc_id}:{index}"
			point_id = str(uuid5(NAMESPACE_URL, chunk_id))
			points.append(PointStruct(
				id=point_id,
				vector=vector,
				payload={
					"source": str(file_path),
					"filename": file_path.name,
					"document_id": doc_id,
					"document_type": file_path.suffix.lower().lstrip("."),
					"chunk_id": chunk_id,
					"chunk_index": index,
					"total_chunks": total,
					"text": chunk,
				},
			))

		# ── 1. Write to Qdrant first ─────────────────────────────────────────
		# If this fails, nothing lands in the registry — the failure is clean.
		# If the registry write below fails after this succeeds, the chunks are
		# live but unregistered; health_check.py --reconcile will surface it.
		self.client.upsert(collection_name=settings.QDRANT_COLLECTION, points=points)

		# ── 2. Update the Postgres registry ──────────────────────────────────
		asyncio.run(self.doc_repo.upsert(
			document_id=doc_id,
			filename=file_path.name,
			source_path=str(file_path),
			document_type=file_path.suffix.lower().lstrip("."),
			chunk_count=total,
		))

		return total


	def delete_document(self, document_id: str) -> None:
		"""Remove all Qdrant chunks and the Postgres registry entry for *document_id*."""
		self._delete_qdrant_chunks(document_id)
		asyncio.run(self.doc_repo.delete(document_id))

	def _delete_qdrant_chunks(self, document_id: str) -> None:
		"""Delete all Qdrant points whose payload matches *document_id*."""
		self.client.delete(
			collection_name=settings.QDRANT_COLLECTION,
			points_selector=Filter(
				must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]
			),
		)

	# ── Async path (used by FastAPI) ─────────────────────────────────────────

	async def aingest_file(self, path: str | Path) -> int:
		"""Async wrapper around ``ingest_file`` for use in FastAPI route handlers."""
		return await asyncio.to_thread(self.ingest_file, path)
