from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # LLM + Embedding
    llm_provider: str = "ollama"  # or "openai"
    if llm_provider == "ollama":
        ollama_base_url: str = "http://localhost:11434"
        ollama_model: str = "llama2"
        embedding_model: str = "all-MiniLM-L6-v2"
    elif llm_provider == "openai":
        openai_api_key: str = ""
        openai_model: str = "gpt-4o"
        embedding_model: str = "text-embedding-3-small"
    
    # ChromaDB
    chroma_persist_dir: str = "../chroma_db"
    
    class Config:
        env_file = ".env"

settings = Settings()
