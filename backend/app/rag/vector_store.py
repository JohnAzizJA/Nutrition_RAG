import math
import os
from contextlib import contextmanager
from pathlib import Path

import httpx
import psycopg2
from pgvector.psycopg2 import register_vector
from psycopg2.pool import ThreadedConnectionPool

from rag.document_processor import DocumentProcessor

# BGE models use this prefix for query encoding (not for documents)
_QUERY_PREFIX = "Represent this sentence for searching relevant passages: "
# Cosine distance threshold — docs above this are too dissimilar to be useful
# cosine_distance = 1 - cosine_similarity, so 0.6 ≈ cosine_sim < 0.4
_SIMILARITY_THRESHOLD = 0.6
_EMBEDDING_MODEL = "BAAI/bge-base-en-v1.5"
_EMBEDDING_DIM = 768


class VectorStore:
    def __init__(self):
        db_url = os.getenv("DATABASE_URL")
        self._pool = ThreadedConnectionPool(1, 5, db_url)
        self._hf_token = os.getenv("HUGGINGFACE_API_KEY")
        self._hf_url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{_EMBEDDING_MODEL}"
        self.doc_processor = DocumentProcessor()
        self._setup_table()

    def _embed(self, texts: list[str]) -> list[list[float]]:
        r = httpx.post(
            self._hf_url,
            headers={"Authorization": f"Bearer {self._hf_token}"},
            json={"inputs": texts, "options": {"wait_for_model": True}},
            timeout=60.0,
        )
        r.raise_for_status()
        raw = r.json()
        result = []
        for emb in raw:
            norm = math.sqrt(sum(x * x for x in emb))
            result.append([x / norm for x in emb] if norm > 0 else emb)
        return result

    @contextmanager
    def _conn(self):
        conn = self._pool.getconn()
        try:
            register_vector(conn)
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            self._pool.putconn(conn)

    def _setup_table(self):
        with self._conn() as conn:
            with conn.cursor() as cur:
                try:
                    cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
                except psycopg2.errors.InsufficientPrivilege:
                    conn.rollback()
                    print(
                        "Warning: could not create vector extension — enable it manually "
                        "in your Supabase dashboard under Database → Extensions → vector"
                    )
                    return
                cur.execute(f"""
                    CREATE TABLE IF NOT EXISTS rag_documents (
                        id        BIGSERIAL PRIMARY KEY,
                        doc_id    TEXT UNIQUE NOT NULL,
                        content   TEXT NOT NULL,
                        embedding vector({_EMBEDDING_DIM}),
                        source    TEXT,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    )
                """)
                # HNSW works well at any size; no minimum-row requirement unlike IVFFlat
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS rag_documents_embedding_idx
                    ON rag_documents USING hnsw (embedding vector_cosine_ops)
                """)

    def add_documents(self, texts: list[str], metadatas: list[dict], ids: list[str]):
        embeddings = self._embed(texts)
        with self._conn() as conn:
            with conn.cursor() as cur:
                for doc_id, text, emb, meta in zip(ids, texts, embeddings, metadatas):
                    cur.execute("""
                        INSERT INTO rag_documents (doc_id, content, embedding, source)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (doc_id) DO UPDATE SET
                            content   = EXCLUDED.content,
                            embedding = EXCLUDED.embedding,
                            source    = EXCLUDED.source
                    """, (doc_id, text, emb, meta.get("source", "")))

    def query(self, query_text: str, n_results: int = 3) -> list[str]:
        query_embedding = self._embed([_QUERY_PREFIX + query_text])[0]
        with self._conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT content, embedding <=> %s::vector AS distance
                    FROM rag_documents
                    ORDER BY distance
                    LIMIT %s
                """, (query_embedding, n_results))
                rows = cur.fetchall()
        return [content for content, distance in rows if distance < _SIMILARITY_THRESHOLD]

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
                print(f"  Ingested {len(chunks)} chunks")
                total_chunks += len(chunks)
            except Exception as e:
                print(f"  Error processing {file_path.name}: {e}")

        print(f"\nTotal: {total_chunks} chunks from {len(files)} files")
