# Source Filtering - Display Only Authoritative Philippine Legal Sources

## Overview

The chatbot UI now **filters and displays only sources from authoritative Philippine legal websites**, hiding other sources from the user interface while still using them in the backend for better answers.

## What Changed

### Before
```
Legal Sources:
- PEOPLES-LAW.ORG (displayed)
- MDCOURTS.GOV (displayed)
- Official Gazette (displayed)
- LawPhil (displayed)
- Random websites (displayed)
```
❌ Shows all sources, including non-Philippine sources
❌ Cluttered UI with irrelevant sources

### After
```
Legal Sources:
- Official Gazette (displayed ✅)
- LawPhil (displayed ✅)
- Supreme Court (displayed ✅)
- E-Library Judiciary (displayed ✅)
- PEOPLES-LAW.ORG (hidden, but still used by LLM)
- MDCOURTS.GOV (hidden, but still used by LLM)
```
✅ Only shows authoritative Philippine legal sources
✅ Clean, professional UI
✅ Backend still uses all sources for better answers

## How It Works

### Frontend Filtering (Client-Side)

**Location:** `client/app/chatbot.tsx` (lines 1310-1422)

```typescript
// Filter sources to only show authoritative Philippine legal sources
const authoritativeDomains = [
  'officialgazette.gov.ph',
  'lawphil.net',
  'sc.judiciary.gov.ph',
  'elibrary.judiciary.gov.ph'
];

const filteredSources = item.sources.filter((source) => {
  // Check if source_url contains any of the authoritative domains
  if (source.source_url) {
    return authoritativeDomains.some(domain => 
      source.source_url!.toLowerCase().includes(domain)
    );
  }
  // Also check the 'law' field for these sources
  const lawLower = source.law.toLowerCase();
  return authoritativeDomains.some(domain => lawLower.includes(domain));
});

// Only render if we have filtered sources
if (filteredSources.length === 0) return null;
```

### Backend (No Changes)

The backend still:
1. ✅ Searches all sources (Qdrant + Web)
2. ✅ Scrapes content from all websites
3. ✅ Provides all sources to the LLM
4. ✅ Returns all sources in the API response

**Why?** The LLM needs comprehensive information to generate accurate answers, even if some sources aren't displayed to the user.

## Authoritative Domains

### Official Gazette
- **Domain:** `officialgazette.gov.ph`
- **Description:** Official government publication for laws, executive orders, and proclamations
- **Example:** https://www.officialgazette.gov.ph/downloads/2013/01jan/20130118-RA-10361-BSA.pdf

### LawPhil
- **Domain:** `lawphil.net`
- **Description:** Comprehensive Philippine law database with Supreme Court decisions
- **Example:** https://lawphil.net/statutes/repacts/ra2013/ra_10361_2013.html

### Supreme Court
- **Domain:** `sc.judiciary.gov.ph`
- **Description:** Official Supreme Court of the Philippines website
- **Example:** https://sc.judiciary.gov.ph/decisions/

### E-Library Judiciary
- **Domain:** `elibrary.judiciary.gov.ph`
- **Description:** Judiciary's electronic library with legal resources
- **Example:** https://elibrary.judiciary.gov.ph/

## User Experience

### What Users See

**Before Filtering:**
```
Legal Sources

PEOPLES-LAW.ORG
Article Web Result 1
Evictions | The Maryland People's Law Library
View full source
Relevance: 0%

MDCOURTS.GOV
Article Web Result 2
...
View full source
Relevance: 0%

OFFICIALGAZETTE.GOV.PH
Article Web Result 3
Republic Act No. 10361 - Kasambahay Law
View full source
Relevance: 0%
```

**After Filtering:**
```
Legal Sources

OFFICIALGAZETTE.GOV.PH
Article Web Result 3
Republic Act No. 10361 - Kasambahay Law
View full source
Relevance: 0%

LAWPHIL.NET
Article Web Result 4
Domestic Workers Act - Full Text
View full source
Relevance: 0%
```

### What Happens Behind the Scenes

1. **Backend sends all sources:**
   ```json
   {
     "sources": [
       { "law": "peoples-law.org", "url": "..." },
       { "law": "mdcourts.gov", "url": "..." },
       { "law": "officialgazette.gov.ph", "url": "..." },
       { "law": "lawphil.net", "url": "..." }
     ]
   }
   ```

2. **Frontend filters sources:**
   ```javascript
   filteredSources = [
     { "law": "officialgazette.gov.ph", "url": "..." },
     { "law": "lawphil.net", "url": "..." }
   ]
   ```

3. **UI displays only filtered sources:**
   - Official Gazette ✅
   - LawPhil ✅
   - (peoples-law.org hidden)
   - (mdcourts.gov hidden)

## Benefits

### ✅ Professional Appearance
- Only shows Philippine legal sources
- Builds trust with users
- Looks more authoritative

### ✅ Reduced Clutter
- Fewer sources displayed
- Easier to read
- Better UX

### ✅ Still Comprehensive
- Backend uses all sources
- LLM has full context
- Better answer quality

### ✅ Flexible
- Easy to add/remove domains
- No backend changes needed
- Can be toggled on/off

## Configuration

### Adding New Authoritative Domains

**Location:** `client/app/chatbot.tsx` (line 1312)

```typescript
const authoritativeDomains = [
  'officialgazette.gov.ph',
  'lawphil.net',
  'sc.judiciary.gov.ph',
  'elibrary.judiciary.gov.ph',
  'chanrobles.com',  // Add this
  'supremecourt.gov.ph'  // Add this
];
```

### Removing Domains

Simply remove the domain from the array:

