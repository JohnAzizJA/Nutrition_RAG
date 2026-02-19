from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pathlib import Path

class DocumentProcessor:
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
    
    def load_and_chunk(self, file_path: str) -> list[dict]:
        path = Path(file_path)
        
        if path.suffix == ".pdf":
            loader = PyPDFLoader(file_path)
        else:
            loader = TextLoader(file_path)
        
        documents = loader.load()
        chunks = self.splitter.split_documents(documents)
        
        return [
            {
                "text": chunk.page_content,
                "metadata": {"source": file_path, "chunk_id": i}
            }
            for i, chunk in enumerate(chunks)
        ]
