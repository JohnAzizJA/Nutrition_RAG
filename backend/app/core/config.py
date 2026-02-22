from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # LLM
    llm_provider: str = "ollama"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama2"
    
    # ChromaDB
    chroma_persist_dir: str = "./chroma_db"
    
    # Embeddings
    embedding_provider: str = "local"  # "local" or "openai"
    embedding_model: str = "all-MiniLM-L6-v2"  # local: sentence-transformers model
    openai_embedding_model: str = "text-embedding-3-small"  # openai: embedding model
    
    class Config:
        env_file = ".env"

settings = Settings()