```typescript
const authoritativeDomains = [
  'officialgazette.gov.ph',
  'lawphil.net',
  // 'sc.judiciary.gov.ph',  // Removed
  'elibrary.judiciary.gov.ph'
];
```

### Disabling Filtering (Show All Sources)

Comment out the filtering logic:

```typescript
// const filteredSources = item.sources.filter(...);
const filteredSources = item.sources;  // Show all sources
```

## Edge Cases

### No Authoritative Sources Found

**Scenario:** Backend returns sources, but none match authoritative domains

**Behavior:** 
```typescript
if (filteredSources.length === 0) return null;
```
- "Legal Sources" section is hidden
- No error shown to user
- Answer is still displayed (from LLM)

**Example:**
```
User asks: "What is the law in California?"
Backend: Returns California legal sources
Frontend: Filters them out (not Philippine sources)
Result: No sources displayed, but answer is still shown
```

### Mixed Sources

**Scenario:** Backend returns both authoritative and non-authoritative sources

**Behavior:**
- Only authoritative sources displayed
- Non-authoritative sources hidden
- LLM used all sources for the answer

**Example:**
```
Backend returns:
1. Official Gazette (authoritative) ✅
2. Random blog (non-authoritative) ❌
3. LawPhil (authoritative) ✅
4. Wikipedia (non-authoritative) ❌

Frontend displays:
1. Official Gazette ✅
3. LawPhil ✅
```

### Qdrant Sources

**Scenario:** Sources from Qdrant database (not web search)

**Behavior:**
- Checked against `source_url` field
- If no URL, checked against `law` field
- Displayed if matches authoritative domains

**Example:**
```typescript
// Qdrant source with URL
{
  "law": "Labor Code",
  "source_url": "https://lawphil.net/statutes/labor_code.html"
}
// ✅ Displayed (lawphil.net)

// Qdrant source without URL
{
  "law": "Labor Code",
  "source_url": null
}
// ❌ Hidden (no matching domain in 'law' field)
```

## Testing

### Test Cases

**1. Test with Philippine legal query:**
```
Query: "What are kasambahay rights?"
Expected: Shows Official Gazette, LawPhil sources
```

**2. Test with non-Philippine query:**
```
Query: "What is the law in California?"
Expected: No sources displayed (all filtered out)
```

**3. Test with mixed sources:**
```
Query: "Labor law in the Philippines"
Expected: Shows only Philippine authoritative sources
```

**4. Test with Qdrant sources:**
```
Query: "Article 279 Labor Code"
Expected: Shows Qdrant sources if they have lawphil.net URLs
```

### Manual Testing

1. **Start the app:**
   ```bash
   cd client
   npm start
   ```

2. **Ask a legal question:**
   - "What are kasambahay rights?"
   - "How to file a labor case?"

3. **Check the sources section:**
   - Should only show Official Gazette, LawPhil, etc.
   - Should NOT show peoples-law.org, mdcourts.gov, etc.

4. **Verify answer quality:**
   - Answer should still be comprehensive
   - Should reference information from all sources (including hidden ones)

## Troubleshooting

### Issue: No sources displayed

**Possible Causes:**
1. No authoritative sources in backend response
2. Domain names don't match filter
3. Filtering logic too strict

**Solutions:**
1. Check backend logs for web search results
2. Verify domain names in `authoritativeDomains` array
3. Add more domains or adjust filtering logic

### Issue: Wrong sources displayed

**Possible Causes:**
1. Domain name partially matches
2. Case sensitivity issue
3. URL structure different than expected

**Solutions:**
1. Use exact domain matching
2. Ensure `.toLowerCase()` is used
3. Check actual URLs in backend response

### Issue: Sources still showing non-Philippine sites

**Possible Causes:**
1. Filtering not applied
2. Domain name in `authoritativeDomains` list
3. Caching issue

**Solutions:**
1. Verify filtering code is active
2. Check `authoritativeDomains` array
3. Clear app cache and reload

## Future Enhancements

### 1. User Preference Toggle

Allow users to show/hide all sources:

```typescript
const [showAllSources, setShowAllSources] = useState(false);

const displaySources = showAllSources 
  ? item.sources 
  : filteredSources;
```

### 2. Source Quality Indicator

Mark authoritative sources with a badge:

```typescript
{source.isAuthoritative && (
  <View style={tw`bg-green-500 px-2 py-1 rounded`}>
    <Text style={tw`text-white text-xs`}>Verified</Text>
  </View>
)}
```

### 3. Source Count Display

Show how many sources were filtered:

```typescript
<Text style={tw`text-xs text-gray-500`}>
  Showing {filteredSources.length} of {item.sources.length} sources
</Text>
```

### 4. Backend Filtering

Move filtering to backend for consistency:

```python
# In chatbot API
def filter_authoritative_sources(sources):
    authoritative_domains = [
        'officialgazette.gov.ph',
        'lawphil.net',
        'sc.judiciary.gov.ph',
        'elibrary.judiciary.gov.ph'
    ]
    return [s for s in sources if any(d in s['source_url'] for d in authoritative_domains)]
```

## Summary

The source filtering feature provides a **clean, professional UI** by displaying only authoritative Philippine legal sources, while the backend still uses all sources for comprehensive answers. This gives users:

- ✅ **Trust** - Only verified Philippine legal sources
- ✅ **Clarity** - Clean, uncluttered UI
- ✅ **Accuracy** - Comprehensive answers from all sources
- ✅ **Flexibility** - Easy to configure and extend

The filtering is **frontend-only**, so no backend changes are needed and the LLM still has access to all information for generating the best possible answers! 🎉
