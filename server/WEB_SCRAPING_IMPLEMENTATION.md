# Web Scraping Implementation for RAG

## Overview

The chatbot now **scrapes and reads the actual content** from web search results, combining it with Qdrant database results to provide comprehensive, accurate answers.

## What Changed

### Before
```
Web Search → Get snippets (150-300 chars) → Add to context
```
❌ Only short snippets from Google
❌ Limited information
❌ May miss important details

### After
```
Web Search → Scrape full webpage content (up to 2000 chars) → Add to context
```
✅ Full article/page content
✅ Comprehensive information
✅ Better answers from LLM

## How It Works

### Step 1: Web Search
```python
# Extract keywords and search
keywords = extract_legal_keywords("ako ay isang kasambahay, pano ko kakasuhan ang amo ko")
# Result: kasambahay, domestic worker, how to, file a case, legal complaint

search_query = "kasambahay domestic worker how to file a case legal complaint Philippine law..."
```

### Step 2: Get Search Results
```python
# Google Custom Search API returns:
[
  {
    "title": "Kasambahay Rights - Official Gazette",
    "url": "https://www.officialgazette.gov.ph/kasambahay-law",
    "snippet": "The Kasambahay Law provides..."
  },
  ...
]
```

### Step 3: Scrape Each Website
```python
for each result:
    1. Visit the URL
    2. Extract main content (article, main, .content)
    3. Clean the text (remove nav, footer, scripts)
    4. Truncate to 2000 characters
    5. Add to result as 'scraped_content'
```

### Step 4: Build Context
```python
=== PRIMARY SOURCES: WEB SEARCH (Most Recent & Comprehensive) ===

[Web Source 1: Kasambahay Rights - Official Gazette]
[URL: https://www.officialgazette.gov.ph/kasambahay-law]
[FULL ARTICLE CONTENT - 2000 chars]
Republic Act No. 10361, also known as the Domestic Workers Act or Batas Kasambahay,
provides comprehensive protection for domestic workers in the Philippines...
[Full legal text, requirements, procedures, etc.]

[Web Source 2: Filing Labor Cases - DOLE]
[URL: https://www.dole.gov.ph/labor-cases]
[FULL ARTICLE CONTENT - 2000 chars]
To file a labor case, domestic workers must follow these steps...
[Complete guide with forms, timelines, etc.]

=== SUPPLEMENTARY SOURCES: LEGAL DATABASE (Additional Context) ===

[Qdrant Source 1: Labor Code - Article 279]
[Relevant legal provisions from database]
```

### Step 5: LLM Generation
- LLM sees full web content FIRST
- Uses it as primary source
- Supplements with Qdrant database
- Generates comprehensive answer

## Features

### ✅ Smart Content Extraction

**Targets Main Content:**
- `<article>` tags
- `<main>` tags
- `.content`, `#content` classes
- `.post-content`, `.entry-content` classes
- Falls back to `<body>` if needed

**Removes Noise:**
- Navigation menus
- Footers and headers
- Scripts and styles
- Advertisements

**Cleans Text:**
- Removes excessive whitespace
- Normalizes line breaks
- Preserves paragraph structure

### ✅ Error Handling

**Graceful Fallbacks:**
```python
if scraping fails:
    use snippet from Google search
if timeout (10 seconds):
    skip and continue to next result
if HTTP error:
    log warning and use snippet
```

**Timeout Protection:**
- 10-second timeout per webpage
- Prevents hanging on slow sites
- Continues with other results

### ✅ Performance Optimization

**Caching:**
- Search results cached for 1 hour
- Scraped content included in cache
- Reduces API calls and scraping

**Parallel Processing:**
- Scrapes multiple pages sequentially
- Logs progress for each page
- Total time: ~5-10 seconds for 5 pages

## Example Flow

### User Query
```
"ako ay isang kasambahay, pano ko kakasuhan ang amo ko"
```

### Execution
```
1. Extract keywords: kasambahay, domestic worker, how to, file a case
2. Search Google: "kasambahay domestic worker how to file a case Philippine law..."
3. Get 5 results:
   - Official Gazette: Kasambahay Law
   - DOLE: Labor Cases Guide
   - LawPhil: Domestic Workers Act
   - Supreme Court: Related Ruling
   - NLRC: Filing Procedures

4. Scrape each website:
   ✅ Official Gazette: 1,850 chars
   ✅ DOLE: 1,920 chars
   ✅ LawPhil: 2,000 chars
   ✅ Supreme Court: 1,750 chars
   ✅ NLRC: 1,680 chars

5. Combine with Qdrant (3 results):
   - Labor Code Article 279
   - Domestic Workers Rights
   - Filing Procedures

6. Total Context:
   - 5 web sources (9,200 chars)
   - 3 Qdrant sources (1,500 chars)
   - Combined: 10,700 chars of legal information

7. LLM generates comprehensive answer using all sources
```

### Response Quality
```
Before (snippets only):
"Based on limited information, kasambahay have rights..."

After (full content):
"According to Republic Act No. 10361 (Kasambahay Law), domestic workers 
have the following rights and procedures to file a case:

1. Rights under the Law:
   - [Detailed rights from Official Gazette]
   
2. Filing Procedures:
   - [Step-by-step guide from DOLE]
   
3. Legal Basis:
   - [Specific provisions from LawPhil]
   
4. Recent Jurisprudence:
   - [Supreme Court ruling details]

Sources: Official Gazette, DOLE, LawPhil, Supreme Court, NLRC"
```

