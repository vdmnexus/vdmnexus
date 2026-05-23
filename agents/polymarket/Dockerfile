FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# uv for fast deterministic installs
RUN pip install --no-cache-dir uv

WORKDIR /app

# Install deps first to maximise layer cache hits.
COPY pyproject.toml README.md ./
RUN uv pip install --system .

# Then drop the package source in.
COPY polymarket_agent ./polymarket_agent
COPY prompt.md ./prompt.md

ENV PORT=8080
EXPOSE 8080

CMD ["python", "-m", "polymarket_agent", "serve"]
