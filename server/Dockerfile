FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

# Install core dependencies from requirements.txt (excluding ML packages)
RUN pip install --no-cache-dir --upgrade pip && \
    grep -v -E "^(torch|transformers|peft|guardrails-ai)" requirements.txt | \
    pip install --no-cache-dir -r /dev/stdin

# Install ML packages (optional - graceful degradation if they fail)
RUN pip install --no-cache-dir torch>=2.0.0 transformers>=4.30.0 peft>=0.4.0 guardrails-ai>=0.4.0 || \
    echo "Warning: Some ML packages failed to install. App will run without Guardrails AI."

COPY . .

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
