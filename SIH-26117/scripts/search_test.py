from __future__ import annotations

from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient


QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "mrpl_knowledge"
MODEL_NAME = "BAAI/bge-m3"

RELEVANCE_THRESHOLD = 0.60


def main() -> None:
    print("Connecting to Qdrant...")
    
    qdrant = QdrantClient(
        url=QDRANT_URL
    )

    print("Loading BGE-M3...")

    model = SentenceTransformer(
        MODEL_NAME
    )

    query = input(
        "\nEnter your question: "
    ).strip()

    if not query:
        print("Question cannot be empty.")
        return

    query_vector = model.encode(
        query,
        normalize_embeddings=True,
    ).tolist()

    results = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        limit=5,
        with_payload=True,
    ).points

    if not results:
        print("\nNo knowledge found.")
        return

    best_result = results[0]
    best_score = best_result.score

    print(
        f"\nBest similarity score: "
        f"{best_score:.4f}"
    )

    print(
        f"Relevance threshold: "
        f"{RELEVANCE_THRESHOLD:.2f}"
    )

    if best_score < RELEVANCE_THRESHOLD:
        print(
            "\nNo relevant information found "
            "in the knowledge base."
        )
        return

    print("\nRelevant knowledge found.")
    print("=" * 70)

    for rank, result in enumerate(
        results,
        start=1,
    ):
        print(f"\nRank: {rank}")
        print(
            f"Score: {result.score:.4f}"
        )
        print(
            f"Source: "
            f"{result.payload.get('source')}"
        )
        print(
            f"Text:\n"
            f"{result.payload.get('text')}"
        )
        print("-" * 70)


if __name__ == "__main__":
    main()