# syntax=docker/dockerfile:1

FROM python:3.13-slim AS base
WORKDIR /app

# Builder stage: install dependencies in a venv
FROM base AS builder

# Copy requirements.txt if present, else fallback to requirements.in or pyproject.toml
# (Assume requirements.txt is present in the same directory as run_visit_qa.py)
COPY --link requirements.txt ./

# Create virtual environment and install dependencies
RUN --mount=type=cache,target=/root/.cache/pip \
    python -m venv .venv && \
    .venv/bin/pip install --upgrade pip && \
    .venv/bin/pip install -r requirements.txt

# Copy application code
COPY --link run_visit_qa.py ./

# Final stage: minimal runtime image
FROM base AS final
WORKDIR /app

# Create non-root user
RUN useradd -m dpmuser
USER dpmuser

# Copy venv and app code from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/run_visit_qa.py ./

# Set PATH to use venv
ENV PATH="/app/.venv/bin:$PATH"

# Default command
CMD ["python", "run_visit_qa.py"]
