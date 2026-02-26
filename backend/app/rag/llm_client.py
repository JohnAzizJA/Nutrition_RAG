from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI
from rag.tools import calculate_bmi, calculate_bmr, calculate_tdee, calculate_targets

class LLMClient:
    def __init__(self):
        self.llm = ChatOllama(
            base_url="http://localhost:11434",
            model="llama2",
            temperature=0,
        )
        # Bind tools to LLM
        self.tools = [calculate_bmi, calculate_bmr, calculate_tdee, calculate_targets]
        self.llm = self.llm.bind_tools(self.tools)
    
    def invoke(self, input_data) -> object:
        return self.llm.invoke(input_data)
