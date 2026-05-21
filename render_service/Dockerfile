FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 7860

CMD ["gunicorn", "main:app", "--bind", "0.0.0.0:7860", "--timeout", "120", "--workers", "1"]
