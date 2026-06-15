FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

WORKDIR /app

# System libraries needed by OpenCV (headless), Pillow and pytesseract (OCR).
RUN apt-get update && apt-get install -y --no-install-recommends \
      tesseract-ocr \
      libglib2.0-0 \
      libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Base (free-tier) deps + GCP deps. GCP libs live in a separate file so the
# Render deployment can keep using requirements.txt alone.
COPY requirements.txt requirements-gcp.txt ./
RUN pip install --upgrade pip \
    && pip install -r requirements.txt \
    && pip install -r requirements-gcp.txt

COPY . .

# Cloud Run injects $PORT (default 8080); bind to it.
EXPOSE 8080
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT}
