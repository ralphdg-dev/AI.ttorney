# Keyword Extraction for Web Search

## Overview

The web search service now **extracts keywords** from user queries instead of using the full prompt. This creates more focused, efficient searches that return better results.

## Problem Solved

### Before
```
User: "ako ay isang kasambahay, pano ko kakasuhan ang amo ko"
Search: "ako ay isang kasambahay, pano ko kakasuhan ang amo ko Philippine law..."
```
❌ Long, conversational query with filler words
❌ Less focused search results
❌ May not match authoritative sources well

### After
```
User: "ako ay isang kasambahay, pano ko kakasuhan ang amo ko"
Keywords: kasambahay, domestic worker, how to, file a case, legal complaint
Search: "kasambahay domestic worker how to file a case legal complaint Philippine law..."
```
✅ Focused keywords only
✅ Better search results
✅ More relevant authoritative sources

## How It Works

### Step 1: Extract Keywords

The `extract_legal_keywords()` function analyzes the query and extracts:

1. **Legal Terms** - Recognizes Filipino and English legal terms
2. **Action Intent** - Identifies what the user wants to do (how to, where to, etc.)
3. **Context Phrases** - Adds relevant legal phrases based on context

### Step 2: Build Search Query

Keywords are combined into a focused search query:
```python
keyword_query = "kasambahay domestic worker how to file a case"
```

### Step 3: Enhance with Sources

Authoritative sources are added:
```python
enhanced_query = (
    f"{keyword_query} Philippine law "
    f"(official gazette OR lawphil OR supreme court of the philippines)"
)
```

## Keyword Mapping

### Labor/Employment Terms

| Filipino | English Keywords |
|----------|------------------|
| kasambahay | kasambahay, domestic worker, household worker |
| trabaho | employment, work, labor |
| amo | employer, boss |
| sweldo | salary, wage, compensation |
| tanggal | termination, dismissal, fired |
| resign | resignation, quit |

### Family Law Terms

| Filipino | English Keywords |
|----------|------------------|
| asawa | spouse, husband, wife, marriage |
| diborsyo | divorce, annulment, separation |
| anak | child, children, custody |
| mana | inheritance, estate, heir |

### Criminal Law Terms

| Filipino | English Keywords |
|----------|------------------|
| kaso | case, lawsuit, complaint |
| demanda | sue, file case, legal action |
| krimen | crime, criminal, offense |
| pulis | police, law enforcement |
| huli | arrest, detained |

### Civil/Property Terms

| Filipino | English Keywords |
|----------|------------------|
| lupa | land, property, real estate |
| bahay | house, home, residence |
| utang | debt, loan, obligation |
| kontrata | contract, agreement |

### Rights and Protections

| Filipino | English Keywords |
|----------|------------------|
| karapatan | rights, legal rights |
| proteksyon | protection, safeguards |
| abuso | abuse, violation, mistreatment |
| diskriminasyon | discrimination |

## Action Intent Detection

| Filipino | English Intent |
|----------|----------------|
| pano, paano | how to |
| saan | where to |
| kailan | when to |
| magkano | how much |
| ano | what is |
| pwede, maaari | can I |
| kailangan | requirements |
| dapat | must |

## Context-Based Phrases

The system automatically adds relevant phrases based on query context:

### Filing Cases
If query contains: `kaso`, `demanda`, `kasuhan`
Adds: `file a case`, `legal complaint`, `how to sue`

### Rights and Protections
If query contains: `karapatan`, `proteksyon`
Adds: `legal rights`, `protections`

### Abuse/Violations
If query contains: `abuso`, `abusive`, `mali`
Adds: `abuse`, `violation`, `illegal`

## Examples

### Example 1: Kasambahay Rights

**User Query:**
```
"ako ay isang kasambahay, pano ko kakasuhan ang amo ko"
```

**Extracted Keywords:**
1. kasambahay
2. domestic worker
3. how to
4. file a case
5. legal complaint

**Search Query:**
```
kasambahay domestic worker how to file a case legal complaint Philippine law (official gazette OR lawphil OR supreme court of the philippines)
```

### Example 2: Employment Termination

**User Query:**
```
"Pwede ba akong tanggalin ng walang dahilan?"
```

**Extracted Keywords:**
1. can I
2. termination
3. dismissal

**Search Query:**
```
can I termination dismissal Philippine law (official gazette OR lawphil OR supreme court of the philippines)
```

### Example 3: Annulment

**User Query:**
```
"What are the requirements for annulment in the Philippines?"
```

**Extracted Keywords:**
1. requirements
2. divorce
3. annulment

**Search Query:**
```
requirements divorce annulment Philippine law (official gazette OR lawphil OR supreme court of the philippines)
```

## Fallback Mechanism

If no keywords are extracted, the system uses a simplified version of the query:

