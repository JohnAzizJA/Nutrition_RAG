from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from models.schemas import GraphState
from rag.vector_store import VectorStore
from rag.llm_client import LLMClient

class RAGGraph:
    def __init__(self):
        self.vector_store = VectorStore()
        self.llm_client = LLMClient()
        self.memory = MemorySaver()
        self.graph = self._build_graph()
        self.system_prompt = """You are an expert nutrition assistant specializing in Egyptian cuisine and dietary habits. Your role is to provide accurate, evidence-based nutrition advice grounded in the provided context from WHO guidelines, Egyptian food databases, and scientific research.

Guidelines:
- Use the provided context to answer questions accurately
- If the context doesn't contain relevant information, politely say so and offer to help with related nutrition topics
- Provide practical, actionable advice for dietary patterns
- Include calorie counts and macronutrients when available in the context
- Be concise but informative
- If asked about medical conditions, remind users to consult healthcare professionals

Respond in a friendly, helpful tone while maintaining scientific accuracy."""
    
    def _retrieve_node(self, state: GraphState) -> GraphState:
        query = state["query"]
        retrieved_docs = self.vector_store.query(query, n_results=3)
        state["retrieved_docs"] = retrieved_docs
        return state
    
    def _generate_node(self, state: GraphState) -> GraphState:
        query = state["query"]
        docs = state["retrieved_docs"]
        
        if not docs:
            context = "No relevant information found."
        else:
            context = "\n\n".join(docs)
        
        # Build the message list with history
        messages = [SystemMessage(content=self.system_prompt)]
        
        # Add previous conversation history
        for msg in state.get("chat_history", []):
            messages.append(msg)
        
        # Add current user query with retrieved context
        user_content = f"Context from knowledge base:\n{context}\n\nQuestion: {query}"
        messages.append(HumanMessage(content=user_content))
        
        # Generate response using message list
        response = self.llm_client.generate(messages)
        state["response"] = response
        
        # Append this turn to chat_history (the reducer will accumulate it)
        state["chat_history"] = [
            HumanMessage(content=query),
            AIMessage(content=response),
        ]
        
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
        
        return workflow.compile(checkpointer=self.memory)
    
    def run(self, query: str, thread_id: str = "default") -> str:
        initial_state = {
            "query": query,
            "retrieved_docs": [],
            "response": "",
            "chat_history": [],
        }
        
        config = {"configurable": {"thread_id": thread_id}}
        result = self.graph.invoke(initial_state, config=config)
        return result["response"]
