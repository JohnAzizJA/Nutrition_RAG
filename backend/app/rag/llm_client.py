from langchain_groq import ChatGroq
from rag.tools import (
    calculate_bmi, calculate_bmr, calculate_tdee, calculate_targets,
    get_todays_nutrition, get_streak, get_workout_history, get_weekly_volume,
    search_food, log_meal, log_water, log_weight,
)
import os
from dotenv import load_dotenv

load_dotenv()

class LLMClient:
    def __init__(self):
        # Generation LLM — final response, no tools
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0,
            api_key=os.getenv("GROQ_API_KEY")
        )

        # Tool-calling LLM — handles 12+ tools reliably
        self.llm_for_tools = ChatGroq(
            model="qwen/qwen3-32b",
            temperature=0,
            api_key=os.getenv("GROQ_API_KEY")
        )

        # Fast router LLM — classifies intent only
        self.llm_router = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0,
            api_key=os.getenv("GROQ_API_KEY")
        )

        self.tools = [
            calculate_bmi, calculate_bmr, calculate_tdee, calculate_targets,
            get_todays_nutrition, get_streak, get_workout_history, get_weekly_volume,
            search_food, log_meal, log_water, log_weight,
        ]
        self.llm_with_tools = self.llm_for_tools.bind_tools(self.tools)

    def invoke(self, input_data) -> object:
        """Invoke LLM with tools (for agent)"""
        return self.llm_with_tools.invoke(input_data)

    def generate(self, input_data) -> object:
        """Generate without tools (for final response)"""
        return self.llm.invoke(input_data)

    def route(self, query: str, history: list = None) -> str:
        """Classify query intent using the fast router model.
        Returns one of: 'tool', 'knowledge', 'chat'.
        Accepts optional recent conversation history for context-aware routing.
        """
        from langchain_core.messages import SystemMessage, HumanMessage
        system = (
            "Classify the user's message into exactly one of these intents:\n"
            "- tool: user wants to log food/water/weight, get today's nutrition, check streak, "
            "view workout history, search food info, or calculate BMI/BMR/TDEE/targets. "
            "IMPORTANT: if the previous assistant message was asking the user to confirm an action "
            "(e.g. logging a meal), and the user replies affirmatively (yes, ok, sure, go ahead, etc.), "
            "classify as 'tool'.\n"
            "- knowledge: user has a nutrition or fitness question that requires factual information "
            "(e.g. 'what foods are high in protein', 'is keto good for weight loss')\n"
            "- chat: general conversation, greetings, or simple questions with no tool or knowledge need\n\n"
            "Reply with ONLY the single word: tool, knowledge, or chat"
        )
        messages = [SystemMessage(content=system)]
        # Include last 2 turns of history so the router understands pending confirmations
        if history:
            messages.extend(history[-4:])
        messages.append(HumanMessage(content=query))

        response = self.llm_router.invoke(messages)
        intent = response.content.strip().lower()
        if intent not in ("tool", "knowledge", "chat"):
            intent = "knowledge"  # safe fallback
        return intent
