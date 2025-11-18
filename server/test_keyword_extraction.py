"""
Test script for keyword extraction functionality
"""

from services.web_search_service import extract_legal_keywords

# Test cases
test_queries = [
    "ako ay isang kasambahay, pano ko kakasuhan ang amo ko",
    "What are the requirements for annulment in the Philippines?",
    "Pwede ba akong mag-resign kahit walang 30 days notice?",
    "Ano ang karapatan ng mga manggagawa sa Pilipinas?",
    "My employer is not paying my salary, what should I do?",
    "Paano mag-file ng kaso sa labor arbiter?",
    "Maaari ba akong tanggalin ng walang dahilan?",
    "What is the minimum wage in Metro Manila?",
]

print("=" * 70)
print("🔍 TESTING KEYWORD EXTRACTION")
print("=" * 70)

for query in test_queries:
    print(f"\n📝 Original Query:")
    print(f"   {query}")
    
    keywords = extract_legal_keywords(query)
    
    print(f"\n🔑 Extracted Keywords:")
    if keywords:
        for i, keyword in enumerate(keywords, 1):
            print(f"   {i}. {keyword}")
    else:
        print("   (No keywords extracted)")
    
    # Show what the search query would be
    keyword_query = ' '.join(keywords) if keywords else query
    enhanced_query = (
        f"{keyword_query} Philippine law "
        f"(official gazette OR lawphil OR supreme court of the philippines)"
    )
    
    print(f"\n🌐 Search Query:")
    print(f"   {keyword_query}")
    print(f"\n📡 Enhanced Query (sent to Google):")
    print(f"   {enhanced_query[:100]}...")
    
    print("\n" + "-" * 70)

print("\n✅ Keyword extraction test complete!")
