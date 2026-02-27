from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres import PostgresSaver
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from models.schemas import GraphState
from rag.vector_store import VectorStore
from rag.llm_client import LLMClient
from rag.tools import calculate_bmi, calculate_bmr, calculate_tdee, calculate_targets
import os
from dotenv import load_dotenv

load_dotenv()

class RAGGraph:
    def __init__(self):
        self.vector_store = VectorStore()
        self.llm_client = LLMClient()
        self.checkpointer = PostgresSaver.from_conn_string(os.getenv("DATABASE_URL"))
        self.checkpointer.setup()
        self.graph = self._build_graph()
        self.system_prompt = """You are an expert nutrition assistant specializing in dietary habits.

Guidelines:
- Use provided context to answer questions accurately
- Use calculation tools when users ask for BMI, BMR, TDEE, or nutrition targets
- If context doesn't contain info, say so politely
- Include calorie counts and macros when available
- Be concise but informative
- Remind users to consult healthcare professionals for medical conditions

You have access to calculation tools:
- calculate_bmi: Needs weight_kg, height_cm
- calculate_bmr: Needs weight_kg, height_cm, age, gender
- calculate_tdee: Needs bmr, activity_level
- calculate_targets: Needs weight_kg, height_cm, age, gender, activity_level, goal

If user asks for calculations but doesn't provide stats, ask for the necessary information.

Respond in a friendly, helpful tone while maintaining scientific accuracy."""
    
    def _agent_node(self, state: GraphState) -> GraphState:
        query = state["query"]
        
        messages = [
            SystemMessage(content=self.system_prompt),
            HumanMessage(content=query)
        ]
        
        response = self.llm_client.invoke(messages)
        
        # Check if LLM wants to use tools
        if hasattr(response, 'tool_calls') and response.tool_calls:
            state["tool_calls"] = response.tool_calls
            state["next_action"] = "tools"
        else:
            # No tools needed, retrieve docs for knowledge questions
            state["next_action"] = "retrieve"
        
        return state
    
    def _tool_node(self, state: GraphState) -> GraphState:
        tool_map = {
            "calculate_bmi": calculate_bmi,
            "calculate_bmr": calculate_bmr,
            "calculate_tdee": calculate_tdee,
            "calculate_targets": calculate_targets
        }
        
        results = []
        for tool_call in state["tool_calls"]:
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]
            
            if tool_name in tool_map:
                try:
                    result = tool_map[tool_name].invoke(tool_args)
                    results.append(f"{tool_name}: {result}")
                except Exception as e:
                    results.append(f"{tool_name}: Error - {str(e)}")
        
        state["tool_results"] = "\n".join(results)
        state["next_action"] = "generate"
        return state
    
    def _retrieve_node(self, state: GraphState) -> GraphState:
        query = state["query"]
        retrieved_docs = self.vector_store.query(query, n_results=3)
        state["retrieved_docs"] = retrieved_docs
        state["next_action"] = "generate"
        return state
    
    def _generate_node(self, state: GraphState) -> GraphState:
        query = state["query"]
        docs = state.get("retrieved_docs", [])
        tool_results = state.get("tool_results", "")
        
        # Build context from available sources
        context_parts = []
        
        if tool_results:
            context_parts.append(f"Calculation Results:\n{tool_results}")
        
        if docs:
            docs_text = "\n\n".join(docs) if isinstance(docs[0], str) else "\n\n".join(d["text"] for d in docs)
            context_parts.append(f"Knowledge Base Context:\n{docs_text}")
        
        context = "\n\n".join(context_parts) if context_parts else "No additional context available."
        
        # Build messages properly
        messages = [
            SystemMessage(content=self.system_prompt),
            HumanMessage(content=f"""Context:
{context}

User Question: {query}

Provide a helpful answer based on the context above.""")
        ]
        
        response = self.llm_client.generate(messages)  # Use generate() not invoke()
        
        # Extract content
        if hasattr(response, 'content'):
            state["response"] = response.content
        else:
            state["response"] = str(response)
        
        state["next_action"] = "end"
        return state
    
    def _route_after_agent(self, state: GraphState) -> str:
        next_action = state.get("next_action", "retrieve")
        if next_action == "tools":
            return "tools"
        return "retrieve"
    
    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(GraphState)
        
        # Add nodes
        workflow.add_node("agent", self._agent_node)
        workflow.add_node("tools", self._tool_node)
        workflow.add_node("retrieve", self._retrieve_node)
        workflow.add_node("generate", self._generate_node)
        
        # Define flow
        workflow.set_entry_point("agent")
        
        # After agent: go to tools OR retrieve
        workflow.add_conditional_edges(
            "agent",
            self._route_after_agent,
            {
                "tools": "tools",
                "retrieve": "retrieve"
            }
        )
        
        # Both tools and retrieve go to generate
        workflow.add_edge("tools", "generate")
        workflow.add_edge("retrieve", "generate")
        workflow.add_edge("generate", END)
        
        return workflow.compile(checkpointer=self.checkpointer)
    
    def run(self, query: str, thread_id: str = "default") -> str:
        """Run the RAG pipeline with conversation memory"""
        initial_state = {
            "query": query,
            "retrieved_docs": [],
            "tool_calls": [],
            "tool_results": "",
            "next_action": "",
            "response": ""
        }
        
        config = {"configurable": {"thread_id": thread_id}}
        result = self.graph.invoke(initial_state, config=config)
        return result["response"]