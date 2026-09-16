from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

from app.core.config import settings


def get_qdrant_client() -> QdrantClient:
	return QdrantClient(url=settings.QDRANT_URL)


def ensure_collection(client: QdrantClient | None = None) -> None:
	client = client or get_qdrant_client()
	collections = {item.name for item in client.get_collections().collections}
	if settings.QDRANT_COLLECTION not in collections:
		client.create_collection(
			collection_name=settings.QDRANT_COLLECTION,
			vectors_config=VectorParams(size=settings.EMBEDDING_DIMENSION, distance=Distance.COSINE),
		)
		return

	info = client.get_collection(settings.QDRANT_COLLECTION)
	params = info.config.params.vectors
	vector_size = params.size if hasattr(params, "size") else next(iter(params.values())).size
	if vector_size != settings.EMBEDDING_DIMENSION:
		raise ValueError(
			f"collection {settings.QDRANT_COLLECTION!r} has vector size {vector_size}, "
			f"expected {settings.EMBEDDING_DIMENSION}; refusing to modify existing data"
		)
