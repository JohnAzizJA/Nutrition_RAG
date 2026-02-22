from langgraph.graph import StateGraph, END
from langgraph.store.memory import InMemoryStore
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from models.schemas import GraphState
from rag.vector_store import VectorStore
from rag.llm_client import LLMClient

class RAGGraph:
    def __init__(self):
        self.vector_store = VectorStore()
        self.llm_client = LLMClient()
        self.store = InMemoryStore()
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
        thread_id = state["thread_id"]
        
        if not docs:
            context = "No relevant information found."
        else:
            context = "\n\n".join(docs)
        
        # Retrieve chat history from store
        namespace = ("chat_history", thread_id)
        existing = self.store.get(namespace, "history")
        past_messages = list(existing.value["messages"]) if existing else []
        
        # Build message list: system prompt + history + current query
        messages = [SystemMessage(content=self.system_prompt)]
        
        for msg in past_messages:
            if msg["role"] == "human":
                messages.append(HumanMessage(content=msg["content"]))
            else:
                messages.append(AIMessage(content=msg["content"]))
        
        # Add current user query with retrieved context
        user_content = f"Context from knowledge base:\n{context}\n\nQuestion: {query}"
        messages.append(HumanMessage(content=user_content))
        
        # Generate response
        response = self.llm_client.generate(messages)
        state["response"] = response
        
        # Save updated history to store (raw query without context, to keep history clean)
        past_messages.append({"role": "human", "content": query})
        past_messages.append({"role": "ai", "content": response})
        self.store.put(namespace, "history", {"messages": past_messages})
        
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
    
    def run(self, query: str, thread_id: str = "default") -> str:
        initial_state = {
            "query": query,
            "retrieved_docs": [],
            "response": "",
            "thread_id": thread_id,
        }
        
        result = self.graph.invoke(initial_state)
        return result["response"]
