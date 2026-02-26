from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI
from rag.tools import calculate_bmi, calculate_bmr, calculate_tdee, calculate_targets

class LLMClient:
    def __init__(self):
        # Base LLM for generation (no tools)
        self.llm = ChatOllama(
            base_url="http://localhost:11434",
            model="llama3.1",
            temperature=0,
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
