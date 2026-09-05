from __future__ import annotations

import json
from pathlib import Path

from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer


QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "mrpl_knowledge"
MODEL_NAME = "BAAI/bge-m3"

QUESTIONS_FILE = Path("tests/retrieval_questions.json")

THRESHOLDS = [0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60]


def main() -> None:
    print("=" * 70)
    print("MRPL RAG THRESHOLD EVALUATION")
    print("=" * 70)

    qdrant = QdrantClient(url=QDRANT_URL)
    model = SentenceTransformer(MODEL_NAME)

    questions = json.loads(
        QUESTIONS_FILE.read_text(encoding="utf-8")
    )

    results_data = []

    for item in questions:
        question = item["question"]
        expected_source = item["expected_source"]
        relevant = item["relevant"]

        query_vector = model.encode(
            question,
            normalize_embeddings=True,
        ).tolist()

        results = qdrant.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vector,
            limit=1,
            with_payload=True,
        ).points

        if not results:
            top_score = 0.0
            top_source = None
        else:
            top_score = results[0].score
            top_source = results[0].payload.get("source")

        results_data.append(
            {
                "question": question,
                "expected_source": expected_source,
                "relevant": relevant,
                "top_source": top_source,
                "top_score": top_score,
            }
        )

    print("\nRAW RESULTS")
    print("-" * 70)

    for item in results_data:
        print(
            f"{item['top_score']:.4f} | "
            f"{'RELEVANT' if item['relevant'] else 'IRRELEVANT':10} | "
            f"{item['question']}"
        )

    print("\n" + "=" * 70)
    print("THRESHOLD ANALYSIS")
    print("=" * 70)

    for threshold in THRESHOLDS:
        true_positives = 0
        false_negatives = 0
        false_positives = 0
        true_negatives = 0

        for item in results_data:
            predicted_relevant = (
                item["top_score"] >= threshold
            )

            actual_relevant = item["relevant"]

            if actual_relevant and predicted_relevant:
                true_positives += 1

            elif actual_relevant and not predicted_relevant:
                false_negatives += 1

            elif not actual_relevant and predicted_relevant:
                false_positives += 1

            else:
                true_negatives += 1

        print(f"\nThreshold: {threshold:.2f}")
        print(f"  TP: {true_positives}")
        print(f"  FN: {false_negatives}")
        print(f"  FP: {false_positives}")
        print(f"  TN: {true_negatives}")

        total_relevant = true_positives + false_negatives
        total_irrelevant = false_positives + true_negatives

        recall = (
            true_positives / total_relevant
            if total_relevant
            else 0.0
        )

        specificity = (
            true_negatives / total_irrelevant
            if total_irrelevant
            else 0.0
        )

        print(f"  Recall:      {recall:.2%}")
        print(f"  Specificity: {specificity:.2%}")


if __name__ == "__main__":
    main()