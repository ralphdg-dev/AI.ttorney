import logging
from services.web_search_service import get_web_search_service

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")

service = get_web_search_service()

# Test if web search can find the updated age of consent law
query = "age of consent Philippines RA 11648"
results = service.search(query, num_results=5)

print(f"\nQuery: {query}")
print(f"Results found: {len(results)}\n")

for i, r in enumerate(results, 1):
    print(f"{i}. {r.get('title', '(no title)')}")
    print(f"   URL: {r.get('url', '')}")
    print(f"   Snippet: {r.get('snippet', '')[:150]}...\n")
