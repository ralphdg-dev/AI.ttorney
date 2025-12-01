import requests
import logging
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime
from pathlib import Path

# Configure logging for script
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

            
URL = "https://lawphil.net/statutes/repacts/ra1949/ra_386_1949.html"

def clean_text(text):
    """Remove excessive whitespace."""
    return re.sub(r'\s+', ' ', text.strip())

def scrape_lawphil(url):
    """Scrape Civil Code using requests and BeautifulSoup."""
    logger.info("Fetching Civil Code from LawPhil...")
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

                                    
        if not data["title"] and re.search(r"REPUBLIC ACT", text, re.I):
            data["title"] = text
            continue
        if not data["preamble"] and re.search(r"AN ACT", text, re.I):
            data["preamble"] = text
            continue

                                                          
        align = p.get("align", "").lower()
        if align == "center":
            current_section = {"heading": text, "articles": []}
            data["sections"].append(current_section)
            continue

                        
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

                                             
        if re.match(r"^\(\d+\)", text):
            if current_article:
                current_article["subsections"].append(text)
            continue

                                           
        if current_article:
            current_article["paragraphs"].append(text)

    logger.info(f"Extracted {sum(len(s['articles']) for s in data['sections'])} articles")
    return data


def save_json(data, filename="civil_code.json"):
                                      
    output_dir = Path(__file__).parent.parent / "data" / "raw"
    output_dir.mkdir(parents=True, exist_ok=True)
    
                                
    output_path = output_dir / filename
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    logger.info(f"Saved to {output_path}")

def save_markdown(data, filename="civil_code.md"):
                                                 
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
    logger.info(f"Saved to {output_path}")


if __name__ == "__main__":
    logger.info("CIVIL CODE SCRAPER")
    logger.info("Republic Act No. 386")
    logger.info("=" * 35)
    
    result = scrape_lawphil(URL)
    save_json(result)
    save_markdown(result)
    
    logger.info("CIVIL CODE SCRAPING COMPLETE!")
    logger.info("Files generated:")
    logger.info("  • civil_code.json - Structured data")
    logger.info("  • civil_code.md - Readable documentation")
    logger.info(f"Source: {URL}")
