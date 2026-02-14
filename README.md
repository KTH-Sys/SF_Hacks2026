# SF_Hacks2026 - Barter (Full Stack)

Full-stack hackathon app for item-for-item trading.
Users create listings, browse a swipe deck, match on mutual interest, and chat in real time.

## Repository Layout

```
barter-backend/
├── core/                    # Config, security, FastAPI dependencies
├── models/                  # MongoDB document builders
├── routers/                 # API routers (auth, listings, swipes, matches, chat, ai)
├── schemas/                 # Pydantic request/response schemas
├── services/                # Matching logic, geo, Gemini, vision
├── websocket/               # WebSocket connection manager
├── main.py                  # FastAPI app entrypoint
├── database.py              # MongoDB client + indexes
├── requirements.txt         # Backend dependencies
├── start.sh                 # Backend bootstrap script
└── front-end/               # React + Vite frontend
    ├── src/
    ├── package.json
    └── vite.config.js
```

## Features

- JWT auth (register/login/profile)
- Listing CRUD
- Swipe deck with value/radius/category filters
- Match creation on mutual right swipe
- Match state flow (confirm/cancel)
- Real-time chat over WebSockets
- AI endpoints with Google Gemini (value estimate + listing description)
- Image classification with PyTorch

## Tech Stack

- Backend: FastAPI, MongoDB (Motor), Pydantic v2, JWT
- Frontend: React, React Router, Vite
- AI/Vision: Google Gemini SDK, PyTorch + torchvision

## Local Setup

### 1. Backend

```bash
cd /Users/kyawthiha/SF_Hacks2026/barter-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# fill in MONGODB_URL and GEMINI_API_KEY
python -m uvicorn main:app --reload --port 8000
```

Backend docs:
- Swagger: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 2. Frontend

```bash
cd /Users/kyawthiha/SF_Hacks2026/barter-backend/front-end
npm install
npm run dev
```

Frontend runs on Vite dev server (default http://localhost:5173).
API calls use `/api` and are proxied to `http://localhost:8000` via `front-end/vite.config.js`.

## Environment Variables

Backend `.env`:

- `MONGODB_URL`
- `DB_NAME`
- `JWT_SECRET_KEY`
- `JWT_ALGORITHM`
- `JWT_EXPIRE_MINUTES`
- `GEMINI_API_KEY`
- `VISION_ENABLED`

Do not commit `.env` files.

## Notes

- This repo intentionally keeps one top-level README for both backend and frontend.
- Frontend dependency/build output (`node_modules`, `dist`) is git-ignored.
