from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.store.postgres.aio import AsyncPostgresStore
from psycopg_pool import AsyncConnectionPool

from app.core.config import settings
from app.workflows.state import AgentState
from app.workflows.nodes import route_task, manage_context, run_agent, should_continue
from app.workflows.tools import TOOLS


def build_graph() -> StateGraph:
    """
    Builds the state graph.

    Turn flow:
      START -> route_task -> manage_context -> run_agent ---> tools -> run_agent -> ...
                                                         \\-> END
    manage_context runs once per user turn (not inside the tools loop),
    preparing the trimmed/summarized message slice for run_agent.
    The tools -> run_agent back-edge bypasses manage_context intentionally --
    tool result messages are short-lived and handled by run_agent's inline trim fallback.
    """
    workflow = StateGraph(AgentState)

    # Nodes
    workflow.add_node("route_task", route_task)
    workflow.add_node("manage_context", manage_context)
    workflow.add_node("run_agent", run_agent)
    workflow.add_node("tools", ToolNode(TOOLS))

    # Edges
    workflow.add_edge(START, "route_task")
    workflow.add_edge("route_task", "manage_context")
    workflow.add_edge("manage_context", "run_agent")

    workflow.add_conditional_edges(
        "run_agent",
        should_continue,
        {"tools": "tools", "END": END},
    )

    # Tools loop back to run_agent directly (skipping manage_context)
    workflow.add_edge("tools", "run_agent")

    return workflow


# Uncompiled graph for reference / testing without a checkpointer
uncompiled_graph = build_graph()


class GraphManager:
    """
    Async context manager that:
    - Opens a Postgres connection pool
    - Sets up the LangGraph checkpointer (AsyncPostgresSaver) for thread-scoped memory
    - Sets up the LangGraph store (AsyncPostgresStore) for cross-thread key-value memory
    - Returns a compiled graph with both wired in

    Usage:
        async with get_graph_manager() as graph:
            await graph.ainvoke(...)
    """

    def __init__(self):
        # open=False defers connection until __aenter__ calls pool.open(),
        # suppressing the psycopg_pool deprecation warning about opening
        # an async pool inside a synchronous constructor.
        # min_size=1 ensures at least one connection is always ready.
        self.pool = AsyncConnectionPool(
            conninfo=settings.POSTGRES_DSN,
            min_size=1,
            max_size=10,
            kwargs={"autocommit": True},
            open=False,
        )
        self.checkpointer = AsyncPostgresSaver(self.pool)

    async def __aenter__(self):
        await self.pool.open()
        await self.checkpointer.setup()

        # AsyncPostgresStore.from_conn_string is an async context manager
        # (AsyncIterator), not a plain coroutine — must use async with.
        # Store the context manager so __aexit__ can close it properly.
        self._store_ctx = AsyncPostgresStore.from_conn_string(settings.POSTGRES_DSN)
        self.store = await self._store_ctx.__aenter__()
        await self.store.setup()

        return uncompiled_graph.compile(
            checkpointer=self.checkpointer,
            store=self.store,
        )

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        # Close the store context manager first, then the connection pool.
        if hasattr(self, "_store_ctx"):
            await self._store_ctx.__aexit__(exc_type, exc_val, exc_tb)
        await self.pool.close()


def get_graph_manager() -> GraphManager:
    return GraphManager()
