import asyncio
import argparse
from langchain_core.messages import HumanMessage
from app.workflows.graph import get_graph_manager

async def test_graph(query: str, thread_id: str):
    print(f"Testing query: '{query}' on thread '{thread_id}'")
    
    async with get_graph_manager() as compiled_graph:
        config = {"configurable": {"thread_id": thread_id}}
        
        initial_state = {
            "messages": [HumanMessage(content=query)]
        }
        
        print("Starting execution stream...")
        async for chunk in compiled_graph.astream(initial_state, config=config):
            for node_name, node_state in chunk.items():
                print(f"\n--- Output from {node_name} ---")
                if "messages" in node_state:
                    latest_msg = node_state["messages"][-1]
                    if hasattr(latest_msg, "tool_calls") and latest_msg.tool_calls:
                        print(f"Tool Calls: {latest_msg.tool_calls}")
                    else:
                        print(f"Message: {latest_msg.content}")

        print("\n--- Final Output ---")
        # To get the final state, we can use aget_state
        state = await compiled_graph.aget_state(config)
        print(state.values["messages"][-1].content)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test LangGraph workflow")
    parser.add_argument("query", type=str, help="The message to send to the agent")
    parser.add_argument("--thread-id", type=str, default="test_thread_1", help="The conversation thread ID")
    args = parser.parse_args()
    
    asyncio.run(test_graph(args.query, args.thread_id))
