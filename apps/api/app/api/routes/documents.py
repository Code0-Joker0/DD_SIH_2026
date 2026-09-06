from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.rag.chunker import chunk_text

router = APIRouter(prefix="/documents", tags=["documents"])


class DocumentRequest(BaseModel):
	text: str = Field(min_length=1)
	chunk_size: int = Field(default=800, ge=1)


@router.post("/chunks")
def create_chunks(document: DocumentRequest) -> dict[str, list[str]]:
	return {"chunks": chunk_text(document.text, document.chunk_size, 0)}
