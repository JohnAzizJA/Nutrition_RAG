import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer
from backend.app.core.config import settings

class VectorStore:
    def __init__(self):
        self.client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        self.collection = self.client.get_or_create_collection(
            name="nutrition_docs"
        )
        self.embedding_model = SentenceTransformer(settings.embedding_model)
    
    def add_documents(self, texts: list[str], metadatas: list[dict], ids: list[str]):
        embeddings = self.embedding_model.encode(texts).tolist()
        self.collection.add(
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )
    
    def query(self, query_text: str, n_results: int = 3) -> list[str]:
        query_embedding = self.embedding_model.encode([query_text]).tolist()
        results = self.collection.query(
            query_embeddings=query_embedding,
            n_results=n_results
        )
        return results["documents"][0] if results["documents"] else []
