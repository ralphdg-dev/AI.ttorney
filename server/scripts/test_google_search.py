import logging

from services.web_search_service import get_web_search_service


def main() -> None:
    """Simple manual test for Google Programmable Search integration.

    Run this from the `server` folder:
        python scripts/test_google_search.py
    """
    logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")

    service = get_web_search_service()

    if not service.is_enabled():
        print("Web search is DISABLED: GOOGLE_API_KEY or GOOGLE_CSE_ID is missing or invalid.")
        return

    print("Web search is ENABLED. Testing a sample query against Google Programmable Search...\n")

    query = "Philippines juvenile justice RA 9344"
    results = service.search(query, num_results=5)

    print(f"Query: {query}")
    print(f"Results returned: {len(results)}")

    for i, r in enumerate(results, start=1):
        title = r.get("title", "(no title)")
        url = r.get("url", "")
        source = r.get("source", "")
        print(f"{i}. [{source}] {title}")
        print(f"   URL: {url}\n")

    if not results:
        print("No results received. Check your GOOGLE_API_KEY / GOOGLE_CSE_ID or CSE configuration.")


if __name__ == "__main__":
    main()
