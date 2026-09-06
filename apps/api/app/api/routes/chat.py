from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.rag.rag_service import RAGService

router = APIRouter(prefix="/rag", tags=["rag"])


class RAGQueryRequest(BaseModel):
	query: str = Field(min_length=1)


@router.post("/query")
def rag_query(request: RAGQueryRequest) -> dict:
	try:
		return RAGService().query(request.query)
	except ValueError as error:
		raise HTTPException(status_code=400, detail=str(error)) from error
	except RuntimeError as error:
		raise HTTPException(status_code=503, detail=str(error)) from error
