from __future__ import annotations

from typing import Any


class ContextBuilder:
	def build(self, candidates: list[dict[str, Any]]) -> tuple[str, list[dict[str, Any]]]:
		blocks = []
		context_used = []
		for index, item in enumerate(candidates, start=1):
			payload = item.get("payload", {})
			text = str(payload.get("text", "")).strip()
			if not text:
				continue
			source = {
				"source": payload.get("source", "unknown"),
				"document_id": payload.get("document_id", "unknown"),
				"chunk_id": payload.get("chunk_id", item.get("id", "unknown")),
				"rerank_score": item.get("rerank_score"),
			}
			context_used.append(source)
			blocks.append(f"[Source {index}] {text}")
		return "\n\n".join(blocks), context_used