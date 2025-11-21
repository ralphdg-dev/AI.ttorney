# Use Python 3.12 slim image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Copy requirements
COPY server/requirements.txt ./

# Install Python dependencies
# Install everything except beautifulsoup4 first, then install bs4 without lxml
RUN pip install --no-cache-dir --upgrade pip && \
    grep -v "beautifulsoup4" requirements.txt > /tmp/requirements_no_bs4.txt && \
    pip install --no-cache-dir -r /tmp/requirements_no_bs4.txt && \
    pip install --no-cache-dir beautifulsoup4 soupsieve

# Copy server code
COPY server/ .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Start command - Railway provides PORT env var
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
