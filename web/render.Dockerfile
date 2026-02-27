# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY web/frontend/package*.json ./
RUN npm install
COPY web/frontend/ .
RUN npm run build

# Stage 2: Setup the backend and merge
FROM python:3.11-slim
WORKDIR /app

# Install standard dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/cache/*

# Copy requirements and install
COPY web/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY web/backend/ .

# Copy built frontend static files to backend/static
COPY --from=frontend-builder /app/dist ./static

# Expose the API port
EXPOSE 8899

# Start with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8899"]
