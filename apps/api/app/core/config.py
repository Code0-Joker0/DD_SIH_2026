import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # App
    PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent.parent.parent.parent
    DATA_ROOT: str = "/mnt/shared_drive"
    
    # vLLM
    VLLM_BASE_URL: str = "http://127.0.0.1:8000/v1"
    VLLM_API_KEY: str = "local-vllm"
    VLLM_MODEL: str = "Qwen/Qwen2.5-Coder-7B-Instruct-AWQ"
    VLLM_MODEL_REASONING: str = "Qwen/Qwen2.5-Coder-7B-Instruct-AWQ"
    VLLM_MODEL_CODING: str = "Qwen/Qwen2.5-Coder-7B-Instruct-AWQ"
    VLLM_MODEL_VL: str = "Qwen/Qwen2.5-Coder-7B-Instruct-AWQ"
    VLLM_MAX_MODEL_LEN: int = 4096       # mirror of the vLLM --max-model-len flag
    CONTEXT_BUDGET_RATIO: float = 0.75   # fraction of max_model_len reserved for input tokens
    
    # PostgreSQL
    POSTGRES_DSN: str = "postgresql://ved:pass@127.0.0.1:5432/sih_db"
    
    # Qdrant / Search
    RETRIEVAL_TOP_K: int = 12
    QDRANT_URL: str = "http://127.0.0.1:6333"
    QDRANT_COLLECTION: str = "sih_documents"
    EMBEDDING_MODEL: str = "BAAI/bge-m3"
    RERANKER_MODEL: str = "BAAI/bge-reranker-v2-m3"
    EMBEDDING_DEVICE: str = "cpu"
    RERANKER_DEVICE: str = "cpu"
    EMBEDDING_DIMENSION: int = 1024
    RERANK_TOP_K: int = 5
    RERANK_MIN_SCORE: float = 0.0
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 100
    
    # API
    API_HOST: str = "127.0.0.1"
    API_PORT: int = 8080

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        env_ignore_empty=True
    )
    
    @property
    def os_environ(self) -> dict:
        return dict(os.environ)

settings = Settings()
