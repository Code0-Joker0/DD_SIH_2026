from __future__ import annotations


def chunk_text(
    text: str,
    chunk_size: int = 700,
    overlap: int = 100,
) -> list[str]:
    """
    Split text into overlapping word-based chunks.

    Parameters:
        text: Input document text.
        chunk_size: Approximate number of words per chunk.
        overlap: Number of words repeated between consecutive chunks.

    Returns:
        List of text chunks.
    """

    if not text or not text.strip():
        return []

    words = text.split()

    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than 0")

    if overlap < 0:
        raise ValueError("overlap cannot be negative")

    if overlap >= chunk_size:
        raise ValueError(
            "overlap must be smaller than chunk_size"
        )

    chunks: list[str] = []

    start = 0

    while start < len(words):
        end = min(start + chunk_size, len(words))

        chunk = " ".join(words[start:end]).strip()

        if chunk:
            chunks.append(chunk)

        if end >= len(words):
            break

        start = end - overlap

    return chunks