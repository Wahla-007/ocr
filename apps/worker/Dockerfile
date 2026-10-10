FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY providers/ /app/providers/
COPY apps/worker/ /app/apps/worker/
COPY prompts/ /app/prompts/
COPY schemas/ /app/schemas/

WORKDIR /app/apps/worker

RUN pip install --no-cache-dir -e /app/providers
RUN pip install --no-cache-dir -e .

CMD ["python", "-m", "worker.main"]
