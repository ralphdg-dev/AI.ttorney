import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import re
from pathlib import Path

# URLs to scrape
FAMILY_CODE_URL = "https://lawphil.net/executive/execord/eo1987/eo_209_1987.html"
RA_9262_URL = "https://lawphil.net/statutes/repacts/ra2004/ra_9262_2004.html"

def clean_text(text):
    """Cleans and normalizes text by removing extra whitespace."""
    return re.sub(r'\s+', ' ', text.strip())

def classify_article_by_content(content, title="", number=""):
    """Intelligently classify articles based on content keywords"""
    content_lower = (content + " " + title).lower()
    
    # Keywords for each topic
    marriage_keywords = [
        'marriage', 'marry', 'married', 'spouse', 'husband', 'wife', 'wedding', 'matrimony',
        'conjugal', 'marital', 'solemniz', 'ceremony', 'license', 'requisite', 'consent',
        'legal capacity', 'impediment', 'celebration', 'contract', 'union', 'family life'
    ]
    
    annulment_keywords = [
        'annul', 'void', 'nullity', 'invalid', 'fraud', 'force', 'intimidation', 'unsound mind',
        'insanity', 'impotence', 'sexually transmissible disease', 'concealment', 'prescription',
        'declaration of nullity', 'voidable', 'ab initio'
    ]
    
    custody_keywords = [
        'custody', 'parental authority', 'child', 'children', 'minor', 'best interest',
        'guardianship', 'support', 'visitation', 'separation', 'legitimate', 'illegitimate',
        'paternity', 'filiation', 'adoption', 'welfare', 'care', 'upbringing'
    ]
    
    vawc_keywords = [
        'violence', 'abuse', 'physical', 'psychological', 'sexual', 'economic', 'battering',
        'threat', 'harassment', 'stalking', 'protection order', 'barangay', 'women',
        'domestic violence', 'intimidation', 'coercion', 'deprivation', 'exploitation'
    ]
    
    # Count keyword matches
    scores = {
        'Marriage': sum(1 for keyword in marriage_keywords if keyword in content_lower),
        'Annulment': sum(1 for keyword in annulment_keywords if keyword in content_lower),
        'Child Custody': sum(1 for keyword in custody_keywords if keyword in content_lower),
        'VAWC': sum(1 for keyword in vawc_keywords if keyword in content_lower)
    }
    
    # Get the topic with highest score
    primary_topic = max(scores, key=scores.get)
    
    # If no clear winner, use article number as fallback
    if scores[primary_topic] == 0:
        try:
            num = int(number)
            if 1 <= num <= 44:
                return 'Marriage'
            elif 45 <= num <= 55:
                return 'Annulment'
            elif num >= 200:
                return 'Child Custody'
            else:
                return 'Marriage'
        except:
            return 'Marriage'
    
    return primary_topic

def scrape_family_code(url):
    """Scrape Family Code from LawPhil"""
    print("🔄 Fetching Family Code content...")
    response = requests.get(url)
    response.encoding = 'utf-8'
    soup = BeautifulSoup(response.text, "html.parser")

    all_paragraphs = soup.find_all("p", attrs={'align': 'justify'})
    
    current_title = ""
    current_chapter = ""
    articles = []
    
    for p in all_paragraphs:
        text = clean_text(p.get_text(" ", strip=True))
        if not text:
            continue

        # Detect TITLE
        title_match = re.match(r"TITLE\s+([IVXLC]+)\s*[-–—]?\s*(.+)", text, re.I)
        if title_match:
            title_number = title_match.group(1)
            title_name = title_match.group(2).strip()
            current_title = f"TITLE {title_number} — {title_name}"
            print(f"📖 Found: {current_title}")
            continue
        
        # Also check for standalone TITLE lines
        if re.match(r"^TITLE\s+[IVXLC]+\s*$", text, re.I):
            current_title = text.strip()
            print(f"📖 Found: {current_title}")
            continue

        # Detect Chapter
        chapter_match = re.match(r"Chapter\s+(\d+)\.\s*(.+)", text)
        if chapter_match:
            chapter_number = chapter_match.group(1)
            chapter_name = chapter_match.group(2).strip()
            current_chapter = f"Chapter {chapter_number}. {chapter_name}"
            print(f"📑 Found: {current_chapter}")
            continue

        # Detect Article
        article_match = re.match(r"Article\s+(\d+)\.?\s*(.*)", text, re.DOTALL)
        if article_match:
            article_number = article_match.group(1)
            content = text
            
            # Extract title (first sentence)
            content_after_number = article_match.group(2).strip()
            title_match = re.match(r'^([^.]+)', content_after_number)
            if title_match:
                title = clean_text(title_match.group(1))
            else:
                title = f"Article {article_number}"
            
            # Classify by content
            topic = classify_article_by_content(content, title, article_number)
            
            article = {
                "law": "Family Code (E.O. 209)",
                "type": "Article",
                "number": article_number,
                "title": title,
                "content": content,
                "topic": topic,
                "hierarchy": {
                    "title": current_title,
                    "chapter": current_chapter
                }
            }
            
            articles.append(article)
            print(f"📄 Article {article_number} - {topic}: {title[:50]}...")
            if current_title or current_chapter:
                print(f"    └─ Hierarchy: {current_title} | {current_chapter}")
    
    return articles

