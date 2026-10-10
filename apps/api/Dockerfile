FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# System packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy packages
COPY providers/ /app/providers/
COPY apps/api/ /app/apps/api/
COPY prompts/ /app/prompts/
COPY schemas/ /app/schemas/

WORKDIR /app/apps/api

# Install dependencies
RUN pip install --no-cache-dir -e /app/providers
RUN pip install --no-cache-dir -e .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
