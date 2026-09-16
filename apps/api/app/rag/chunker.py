from __future__ import annotations

import re


def chunk_text(
    text: str,
    chunk_size: int = 800,
    overlap: int = 100,
) -> list[str]:
    """Split text into overlapping chunks that respect sentence boundaries.

    Strategy:
    1. Normalise whitespace so comparisons are stable.
    2. Split on sentence-ending punctuation so chunks don't cut mid-sentence.
    3. Greedily accumulate sentences until the chunk would exceed *chunk_size*.
    4. Slide forward by (chunk_size - overlap) characters, keeping the tail
       of the previous chunk as the leading context for the next one.

    Args:
        text:       Raw document text.
        chunk_size: Maximum number of characters per chunk.
        overlap:    Number of characters of trailing context carried into the
                    next chunk.  Must be in [0, chunk_size).  A value of
                    roughly 10-15 % of chunk_size is a good default.

    Returns:
        List of non-empty text chunks.
    """
    if chunk_size < 1:
        raise ValueError("chunk_size must be positive")
    if not 0 <= overlap < chunk_size:
        raise ValueError("overlap must be in [0, chunk_size)")

    # ── 1. Normalise whitespace ──────────────────────────────────────────
    normalized = " ".join(text.split())
    if not normalized:
        return []

    # ── 2. Sentence-split ────────────────────────────────────────────────
    # Keep the delimiter attached to the sentence it closes (positive look-
    # behind) so we don't strip punctuation from the output.
    sentence_pattern = re.compile(r'(?<=[.!?])\s+')
    sentences = sentence_pattern.split(normalized)

    # ── 3. Greedy sentence packing ───────────────────────────────────────
    chunks: list[str] = []
    current_parts: list[str] = []
    current_len = 0

    def flush() -> None:
        """Emit the current accumulator as a chunk."""
        chunk = " ".join(current_parts).strip()
        if chunk:
            chunks.append(chunk)

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue

        # If a single sentence is already longer than chunk_size, split it
        # with the character-level fallback so we never produce oversized chunks.
        if len(sentence) > chunk_size:
            # Flush anything accumulated so far first.
            flush()
            current_parts, current_len = [], 0
            # Character-level split with overlap for the long sentence.
            step = chunk_size - overlap
            for i in range(0, len(sentence), step):
                sub = sentence[i : i + chunk_size].strip()
                if sub:
                    chunks.append(sub)
            continue

        sep_len = 1 if current_parts else 0  # space between sentences
        if current_len + sep_len + len(sentence) > chunk_size and current_parts:
            flush()
            # ── 4. Carry-over overlap ────────────────────────────────────
            # Walk back through parts until we have ~overlap chars of context.
            overlap_parts: list[str] = []
            overlap_len = 0
            for part in reversed(current_parts):
                if overlap_len + len(part) + 1 > overlap:
                    break
                overlap_parts.insert(0, part)
                overlap_len += len(part) + 1
            current_parts = overlap_parts
            current_len = overlap_len

        current_parts.append(sentence)
        current_len += sep_len + len(sentence)

    flush()
    return chunks
