from rag.graph import RAGGraph

def main():
    print("=== Nutrition RAG System ===")
    print("Type 'exit' or 'quit' to stop")
    print("Type 'new' to start a new conversation\n")
    
    rag_graph = RAGGraph()
    
    user_id = int(input("Enter your user ID (default 1): ").strip() or "1")
    thread_id = input("Enter conversation ID (or press Enter for 'default'): ").strip() or "default"
    print(f"\nUser: {user_id}, Conversation: {thread_id}\n")
    
    while True:
        query = input("You: ").strip()
        
        if query.lower() in ['exit', 'quit']:
            print("Goodbye!")
            break
        
        if query.lower() == 'new':
            thread_id = input("Enter new conversation ID: ").strip() or "default"
            print(f"\nSwitched to conversation: {thread_id}\n")
            continue
        
        if not query:
            continue
        
        try:
            print("\nAssistant: ", end="")
            response = rag_graph.run(query, user_id=user_id, thread_id=thread_id)
            print(response)
            print()
        except Exception as e:
            print(f"Error: {e}\n")

if __name__ == "__main__":
    main()
