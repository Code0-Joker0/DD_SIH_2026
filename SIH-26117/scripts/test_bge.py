from sentence_transformers import SentenceTransformer
MODEL_NAME = "BAAI/bge-m3"
def main() -> None:
    print(f"Loading model: {MODEL_NAME}")

    model = SentenceTransformer(MODEL_NAME)

    texts = [
        "Emergency shutdown procedure for process equipment.",
        "Pump maintenance and equipment isolation procedure.",
        "Safety checks before industrial maintenance.",
    ]

    embeddings = model.encode(
        texts,
        normalize_embeddings=True,
    )

    print("Embedding shape:", embeddings.shape)
    print("Vector dimension:", embeddings.shape[1])


if __name__ == "__main__":
    main()