import requests
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime
from pathlib import Path

# Target URL
URL = "https://lawphil.net/statutes/repacts/ra1949/ra_386_1949.html"

def clean_text(text):
    """Remove excessive whitespace."""
    return re.sub(r'\s+', ' ', text.strip())

def scrape_lawphil(url):
    """Scrape Civil Code using requests and BeautifulSoup."""
    print("🔄 Fetching Civil Code from LawPhil...")
    response = requests.get(url, timeout=30)
    response.encoding = 'utf-8'
    soup = BeautifulSoup(response.text, 'html.parser')

    data = {
        "title": None,
        "preamble": None,
        "category": "Civil Law",
        "sections": [],
        "metadata": {
            "source_url": url,
            "date_accessed": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        },
    }

    current_section = None
    current_article = None

    paragraphs = soup.find_all("p")
    
    for p in paragraphs:
        text = clean_text(p.get_text(" ", strip=True))
        if not text:
            continue

        # Title & preamble detection
        if not data["title"] and re.search(r"REPUBLIC ACT", text, re.I):
            data["title"] = text
            continue
        if not data["preamble"] and re.search(r"AN ACT", text, re.I):
            data["preamble"] = text
            continue

        # Check if paragraph is centered (section heading)
        align = p.get("align", "").lower()
        if align == "center":
            current_section = {"heading": text, "articles": []}
            data["sections"].append(current_section)
            continue

        # Detect Article
        article_match = re.match(r"Article\s+(\d+)\.?\s*(.*)", text, re.I)
        if article_match:
            article_number, heading = article_match.groups()
            current_article = {
                "article_number": article_number,
                "heading": heading.strip() or None,
                "paragraphs": [],
                "subsections": [],
            }
            if not current_section:
                current_section = {"heading": "Uncategorized", "articles": []}
                data["sections"].append(current_section)
            current_section["articles"].append(current_article)
            continue

        # Detect subsections (numbered items)
        if re.match(r"^\(\d+\)", text):
            if current_article:
                current_article["subsections"].append(text)
            continue

        # Add to current article paragraphs
        if current_article:
            current_article["paragraphs"].append(text)

    print(f"✅ Extracted {sum(len(s['articles']) for s in data['sections'])} articles")
    return data


def save_json(data, filename="civil_code.json"):
    # Ensure data/raw directory exists
    output_dir = Path(__file__).parent.parent / "data" / "raw"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save to data/raw directory
    output_path = output_dir / filename
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"💾 Saved to {output_path}")

def save_markdown(data, filename="civil_code.md"):
    # Save markdown to data/raw directory as well
    output_dir = Path(__file__).parent.parent / "data" / "raw"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / filename
    
    md = [f"# {data['title']}\n"]
    if data["preamble"]:
        md.append(f"**{data['preamble']}**\n")

    for section in data["sections"]:
        md.append(f"\n## {section['heading']}\n")
        for article in section["articles"]:
            heading = f"### Article {article['article_number']}"
            if article["heading"]:
                heading += f" — {article['heading']}"
            md.append(heading + "\n")
            for para in article["paragraphs"]:
                md.append(f"{para}\n")
            for sub in article["subsections"]:
                md.append(f"- {sub}\n")

    md.append("\n---")
    md.append(f"\n**Source:** {data['metadata']['source_url']}")
    md.append(f"\n**Date Accessed:** {data['metadata']['date_accessed']}")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md))
    print(f"💾 Saved to {output_path}")


if __name__ == "__main__":
    print("🏛️  CIVIL CODE SCRAPER")
    print("📚 Republic Act No. 386")
    print("=" * 35)
    
    result = scrape_lawphil(URL)
    save_json(result)
    save_markdown(result)
    
    print("\n✅ CIVIL CODE SCRAPING COMPLETE!")
    print("📄 Files generated:")
    print("  • civil_code.json - Structured data")
    print("  • civil_code.md - Readable documentation")
    print(f"🔗 Source: {URL}")
