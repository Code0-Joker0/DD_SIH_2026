from huggingface_hub.utils import endpoint_helpers
from huggingface_hub.utils import endpoint_helpers
import os
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
import uuid
from qdrant_client.http.models import PointStruct

class QdrantRetriever:
    def __init__(
        self,
        collection_name: str = None,
        model_name: str = "BAAI/bge-m3",
        threshold: float = 0.60,
        top_k: int = 4
    ):
        self.collection_name = collection_name or os.getenv("QDRANT_COLLECTION", "mrpl_knowledge")
        self.host = os.getenv("QDRANT_HOST", "localhost")
        self.port = int(os.getenv("QDRANT_PORT", 6333))
        self.threshold = threshold
        self.top_k = top_k

        # Initialize Qdrant Client
        self.client = QdrantClient(host=self.host, port=self.port)
        
        # Load local cached BGE-M3
        self.model = SentenceTransformer(model_name)

    def retrieve(self, query: str) -> List[Dict[str, Any]]:
        query_vector = self.model.encode(query).tolist()

        # Handle qdrant-client version differences: query_points vs search
        hits = []
        if hasattr(self.client, "query_points"):
            response = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                limit=self.top_k,
                score_threshold=self.threshold
            )
            hits = response.points
        elif hasattr(self.client, "search"):
            hits = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                limit=self.top_k,
                score_threshold=self.threshold
            )

        results = []
        for hit in hits:
            payload = hit.payload or {}
            results.append({
                "score": round(float(hit.score), 4),
                "text": payload.get("text", ""),
                "source": payload.get("source", "unknown"),
                "chunk_id": payload.get("chunk_id", str(hit.id))
            })
        return results

    def ingest_text_chunks(self, text: str, source_name: str, chunk_size: int = 500, overlap: int = 50):
        from app.rag.chunker import chunk_text  # or your teammate's chunker function
    
        chunks = chunk_text(text) if callable(globals().get("chunk_text")) else [text]
        points = []
    
        for idx, chunk in enumerate(chunks):
            vector = self.model.encode(chunk).tolist()
            point_id = str(uuid.uuid4())
            payload = {
                "text": chunk,
                "source": source_name,
                "chunk_id": f"{source_name}_chunk_{idx}"
            }
            points.append(PointStruct(id=point_id, vector=vector, payload=payload))
        
        if points:
        
            self.client.upsert(
                collection_name=self.collection_name,
                points=points,
                wait=True
            )
    
        return len(points)