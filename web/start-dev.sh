#!/usr/bin/env bash
# Quick development start script for nanobot web management tool
# Usage: ./start-dev.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🐈 nanobot Web Management — Development Mode${NC}\n"

# Backend
echo -e "${GREEN}Starting backend...${NC}"
cd "$(dirname "$0")/backend"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt

echo "Starting FastAPI on :8899..."
uvicorn main:app --host 0.0.0.0 --port 8899 --reload &
BACKEND_PID=$!
cd ..

# Frontend
echo -e "${GREEN}Starting frontend...${NC}"
cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

echo "Starting Vite dev server on :5173..."
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "\n${GREEN}✓ Services started!${NC}"
echo -e "  Frontend:  ${BLUE}http://localhost:5173${NC}"
echo -e "  Backend:   ${BLUE}http://localhost:8899${NC}"
echo -e "  API docs:  ${BLUE}http://localhost:8899/docs${NC}\n"

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo -e '${RED}Stopped.${NC}'" EXIT

wait
