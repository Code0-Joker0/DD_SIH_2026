from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage
from typing import Any

from app.workflows.graph import get_graph_manager

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    query: str = Field(min_length=1)
    thread_id: str = Field(default="default", description="Conversation thread ID for checkpointing")

@router.post("/query")
async def chat_query(request: ChatRequest) -> dict[str, Any]:
    try:
        async with get_graph_manager() as compiled_graph:
            config = {"configurable": {"thread_id": request.thread_id}}
            
            # The initial state input
            initial_state = {
                "messages": [HumanMessage(content=request.query)]
            }
            
            # Invoke the graph
            final_state = await compiled_graph.ainvoke(initial_state, config=config)
            
            # The final message is the last one in the messages list
            last_message = final_state["messages"][-1].content
            
            return {
                "response": last_message,
                "loaded_model": final_state.get("loaded_model", "unknown")
            }
            
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Graph execution failed: {str(error)}") from error
