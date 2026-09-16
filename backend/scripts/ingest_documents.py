from __future__ import annotations

from pathlib import Path

from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
from sentence_transformers import SentenceTransformer

from app.rag.chunker import chunk_text


QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "mrpl_knowledge"
MODEL_NAME = "BAAI/bge-m3"

DOCUMENTS_DIR = Path("data/raw")


def main() -> None:
    print("Connecting to Qdrant...")

    qdrant = QdrantClient(
        url=QDRANT_URL
    )

    print("Loading BGE-M3...")

    model = SentenceTransformer(
        MODEL_NAME
    )

    documents = sorted(
        DOCUMENTS_DIR.glob("*.txt")
    )

    if not documents:
        raise RuntimeError(
            f"No TXT documents found in {DOCUMENTS_DIR}"
        )

    all_points: list[PointStruct] = []

    point_id = 1

    for document_path in documents:

        print(
            f"\nProcessing: {document_path.name}"
        )

        text = document_path.read_text(
            encoding="utf-8"
        )

        chunks = chunk_text(text)

        print(
            f"Chunks created: {len(chunks)}"
        )

        if not chunks:
            print("Skipping empty document.")
            continue

        embeddings = model.encode(
            chunks,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

        for chunk_index, (
            chunk,
            embedding,
        ) in enumerate(
            zip(chunks, embeddings)
        ):

            point = PointStruct(
                id=point_id,
                vector=embedding.tolist(),
                payload={
                    "document_id": document_path.stem,
                    "chunk_id": (
                        f"{document_path.stem}"
                        f"_chunk_{chunk_index}"
                    ),
                    "source": document_path.name,
                    "document_type": "test_document",
                    "department": "operations",
                    "access_level": "internal",
                    "chunk_index": chunk_index,
                    "text": chunk,
                },
            )

            all_points.append(point)

            point_id += 1

    if not all_points:
        raise RuntimeError(
            "No vectors were generated."
        )

    print(
        f"\nUploading {len(all_points)} "
        f"points to Qdrant..."
    )

    qdrant.upsert(
        collection_name=COLLECTION_NAME,
        points=all_points,
        wait=True,
    )

    print("\nIngestion completed successfully.")


if __name__ == "__main__":
    main()