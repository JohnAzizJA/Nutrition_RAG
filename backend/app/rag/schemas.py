from typing import TypedDict, Literal, Annotated
from langgraph.graph.message import add_messages

class GraphState(TypedDict):
    query: str
    messages: Annotated[list, add_messages]
    retrieved_docs: list[str]
    tool_calls: list
    tool_results: str
    next_action: Literal["retrieve", "tools", "generate", "end"]
    response: str
