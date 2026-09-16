from __future__ import annotations

import json
from pathlib import Path

from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer


QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "mrpl_knowledge"
MODEL_NAME = "BAAI/bge-m3"

QUESTIONS_FILE = Path("tests/retrieval_questions.json")


def main() -> None:
    print("=" * 70)
    print("MRPL RAG RETRIEVAL EVALUATION")
    print("=" * 70)

    qdrant = QdrantClient(url=QDRANT_URL)
    model = SentenceTransformer(MODEL_NAME)

    questions = json.loads(
        QUESTIONS_FILE.read_text(encoding="utf-8")
    )

    recall_at_1 = 0
    recall_at_3 = 0
    recall_at_5 = 0
    relevant_total = 0

    for index, item in enumerate(questions, start=1):
        question = item["question"]
        expected_source = item["expected_source"]
        is_relevant = item["relevant"]

        query_vector = model.encode(
            question,
            normalize_embeddings=True,
        ).tolist()

        results = qdrant.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vector,
            limit=5,
            with_payload=True,
        ).points

        print("\n" + "=" * 70)
        print(f"Q{index}: {question}")

        if not results:
            print("No results returned.")
            continue

        if not is_relevant:
            print("Type: IRRELEVANT")
            print(
                f"Top result: "
                f"{results[0].payload.get('source')} "
                f"(score={results[0].score:.4f})"
            )

            print("\nAll retrieved results:")

            for rank, result in enumerate(results, start=1):
                print(
                    f"  {rank}. "
                    f"{result.payload.get('source')} "
                    f"(score={result.score:.4f})"
                )

            continue

        relevant_total += 1

        sources = [
            result.payload.get("source")
            for result in results
        ]

        print(f"Expected: {expected_source}")
        print("\nRetrieved results:")

        for rank, result in enumerate(results, start=1):
            source = result.payload.get("source")
            score = result.score

            marker = (
                " <-- CORRECT"
                if source == expected_source
                else ""
            )

            print(
                f"  {rank}. {source} "
                f"(score={score:.4f}){marker}"
            )

        hit_1 = expected_source in sources[:1]
        hit_3 = expected_source in sources[:3]
        hit_5 = expected_source in sources[:5]

        recall_at_1 += int(hit_1)
        recall_at_3 += int(hit_3)
        recall_at_5 += int(hit_5)

        print(
            f"\nRecall@1: {'PASS' if hit_1 else 'FAIL'}"
        )
        print(
            f"Recall@3: {'PASS' if hit_3 else 'FAIL'}"
        )
        print(
            f"Recall@5: {'PASS' if hit_5 else 'FAIL'}"
        )

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)

    if relevant_total:
        print(
            f"Recall@1: "
            f"{recall_at_1 / relevant_total:.2%}"
        )

        print(
            f"Recall@3: "
            f"{recall_at_3 / relevant_total:.2%}"
        )

        print(
            f"Recall@5: "
            f"{recall_at_5 / relevant_total:.2%}"
        )


if __name__ == "__main__":
    main()