## Logging

### User-Facing Logs
```
🔍 Web search keywords: kasambahay domestic worker how to file a case
✅ Found 5 web search results
📄 Scraping content from 5 web pages...
✅ Completed scraping 5 web pages
✅ Added 5 web search results with scraped content to context
📦 Context built: 3 Qdrant + 5 Web = 8 total sources
```

### Debug Logs (optional)
```
   📄 Scraping content from: https://www.officialgazette.gov.ph/kasambahay-law...
   ✅ Scraped 1850 characters from https://www.officialgazette.gov.ph...
   📄 Scraping content from: https://www.dole.gov.ph/labor-cases...
   ✅ Scraped 1920 characters from https://www.dole.gov.ph...
```

## Configuration

### Scraping Limits

```python
# In web_search_service.py
MAX_SNIPPET_LENGTH = 300      # Fallback snippet length
MAX_SCRAPE_LENGTH = 2000      # Maximum scraped content per page
SCRAPE_TIMEOUT = 10           # Seconds to wait per page
```

### Adjusting Content Length

```python
# Increase for more detailed content
def scrape_webpage_content(self, url: str, max_length: int = 3000):
    ...

# Decrease for faster processing
def scrape_webpage_content(self, url: str, max_length: int = 1000):
    ...
```

### Content Selectors

```python
# Add more selectors for specific sites
for selector in [
    'article', 
    'main', 
    '.content', 
    '#content', 
    '.post-content', 
    '.entry-content',
    '.article-body',  # Add this
    '#main-content'   # Add this
]:
    main_content = soup.select_one(selector)
    if main_content:
        break
```

## Benefits

### ✅ Comprehensive Answers
- Full article content, not just snippets
- Complete legal procedures and requirements
- Detailed explanations and examples

### ✅ Better Accuracy
- More context for LLM to work with
- Reduces hallucinations
- Provides specific citations

### ✅ Recent Information
- Gets latest updates from official sites
- Includes recent court rulings
- Captures new legislation

### ✅ Authoritative Sources
- Prioritizes Official Gazette, LawPhil, Supreme Court
- Verifiable information with URLs
- Trustworthy legal content

## Performance Impact

### Processing Time
```
Without scraping: ~2 seconds
With scraping: ~7 seconds (5 pages × ~1 second each)
```

### Token Usage
```
Snippets only: ~500 tokens
Full content: ~3000 tokens
```
**Note:** Higher token usage but significantly better quality

### Caching Benefits
```
First request: 7 seconds (search + scrape)
Cached requests: <1 second (from cache)
Cache duration: 1 hour
```

## Troubleshooting

### Issue: Scraping fails for some sites

**Possible Causes:**
1. Site blocks scrapers
2. Dynamic content (JavaScript-rendered)
3. Timeout

**Solutions:**
1. Fallback to snippet (automatic)
2. Increase timeout
3. Add User-Agent header (already done)

### Issue: Too much content

**Symptom:** Context too long for LLM

**Solution:**
```python
# Reduce max_length
MAX_SCRAPE_LENGTH = 1000  # Instead of 2000
```

### Issue: Slow response time

**Symptom:** Takes too long to respond

**Solutions:**
1. Reduce number of results: `MAX_WEB_RESULTS = 3`
2. Reduce scrape length: `MAX_SCRAPE_LENGTH = 1000`
3. Increase cache TTL: `CACHE_TTL_SECONDS = 7200`

## Testing

### Test the Implementation

```bash
# Start the server
python main.py

# Ask a question via client
# Check logs for scraping activity
```

**Expected Logs:**
```
🔍 Web search keywords: kasambahay domestic worker
✅ Found 5 web search results
📄 Scraping content from 5 web pages...
✅ Completed scraping 5 web pages
✅ Added 5 web search results with scraped content to context
```

### Verify Content Quality

1. Ask a legal question
2. Check the response for detailed information
3. Verify sources are cited with URLs
4. Confirm answer includes specific legal provisions

## Future Enhancements

### 1. Parallel Scraping
```python
import asyncio
import aiohttp

async def scrape_all_pages(urls):
    # Scrape multiple pages simultaneously
    # Reduce total time from 5s to 1-2s
```

### 2. Smart Content Selection
```python
# Extract only relevant sections
def extract_relevant_section(content, query):
    # Use NLP to find most relevant paragraphs
    # Reduce content while maintaining quality
```

### 3. PDF Support
```python
# Handle PDF documents from search results
import PyPDF2

def scrape_pdf_content(url):
    # Extract text from PDF files
    # Common for legal documents
```

### 4. Image/Table Extraction
```python
# Extract tables and images
# Useful for legal forms and charts
```

## Summary

The web scraping implementation transforms the chatbot from using short snippets to reading **full webpage content**, resulting in:

- **Comprehensive answers** with complete legal information
- **Better accuracy** from more context
- **Recent information** from authoritative sources
- **Verifiable citations** with source URLs

All of this is **combined with Qdrant database** results to provide the best possible legal information to users! 🎉
