from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

from app.core.config import EMBEDDING_DIMENSION, QDRANT_COLLECTION, QDRANT_URL


def get_qdrant_client() -> QdrantClient:
	return QdrantClient(url=QDRANT_URL)


def ensure_collection(client: QdrantClient | None = None) -> None:
	client = client or get_qdrant_client()
	collections = {item.name for item in client.get_collections().collections}
	if QDRANT_COLLECTION not in collections:
		client.create_collection(
			collection_name=QDRANT_COLLECTION,
			vectors_config=VectorParams(size=EMBEDDING_DIMENSION, distance=Distance.COSINE),
		)
		return

	info = client.get_collection(QDRANT_COLLECTION)
	params = info.config.params.vectors
	vector_size = params.size if hasattr(params, "size") else next(iter(params.values())).size
	if vector_size != EMBEDDING_DIMENSION:
		raise ValueError(
			f"collection {QDRANT_COLLECTION!r} has vector size {vector_size}, "
			f"expected {EMBEDDING_DIMENSION}; refusing to modify existing data"
		)
