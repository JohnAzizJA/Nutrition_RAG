import chromadb
from sentence_transformers import SentenceTransformer
from pathlib import Path
from rag.document_processor import DocumentProcessor

# BGE models use this prefix for query encoding (not for documents)
_QUERY_PREFIX = "Represent this sentence for searching relevant passages: "
# L2 distance threshold — docs above this are too dissimilar to be useful
# For normalized embeddings: L2 ~= 2*(1 - cosine_sim), so 1.2 ≈ cosine_sim < 0.4
_SIMILARITY_THRESHOLD = 1.2
# Collection name is tied to the model so switching models doesn't corrupt old data
_COLLECTION_NAME = "nutrition_docs_bge_base_v1"
_EMBEDDING_MODEL = "BAAI/bge-base-en-v1.5"


class VectorStore:
    def __init__(self):
        self.client = chromadb.PersistentClient(path="./chroma_db")
        self.collection = self.client.get_or_create_collection(name=_COLLECTION_NAME)
        self.embedding_model = SentenceTransformer(_EMBEDDING_MODEL)
        self.doc_processor = DocumentProcessor()

    def add_documents(self, texts: list[str], metadatas: list[dict], ids: list[str]):
        embeddings = self.embedding_model.encode(texts, normalize_embeddings=True).tolist()
        self.collection.add(
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids,
        )

    def query(self, query_text: str, n_results: int = 3) -> list[str]:
        query_embedding = self.embedding_model.encode(
            [_QUERY_PREFIX + query_text], normalize_embeddings=True
        ).tolist()
        results = self.collection.query(
            query_embeddings=query_embedding,
            n_results=n_results,
            include=["documents", "distances"],
        )
        if not results["documents"]:
            return []
        docs = results["documents"][0]
        distances = results["distances"][0]
        # Drop chunks that are too dissimilar to be useful
        return [doc for doc, dist in zip(docs, distances) if dist < _SIMILARITY_THRESHOLD]

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
