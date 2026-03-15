import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from rag.tools import (
    calculate_bmi, calculate_bmr, calculate_tdee, calculate_targets,
    get_todays_nutrition, get_streak, get_workout_history, get_weekly_volume,
    search_food,
)

load_dotenv()


class LLMClient:
    def __init__(self):
        # Generation LLM — final response, no tools
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0,
            api_key=os.getenv("GROQ_API_KEY"),
            timeout=30,
        )

        # Tool-calling LLM — handles 12+ tools reliably
        self.llm_for_tools = ChatGroq(
            model="qwen/qwen3-32b",
            temperature=0,
            api_key=os.getenv("GROQ_API_KEY"),
            timeout=30,
        )

        # Fast router LLM — classifies intent only
        self.llm_router = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0,
            api_key=os.getenv("GROQ_API_KEY"),
            timeout=10,
        )

        self.tools = [
            calculate_bmi, calculate_bmr, calculate_tdee, calculate_targets,
            get_todays_nutrition, get_streak, get_workout_history, get_weekly_volume,
            search_food,
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
        """
        system = (
            "Classify the user's message into exactly one of these intents:\n"
            "- tool: user wants to get today's nutrition, check streak, view workout history, "
            "search food nutritional info, or calculate BMI/BMR/TDEE/targets.\n"
            "- knowledge: user has a nutrition or fitness question that requires factual information "
            "(e.g. 'what foods are high in protein', 'is keto good for weight loss')\n"
            "- chat: general conversation, greetings, or simple questions with no tool or knowledge need\n\n"
            "Reply with ONLY the single word: tool, knowledge, or chat"
        )
        messages = [SystemMessage(content=system)]
        if history:
            messages.extend(history[-4:])
        messages.append(HumanMessage(content=query))

        response = self.llm_router.invoke(messages)
        intent = response.content.strip().lower()
        return intent if intent in ("tool", "knowledge", "chat") else "knowledge"
