from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI
from core.config import settings

class LLMClient:
    def __init__(self):
        if settings.llm_provider == "ollama":
            self.llm = ChatOllama(
                base_url=settings.ollama_base_url,
                model=settings.ollama_model,
                temperature=0,
            )
        elif settings.llm_provider == "openai":
            self.llm = ChatOpenAI(
                api_key=settings.openai_api_key,
                model=settings.openai_model,
                temperature=0,
            )
    
    def generate(self, prompt: str) -> str:
        response = self.llm.invoke(prompt)
        # Handle different return types
        if hasattr(response, 'content'):
            return response.content
        return str(response)
