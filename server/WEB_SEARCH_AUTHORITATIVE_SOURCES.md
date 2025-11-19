# Authoritative Source Prioritization in Web Search

## Overview

The web search service automatically includes authoritative Philippine legal sources in every search query to ensure high-quality, reliable results.

## Implementation

### Search Query Enhancement

When a user asks a legal question, the search query is automatically enhanced with:

**Original Query:**
```
"What are the requirements for annulment in the Philippines?"
```

**Enhanced Query (sent to Google):**
```
"What are the requirements for annulment in the Philippines? Philippine law (official gazette OR lawphil OR supreme court of the philippines)"
```

### Authoritative Sources Included

1. **Official Gazette** (`officialgazette.gov.ph`)
   - Official publication of the Philippine government
   - Contains all laws, executive orders, and proclamations
   - Most authoritative source for Philippine legislation

2. **LawPhil** (`lawphil.net`)
   - Comprehensive Philippine law database
   - Maintained by Arellano Law Foundation
   - Contains full text of laws, codes, and jurisprudence

3. **Supreme Court of the Philippines** (`sc.judiciary.gov.ph`)
   - Official Supreme Court website
   - Contains court decisions and jurisprudence
   - Primary source for case law

### How It Works

```python
# In web_search_service.py
enhanced_query = (
    f"{query} Philippine law "
    f"(official gazette OR lawphil OR supreme court of the philippines)"
)
```

**Google Search Operators Used:**
- `OR` - Matches any of the specified sources
- Parentheses - Groups the OR conditions
- Quotes - Not used to allow flexible matching

## Benefits

### ✅ Higher Quality Results
- Prioritizes official government sources
- Reduces low-quality or unreliable information
- Ensures legal accuracy

### ✅ Authoritative Citations
- Results come from trusted legal databases
- Users can verify information at the source
- Builds trust in the chatbot's responses

### ✅ Comprehensive Coverage
- Official Gazette: Current laws and legislation
- LawPhil: Historical legal documents
- Supreme Court: Recent jurisprudence and rulings

### ✅ Transparent to Users
- Enhancement happens behind the scenes
- Users don't see the technical query
- Logs show original user query for clarity

## Example Search Flow

### User Query
```
"What is the minimum wage in Metro Manila?"
```

### Step 1: Query Enhancement
```
Search query sent to Google:
"What is the minimum wage in Metro Manila? Philippine law (official gazette OR lawphil OR supreme court of the philippines)"
```

### Step 2: Results Retrieved
```
1. Official Gazette - Wage Order No. NCR-24
   URL: https://www.officialgazette.gov.ph/wage-order-ncr-24
   
2. DOLE - National Wages and Productivity Commission
   URL: https://nwpc.dole.gov.ph/wage-rates/
   
3. LawPhil - Republic Act No. 6727
   URL: https://lawphil.net/statutes/repacts/ra1989/ra_6727_1989.html
```

### Step 3: Context Building
```
=== PRIMARY SOURCES: WEB SEARCH (Most Recent & Comprehensive) ===

[Web Source 1: Wage Order No. NCR-24 - Official Gazette]
[URL: https://www.officialgazette.gov.ph/wage-order-ncr-24]
The current minimum wage in Metro Manila is ₱610 per day...

[Web Source 2: NWPC Wage Rates]
[URL: https://nwpc.dole.gov.ph/wage-rates/]
Regional minimum wage rates are set by the Regional Tripartite...
```

## Logging

### User-Facing Log
```
🔍 Performing web search: What is the minimum wage in Metro Manila?...
```

### Debug Log (if enabled)
```
   Enhanced query: What is the minimum wage in Metro Manila? Philippine law (official gazette OR lawphil OR supreme court of the philippines)...
```

**Note:** The enhanced query is only shown in debug logs, not in regular info logs, to keep user-facing logs clean.

## Configuration

### Location
`server/services/web_search_service.py`

