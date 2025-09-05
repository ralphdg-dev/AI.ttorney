import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from dotenv import load_dotenv

def scrape_and_push_terms():
    """
    Scrapes legal terms, checks for existing entries in the database,
    and pushes only new terms to the Supabase 'glossary_terms' table.
    """
    # Load environment variables
    dotenv_path = os.path.join(os.path.dirname(__file__), '.env.development')
    load_dotenv(dotenv_path)

    # Get Supabase credentials
    SUPABASE_URL = os.environ.get("EXPO_PUBLIC_SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("EXPO_PUBLIC_SUPABASE_ANON_KEY")

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase credentials not found. Check your .env.development file.")
        return

    # Initialize Supabase client
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Supabase client initialized.")
    except Exception as e:
        print(f"❌ Error initializing Supabase client: {e}")
        return

    # URL to scrape
    url = "https://www.digest.ph/legal-dictionary"
    
    # Scrape data
    print("⏳ Starting to scrape legal terms...")
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"❌ Error fetching the URL: {e}")
        return

    soup = BeautifulSoup(response.content, 'html.parser')
    term_elements = soup.select('div.prose ul li a')

    if not term_elements:
        print("⚠️ Warning: No legal terms found on the page.")
        return

    # Prepare data for insertion
    scraped_data = []
    for term_element in term_elements:
        term_title = term_element.get_text(strip=True)
        if term_title:
            scraped_data.append({"term_en": term_title})

    if not scraped_data:
        print("⚠️ Warning: No new data to process.")
        return
    
    print(f"🔍 Found {len(scraped_data)} terms on the website.")
    
    # --- New Logic to Prevent Duplicates ---
    try:
        # Fetch existing terms from the database
        print("⏳ Checking for existing terms in the database...")
        existing_terms_response = supabase.table('glossary_terms').select('term_en').execute()
        
        if existing_terms_response and hasattr(existing_terms_response, 'data') and existing_terms_response.data:
            existing_terms = {item['term_en'] for item in existing_terms_response.data}
            print(f"✅ Found {len(existing_terms)} existing terms.")
        else:
            existing_terms = set()
            print("✅ No existing terms found in the database.")
            
        # Filter out terms that already exist
        new_terms_to_insert = [
            term for term in scraped_data if term['term_en'] not in existing_terms
        ]

        if not new_terms_to_insert:
            print("🎉 All scraped terms already exist in the database. No new terms to push.")
            return

        # Push only the new, non-duplicate terms
        print(f"🔍 Pushing {len(new_terms_to_insert)} new terms to the database...")
        insert_response = supabase.table('glossary_terms').insert(new_terms_to_insert).execute()
        
        # Check for data in the response object
        if insert_response and hasattr(insert_response, 'data') and insert_response.data:
            print(f"🎉 Successfully pushed {len(insert_response.data)} terms to Supabase.")
            print("📝 Example of a pushed term:")
            print(insert_response.data[0])
        else:
            print("❌ Failed to push terms. No data returned from Supabase.")
            if hasattr(insert_response, 'error') and insert_response.error:
                print(f"Error details: {insert_response.error}")

    except Exception as e:
        print(f"❌ An unexpected error occurred while pushing to Supabase: {e}")

if __name__ == "__main__":
    scrape_and_push_terms()