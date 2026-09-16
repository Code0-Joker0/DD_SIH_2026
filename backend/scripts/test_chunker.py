from pathlib import Path

from app.rag.chunker import chunk_text


def main() -> None:
    file_path = Path("data/raw/emergency_shutdown.txt")

    text = file_path.read_text(
        encoding="utf-8"
    )

    chunks = chunk_text(text)

    print(f"Document: {file_path.name}")
    print(f"Total chunks: {len(chunks)}")

    for index, chunk in enumerate(chunks):
        print("\n" + "=" * 60)
        print(f"CHUNK {index}")
        print("=" * 60)
        print(chunk)


if __name__ == "__main__":
    main()