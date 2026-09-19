FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    libgdal-dev \
    gdal-bin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY normalizer.py .
COPY llm_normalizer.py .
COPY server.py .

# Default entrypoint is the one-shot CLI loader (used by smoke-test.sh and manual
# loads). The etl_runner compose service overrides this with `python server.py`
# to run the long-lived HTTP runner instead.
ENTRYPOINT ["python", "normalizer.py"]
