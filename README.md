# Barter Backend

FastAPI backend for **Barter** — "Tinder for Used Product Trade."

Users post items they want to trade, swipe on other listings, and when two users mutually swipe right, a **match** is created. They can then chat in real-time to arrange the exchange.

---

## What the Backend Does

### 1. Authentication (`/auth`)
- Users register with email + password. Passwords are hashed with bcrypt.
- Login returns a **JWT token** (7-day expiry for hackathon convenience).
- Every protected endpoint reads the token from the `Authorization: Bearer <token>` header.
- Users can update their profile: display name, bio, avatar, city, and **trade radius** (how far they're willing to travel).

### 2. Listings (`/listings`)
- A **listing** is an item a user wants to trade — it has a title, description, category, condition, estimated value, images (base64 or URLs), and an optional GPS location.
- Users can create, view, update, and soft-delete their own listings.
- `GET /listings/deck` is the core feed endpoint — it returns a filtered stack of other users' listings to swipe on (see Matching Logic below).

### 3. Swipe Deck & Matching Logic (`services/matching.py`, `services/geo.py`)
The swipe deck applies three filters before returning cards:

| Filter | Rule |
|--------|------|
| **Value** | Only show listings within ±30% of your item's estimated value. A $100 item sees listings priced $70–$130. |
| **Geo** | Only show listings within the user's `trade_radius_km` (default 25 km). Distance is calculated using the **Haversine formula**. Listings with no location set are excluded. |
| **Category** | Only show listings in the same category (e.g. electronics ↔ electronics). Can be overridden with the `category` query param. |

Already-swiped listings are excluded. Results are sorted by distance (closest first), capped at 50 items.

### 4. Swipes & Matches (`/swipes`, `/matches`)
- `POST /swipes/` records a left or right swipe.
- On every **right swipe**, the system checks for a **counter-swipe** — if the other user has already swiped right on your listing, a **match** is created instantly.
- Both users are notified via WebSocket the moment a match is created.
- Matches have a confirm/cancel flow: both users must call `POST /matches/{id}/confirm` to mark the trade as complete. Either user can cancel at any point before full confirmation.

### 5. Real-Time Chat (`/chat`)
- Each match gets a private chat room.
- Supports both REST (`GET`/`POST /chat/{match_id}/messages`) for message history and fallback sending, and **WebSocket** (`/chat/ws/{match_id}?token=<jwt>`) for real-time messaging.
- System messages are automatically inserted on key events (match created, trade confirmed, match cancelled).

### 6. AI Features (`/ai`)
- **`POST /ai/estimate-value`** — Sends item details to **Google Gemini** and returns a `min_value`, `max_value`, `suggested_value`, reasoning, and confidence level. Used to help users price their items fairly.
- **`POST /ai/generate-desc`** — Asks Gemini to write a 2–3 sentence listing description from just the title, category, and condition.
- **`POST /ai/classify-image`** — Runs a base64-encoded photo through **PyTorch MobileNetV2** (pretrained on ImageNet) to predict the item category. Returns the top-5 predictions with confidence scores. Can be disabled via `VISION_ENABLED=false`.

---

## Quick Start

```bash
# 1. Clone and enter the directory
cd barter-backend

# 2. Run the start script (creates venv, installs deps, copies .env, starts server)
bash start.sh
```

Or manually:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in MONGODB_URL and GEMINI_API_KEY in .env
python -m uvicorn main:app --reload --port 8000
```

- Swagger UI: http://localhost:8000/docs
- ReDoc:       http://localhost:8000/redoc
- Health:      http://localhost:8000/health

---

## Project Structure

```
barter-backend/
├── main.py                   # App entry point, lifespan startup/shutdown
├── database.py               # Motor (async MongoDB) client + index creation
├── requirements.txt
├── .env.example
│
├── core/
│   ├── config.py             # Pydantic settings (reads .env)
│   ├── security.py           # bcrypt password hashing + JWT encode/decode
│   └── dependencies.py       # get_current_user FastAPI dependency
│
├── models/                   # MongoDB document factory functions
│   ├── user.py               # new_user() → dict
│   ├── listing.py            # new_listing() → dict
│   ├── swipe.py              # new_swipe() → dict
│   ├── match.py              # new_match() → dict
│   └── message.py            # new_message() → dict
│
├── schemas/                  # Pydantic v2 request/response schemas
│   ├── user.py
│   ├── listing.py
│   ├── swipe.py
│   ├── match.py
│   └── message.py
│
├── routers/                  # FastAPI route handlers
│   ├── auth.py               # /auth — register, login, me
│   ├── listings.py           # /listings — CRUD + swipe deck
│   ├── swipes.py             # /swipes — record swipe + match detection
│   ├── matches.py            # /matches — list, confirm, cancel
│   ├── chat.py               # /chat — REST history + WebSocket
│   └── ai.py                 # /ai — Gemini value/desc + PyTorch classify
│
├── services/
│   ├── geo.py                # Haversine distance calculation
│   ├── matching.py           # Swipe deck builder (value + geo + category)
│   ├── gemini.py             # Google Gemini API (estimate value, gen description)
│   └── vision.py             # PyTorch MobileNetV2 image classification
│
└── websocket/
    └── manager.py            # In-memory WebSocket connection manager
```

---

## API Endpoints

All endpoints except `/health` require `Authorization: Bearer <token>`.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account → returns JWT + user |
| POST | `/auth/login` | Login → returns JWT + user |
| GET  | `/auth/me` | Get current user profile |
| PATCH | `/auth/me` | Update profile (name, bio, location, trade radius) |

### Listings
| Method | Path | Description |
|--------|------|-------------|
| POST | `/listings/` | Create a new listing |
| GET  | `/listings/mine` | Get your own listings |
| GET  | `/listings/deck?offering_listing_id=` | Get filtered swipe deck |
| GET  | `/listings/{id}` | Get a single listing (increments view count) |
| PATCH | `/listings/{id}` | Update your listing |
| DELETE | `/listings/{id}` | Soft-delete your listing |

### Swipes
| Method | Path | Description |
|--------|------|-------------|
| POST | `/swipes/` | Record a swipe (left/right) — triggers match check on right swipe |

### Matches
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/matches/` | Get all your active/confirmed matches |
| GET  | `/matches/{id}` | Get single match with both listings + users |
| POST | `/matches/{id}/confirm` | Confirm trade — when both confirm, listings → "traded" |
| POST | `/matches/{id}/cancel` | Cancel a match — listings revert to "active" |

### Chat
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/chat/{match_id}/messages` | Paginated message history |
| POST | `/chat/{match_id}/messages` | Send message (REST fallback) |
| WS   | `/chat/ws/{match_id}?token=` | Real-time WebSocket chat |

### AI
| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai/estimate-value` | Gemini: estimate fair market value from item details |
| POST | `/ai/generate-desc` | Gemini: write a listing description |
| POST | `/ai/classify-image` | PyTorch: classify item category from base64 image |

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
{ "event": "new_message",   "data": { "id": "...", "sender_name": "...", "content": "...", "created_at": "..." } }
{ "event": "new_match",     "data": { "match_id": "...", "listing_a_id": "...", "listing_b_id": "..." } }
{ "event": "trade_confirmed", "data": { "match_id": "..." } }
{ "event": "match_cancelled", "data": { "match_id": "..." } }
{ "event": "pong" }
```

---

## Database

**MongoDB** (via Motor async driver). Collections and indexes are created automatically on startup.

| Collection | Purpose |
|------------|---------|
| `users` | User accounts (unique index on `email`) |
| `listings` | Trade listings (indexed on `status`, `category`, `estimated_value`) |
| `swipes` | Swipe records (unique compound index prevents duplicate swipes) |
| `matches` | Matched pairs (indexed on `user_a_id`, `user_b_id`) |
| `messages` | Chat messages (indexed on `match_id` + `created_at`) |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URL` | `mongodb://localhost:27017` | MongoDB connection string (use Atlas URI in prod) |
| `MONGODB_DB` | `barter` | Database name |
| `SECRET_KEY` | `changeme-...` | JWT signing secret — **change this in production** |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` (7 days) | Token lifetime |
| `GEMINI_API_KEY` | *(empty)* | Get from [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `GEMINI_MODEL` | `gemini-1.5-flash` | Gemini model to use |
| `VISION_ENABLED` | `true` | Set `false` to skip PyTorch model load on low-memory machines |
| `DEFAULT_RADIUS_KM` | `25.0` | Default trade search radius |
| `VALUE_TOLERANCE_PERCENT` | `0.30` | ±30% value matching band |
| `MAX_SWIPE_DECK_SIZE` | `50` | Max cards returned per deck request |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI |
| Database | MongoDB Atlas + Motor (async) |
| Auth | JWT (python-jose) + bcrypt |
| AI — Value & Description | Google Gemini (`google-genai`) |
| AI — Image Classification | PyTorch MobileNetV2 + torchvision |
| Real-time | WebSocket (Starlette native) |
| Config | pydantic-settings |