def scrape_ra_9262(url):
    """Scrape RA 9262 (VAWC) from LawPhil"""
    print("🔄 Fetching RA 9262 content...")
    try:
        response = requests.get(url)
        response.encoding = 'utf-8'
        soup = BeautifulSoup(response.text, "html.parser")

        all_paragraphs = soup.find_all("p")
        
        current_title = ""
        current_chapter = ""
        sections = []
        
        for p in all_paragraphs:
            text = clean_text(p.get_text(" ", strip=True))
            if not text:
                continue

            # Detect centered headings
            if p.has_attr("align") and p["align"] == "center":
                if "TITLE" in text.upper():
                    current_title = text
                    print(f"📖 Found: {current_title}")
                elif "CHAPTER" in text.upper():
                    current_chapter = text
                    print(f"📑 Found: {current_chapter}")
                continue

            # Detect Section
            section_match = re.match(r"(?:SEC\.|SECTION)\s+(\d+)\.?\s*(.*)", text, re.I | re.DOTALL)
            if section_match:
                section_number = section_match.group(1)
                content = text
                
                # Extract title
                content_after_number = section_match.group(2).strip()
                title_match = re.match(r'^([^.–—\-]+)', content_after_number)
                if title_match:
                    title = clean_text(title_match.group(1))
                else:
                    title = f"Section {section_number}"
                
                # All RA 9262 sections are VAWC
                topic = 'VAWC'
                
                section = {
                    "law": "Republic Act No. 9262",
                    "type": "Section", 
                    "number": section_number,
                    "title": title,
                    "content": content,
                    "topic": topic,
                    "hierarchy": {
                        "title": current_title,
                        "chapter": current_chapter
                    }
                }
                
                sections.append(section)
                print(f"📄 Section {section_number} - {topic}: {title[:50]}...")
                if current_title or current_chapter:
                    print(f"    └─ Hierarchy: {current_title} | {current_chapter}")
        
        return sections
    
    except Exception as e:
        print(f"❌ Error scraping RA 9262: {e}")
        return []

def organize_by_topics(all_entries):
    """Organize all entries by the four main topics"""
    topics = {
        "Marriage": [],
        "Annulment": [],
        "Child Custody": [],
        "VAWC": []
    }
    
    for entry in all_entries:
        topic = entry['topic']
        topics[topic].append(entry)
    
    return topics

def create_comprehensive_data(family_code_articles, ra_9262_sections):
    """Create clean comprehensive JSON structure"""
    all_entries = family_code_articles + ra_9262_sections
    topics_data = organize_by_topics(all_entries)
    
    data = {
        "title": "COMPREHENSIVE FAMILY LAW COMPENDIUM",
        "description": "Family Code of the Philippines and Republic Act No. 9262 (VAWC)",
        "laws": [
            {
                "name": "Family Code of the Philippines",
                "executive_order": "EXECUTIVE ORDER NO. 209",
                "date": "July 6, 1987",
                "url": FAMILY_CODE_URL
            },
            {
                "name": "Republic Act No. 9262",
                "full_name": "Anti-Violence Against Women and Their Children Act of 2004",
                "date": "March 8, 2004",
                "url": RA_9262_URL
            }
        ],
        "topics": topics_data,
        "statistics": {
            "total_entries": len(all_entries),
            "family_code_articles": len(family_code_articles),
            "ra_9262_sections": len(ra_9262_sections),
            "by_topic": {topic: len(entries) for topic, entries in topics_data.items()}
        },
        "metadata": {
            "date_accessed": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "sources": [FAMILY_CODE_URL, RA_9262_URL]
        }
    }
    
    return data

