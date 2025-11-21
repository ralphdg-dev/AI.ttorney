FROM python:3.12-slim

WORKDIR /app

# Install core dependencies (no lxml needed)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
        supabase==2.21.1 python-dotenv==1.1.1 fastapi==0.118.0 uvicorn==0.32.1 \
        pydantic==2.10.3 httpx==0.28.1 email-validator==2.3.0 PyJWT==2.10.1 \
        python-multipart==0.0.20 googlemaps==4.10.0 cachetools==6.2.0 \
        openai==1.54.0 google-api-python-client==2.108.0 requests==2.31.0 \
        tqdm==4.66.1 "urllib3<2.0" slowapi==0.1.9 limits==3.7.0 asgiref==3.8.1 \
        jinja2>=3.1.0 beautifulsoup4==4.12.3 "soupsieve>=2.5" \
        "numpy>=2.1.0" "qdrant-client>=1.15.1"

# Install ML packages (optional - graceful degradation if they fail)
RUN pip install --no-cache-dir torch>=2.0.0 transformers>=4.30.0 peft>=0.4.0 guardrails-ai>=0.4.0 || \
    echo "Warning: Some ML packages failed to install. App will run without Guardrails AI."

COPY . .

EXPOSE 8000

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
