                                                                                                                          
                                                                          

import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import re
from pathlib import Path

               
CONSUMER_ACT_URL = "https://lawphil.net/statutes/repacts/ra1992/ra_7394_1992.html"

def clean_text(text):
    """Cleans and normalizes text by removing extra whitespace."""
    return re.sub(r'\s+', ' ', text.strip())

def classify_article_by_content(content, title="", number=""):
    """Intelligently classify articles based on content keywords"""
    content_lower = (content + " " + title).lower()
    
                                                                                     
    consumer_rights_keywords = [
        'rights', 'right to', 'safety', 'information', 'redress', 'remedy', 'protection',
        'consumer rights', 'basic rights', 'welfare', 'health', 'security', 'quality',
        'standard', 'warranty', 'guarantee', 'complaint', 'grievance', 'compensation'
    ]
    
                                                                                              
    unfair_sales_keywords = [
        'unfair', 'deceptive', 'misleading', 'false', 'fraud', 'misrepresentation',
        'advertising', 'promotion', 'marketing', 'sales', 'selling', 'offer',
        'price manipulation', 'bait and switch', 'pyramid', 'chain letter',
        'unconscionable', 'prohibited acts', 'unlawful', 'violation'
    ]
    
                           
    scores = {
        'Consumer Rights': sum(1 for keyword in consumer_rights_keywords if keyword in content_lower),
        'Unfair Sales Practices': sum(1 for keyword in unfair_sales_keywords if keyword in content_lower)
    }
    
                                      
    primary_topic = max(scores, key=scores.get)
    
                                                        
    if scores[primary_topic] == 0:
                                                                                          
        if 'title ii' in content_lower or 'title 2' in content_lower:
            return 'Consumer Rights'
        elif 'title iv' in content_lower or 'title 4' in content_lower:
            return 'Unfair Sales Practices'
        else:
                                                                   
            try:
                num = int(number)
                if 1 <= num <= 50:
                    return 'Consumer Rights'
                else:
                    return 'Unfair Sales Practices'
            except:
                return 'Consumer Rights'
    
    return primary_topic

def scrape_consumer_act(url):
    """Scrape Consumer Act from LawPhil"""
    print(" Fetching Consumer Act content...")
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

                      
        title_match = re.match(r"TITLE\s+([IVXLC]+)\s*[-–—]?\s*(.+)", text, re.I)
        if title_match:
            title_number = title_match.group(1)
            title_name = title_match.group(2).strip()
            current_title = f"TITLE {title_number} — {title_name}"
            print(f"📖 Found: {current_title}")
            continue
        
                                               
        if re.match(r"^TITLE\s+[IVXLC]+\s*$", text, re.I):
            current_title = text.strip()
            print(f"📖 Found: {current_title}")
            continue

                        
        chapter_match = re.match(r"Chapter\s+(\d+)\.\s*(.+)", text)
        if chapter_match:
            chapter_number = chapter_match.group(1)
            chapter_name = chapter_match.group(2).strip()
            current_chapter = f"Chapter {chapter_number}. {chapter_name}"
            print(f"📑 Found: {current_chapter}")
            continue

                        
        article_match = re.match(r"Article\s+(\d+)\.?\s*(.*)", text, re.DOTALL)
        if article_match:
            article_number = article_match.group(1)
            content = text
            
                                            
            content_after_number = article_match.group(2).strip()
            title_match = re.match(r'^([^.]+)', content_after_number)
            if title_match:
                title = clean_text(title_match.group(1))
            else:
                title = f"Article {article_number}"
            
                                 
            topic = classify_article_by_content(content, title, article_number)
            
            article = {
                "law": "Republic Act No. 7394",
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

def organize_by_topics(all_articles):
    """Organize all articles by the two main topics"""
    topics = {
        "Consumer Rights": [],
        "Unfair Sales Practices": []
    }
    
    for article in all_articles:
        topic = article['topic']
        topics[topic].append(article)
    
    return topics

def create_consumer_data(consumer_articles):
    """Create clean comprehensive JSON structure"""
    topics_data = organize_by_topics(consumer_articles)
    
    data = {
        "title": "THE CONSUMER ACT OF THE PHILIPPINES",
        "description": "Republic Act No. 7394 - Consumer Protection Law",
        "law": {
            "name": "Republic Act No. 7394",
            "full_name": "The Consumer Act of the Philippines",
            "date": "April 13, 1992",
            "url": CONSUMER_ACT_URL
        },
        "topics": topics_data,
        "statistics": {
            "total_articles": len(consumer_articles),
            "by_topic": {topic: len(articles) for topic, articles in topics_data.items()}
        },
        "metadata": {
            "date_accessed": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "source": CONSUMER_ACT_URL
        }
    }
    
    return data

def save_json(data, filename="consumer_act.json"):
    """Save data as JSON file"""
                                      
    output_dir = Path(__file__).parent.parent / "data" / "raw"
    output_dir.mkdir(parents=True, exist_ok=True)
    
                                
    output_path = output_dir / filename
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f" JSON saved to {output_path}")

