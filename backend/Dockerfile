FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x start.sh

# Render injecte PORT (souvent 10000) — ne pas écouter uniquement 8000
ENV PORT=8000
EXPOSE 8000

CMD ["./start.sh"]
