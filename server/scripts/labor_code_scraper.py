import requests
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime
from pathlib import Path

LABOR_CODE_URL = "https://lawphil.net/statutes/presdecs/pd1974/pd_442_1974.html"

def clean_text(text):
    """Remove excessive whitespace and footnote artifacts."""
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\(LABOR CODE.*?\)', '', text, flags=re.IGNORECASE)
    return text.strip()

def classify_article(content):
    """Simple classification logic for topic tagging."""
    content_lower = (content or "").lower()
    topics = {
        "Employment": ["employment", "employer", "employee", "work", "contract", "termination", "wage", "salary"],
        "Labor Relations": ["union", "collective", "bargaining", "strike", "conciliation", "arbitration"],
        "Social Welfare": ["sss", "gsis", "insurance", "benefit", "pension"],
        "Health and Safety": ["safety", "health", "accident", "hazard", "sanitation"]
    }
    scores = {t: sum(k in content_lower for k in kw) for t, kw in topics.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "General Provisions"

def scrape_labor_code(url):
    print("🔄 Fetching from LawPhil...")
    response = requests.get(url)
    response.encoding = "utf-8"
    soup = BeautifulSoup(response.text, "html.parser")

    paragraphs = soup.find_all("p")
    articles = []
    current_book, current_title, current_chapter = "", "", ""
    current_article = None
    buffer = []

    for idx, p in enumerate(paragraphs):
        text = clean_text(p.get_text(" ", strip=True))
        if not text:
            continue

        # Detect Book, Title, Chapter
        if re.match(r"^BOOK\s+[IVXLC]+\b", text, re.IGNORECASE):
            current_book = text
            continue
        if re.match(r"^TITLE\s+[IVXLC]+\b", text, re.IGNORECASE):
            current_title = text
            continue
        if re.match(r"^CHAPTER\s+[IVXLC0-9]+\b", text, re.IGNORECASE):
            current_chapter = text
            continue

        # Detect new Article
        article_match = re.match(r"^(ART\.|ARTICLE)\s*(\d+)\.?\s*(.*)", text, re.IGNORECASE)
        if article_match:
            # Save previous article
            if current_article:
                current_article["content"] = clean_text(" ".join(buffer))
                articles.append(current_article)
                buffer = []

            article_num = article_match.group(2)
            article_title = article_match.group(3).strip()

            # If article line already contains a long body, split it
            split_parts = re.split(r'[\.\-–:]\s+', article_title, 1)
            if len(split_parts) > 1 and len(split_parts[1].split()) > 5:
                article_title, first_content = split_parts[0].strip(), split_parts[1].strip()
                buffer = [first_content]
            else:
                buffer = []

            current_article = {
                "law": "Labor Code (P.D. 442)",
                "type": "Article",
                "number": article_num,
                "title": article_title if article_title else f"Article {article_num}",
                "content": "",
                "topic": "",
                "hierarchy": {
                    "book": current_book,
                    "title": current_title,
                    "chapter": current_chapter
                }
            }

            # Also check if the next <p> continues the article
            if idx + 1 < len(paragraphs):
                next_p = clean_text(paragraphs[idx + 1].get_text(" ", strip=True))
                if next_p and not re.match(r"^(ART\.|ARTICLE)\s*\d+", next_p, re.IGNORECASE):
                    # Only append if we didn't already push first_content into buffer
                    if not (len(buffer) == 1 and buffer[0] == first_content if 'first_content' in locals() else False):
                        buffer.append(next_p)
            continue

        # Accumulate article content
        if current_article:
            buffer.append(text)

    # Add last article after loop
    if current_article:
        current_article["content"] = clean_text(" ".join(buffer))
        articles.append(current_article)

    # Classify all articles
    for art in articles:
        art["topic"] = classify_article(art.get("content", "") or art.get("title", ""))

    print(f"✅ Extracted {len(articles)} articles.")
    return articles

def organize_by_topic(articles):
    topics = {}
    for art in articles:
        topics.setdefault(art["topic"], []).append(art)
    return topics

def create_data_structure(articles):
    topics = organize_by_topic(articles)
    return {
        "title": "LABOR CODE OF THE PHILIPPINES",
        "description": "Presidential Decree No. 442 - Labor Code of the Philippines",
        "laws": [
            {
                "name": "Labor Code of the Philippines",
                "executive_order": "P.D. No. 442",
                "date": "May 1, 1974",
                "url": LABOR_CODE_URL
            }
        ],
        "topics": topics,
        "statistics": {
            "total_articles": len(articles),
            "by_topic": {topic: len(arts) for topic, arts in topics.items()}
        },
        "metadata": {
            "source": LABOR_CODE_URL,
            "date_accessed": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    }

def save_json(data):
    # Ensure data/raw directory exists
    output_dir = Path(__file__).parent.parent / "data" / "raw"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save to data/raw directory
    output_path = output_dir / "labor_code.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"💾 Saved to {output_path}")

def save_markdown(data):
    # Save markdown to data/raw directory as well
    output_dir = Path(__file__).parent.parent / "data" / "raw"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "labor_code.md"
    
    md = [f"# {data['title']}\n", f"{data['description']}\n"]
    md.append("## Topics\n")
    for topic, articles in data["topics"].items():
        md.append(f"### {topic}\n")
        for art in articles:
            md.append(f"#### Article {art['number']}: {art['title']}")
            md.append(f"*{art['hierarchy']['book']} | {art['hierarchy']['title']} | {art['hierarchy']['chapter']}*")
            md.append(f"\n{art['content']}\n")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md))
    print(f"💾 Saved to {output_path}")

def main():
    articles = scrape_labor_code(LABOR_CODE_URL)
    data = create_data_structure(articles)
    save_json(data)
    save_markdown(data)
    print("\n📊 SUMMARY:")
    for topic, count in data["statistics"]["by_topic"].items():
        print(f"• {topic}: {count} articles")

if __name__ == "__main__":
    main()
