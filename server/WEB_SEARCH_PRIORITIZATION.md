# Web Search Prioritization Implementation

## Overview

The chatbot now **prioritizes web search results over Qdrant database results** when generating responses. This ensures users get the most recent and comprehensive legal information available.

## Changes Made

### 1. RAG Context Ordering (`utils/rag_utils.py`)

**Before:**
```python
# Qdrant results first, web search second
all_context_parts = qdrant_context_parts + web_context_parts
all_sources = qdrant_sources + web_sources
```

**After:**
```python
# Web search results FIRST, Qdrant second
all_context_parts = web_context_parts + qdrant_context_parts
all_sources = web_sources + qdrant_sources
```

**Context Labels:**
```
=== PRIMARY SOURCES: WEB SEARCH (Most Recent & Comprehensive) ===
[Web search results here]

=== SUPPLEMENTARY SOURCES: LEGAL DATABASE (Additional Context) ===
[Qdrant database results here]
```

### 2. System Prompts Updated

#### Lawyer Chatbot (`api/chatbot_lawyer.py`)

**English Prompt:**
```
IMPORTANT: When multiple sources are provided, PRIORITIZE WEB SEARCH SOURCES 
over database sources. Web search results are more recent, comprehensive, and 
should be given greater weight in your analysis. Database sources should be 
used as supplementary context only.
```

**Tagalog Prompt:**
```
MAHALAGA: Kapag may maraming sources na ibinigay, UNAHIN ang WEB SEARCH SOURCES 
kaysa database sources. Ang mga resulta ng web search ay mas bago, komprehensibo, 
at dapat bigyan ng mas malaking timbang sa iyong pagsusuri. Ang database sources 
ay dapat gamitin lamang bilang supplementary context.
```

#### User Chatbot (`config/system_prompts.py`)

**English Prompt:**
```
IMPORTANT SOURCE PRIORITIZATION: When multiple sources are provided, PRIORITIZE 
WEB SEARCH SOURCES over database sources. Web search results are more recent, 
comprehensive, and should be given greater weight in your analysis. Database 
sources should be used as supplementary context only.
```

**Tagalog Prompt:**
```
MAHALAGANG PAGPILI NG SOURCES: Kapag may maraming sources na ibinigay, UNAHIN 
ang WEB SEARCH SOURCES kaysa database sources. Ang mga resulta ng web search 
ay mas bago, komprehensibo, at dapat bigyan ng mas malaking timbang sa iyong 
pagsusuri. Ang database sources ay dapat gamitin lamang bilang supplementary context.
```

## How It Works

### Search Flow

1. **User asks a legal question**
2. **Qdrant search** (vector database)
   - Retrieves relevant legal documents
   - Calculates confidence score
3. **Web search trigger** (if confidence < 0.8)
   - Searches Google for recent information
   - Gets 5 web results with snippets
4. **Context building** (prioritized order)
   - ✅ **Web search results FIRST** (primary sources)
   - ✅ **Qdrant results SECOND** (supplementary)
5. **LLM generation**
   - Sees web search results first
   - Gives them more weight in analysis
   - Uses Qdrant as additional context

### Example Context Structure

```
=== PRIMARY SOURCES: WEB SEARCH (Most Recent & Comprehensive) ===

[Web Source 1: Labor Law Updates - DOL Website]
[URL: https://www.dole.gov.ph/labor-code-updates]
Recent amendments to the Labor Code include...

[Web Source 2: Supreme Court Ruling 2024]
[URL: https://sc.judiciary.gov.ph/ruling-2024]
The Supreme Court ruled that...

=== SUPPLEMENTARY SOURCES: LEGAL DATABASE (Additional Context) ===

[Qdrant Source 1: Labor Code - Article 279]
[URL: https://lawphil.net/statutes/labor-code]
Regular employment shall be deemed to exist...

[Qdrant Source 2: Civil Code - Article 1156]
An obligation is a juridical necessity...
```

## Benefits

### ✅ More Recent Information
- Web search provides the latest legal updates
- Catches recent Supreme Court rulings
- Includes new legislation and amendments

### ✅ Comprehensive Coverage
- Broader range of sources
- Multiple perspectives on legal issues
- Real-world applications and examples

### ✅ Better Accuracy
- LLM prioritizes most recent information
- Reduces reliance on potentially outdated database
- Combines best of both worlds (web + database)

## Confidence Threshold

**Current Setting: 0.8**

| Qdrant Score | Behavior | Sources Priority |
|--------------|----------|------------------|
| ≥ 0.8 | High confidence | Qdrant only |
| < 0.8 | Low confidence | **Web (primary)** + Qdrant (supplementary) |
| 0 results | No matches | Web only |

## Testing

### Verify Prioritization

1. **Start the server:**
   ```bash
   python main.py
   ```

2. **Ask a legal question** (via API or client)

3. **Check the logs:**
   ```
   🌐 Web search triggered: hybrid
   📊 Qdrant: 3, Web: 5
   📦 Context built: 3 Qdrant + 5 Web = 8 total sources
   ```

4. **Verify response sources:**
   - Web search results should appear first
   - Should be cited more prominently
   - Qdrant results as supplementary

### Example Test Query

```bash
curl -X POST http://localhost:8000/api/chatbot/user/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the latest labor law updates in the Philippines?",
    "max_tokens": 500
  }'
```

**Expected Behavior:**
- Web search triggered (recent topic)
- Response cites web sources first
- Qdrant sources mentioned as additional context

## Files Modified

1. ✅ `server/utils/rag_utils.py`
   - Reversed context order (web first)
   - Updated context labels

2. ✅ `server/api/chatbot_lawyer.py`
   - Added prioritization to English prompt
   - Added prioritization to Tagalog prompt

3. ✅ `server/config/system_prompts.py`
   - Added prioritization to user English prompt
   - Added prioritization to user Tagalog prompt

4. ✅ `server/services/web_search_service.py`
   - Confidence threshold: 0.8

## Monitoring

### Log Messages to Watch

```
✅ Added 5 web search results to context
📦 Context built: 3 Qdrant + 5 Web = 8 total sources
🌐 Web search triggered: hybrid
```

### Response Quality Indicators

- Web sources cited first in response
- More recent information in answers
- Better coverage of current legal issues
- Qdrant sources as supporting evidence

## Rollback (if needed)

To revert to Qdrant-first prioritization:

1. **Edit `utils/rag_utils.py`:**
   ```python
   # Change this:
   all_context_parts = web_context_parts + qdrant_context_parts
   
   # Back to:
   all_context_parts = qdrant_context_parts + web_context_parts
   ```

2. **Update context labels:**
   ```python
   "=== LEGAL DATABASE SOURCES ===\n\n" +
   "\n\n".join(qdrant_context_parts) +
   "\n\n=== WEB SEARCH SOURCES ===\n\n" +
   "\n\n".join(web_context_parts)
   ```

3. **Remove prioritization instructions from prompts**

## Next Steps

1. ✅ Monitor response quality
2. ✅ Gather user feedback
3. ✅ Adjust confidence threshold if needed
4. ✅ Fine-tune web search queries
5. ✅ Optimize caching strategy

## Support

If you notice issues:
- Check logs for web search triggers
- Verify API credentials are working
- Monitor response quality and accuracy
- Adjust confidence threshold if needed (in `web_search_service.py`)
