# Barter Backend

FastAPI backend for Barter — "Tinder for Used Product Trade."

## Quick Start

```bash
# 1. Clone and enter the directory
cd swapr-backend

# 2. Create virtual environment
python3 -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env if needed (defaults work for local dev)

# 5. Start the server
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs
ReDoc:    http://localhost:8000/redoc

---

## Project Structure

```
barter-backend/
├── main.py                   # App entry point, router registration
├── database.py               # SQLAlchemy engine + session
├── requirements.txt
├── .env.example
│
├── core/
│   ├── config.py             # Settings (pydantic-settings)
│   ├── security.py           # JWT + bcrypt helpers
│   └── dependencies.py       # FastAPI dependency: get_current_user
│
├── models/                   # SQLAlchemy ORM models
│   ├── user.py
│   ├── listing.py
│   ├── swipe.py
│   ├── match.py
│   └── message.py
│
├── schemas/                  # Pydantic request/response schemas
│   ├── user.py
│   ├── listing.py
│   ├── swipe.py
│   ├── match.py
│   └── message.py
│
├── routers/                  # FastAPI route handlers
│   ├── auth.py               # POST /auth/register, /auth/login, GET /auth/me
│   ├── listings.py           # CRUD + GET /listings/deck
│   ├── swipes.py             # POST /swipes (records swipe + fires match)
│   ├── matches.py            # GET /matches, POST /matches/{id}/confirm
│   └── chat.py               # GET + POST /chat/{id}/messages, WS /chat/ws/{id}
│
├── services/
│   ├── geo.py                # Haversine distance calculation
│   └── matching.py           # Swipe deck builder (value + geo + category filter)
│
└── websocket/
    └── manager.py            # In-memory WS connection manager
```

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account, returns JWT |
| POST | `/auth/login` | Login, returns JWT |
| GET  | `/auth/me` | Get current user profile |
| PATCH | `/auth/me` | Update profile (location, bio, radius) |

### Listings
| Method | Path | Description |
|--------|------|-------------|
| POST | `/listings/` | Create a new listing |
| GET  | `/listings/mine` | Get your own listings |
| GET  | `/listings/deck?offering_listing_id=` | Get swipe deck (filtered) |
| GET  | `/listings/{id}` | Get a single listing |
| PATCH | `/listings/{id}` | Update your listing |
| DELETE | `/listings/{id}` | Soft-delete your listing |

### Swipes
| Method | Path | Description |
|--------|------|-------------|
| POST | `/swipes/` | Record a swipe — triggers match check |

### Matches
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/matches/` | Get all your active matches |
| GET  | `/matches/{id}` | Get a single match with both listings |
| POST | `/matches/{id}/confirm` | Confirm trade complete |
| POST | `/matches/{id}/cancel` | Cancel a match |

### Chat
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/chat/{match_id}/messages` | Fetch message history |
| POST | `/chat/{match_id}/messages` | Send message (REST fallback) |
| WS   | `/chat/ws/{match_id}?token=` | Real-time WebSocket chat |

---

## WebSocket Protocol

Connect: `ws://localhost:8000/chat/ws/{match_id}?token=<jwt>`

**Client sends:**
```json
{ "type": "message", "content": "Hey, can we meet Saturday?" }
{ "type": "ping" }
```

**Server pushes:**
```json
{ "event": "new_message", "data": { "id": "...", "sender_id": "...", "content": "...", "created_at": "..." } }
{ "event": "new_match",   "data": { "match_id": "...", "listing_a_id": "...", "listing_b_id": "..." } }
{ "event": "trade_confirmed", "data": { "match_id": "..." } }
{ "event": "match_cancelled", "data": { "match_id": "..." } }
{ "event": "pong" }
```

---

## Matching Logic

**Value filter:** Listings are shown only if their value is within ±30% of your listing's value.
```
$100 item sees items in range $70 – $130
$500 item sees items in range $350 – $650
```

**Geo filter:** Haversine distance computed in Python. Items beyond user's `trade_radius_km` are excluded. If an item has no location set, it's included (avoids empty deck).

**Match trigger:** When User A swipes right on Listing B, the system checks if the owner of Listing B has already swiped right on Listing A. If yes → match created, both users notified via WebSocket.

---

## Team Task Division

### Backend Dev 1 — Auth + Listings + Matching Core
- `routers/auth.py`
- `routers/listings.py`
- `services/matching.py`
- `services/geo.py`
- `models/user.py`, `models/listing.py`

### Backend Dev 2 — Swipes + Matches + Chat + WebSocket
- `routers/swipes.py`
- `routers/matches.py`
- `routers/chat.py`
- `websocket/manager.py`
- `models/swipe.py`, `models/match.py`, `models/message.py`

---

## Database

SQLite by default (zero config). Switch to PostgreSQL for production:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/barter
```

Tables are created automatically on startup via `create_tables()`.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./barter.db` | DB connection string |
| `SECRET_KEY` | `changeme-...` | JWT signing secret |
| `DEFAULT_RADIUS_KM` | `25.0` | Default trade radius |
| `VALUE_TOLERANCE_PERCENT` | `0.30` | ±30% value matching band |
| `MAX_SWIPE_DECK_SIZE` | `50` | Max cards returned per deck call |
