# Legal Data Scrapers

## Overview
These scripts scrape Philippine legal documents from public sources for the AI.ttorney chatbot knowledge base.

## Scrapers

### 1. Consumer Act Scraper (`consumer_act_scraper.py`)
- **Source**: LawPhil - Republic Act No. 7394
- **Output**: `server/data/raw/consumer_act.json`
- **Topics**: Consumer Rights, Unfair Sales Practices
- **Run**: `python consumer_act_scraper.py`

### 2. Revised Penal Code Scraper (`revised_penal_code_scraper.py`)
- **Source**: Supreme Court E-Library
- **Output**: `server/data/raw/revised_penal_code.json`
- **Topics**: Self-Defense, Robbery, Theft, Estafa
- **Articles**: 11, 293-312, 315
- **Run**: `python revised_penal_code_scraper.py`

### 3. Family Law Scraper (`family_law_scraper.py`)
- **Source**: LawPhil - Family Code (E.O. 209) & RA 9262 (VAWC)
- **Output**: `server/data/raw/family_code.json`
- **Topics**: Marriage, Annulment, Child Custody, VAWC
- **Run**: `python family_law_scraper.py`

## Output Directory
All scrapers now save JSON files to: **`server/data/raw/`**

The directory is automatically created if it doesn't exist.

## Usage

### Run All Scrapers
```bash
cd server/scripts

# Scrape Consumer Act
python consumer_act_scraper.py

# Scrape Revised Penal Code
python revised_penal_code_scraper.py

# Scrape Family Law
python family_law_scraper.py
```

### Expected Output
```
server/
└── data/
    └── raw/
        ├── consumer_act.json
        ├── consumer_act.md
        ├── revised_penal_code.json
        ├── revised_penal_code.csv
        ├── revised_penal_code_stats.txt
        ├── family_code.json
        └── family_code.md
```

## Next Steps

After running the scrapers:

1. **Preprocess Data**:
   ```bash
   cd server/data
   python preprocess_data.py
   ```

2. **Generate Embeddings**:
   ```bash
   python generate_embeddings.py
   ```

3. **Start Chatbot**:
   ```bash
   cd server
   python main.py
   ```

## File Formats

### JSON Structure
All JSON files follow this structure:
```json
{
  "title": "Law Title",
  "description": "Law Description",
  "law": {...},
  "topics": {
    "Topic Name": [
      {
        "law": "Law Name",
        "type": "Article/Section",
        "number": "123",
        "title": "Article Title",
        "content": "Full article text...",
        "topic": "Topic Name",
        "hierarchy": {...}
      }
    ]
  },
  "statistics": {...},
  "metadata": {...}
}
```

## Requirements

```bash
pip install requests beautifulsoup4 pandas
```

## Disclaimer

These scripts scrape publicly available legal information for educational and research purposes only. They do not provide legal advice or create a lawyer-client relationship.

## Sources

- **LawPhil**: https://lawphil.net/
- **Supreme Court E-Library**: https://elibrary.judiciary.gov.ph/