1. **Remove filler words**: `ako`, `ang`, `mga`, `para`, `kung`, `that`, `this`, `with`
2. **Keep words > 3 characters**
3. **Limit to 5 words**

**Example:**
```
Query: "this is about my contract with employer"
Fallback: "about contract employer"
```

## Logging

### User-Facing Log
```
🔍 Web search keywords: kasambahay domestic worker how to file a case
```

### Debug Logs (optional)
```
   Original query: ako ay isang kasambahay, pano ko kakasuhan ang amo ko
   Enhanced query: kasambahay domestic worker how to file a case legal complaint Philippine law...
```

## Benefits

### ✅ More Focused Results
- Removes conversational filler
- Targets specific legal concepts
- Better matches authoritative sources

### ✅ Better Performance
- Shorter queries = faster searches
- More relevant results = better answers
- Reduced API costs (fewer irrelevant results)

### ✅ Bilingual Support
- Handles Filipino and English queries
- Translates Filipino terms to English
- Maintains context and intent

### ✅ Context-Aware
- Understands legal domain (labor, family, criminal, etc.)
- Adds relevant phrases automatically
- Adapts to user intent

## Testing

### Run the Test Script

```bash
python test_keyword_extraction.py
```

**Expected Output:**
```
======================================================================
🔍 TESTING KEYWORD EXTRACTION
======================================================================

📝 Original Query:
   ako ay isang kasambahay, pano ko kakasuhan ang amo ko

🔑 Extracted Keywords:
   1. kasambahay
   2. domestic worker
   3. how to
   4. file a case
   5. legal complaint

🌐 Search Query:
   kasambahay domestic worker how to file a case legal complaint

📡 Enhanced Query (sent to Google):
   kasambahay domestic worker how to file a case legal complaint Philippine law (official gazette...
```

### Manual Testing

```bash
# Start the server
python main.py

# Ask a question via the client
# Check the logs for keyword extraction
```

**Look for:**
```
🔍 Web search keywords: kasambahay domestic worker how to
```

## Configuration

### Location
`server/services/web_search_service.py`

### Adding New Terms

To add new legal terms:

```python
legal_terms_map = {
    # Add your new term
    'new_term': ['english_equivalent_1', 'english_equivalent_2'],
    
    # Example: Adding "kontrata" (contract)
    'kontrata': ['contract', 'agreement', 'legal document'],
}
```

### Adding New Action Words

```python
action_words = {
    # Add your new action word
    'new_word': 'english_intent',
    
    # Example: Adding "gusto" (want)
    'gusto': 'want to',
}
```

### Adjusting Keyword Limit

```python
# Change from 5 to your desired number
return unique_keywords[:5]  # Return top 5 keywords
```

## Performance Impact

### Minimal Overhead
- Keyword extraction: < 1ms
- No additional API calls
- Same cache efficiency

### Better Results
- More relevant search results
- Higher quality sources
- Better LLM responses

## Monitoring

### Metrics to Track

1. **Keyword Extraction Rate**
   - % of queries with keywords extracted
   - % falling back to simplified query

2. **Search Quality**
   - Relevance of results
   - Source authority (Official Gazette, LawPhil, etc.)
   - User satisfaction

3. **Performance**
   - Keyword extraction time
   - Search response time
   - Cache hit rate

## Troubleshooting

### Issue: No keywords extracted

**Possible Causes:**
1. Query in unsupported language
2. No recognized legal terms
3. Very generic query

**Solutions:**
1. Add more terms to `legal_terms_map`
2. Improve fallback mechanism
3. Check query preprocessing

### Issue: Too many keywords

**Symptom:** Search query too long

**Solution:**
```python
# Reduce keyword limit
return unique_keywords[:3]  # Return top 3 instead of 5
```

### Issue: Wrong keywords extracted

**Symptom:** Irrelevant search results

**Solution:**
1. Review `legal_terms_map` for incorrect mappings
2. Adjust context-based phrase logic
3. Add more specific terms

## Future Enhancements

### 1. Machine Learning-Based Extraction
- Train model on legal queries
- Better context understanding
- Adaptive keyword selection

### 2. Domain-Specific Extraction
```python
if detect_domain(query) == "labor":
    use_labor_keywords()
elif detect_domain(query) == "family":
    use_family_keywords()
```

### 3. Query Expansion
- Add synonyms automatically
- Include related legal concepts
- Improve coverage

### 4. Multi-Language Support
- Support more Filipino dialects
- Handle code-switching better
- Improve translation accuracy

## Summary

The keyword extraction system transforms conversational user queries into focused search terms, resulting in:

- **Better search results** from authoritative sources
- **Faster searches** with shorter queries
- **Bilingual support** for Filipino and English
- **Context-aware** extraction based on legal domain

All of this happens **transparently** behind the scenes while maintaining clean, user-friendly logs.
