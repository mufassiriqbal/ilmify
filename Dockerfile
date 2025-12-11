# Ilmify - Offline Knowledge Server for Rural Schools
# Docker Configuration

FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Create necessary directories
RUN mkdir -p /app/content/textbooks \
    /app/content/videos \
    /app/content/health-guides \
    /app/portal/data \
    /app/uploads

# Set permissions
RUN chmod +x /app/server.py /app/indexer.py

# Generate initial metadata
RUN python indexer.py || true

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

# Run the server
CMD ["python", "server.py"]
