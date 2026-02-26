from typing import TypedDict, Literal

class GraphState(TypedDict):
    query: str
    retrieved_docs: list[str]
    tool_calls: list
    tool_results: str
    next_action: Literal["retrieve", "tools", "generate", "end"]
    response: str
