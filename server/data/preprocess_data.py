import json
import os
import re
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

               
RAW_DATA_DIR = Path(__file__).parent / "raw"
PROCESSED_DATA_DIR = Path(__file__).parent / "processed"
OUTPUT_FILE = PROCESSED_DATA_DIR / "legal_knowledge.jsonl"
CHUNK_SIZE = 500                                                       
CHUNK_OVERLAP = 50                                      


                                                    
WHITESPACE_PATTERN = re.compile(r'\s+')
SPECIAL_CHARS_PATTERN = re.compile(r'[^\w\s.,;:!?()\-\'"áéíóúñÁÉÍÓÚÑ]')

def clean_text(text: str) -> str:
    """Clean and normalize text content (optimized)"""
    if not text:
        return ""
    
                             
    text = WHITESPACE_PATTERN.sub(' ', text)
                                                    
    text = SPECIAL_CHARS_PATTERN.sub('', text)
                                       
    text = text.strip()
    
    return text


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Split text into chunks - ULTRA FAST VERSION"""
    if len(text) <= chunk_size:
        return [text]
    
    chunks = []
    i = 0
    text_len = len(text)
    
    while i < text_len:
        chunk_end = min(i + chunk_size, text_len)
        chunks.append(text[i:chunk_end])
        i += chunk_size - overlap
    
    return chunks


def process_consumer_act(data: Dict[str, Any], source_file: str) -> List[Dict[str, Any]]:
    """Process Consumer Act JSON data (handles topics structure)"""
    processed_items = []
    
    law_title = data.get('title', 'Consumer Act of the Philippines')
    law_info = data.get('law', {})
    law_number = law_info.get('name', 'RA 7394')
    
                                       
    topics = data.get('topics', {})
    total_articles = sum(len(articles) for articles in topics.values())
    
    print(f"    Found {total_articles} articles to process")
    article_count = 0
    
    for topic_name, articles in topics.items():
        print(f"   📁 Processing topic: {topic_name} ({len(articles)} articles)")
        for article in articles:
            article_count += 1
            if article_count % 20 == 0 or article_count == 1:
                print(f"   ⏳ Progress: {article_count}/{total_articles} articles...")
            article_number = article.get('number', 'Unknown')
            article_title = article.get('title', '')
            content = article.get('content', '')
            topic = article.get('topic', topic_name)
            
                           
            cleaned_content = clean_text(content)
            
            if not cleaned_content:
                continue
            
                                           
            full_text = f"{law_title} ({law_number})\n"
            full_text += f"Article {article_number}: {article_title}\n"
            full_text += f"Topic: {topic}\n\n"
            full_text += cleaned_content
            
                            
            chunks = chunk_text(full_text)
            
            for idx, chunk in enumerate(chunks):
                processed_items.append({
                    'id': f"{source_file}_{article_number}_{idx}",
                    'text': chunk,
                    'metadata': {
                        'source': source_file,
                        'law': law_title,
                        'law_number': law_number,
                        'article_number': article_number,
                        'article_title': article_title,
                        'topic': topic,
                        'chunk_index': idx,
                        'total_chunks': len(chunks)
                    }
                })
    
    return processed_items


def process_revised_penal_code(data: Dict[str, Any], source_file: str) -> List[Dict[str, Any]]:
    """Process Revised Penal Code JSON data (array format)"""
    processed_items = []
    
    law_title = 'Revised Penal Code of the Philippines'
    
                                                
    articles = data if isinstance(data, list) else []
    total_articles = len(articles)
    
    print(f"    Found {total_articles} articles to process")
    
    for idx, article in enumerate(articles, 1):
        if idx % 5 == 0 or idx == 1:
            print(f"   ⏳ Progress: {idx}/{total_articles} articles...")
        article_number = str(article.get('article_number', 'Unknown'))
        article_title = article.get('article_title', '')
        content = article.get('article_text', '')
        category = article.get('category', 'General')
        penalties = article.get('penalties', '')
        
                       
        cleaned_content = clean_text(content)
        
        if not cleaned_content:
            continue
        
                                       
        full_text = f"{law_title}\n"
        full_text += f"Article {article_number}: {article_title}\n"
        full_text += f"Category: {category}\n"
        if penalties and penalties != "No specific penalty mentioned":
            full_text += f"Penalties: {penalties}\n"
        full_text += "\n"
        full_text += cleaned_content
        
                        
        chunks = chunk_text(full_text)
        
        for idx, chunk in enumerate(chunks):
            processed_items.append({
                'id': f"{source_file}_{article_number}_{idx}",
                'text': chunk,
                'metadata': {
                    'source': source_file,
                    'law': law_title,
                    'article_number': article_number,
                    'article_title': article_title,
                    'category': category,
                    'penalties': penalties,
                    'chunk_index': idx,
                    'total_chunks': len(chunks)
                }
            })
    
    return processed_items


def process_family_law(data: Dict[str, Any], source_file: str) -> List[Dict[str, Any]]:
    """Process Family Law JSON data (handles topics structure)"""
    processed_items = []
    
    law_title = data.get('title', 'Family Code of the Philippines')
    
                                      
    topics = data.get('topics', {})
    total_articles = sum(len(articles) for articles in topics.values())
    
    print(f"    Found {total_articles} articles to process")
    article_count = 0
    
    for topic_name, articles in topics.items():
        print(f"   📁 Processing topic: {topic_name} ({len(articles)} articles)")
        for article in articles:
            article_count += 1
            if article_count % 20 == 0 or article_count == 1:
                print(f"   ⏳ Progress: {article_count}/{total_articles} articles...")
            article_number = article.get('number', 'Unknown')
            article_title = article.get('title', '')
            content = article.get('content', '')
            topic = article.get('topic', topic_name)
            
                           
            cleaned_content = clean_text(content)
            
            if not cleaned_content:
                continue
            
                                           
            full_text = f"{law_title}\n"
            full_text += f"Article {article_number}: {article_title}\n"
            full_text += f"Topic: {topic}\n\n"
            full_text += cleaned_content
            
                            
            chunks = chunk_text(full_text)
            
            for idx, chunk in enumerate(chunks):
                processed_items.append({
                    'id': f"{source_file}_{article_number}_{idx}",
                    'text': chunk,
                    'metadata': {
                        'source': source_file,
                        'law': law_title,
                        'article_number': article_number,
                        'article_title': article_title,
                        'topic': topic,
                        'chunk_index': idx,
                        'total_chunks': len(chunks)
                    }
                })
    
    return processed_items


def process_labor_code(data: Dict[str, Any], source_file: str) -> List[Dict[str, Any]]:
    """Process Labor Code JSON data (handles topics structure)"""
    processed_items = []
    
    law_title = data.get('title', 'Labor Code of the Philippines')
    
                                     
    topics = data.get('topics', {})
    total_articles = sum(len(articles) for articles in topics.values())
    
    print(f"    Found {total_articles} articles to process")
    article_count = 0
    
    for topic_name, articles in topics.items():
        print(f"   📁 Processing topic: {topic_name} ({len(articles)} articles)")
        for article in articles:
            article_count += 1
            if article_count % 20 == 0 or article_count == 1:
                print(f"   ⏳ Progress: {article_count}/{total_articles} articles...")
            article_number = article.get('number', 'Unknown')
            article_title = article.get('title', '')
            content = article.get('content', '')
            topic = article.get('topic', topic_name)
            
                           
            cleaned_content = clean_text(content)
            
            if not cleaned_content:
                continue
            
                                           
            full_text = f"{law_title}\n"
            full_text += f"Article {article_number}: {article_title}\n"
            full_text += f"Topic: {topic}\n\n"
            full_text += cleaned_content
            
                            
            chunks = chunk_text(full_text)
            
            for idx, chunk in enumerate(chunks):
                processed_items.append({
                    'id': f"{source_file}_{article_number}_{idx}",
                    'text': chunk,
                    'metadata': {
                        'source': source_file,
                        'law': law_title,
                        'article_number': article_number,
                        'article_title': article_title,
                        'topic': topic,
                        'chunk_index': idx,
                        'total_chunks': len(chunks)
                    }
                })
    
    return processed_items


def process_civil_code(data: Dict[str, Any], source_file: str) -> List[Dict[str, Any]]:
    """Process Civil Code JSON data (handles sections structure)"""
    processed_items = []
    
    law_title = data.get('title', 'Civil Code of the Philippines')
    
                                       
    sections = data.get('sections', [])
    total_sections = len(sections)
    
    print(f"    Found {total_sections} sections to process")
    
    for section_idx, section in enumerate(sections, 1):
        section_heading = section.get('heading', 'General')
        articles = section.get('articles', [])
        
                                         
        if section_idx % 10 == 0 or section_idx == 1:
            print(f"   ⏳ Progress: {section_idx}/{total_sections} sections - {section_heading[:40]}...")
        
        if section_idx % 50 == 0:
            print(f"    Processed {section_idx} sections so far...")
        
        for article in articles:
            article_number = article.get('article_number', 'Unknown')
            article_heading = article.get('heading', '')
            paragraphs = article.get('paragraphs', [])
            subsections = article.get('subsections', [])
            
                                                             
            content_parts = paragraphs + subsections
            content = ' '.join(content_parts)
            
                           
            cleaned_content = clean_text(content)
            
            if not cleaned_content:
                continue
            
                                           
            full_text = f"{law_title}\n"
            full_text += f"Section: {section_heading}\n"
            full_text += f"Article {article_number}"
            if article_heading:
                full_text += f": {article_heading}"
            full_text += "\n\n"
            full_text += cleaned_content
            
                            
            chunks = chunk_text(full_text)
            
            for idx, chunk in enumerate(chunks):
                processed_items.append({
                    'id': f"{source_file}_{article_number}_{idx}",
                    'text': chunk,
                    'metadata': {
                        'source': source_file,
                        'law': law_title,
                        'section': section_heading,
                        'article_number': article_number,
                        'article_heading': article_heading,
                        'chunk_index': idx,
                        'total_chunks': len(chunks)
                    }
                })
    
    return processed_items


def process_all_files():
    """
    Main processing function
    Loads all JSON files from raw/ and processes them
    """
                              
    PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    if not RAW_DATA_DIR.exists():
        print(f" Raw data directory not found: {RAW_DATA_DIR}")
        return
    
    all_processed_items = []
    
                                           
    json_files = list(RAW_DATA_DIR.glob("*.json"))
    
    if not json_files:
        print(f" No JSON files found in {RAW_DATA_DIR}")
        print("Please run the scraper scripts first to generate raw data.")
        return
    
                                                                   
    json_files.sort(key=lambda f: (f.name == 'civil_code.json', f.name))
    
    print(f"📂 Found {len(json_files)} JSON files to process")
    
    for json_file in json_files:
        print(f"\n📄 Processing: {json_file.name}")
        
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            source_name = json_file.stem                              
            
                                                              
            if 'consumer' in source_name.lower():
                items = process_consumer_act(data, source_name)
            elif 'penal' in source_name.lower() or 'rpc' in source_name.lower():
                items = process_revised_penal_code(data, source_name)
            elif 'family' in source_name.lower():
                items = process_family_law(data, source_name)
            elif 'labor' in source_name.lower():
                items = process_labor_code(data, source_name)
            elif 'civil' in source_name.lower():
                items = process_civil_code(data, source_name)
            else:
                                                       
                print(f" Unknown format for {source_name}, skipping...")
                continue
            
            all_processed_items.extend(items)
            print(f" Processed {len(items)} chunks from {json_file.name}")
            
        except Exception as e:
            print(f" Error processing {json_file.name}: {str(e)}")
            continue
    
                                                     
    print(f"\n Saving {len(all_processed_items)} processed chunks to {OUTPUT_FILE}")
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        for item in all_processed_items:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
    
    print(f" Preprocessing complete!")
    print(f" Total chunks created: {len(all_processed_items)}")
    print(f"📁 Output file: {OUTPUT_FILE}")
    
                                 
    sources = {}
    for item in all_processed_items:
        source = item['metadata']['source']
        sources[source] = sources.get(source, 0) + 1
    
    print("\n Summary by source:")
    for source, count in sources.items():
        print(f"  - {source}: {count} chunks")


if __name__ == "__main__":
    print(" Starting data preprocessing for AI.ttorney Legal Chatbot")
    print(f"📂 Raw data directory: {RAW_DATA_DIR}")
    print(f"📂 Output directory: {PROCESSED_DATA_DIR}")
    print("=" * 60)
    
    process_all_files()
