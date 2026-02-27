from sqlalchemy import text
from sentence_transformers import SentenceTransformer
from pathlib import Path
from rag.document_processor import DocumentProcessor
from db.database import get_db
import numpy as np

class VectorStore:
    def __init__(self):
        self.embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        self.doc_processor = DocumentProcessor()
        self._init_pgvector()
    
    def _init_pgvector(self):
        """Initialize pgvector extension and create table"""
        with get_db() as db:
            # Enable pgvector extension
            db.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            
            # Create documents table with vector column
            db.execute(text("""
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    content TEXT NOT NULL,
                    metadata JSONB,
                    embedding vector(384)
                )
            """))
            
            # Create index for faster similarity search
            db.execute(text("""
                CREATE INDEX IF NOT EXISTS documents_embedding_idx 
                ON documents USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 100)
            """))
            
            db.commit()
    
    def add_documents(self, texts: list[str], metadatas: list[dict], ids: list[str]):
        embeddings = self.embedding_model.encode(texts)
        
        with get_db() as db:
            for text_content, metadata, doc_id, embedding in zip(texts, metadatas, ids, embeddings):
                # Convert numpy array to list for PostgreSQL
                embedding_list = embedding.tolist()
                
                db.execute(text("""
                    INSERT INTO documents (id, content, metadata, embedding)
                    VALUES (:id, :content, :metadata::jsonb, :embedding::vector)
                    ON CONFLICT (id) DO UPDATE 
                    SET content = :content, metadata = :metadata::jsonb, embedding = :embedding::vector
                """), {
                    "id": doc_id,
                    "content": text_content,
                    "metadata": str(metadata).replace("'", '"'),
                    "embedding": str(embedding_list)
                })
            
            db.commit()
    
    def query(self, query_text: str, n_results: int = 3) -> list[str]:
        query_embedding = self.embedding_model.encode([query_text])[0]
        embedding_list = query_embedding.tolist()
        
        with get_db() as db:
            result = db.execute(text("""
                SELECT content, metadata, (embedding <=> :embedding::vector) as distance
                FROM documents
                ORDER BY embedding <=> :embedding::vector
                LIMIT :limit
            """), {
                "embedding": str(embedding_list),
                "limit": n_results
            })
            
            rows = result.fetchall()
            return [row[0] for row in rows]
    
    def ingest(self, data_dir: str):
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
