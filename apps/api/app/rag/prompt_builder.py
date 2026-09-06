def build_grounded_prompt(query: str, context: str) -> str:
	return (
		"Answer the user using only the supplied context. If the context does not "
		"contain the answer, say that you do not have enough information. "
		"Cite sources by their [Source N] labels.\n\n"
		f"Context:\n{context}\n\nUser question: {query}"
	)