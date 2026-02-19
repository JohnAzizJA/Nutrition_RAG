from langchain_community.llms import Ollama
from langchain_community.chat_models import ChatOpenAI
from backend.app.core.config import settings

class LLMClient:
    def __init__(self):
        if settings.llm_provider == "ollama":
            self.llm = Ollama(
                base_url=settings.ollama_base_url,
                model=settings.ollama_model
            )
        elif settings.llm_provider == "openai":
            self.llm = ChatOpenAI(
                api_key=settings.openai_api_key,
                model=settings.openai_model
            )
    
    def generate(self, prompt: str) -> str:
        return self.llm.invoke(prompt)
