import asyncio
import argparse
from langchain_core.messages import HumanMessage
from app.workflows.graph import get_graph_manager

async def chat_loop(thread_id: str):
    print(f"Starting interactive chat on thread: '{thread_id}'")
    print("Type 'exit' or 'quit' to stop.\n")
    
    async with get_graph_manager() as compiled_graph:
        config = {"configurable": {"thread_id": thread_id}}
        
        while True:
            try:
                user_input = input("\nUser: ")
                if user_input.lower() in ['exit', 'quit']:
                    break
                if not user_input.strip():
                    continue
                
                print("\nThinking...")
                initial_state = {"messages": [HumanMessage(content=user_input)]}
                
                async for chunk in compiled_graph.astream(initial_state, config=config):
                    for node_name, node_state in chunk.items():
                        if "messages" in node_state:
                            latest_msg = node_state["messages"][-1]
                            if hasattr(latest_msg, "tool_calls") and latest_msg.tool_calls:
                                print(f"\n[Agent -> Tool] {latest_msg.tool_calls[0]['name']}({latest_msg.tool_calls[0]['args']})")
                            elif latest_msg.content:
                                print(f"\n[Agent] {latest_msg.content}")
                                
            except KeyboardInterrupt:
                print("\nExiting chat...")
                break
            except Exception as e:
                print(f"\n[Error] {str(e)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Interactive LangGraph Chat")
    parser.add_argument("--thread-id", type=str, default="interactive_thread_1", help="The conversation thread ID")
    args = parser.parse_args()
    
    asyncio.run(chat_loop(args.thread_id))
