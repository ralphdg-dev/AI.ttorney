# Use Python 3.12 slim image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install Python dependencies in stages (no requirements.txt to avoid lxml)
# Stage 1: Install core dependencies that definitely work
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir \
        supabase==2.21.1 python-dotenv==1.1.1 fastapi==0.118.0 uvicorn==0.32.1 \
        pydantic==2.10.3 httpx==0.28.1 email-validator==2.3.0 PyJWT==2.10.1 \
        python-multipart==0.0.20 googlemaps==4.10.0 cachetools==6.2.0 \
        openai==1.54.0 google-api-python-client==2.108.0 requests==2.31.0 \
        tqdm==4.66.1 "urllib3<2.0" "starlette>=0.27.0" slowapi==0.1.9 \
        limits==3.7.0 asgiref==3.8.1 jinja2>=3.1.0

# Stage 2: Install BeautifulSoup with only soupsieve (no lxml)
RUN pip install --no-cache-dir beautifulsoup4==4.12.3 "soupsieve>=2.5"

# Stage 3: Install numpy and qdrant (should work fine)
RUN pip install --no-cache-dir "numpy>=2.1.0" "qdrant-client>=1.15.1"

# Stage 4: Try ML packages, but don't fail the build if they need lxml
RUN set -e; \
    pip install --no-cache-dir "torch>=2.0.0" || true; \
    pip install --no-cache-dir "transformers>=4.30.0" || true; \
    pip install --no-cache-dir "peft>=0.4.0" || true; \
    pip install --no-cache-dir "guardrails-ai>=0.4.0" || true; \
    exit 0

# Copy server code
COPY server/ .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Start command - Railway provides PORT env var
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
