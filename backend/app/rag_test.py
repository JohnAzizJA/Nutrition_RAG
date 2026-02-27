from rag.graph import RAGGraph
import uuid

def main():
    print("=== Nutrition RAG System ===")
    print("Type 'exit' or 'quit' to stop")
    print("Type 'new' to start a new conversation\n")
    
    rag_graph = RAGGraph()
    thread_id = str(uuid.uuid4())
    print(f"Conversation ID: {thread_id}\n")
    
    while True:
        query = input("You: ").strip()
        
        if query.lower() in ['exit', 'quit']:
            print("Goodbye!")
            break
        
        if query.lower() == 'new':
            thread_id = str(uuid.uuid4())
            print(f"\nNew conversation started: {thread_id}\n")
            continue
        
        if not query:
            continue
        
        try:
            print("\nAssistant: ", end="")
            response = rag_graph.run(query, thread_id=thread_id)
            print(response)
            print()
        except Exception as e:
            print(f"Error: {e}\n")

if __name__ == "__main__":
    main()
