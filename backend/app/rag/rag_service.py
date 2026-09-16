import os
import requests
from typing import Dict, Any, List, Optional
from app.rag.retriever import QdrantRetriever

class RAGService:
    def __init__(self):
        self.retriever = QdrantRetriever()
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", os.getenv("VLLM_BASE_URL", "http://127.0.0.1:11434"))
        self.ollama_model = os.getenv("OLLAMA_MODEL", os.getenv("VLLM_MODEL_NAME", "llama3.2:3b"))

    def generate_response(
        self,
        query: str,
        history: Optional[List[Dict[str, Any]]] = None,
        model_name: Optional[str] = None
    ) -> Dict[str, Any]:
        # 1. Retrieve top matching chunks above threshold
        retrieved_docs = self.retriever.retrieve(query)

        # 2. Build context string
        if retrieved_docs:
            context_blocks = [
                f"[Source: {doc['source']} | Score: {doc['score']}]\n{doc['text']}" 
                for doc in retrieved_docs
            ]
            context_str = "\n\n".join(context_blocks)
        else:
            context_str = "No specific documentation found matching the required relevance threshold."

        # 3. System prompt for industrial integrity and equipment guidelines
        system_prompt = (
            "You are an industrial safety and equipment integrity assistant for MRPL refinery operations. "
            "Answer the question accurately based strictly on the provided context below. "
            "If the answer cannot be determined from the context, state clearly that the "
            "information is not available in the provided documentation.\n\n"
            f"Context:\n{context_str}"
        )

        # 4. Invoke Ollama API
        active_model = model_name or self.ollama_model
        try:
            res = requests.post(
                f"{self.ollama_base_url}/api/generate",
                json={
                    "model": active_model,
                    "prompt": query,
                    "system": system_prompt,
                    "stream": False
                },
                timeout=60
            )
            res.raise_for_status()
            answer = res.json().get("response", "")
        except Exception as err:
            answer = f"[LLM Inference Unavailable: {str(err)}]"

        return {
            "query": query,
            "response": answer,
            "sources": retrieved_docs
        }