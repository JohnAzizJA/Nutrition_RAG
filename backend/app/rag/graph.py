from langgraph.graph import StateGraph, END
from backend.app.models.schemas import GraphState
from backend.app.rag.vector_store import VectorStore
from backend.app.rag.llm_client import LLMClient

class RAGGraph:
    def __init__(self):
        self.vector_store = VectorStore()
        self.llm_client = LLMClient()
        self.graph = self._build_graph()
    
    def _retrieve_node(self, state: GraphState) -> GraphState:
        query = state["query"]
        retrieved_docs = self.vector_store.query(query, n_results=3)
        state["retrieved_docs"] = retrieved_docs
        return state
    
    def _generate_node(self, state: GraphState) -> GraphState:
        query = state["query"]
        context = "\n\n".join(state["retrieved_docs"])
        
        prompt = f"""You are a nutrition expert. Use the following context to answer the question.

Context:
{context}

Question: {query}

Answer:"""
        
        response = self.llm_client.generate(prompt)
        state["response"] = response
        return state
    
    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(GraphState)
        
        # Add nodes
        workflow.add_node("retrieve", self._retrieve_node)
        workflow.add_node("generate", self._generate_node)
        
        # Define edges
        workflow.set_entry_point("retrieve")
        workflow.add_edge("retrieve", "generate")
        workflow.add_edge("generate", END)
        
        return workflow.compile()
    
    def run(self, query: str) -> str:
        initial_state = {
            "query": query,
            "retrieved_docs": [],
            "response": ""
        }
        
        result = self.graph.invoke(initial_state)
        return result["response"]