def save_markdown(data, filename="consumer_act.md"):
    """Save data as Markdown file"""
                                                 
    output_dir = Path(__file__).parent.parent / "data" / "raw"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / filename
    
    md = []
    md.append(f"# {data['title']}\n")
    md.append(f"{data['description']}\n")
    
                 
    law = data['law']
    md.append("## Law Details\n")
    md.append(f"- **{law['name']}** ({law['full_name']})")
    md.append(f"- **Date:** {law['date']}")
    md.append(f"- **Source:** {law['url']}\n")
    
                
    stats = data['statistics']
    md.append("## Statistics\n")
    md.append(f"- **Total Articles:** {stats['total_articles']}\n")
    
    md.append("### By Topic:\n")
    for topic, count in stats['by_topic'].items():
        md.append(f"- **{topic}:** {count} articles")
    
                    
    for topic_name, articles in data['topics'].items():
        md.append(f"\n## {topic_name}\n")
        
        for article in articles:
            md.append(f"\n### {article['law']} - {article['type']} {article['number']}")
            md.append(f"**{article['title']}**\n")
            
            if article['hierarchy']['title']:
                md.append(f"*{article['hierarchy']['title']}*")
            if article['hierarchy']['chapter']:
                md.append(f" | *{article['hierarchy']['chapter']}*")
            md.append("\n")
            
            md.append(f"{article['content']}\n")
    
    md.append(f"\n---\n**Date Accessed:** {data['metadata']['date_accessed']}")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md))
    print(f" Markdown saved to {output_path}")

def display_summary(data):
    """Display clean summary"""
    print(f"\n **EXTRACTION SUMMARY**")
    print("=" * 50)
    print(f"📖 {data['title']}")
    print(f" {data['description']}")
    
    law = data['law']
    print(f"\n📚 **Law:** {law['name']} ({law['date']})")
    
    stats = data['statistics']
    print(f"\n📄 **Total Articles:** {stats['total_articles']}")
    
    print(f"\n🏷  **By Topic:**")
    for topic, count in stats['by_topic'].items():
        print(f"  • {topic}: {count} articles")
        
                              
        sample_articles = data['topics'][topic][:2]
        for article in sample_articles:
            print(f"    - Article {article['number']}: {article['title'][:50]}...")

if __name__ == "__main__":
    print("🏛  CONSUMER ACT SCRAPER")
    print("📚 Republic Act No. 7394")
    print("=" * 35)
    
                         
    consumer_articles = scrape_consumer_act(CONSUMER_ACT_URL)
    
                                 
    consumer_data = create_consumer_data(consumer_articles)
    
                  
    save_json(consumer_data)
    save_markdown(consumer_data)
    
                     
    display_summary(consumer_data)
    
    print("\n **CONSUMER ACT SCRAPING COMPLETE!**")
    print("📄 Files generated:")
    print("  • consumer_act.json - Clean structured data")
    print("  • consumer_act.md - Readable documentation")
    print(f"🔗 Source: {CONSUMER_ACT_URL}")