def save_json(data, filename="family_code.json"):
    """Save data as JSON file"""
    # Ensure data/raw directory exists
    output_dir = Path(__file__).parent.parent / "data" / "raw"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save to data/raw directory
    output_path = output_dir / filename
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"✅ JSON saved to {output_path}")

def save_markdown(data, filename="family_code.md"):
    """Save data as Markdown file"""
    # Save markdown to data/raw directory as well
    output_dir = Path(__file__).parent.parent / "data" / "raw"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / filename
    
    md = []
    md.append(f"# {data['title']}\n")
    md.append(f"{data['description']}\n")
    
    # Laws section
    md.append("## Laws Covered\n")
    for law in data['laws']:
        md.append(f"- **{law['name']}** ({law.get('executive_order', law.get('full_name', ''))})")
        md.append(f"  - Date: {law['date']}")
        md.append(f"  - Source: {law['url']}\n")
    
    # Statistics
    stats = data['statistics']
    md.append("## Statistics\n")
    md.append(f"- **Total Entries:** {stats['total_entries']}")
    md.append(f"- **Family Code Articles:** {stats['family_code_articles']}")
    md.append(f"- **RA 9262 Sections:** {stats['ra_9262_sections']}\n")
    
    md.append("### By Topic:\n")
    for topic, count in stats['by_topic'].items():
        md.append(f"- **{topic}:** {count} entries")
    
    # Topics content
    for topic_name, entries in data['topics'].items():
        md.append(f"\n## {topic_name}\n")
        
        for entry in entries:
            md.append(f"\n### {entry['law']} - {entry['type']} {entry['number']}")
            md.append(f"**{entry['title']}**\n")
            
            if entry['hierarchy']['title']:
                md.append(f"*{entry['hierarchy']['title']}*")
            if entry['hierarchy']['chapter']:
                md.append(f" | *{entry['hierarchy']['chapter']}*")
            md.append("\n")
            
            md.append(f"{entry['content']}\n")
    
    md.append(f"\n---\n**Date Accessed:** {data['metadata']['date_accessed']}")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md))
    print(f"✅ Markdown saved to {output_path}")

def display_summary(data):
    """Display clean summary"""
    print(f"\n📊 **EXTRACTION SUMMARY**")
    print("=" * 50)
    print(f"📖 {data['title']}")
    print(f"📝 {data['description']}")
    
    print(f"\n📚 **Laws:**")
    for law in data['laws']:
        print(f"  • {law['name']} ({law['date']})")
    
    stats = data['statistics']
    print(f"\n📄 **Total:** {stats['total_entries']} entries")
    print(f"  • Family Code: {stats['family_code_articles']} articles")
    print(f"  • RA 9262: {stats['ra_9262_sections']} sections")
    
    print(f"\n🏷️  **By Topic:**")
    for topic, count in stats['by_topic'].items():
        print(f"  • {topic}: {count} entries")
        
        # Show sample entries
        sample_entries = data['topics'][topic][:2]
        for entry in sample_entries:
            print(f"    - {entry['type']} {entry['number']}: {entry['title'][:50]}...")

if __name__ == "__main__":
    print("🏛️  CLEAN FAMILY LAW SCRAPER")
    print("📚 Simplified Structure - No Redundancy")
    print("=" * 45)
    
    # Scrape both sources
    family_code_articles = scrape_family_code(FAMILY_CODE_URL)
    ra_9262_sections = scrape_ra_9262(RA_9262_URL)
    
    # Create clean data structure
    clean_data = create_comprehensive_data(family_code_articles, ra_9262_sections)
    
    # Save outputs
    save_json(clean_data)
    save_markdown(clean_data)
    
    # Display summary
    display_summary(clean_data)
    
    print("\n✅ **CLEAN SCRAPING COMPLETE!**")
    print("📄 Files generated:")
    print("  • clean_family_law.json - Clean structured data")
    print("  • clean_family_law.md - Readable documentation")
    print(f"🔗 Sources:")
    print(f"  • {FAMILY_CODE_URL}")
    print(f"  • {RA_9262_URL}")
