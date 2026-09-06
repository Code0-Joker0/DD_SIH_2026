def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list[str]:
	"""Split normalized text into overlapping character chunks."""
	if chunk_size < 1:
		raise ValueError("chunk_size must be positive")
	if overlap < 0 or overlap >= chunk_size:
		raise ValueError("overlap must be between 0 and chunk_size - 1")

	normalized = " ".join(text.split())
	chunks = []
	step = chunk_size - overlap
	for index in range(0, len(normalized), step):
		chunk = normalized[index:index + chunk_size].strip()
		if chunk:
			chunks.append(chunk)
	return chunks
