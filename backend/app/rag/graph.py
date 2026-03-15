import os
import atexit
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.store.postgres import PostgresStore
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from rag.schemas import GraphState
from rag.vector_store import VectorStore
from rag.llm_client import LLMClient
from rag.tools import (
    calculate_bmi, calculate_bmr, calculate_tdee, calculate_targets,
    get_todays_nutrition, get_streak, get_workout_history, get_weekly_volume,
    search_food, log_meal, log_water, log_weight,
)

load_dotenv()

# Tools that need user_id injected server-side
USER_ID_TOOLS = {
    "get_todays_nutrition", "get_streak", "get_workout_history", "get_weekly_volume",
    "log_meal", "log_water", "log_weight",
}

MAX_HISTORY_MESSAGES = 20  # ~10 conversation turns


class RAGGraph:
    def __init__(self):
        self.vector_store = VectorStore()
        self.llm_client = LLMClient()

        db_url = os.getenv("DATABASE_URL")
        self._checkpointer_cm = PostgresSaver.from_conn_string(db_url)
        self.checkpointer = self._checkpointer_cm.__enter__()

        self._store_cm = PostgresStore.from_conn_string(db_url)
        self.store = self._store_cm.__enter__()

        self.checkpointer.setup()
        self.store.setup()

        atexit.register(self._cleanup)

        # Built once at startup, not on every tool call
        self.tool_map = {
            "calculate_bmi": calculate_bmi,
            "calculate_bmr": calculate_bmr,
            "calculate_tdee": calculate_tdee,
            "calculate_targets": calculate_targets,
            "get_todays_nutrition": get_todays_nutrition,
            "get_streak": get_streak,
            "get_workout_history": get_workout_history,
            "get_weekly_volume": get_weekly_volume,
            "search_food": search_food,
            "log_meal": log_meal,
            "log_water": log_water,
            "log_weight": log_weight,
        }

        self.base_system_prompt = """You are an expert nutrition and fitness coach assistant.

Guidelines:
- Use provided context to answer questions accurately
- Use calculation tools when users ask for BMI, BMR, TDEE, or nutrition targets
- If context doesn't contain info, say so politely
- Include calorie counts and macros when available
- Be concise but informative
- Remind users to consult healthcare professionals for medical conditions

You have access to the following tools:
- calculate_bmi / calculate_bmr / calculate_tdee / calculate_targets: nutrition calculations
- search_food: look up nutritional info from the USDA database
- get_todays_nutrition: fetch what the user has eaten today
- get_streak: fetch the user's current logging streak
- get_workout_history: fetch recent workout sessions
- get_weekly_volume: fetch weekly training volume
- log_meal: log a meal to the food diary
- log_water: add glasses of water to today's intake
- log_weight: record the user's current body weight

IMPORTANT — meal logging rules:
1. When a user wants to log a meal, first call search_food to find the item.
2. Present the nutritional info (calories, protein, carbs, fat).
3. If the user did not specify a meal type (breakfast, lunch, dinner, snack), ask which one before proceeding.
4. Once you have the nutritional info and meal type, ask "Shall I log this?" or similar for confirmation.
5. Only call log_meal after the user explicitly confirms (e.g. "yes", "go ahead", "log it").
6. Never log a meal without user confirmation.

If user asks for calculations but doesn't provide stats, use the user profile above if available, otherwise ask.

Respond in a friendly, helpful tone while maintaining scientific accuracy."""

        self.graph = self._build_graph()

    def _cleanup(self):
        try:
            self._checkpointer_cm.__exit__(None, None, None)
            self._store_cm.__exit__(None, None, None)
        except Exception:
            pass

    def _build_system_prompt(self, user_profile: dict | None) -> str:
        if not user_profile:
            return self.base_system_prompt
        goal_labels = {
            "lose_weight": "Lose Weight",
            "maintain_weight": "Maintain Weight",
            "gain_weight": "Gain Weight",
            "gain_muscle": "Gain Muscle",
        }
        activity_labels = {
            "sedentary": "Sedentary",
            "light": "Lightly Active",
            "moderate": "Moderately Active",
            "very_active": "Very Active",
            "extra_active": "Extra Active",
        }
        goal = goal_labels.get(user_profile.get("goal", ""), user_profile.get("goal", ""))
        activity = activity_labels.get(user_profile.get("activity_level", ""), user_profile.get("activity_level", ""))
        profile_block = f"""## Current User Profile
Name: {user_profile.get('name', 'Unknown')}
Age: {user_profile.get('age')} | Gender: {user_profile.get('gender', '').capitalize()}
Weight: {user_profile.get('weight_kg')} kg | Height: {user_profile.get('height_cm')} cm
Goal: {goal} | Activity: {activity}
Goal Weight: {user_profile.get('goal_weight_kg')} kg"""
        if user_profile.get("weight_loss_per_week"):
            profile_block += f" | Target rate: {user_profile.get('weight_loss_per_week')} kg/week"
        return profile_block + "\n\n" + self.base_system_prompt

    def _truncate_history(self, messages: list) -> list:
        return messages[-MAX_HISTORY_MESSAGES:] if len(messages) > MAX_HISTORY_MESSAGES else messages

    # ── Nodes ──────────────────────────────────────────────────────────────────

    def _router_node(self, state: GraphState) -> dict:
        history = self._truncate_history(state.get("messages", []))
        intent = self.llm_client.route(state["query"], history=history)
        return {"intent": intent}

    def _agent_node(self, state: GraphState) -> dict:
        query = state["query"]
        history = self._truncate_history(state.get("messages", []))
        system_prompt = self._build_system_prompt(state.get("user_profile"))
        is_retry = state.get("tool_retry_count", 0) > 0

        extra = []
        if is_retry and state.get("tool_errors"):
            succeeded_results = state.get("tool_results", "")
            succeeded_names = [
                line.split(":")[0].strip()
                for line in succeeded_results.splitlines() if line
            ]
            error_ctx = f"Some tool calls failed:\n{state['tool_errors']}\n\n"
            if succeeded_names:
                error_ctx += f"Already succeeded — do NOT call again: {', '.join(succeeded_names)}\n\n"
            error_ctx += "Please retry only the failed tools with corrected arguments."
            extra = [HumanMessage(content=error_ctx)]

        all_messages = [SystemMessage(content=system_prompt)] + history + extra + [HumanMessage(content=query)]
        response = self.llm_client.invoke(all_messages)

        updates: dict = {}
        if hasattr(response, "tool_calls") and response.tool_calls:
            updates["tool_calls"] = response.tool_calls
            updates["next_action"] = "tools"
        else:
            updates["next_action"] = "retrieve"

        # Add the human message to persisted history only on the first pass (not retries)
        if not is_retry:
            updates["messages"] = [HumanMessage(content=query)]

        return updates

    def _execute_tool(self, tool_call: dict, user_id: int) -> tuple[str, str | None, str | None]:
        """Run a single tool call. Returns (name, result, error)."""
        tool_name = tool_call["name"]
        tool_args = dict(tool_call["args"])
        if tool_name in USER_ID_TOOLS:
            tool_args["user_id"] = user_id
        if tool_name not in self.tool_map:
            return tool_name, None, f"Unknown tool: {tool_name}"
        try:
            result = self.tool_map[tool_name].invoke(tool_args)
            return tool_name, str(result), None
        except Exception as e:
            return tool_name, None, str(e)

    def _tool_node(self, state: GraphState) -> dict:
        user_id = (state.get("user_profile") or {}).get("id", 0)
        successes: list[str] = []
        failures: list[str] = []

        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {
                executor.submit(self._execute_tool, tc, user_id): tc
                for tc in state["tool_calls"]
            }
            for future in as_completed(futures):
                tool_name, result, error = future.result()
                if error:
                    failures.append(f"{tool_name}: {error}")
                else:
                    successes.append(f"{tool_name}: {result}")

        # Accumulate successes across retries so they aren't lost
        prev_results = state.get("tool_results", "")
        all_results = "\n".join(filter(None, [prev_results] + successes))

        retry_count = state.get("tool_retry_count", 0)
        has_failures = bool(failures)
        next_action = "retry" if has_failures and retry_count < 2 else "generate"

        return {
            "tool_results": all_results,
            "tool_errors": "\n".join(failures),
            "next_action": next_action,
            "tool_retry_count": retry_count + (1 if has_failures else 0),
        }

    def _retrieve_node(self, state: GraphState) -> dict:
        docs = self.vector_store.query(state["query"], n_results=3)
        return {"retrieved_docs": docs}

    def _generate_node(self, state: GraphState) -> dict:
        query = state["query"]
        docs = state.get("retrieved_docs", [])
        tool_results = state.get("tool_results", "")
        history = self._truncate_history(state.get("messages", []))
        system_prompt = self._build_system_prompt(state.get("user_profile"))

        context_parts = []
        if tool_results:
            context_parts.append(f"Tool Results:\n{tool_results}")
        if docs:
            docs_text = "\n\n".join(docs) if isinstance(docs[0], str) else "\n\n".join(d["text"] for d in docs)
            context_parts.append(f"Knowledge Base:\n{docs_text}")

        if context_parts:
            context = "\n\n".join(context_parts)
            user_msg = HumanMessage(content=f"Context:\n{context}\n\nUser Question: {query}\n\nProvide a helpful answer based on the context above.")
        else:
            # Pure chat or empty retrieval — respond naturally without context framing
            user_msg = HumanMessage(content=query)

        full_messages = [SystemMessage(content=system_prompt)] + history + [user_msg]
        response = self.llm_client.generate(full_messages)
        response_text = response.content if hasattr(response, "content") else str(response)

        return {
            # Store both the raw user query and AI reply in history
            "messages": [HumanMessage(content=query), AIMessage(content=response_text)],
            "response": response_text,
        }

    # ── Routing ────────────────────────────────────────────────────────────────

    def _route_after_router(self, state: GraphState) -> str:
        return state.get("intent", "knowledge")

    def _route_after_agent(self, state: GraphState) -> str:
        return "tools" if state.get("next_action") == "tools" else "retrieve"

    def _route_after_tools(self, state: GraphState) -> str:
        return state.get("next_action", "generate")

    # ── Graph ──────────────────────────────────────────────────────────────────

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(GraphState)

        workflow.add_node("router", self._router_node)
        workflow.add_node("agent", self._agent_node)
        workflow.add_node("tools", self._tool_node)
        workflow.add_node("retrieve", self._retrieve_node)
        workflow.add_node("generate", self._generate_node)

        workflow.set_entry_point("router")

        workflow.add_conditional_edges(
            "router", self._route_after_router,
            {"tool": "agent", "knowledge": "retrieve", "chat": "generate"},
        )
        workflow.add_conditional_edges(
            "agent", self._route_after_agent,
            {"tools": "tools", "retrieve": "retrieve"},
        )
        workflow.add_conditional_edges(
            "tools", self._route_after_tools,
            {"generate": "generate", "retry": "agent"},
        )
        workflow.add_edge("retrieve", "generate")
        workflow.add_edge("generate", END)

        return workflow.compile(checkpointer=self.checkpointer, store=self.store)

    def run(self, query: str, user_id: int = 1, thread_id: str = "default", user_profile: dict | None = None) -> str:
        """Run the RAG pipeline with conversation memory."""
        result = self.graph.invoke(
            {
                "query": query,
                "user_profile": user_profile,
                "tool_retry_count": 0,
                "tool_errors": "",
                "tool_results": "",
            },
            config={"configurable": {"thread_id": thread_id, "user_id": str(user_id)}},
        )
        return result["response"]
