#!/bin/bash
# One-command local dev start for Barter backend
set -e

# Always run from the directory containing this script
cd "$(dirname "$0")"

# Create venv if missing
if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate

# Install / sync dependencies
pip install -q -r requirements.txt

# Copy env file if missing
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ""
  echo "⚠️  Created .env from .env.example"
  echo "   Set MONGODB_URL and GEMINI_API_KEY before running again."
  exit 1
fi

echo ""
echo "✅ Starting Barter API on http://localhost:8000"
echo "   Swagger docs: http://localhost:8000/docs"
echo ""
python -m uvicorn main:app --reload --port 8000
