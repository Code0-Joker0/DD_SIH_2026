import os


def _int_env(name: str, default: int) -> int:
	value = os.getenv(name)
	return int(value) if value else default


DATA_ROOT = os.getenv("DATA_ROOT", "/data/sih26117")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_PORT = _int_env("QDRANT_PORT", 6333)
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "sih_documents")
EMBEDDING_MODEL = os.getenv("BGE_M3_MODEL", "BAAI/bge-m3")
RERANKER_MODEL = os.getenv("RERANKER_MODEL", "BAAI/bge-reranker-v2-m3")
EMBEDDING_DEVICE = os.getenv("BGE_DEVICE", "cpu")
RERANKER_DEVICE = os.getenv("RERANKER_DEVICE", "cpu")
EMBEDDING_DIMENSION = _int_env("EMBEDDING_DIMENSION", 1024)
RETRIEVAL_TOP_K = _int_env("RETRIEVAL_TOP_K", 12)
RERANK_TOP_K = _int_env("RERANK_TOP_K", 5)
RERANK_MIN_SCORE = float(os.getenv("RERANK_MIN_SCORE", "0.0"))
CHUNK_SIZE = _int_env("CHUNK_SIZE", 800)
CHUNK_OVERLAP = _int_env("CHUNK_OVERLAP", 100)
VLLM_BASE_URL = os.getenv("VLLM_BASE_URL", "http://127.0.0.1:8000/v1")
VLLM_MODEL = os.getenv("VLLM_MODEL", "Qwen/Qwen2.5-Coder-7B-Instruct-AWQ")
VLLM_API_KEY = os.getenv("VLLM_API_KEY", "local-vllm")
VLLM_TIMEOUT = float(os.getenv("VLLM_TIMEOUT", "120"))
API_HOST = os.getenv("API_HOST", "127.0.0.1")
API_PORT = _int_env("API_PORT", 8080)
