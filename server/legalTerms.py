import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from dotenv import load_dotenv

def scrape_and_push_terms():
    """
    Scrapes legal terms and pushes them to the Supabase database,
    populating only the 'term_en' column.
    """
    # Load environment variables
    dotenv_path = os.path.join(os.path.dirname(__file__), '.env.development')
    load_dotenv(dotenv_path)

    # Get Supabase credentials
    SUPABASE_URL = os.environ.get("EXPO_PUBLIC_SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("EXPO_PUBLIC_SUPABASE_ANON_KEY")

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase credentials not found.")
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
        print("⚠️ Warning: No data to push to the database.")
        return
    
    print(f"🔍 Found {len(scraped_data)} terms to push.")
    
    try:
        response = supabase.table('glossary_terms').insert(scraped_data).execute()
        
        # Check for data in the response object
        if response and hasattr(response, 'data') and response.data:
            print(f"🎉 Successfully pushed {len(response.data)} terms to Supabase.")
            print("📝 Example of a pushed term:")
            print(response.data[0])
        else:
            print("❌ Failed to push terms. No data returned from Supabase.")
            if hasattr(response, 'error') and response.error:
                print(f"Error details: {response.error}")

    except Exception as e:
        print(f"❌ An unexpected error occurred while pushing to Supabase: {e}")

if __name__ == "__main__":
    scrape_and_push_terms()