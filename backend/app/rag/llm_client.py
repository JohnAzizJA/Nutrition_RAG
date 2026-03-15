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
