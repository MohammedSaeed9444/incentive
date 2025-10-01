# Use a slim Python base image
FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system deps (if needed in future). Keeping minimal for psycopg2-binary
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Set workdir at repo root, then copy only backend first to leverage layer caching
WORKDIR /app

# Copy backend requirements and install
COPY driver-incentive-backend/requirements.txt /app/driver-incentive-backend/requirements.txt
RUN pip install --no-cache-dir -r /app/driver-incentive-backend/requirements.txt

# Copy backend source
COPY driver-incentive-backend /app/driver-incentive-backend

# Optional: copy frontend build into backend static if you plan to serve it
# COPY driver-incentive-frontend/dist /app/driver-incentive-backend/src/static

# Set environment variables
ENV PORT=5000 \
    PYTHONPATH=/app/driver-incentive-backend

# Expose the port Railway will bind to
EXPOSE 5000

# Set working directory to backend for relative paths in code
WORKDIR /app/driver-incentive-backend

# Default command uses gunicorn with the app defined in src.main:app
CMD sh -c "gunicorn -w 3 -k gthread -t 120 -b 0.0.0.0:\${PORT:-5000} src.main:app"