### Code Section
```python
# Line 117-122
enhanced_query = (
    f"{query} Philippine law "
    f"(official gazette OR lawphil OR supreme court of the philippines)"
)
```

### Modifying Sources

To add or change authoritative sources:

```python
# Example: Add more sources
enhanced_query = (
    f"{query} Philippine law "
    f"(official gazette OR lawphil OR supreme court of the philippines "
    f"OR chanrobles.com OR congress.gov.ph)"
)
```

**Recommended Sources:**
- `official gazette` - Government publications
- `lawphil` - Legal database
- `supreme court of the philippines` - Court decisions
- `chanrobles.com` - Legal resources
- `congress.gov.ph` - Legislative information
- `dole.gov.ph` - Labor laws (for labor queries)

## Testing

### Test the Enhancement

1. **Run the test script:**
   ```bash
   python test_google_api.py
   ```

2. **Check the logs:**
   ```
   🔍 Performing web search: Philippine labor law...
   ```

3. **Verify results include authoritative sources:**
   - Look for `officialgazette.gov.ph` URLs
   - Look for `lawphil.net` URLs
   - Look for `sc.judiciary.gov.ph` URLs

### Manual Test

```bash
curl -X POST http://localhost:8000/api/chatbot/user/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the retirement age in the Philippines?",
    "max_tokens": 500
  }'
```

**Expected:** Response should cite Official Gazette, LawPhil, or Supreme Court sources.

## Performance Impact

### Minimal Impact
- Query enhancement happens instantly (string concatenation)
- No additional API calls
- Same response time as regular search

### Cache Efficiency
- Cache key includes original query only
- Enhanced query not part of cache key
- Changing enhancement doesn't invalidate cache

## Best Practices

### ✅ Do
- Keep source list focused on most authoritative sites
- Use OR operator for flexibility
- Log original query for user clarity
- Test with various legal topics

### ❌ Don't
- Don't add too many sources (reduces relevance)
- Don't use AND operator (too restrictive)
- Don't show enhanced query to users
- Don't hardcode domain-specific sources in general search

## Future Enhancements

### Potential Improvements

1. **Topic-Specific Sources**
   ```python
   if "labor" in query.lower():
       sources = "dole.gov.ph OR nlrc.dole.gov.ph"
   elif "criminal" in query.lower():
       sources = "supreme court OR court of appeals"
   ```

2. **Source Weighting**
   - Use Google's `site:` operator for stronger prioritization
   - Example: `site:officialgazette.gov.ph OR site:lawphil.net`

3. **Dynamic Source Selection**
   - Analyze query to determine best sources
   - Adapt based on legal domain (civil, criminal, labor, etc.)

4. **Source Quality Scoring**
   - Rank results by source authority
   - Prioritize Official Gazette > LawPhil > Others

## Troubleshooting

### Issue: Not getting authoritative sources

**Possible Causes:**
1. Sources don't have relevant content
2. Query too specific or too broad
3. Google ranking other results higher

**Solutions:**
1. Check if sources actually cover the topic
2. Adjust query phrasing
3. Use `site:` operator for stronger prioritization

### Issue: Too restrictive results

**Symptom:** Very few or no results returned

**Solution:**
- Remove some sources from OR list
- Make query more general
- Check if sources are accessible

## Monitoring

### Metrics to Track

1. **Source Distribution**
   - % of results from Official Gazette
   - % of results from LawPhil
   - % of results from Supreme Court
   - % of results from other sources

2. **Result Quality**
   - User satisfaction with responses
   - Accuracy of legal information
   - Citation reliability

3. **Performance**
   - Search response time
   - Cache hit rate
   - API quota usage

## Summary

The web search service automatically enhances every query with authoritative Philippine legal sources, ensuring users receive high-quality, reliable legal information without any additional configuration or user input. This happens transparently behind the scenes while maintaining clean, user-friendly logs.
