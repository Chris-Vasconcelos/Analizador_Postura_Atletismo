FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libportaudio2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements-analysis.txt ./
RUN python -m pip install --no-cache-dir --requirement requirements-analysis.txt
COPY src/ ./src/

RUN mkdir -p /data/output && chown 10001:10001 /data/output
USER 10001:10001
ENTRYPOINT ["python", "-m", "src.cli"]
CMD ["--help"]
