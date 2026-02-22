from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI

class LLMClient:
    def __init__(self):
        self.llm = ChatOllama(
            base_url="http://localhost:11434",
            model="llama2",
            temperature=0,
        )
    
    def generate(self, messages) -> str:
        response = self.llm.invoke(messages)
        if hasattr(response, 'content'):
            return response.content
        return str(response)
