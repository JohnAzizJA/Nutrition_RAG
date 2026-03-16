from dotenv import load_dotenv
load_dotenv()

from rag.vector_store import VectorStore

if __name__ == "__main__":
    vector_store = VectorStore()
    vector_store.ingest("data")
