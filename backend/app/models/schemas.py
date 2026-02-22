from typing import TypedDict, Annotated
import operator

class GraphState(TypedDict):
    query: str
    retrieved_docs: list[str]
    response: str
    chat_history: Annotated[list, operator.add]
