from typing import TypedDict

class GraphState(TypedDict):
    query: str
    retrieved_docs: list[str]
    response: str
    thread_id: str
