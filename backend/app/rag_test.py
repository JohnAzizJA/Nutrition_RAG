from rag.graph import RAGGraph

def main():
    print("=== Nutrition RAG System ===")
    print("Type 'exit' or 'quit' to stop\n")
    
    rag_graph = RAGGraph()
    
    while True:
        query = input("You: ").strip()
        
        if query.lower() in ['exit', 'quit']:
            print("Goodbye!")
            break
        
        if not query:
            continue
        
        try:
            print("\nAssistant: ", end="")
            response = rag_graph.run(query)
            print(response)
            print()
        except Exception as e:
            print(f"Error: {e}\n")

if __name__ == "__main__":
    main()
