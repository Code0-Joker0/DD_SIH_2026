import asyncio
from langchain_core.messages import HumanMessage
from app.workflows.graph import get_graph_manager

async def test_agent():
    async with get_graph_manager() as compiled_graph:
        config = {"configurable": {"thread_id": "test_thread_100"}}
        
        print("\n--- Generating History ---")
        large_text = "word " * 12000
        async for chunk in compiled_graph.astream({"messages": [HumanMessage(content=f"Please remember this large block of text: {large_text}")]}, config=config, stream_mode="values"):
            pass
                
        # Test 1: Ask a RAG question
        print("\n--- Test RAG and Summarization ---")
        async for chunk in compiled_graph.astream({"messages": [HumanMessage(content="What operating phases must be addressed in written operating procedures?")]}, config=config, stream_mode="values"):
            pass
            
        final_state = await compiled_graph.aget_state(config)
        messages = final_state.values.get("messages", [])
        
        tool_messages = [m for m in messages if m.type == "tool"]
        if tool_messages:
            print(f"Latest ToolMessage length: {len(str(tool_messages[-1].content))} characters")
        else:
            print("No tool message found in this turn.")
        
        summary = final_state.values.get("context_summary")
        print(f"\nCurrent Context Summary:\n{summary if summary else 'No summary yet.'}")
        
if __name__ == "__main__":
    asyncio.run(test_agent())
