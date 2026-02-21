import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer
from pathlib import Path
from backend.app.core.config import settings
from backend.app.rag.document_processor import DocumentProcessor

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
        self.doc_processor = DocumentProcessor()
    
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
    
    def ingest(self, data_dir: str = "data/raw"):
        dir_path = Path(data_dir)
        
        if not dir_path.exists():
            print(f"Error: {data_dir} does not exist")
            return
        
        files = list(dir_path.glob("*.txt")) + list(dir_path.glob("*.pdf"))
        
        if not files:
            print(f"No documents found in {data_dir}")
            return
        
        total_chunks = 0
        
        for file_path in files:
            print(f"Processing {file_path.name}...")
            
            try:
                chunks = self.doc_processor.load_and_chunk(str(file_path))
                
                texts = [chunk["text"] for chunk in chunks]
                metadatas = [chunk["metadata"] for chunk in chunks]
                ids = [f"{file_path.stem}_{i}" for i in range(len(chunks))]
                
                self.add_documents(texts, metadatas, ids)
                
                print(f"Ingested {len(chunks)} chunks")
                total_chunks += len(chunks)
                
            except Exception as e:
                print(f"Error processing {file_path.name}: {e}")
        
        print(f"\nTotal: {total_chunks} chunks from {len(files)} files")
