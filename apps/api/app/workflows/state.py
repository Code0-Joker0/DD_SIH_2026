from typing import Annotated, TypedDict, Optional
from langchain_core.messages import BaseMessage
import operator

class AgentState(TypedDict):
    # Standard conversation history — append-only (Postgres checkpointer persists full history)
    messages: Annotated[list[BaseMessage], operator.add]

    # Model swapping state
    required_model: str
    loaded_model: str

    # Running conversation summary — populated by manage_context when history grows long.
    # Stored in Postgres via the checkpointer so it survives session restarts.
    context_summary: str

    # Side-channel: trimmed message slice prepared by manage_context for run_agent.
    # Set to None by run_agent after use so it doesn't pollute Postgres state.
    _trimmed_messages: Optional[list]

    # Task context
    retrieved_context: Annotated[list[str], operator.add]
    draft: str
