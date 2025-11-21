FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

# Install all dependencies from requirements.txt
# Note: ML packages (torch, transformers, etc.) are 2-3GB and will take 10-20 minutes
RUN echo "📦 Installing all dependencies (this may take 15-20 minutes for ML packages)..." && \
    pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --verbose -r requirements.txt && \
    echo "✅ All dependencies installed successfully"

COPY . .

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
