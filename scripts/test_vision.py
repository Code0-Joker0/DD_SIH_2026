import asyncio
import logging
from langchain_core.messages import HumanMessage
from app.workflows.graph import get_graph_manager

logging.basicConfig(level=logging.INFO)

async def test_agent():
    async with get_graph_manager() as compiled_graph:
        config = {"configurable": {"thread_id": "vision_multi_test_002"}}
        
        print("\n--- Test Vision Tool ---")
        prompt = "Analyze these images together: /mnt/shared_drive/images_test/image_1.png and /mnt/shared_drive/images_test/image_2.png"
        async for chunk in compiled_graph.astream({"messages": [HumanMessage(content=prompt)]}, config=config, stream_mode="values"):
            messages = chunk.get("messages", [])
            if messages:
                latest = messages[-1]
                if latest.type == "tool":
                    print(f"[Tool Output]: {latest.content[:300]}...")
                elif latest.type == "ai" and latest.tool_calls:
                    print(f"[AI Tool Call]: {latest.tool_calls}")
                elif latest.type == "ai":
                    print(f"[AI Content]: {latest.content}")
        
if __name__ == "__main__":
    asyncio.run(test_agent())
