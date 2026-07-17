# backend/Dockerfile
FROM python:3.10-slim

# Install system deps required by OpenCV/Pillow and builds
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Create app dir
WORKDIR /app

# Copy requirements and backend source
COPY backend/requirements.txt /app/requirements.txt
COPY backend /app

# Upgrade pip
RUN python -m pip install --upgrade pip

# Install Python deps (tensorflow-cpu wheel for Python 3.10 will be used)
RUN pip install --no-cache-dir -r requirements.txt

# Expose port and default env
ENV PORT 5000
EXPOSE 5000

# Run with gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app", "--workers", "1", "--threads", "4"]
