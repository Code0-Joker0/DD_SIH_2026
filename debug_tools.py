import asyncio
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from app.workflows.tools import TOOLS

async def main():
    llm = ChatOpenAI(
        base_url="http://127.0.0.1:8000/v1",
        api_key="local-vllm",
        model="solidrust/Hermes-3-Llama-3.1-8B-AWQ",
        temperature=0.0,
    )
    llm_with_tools = llm.bind_tools(TOOLS)
    try:
        print("Invoking LLM with tools...")
        res = await llm_with_tools.ainvoke([HumanMessage(content="+")])
        print("Success!")
        print(res)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
