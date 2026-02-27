from langchain_groq import ChatGroq
from rag.tools import calculate_bmi, calculate_bmr, calculate_tdee, calculate_targets
import os
from dotenv import load_dotenv

load_dotenv()

class LLMClient:
    def __init__(self):
        # Base LLM for generation (no tools)
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0,
            api_key=os.getenv("GROQ_API_KEY")
        )
        
        # LLM with tools for agent decisions
        self.tools = [calculate_bmi, calculate_bmr, calculate_tdee, calculate_targets]
        self.llm_with_tools = self.llm.bind_tools(self.tools)
    
    def invoke(self, input_data) -> object:
        """Invoke LLM with tools (for agent)"""
        return self.llm_with_tools.invoke(input_data)
    
    def generate(self, input_data) -> object:
        """Generate without tools (for final response)"""
        return self.llm.invoke(input_data)
