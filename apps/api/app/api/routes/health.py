from fastapi import APIRouter

from app.core.config import QDRANT_URL

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
	return {"status": "ok", "qdrant_url": QDRANT_URL}
