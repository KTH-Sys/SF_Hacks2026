# Barter Backend — Task Split

## Local Setup (do this together first, ~15 min)

```bash
# 1. Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Config
cp .env.example .env
# Edit .env — set GEMINI_API_KEY and MONGODB_URL (see below)

# 4. MongoDB (pick one)
#    Option A — local: brew install mongodb-community && brew services start mongodb-community
#    Option B — Atlas free tier: create cluster at mongodb.com, paste URI into MONGODB_URL

# 5. Run
python -m uvicorn main:app --reload --port 8000
# Swagger docs: http://localhost:8000/docs
```

> **Demo tip:** Set `VISION_ENABLED=false` in `.env` if PyTorch is slow to load on your machine.
> The `/ai/classify-image` endpoint will return 503, but everything else works fine.

---

## Team Split

### Backend Dev 1 — Auth · Listings · AI
**Own these files:**

| File | What to build |
|---|---|
| `core/config.py` | Already done — add any missing env vars |
| `core/security.py` | Already done — JWT sign/verify |
| `models/user.py` | Already done — `new_user()` factory |
| `models/listing.py` | Already done — `new_listing()` factory |
| `schemas/user.py` | Already done — validate & adjust as needed |
| `schemas/listing.py` | Already done — validate & adjust as needed |
| `routers/auth.py` | **Build:** register, login, GET /me, PATCH /me |
| `routers/listings.py` | **Build:** CRUD + GET /listings/deck (swipe feed) |
| `services/matching.py` | **Build:** `build_swipe_deck()` — filter by value/geo/category |
| `services/geo.py` | Already done — Haversine distance |
| `services/gemini.py` | **Build:** `estimate_value()`, `generate_description()` |
| `services/vision.py` | **Build:** `classify_image()` PyTorch MobileNetV2 |
| `routers/ai.py` | **Build:** `/ai/estimate-value`, `/ai/generate-desc`, `/ai/classify-image` |

**Day-by-day:**
- **Day 1:** Auth endpoints + listing CRUD working end-to-end (test with Swagger)
- **Day 2:** Swipe deck endpoint + Gemini value estimation working
- **Day 3:** PyTorch image classify + polish + help Dev 2 with demo data

---

### Backend Dev 2 — Swipes · Matches · Chat · WebSocket
**Own these files:**

| File | What to build |
|---|---|
| `models/swipe.py` | Already done — `new_swipe()` factory |
| `models/match.py` | Already done — `new_match()` factory |
| `models/message.py` | Already done — `new_message()` factory |
| `schemas/swipe.py` | Already done |
| `schemas/match.py` | Already done |
| `schemas/message.py` | Already done |
| `routers/swipes.py` | **Build:** POST /swipes — record swipe + fire match on mutual right |
| `routers/matches.py` | **Build:** list matches, confirm trade, cancel match |
| `routers/chat.py` | **Build:** GET/POST messages (REST) + WebSocket `/chat/ws/{match_id}` |
| `websocket/manager.py` | Already done — `ConnectionManager` singleton |
| `database.py` | Already done — Motor connect + indexes |
| `core/dependencies.py` | Already done — `get_current_user` |

**Day-by-day:**
- **Day 1:** Swipe endpoint + match detection working (write a test: two users right-swipe each other → match fires)
- **Day 2:** Match confirm/cancel + REST chat history working
- **Day 3:** WebSocket real-time chat working + demo flow polished

---

## How the Two Parts Connect

```
Dev 1 builds ──────────────────────────────────────── Dev 2 builds

  POST /listings/     ──(creates listing)
  GET  /listings/deck ──(returns cards)──────────────── POST /swipes/
                                                              │
                                             (mutual right) ─┤
                                                              ▼
                                                        match created
                                                              │
                                                    GET  /matches/
                                                    POST /matches/{id}/confirm
                                                              │
                                                    GET  /chat/{id}/messages
                                                    WS   /chat/ws/{id}
```

**Integration point:** `routers/swipes.py` calls `ws_manager.broadcast_to_users()` (Dev 2's code) when a match fires. Dev 1 doesn't touch WebSockets; Dev 2 doesn't touch listings. Clean boundary.

---

## Quick Demo Script (for judging)

Run these in order using Swagger at `http://localhost:8000/docs`:

```
1. POST /auth/register         — create User A
2. POST /auth/register         — create User B
3. PATCH /auth/me              — set lat/lon for both users
4. POST /listings/             — User A posts item (~$100)
5. POST /listings/             — User B posts item (~$90)
6. POST /ai/estimate-value     — show Gemini pricing a new item
7. POST /ai/classify-image     — show PyTorch detecting category from photo
8. GET  /listings/deck         — User A sees User B's item
9. POST /swipes/               — User A swipes right on User B's item
10. GET  /listings/deck         — User B sees User A's item
11. POST /swipes/               — User B swipes right → MATCH fires
12. GET  /matches/              — both users see the match
13. WS  /chat/ws/{match_id}    — open chat, send messages live
14. POST /matches/{id}/confirm  — User A confirms trade
15. POST /matches/{id}/confirm  — User B confirms → trade complete
```

---

## MongoDB Quick Reference

```python
# Insert
await db["users"].insert_one(doc)

# Find one
user = await db["users"].find_one({"email": "foo@bar.com"})

# Find many
cursor = db["listings"].find({"status": "active"}).sort("created_at", -1)
docs = await cursor.to_list(length=50)

# Update
await db["listings"].update_one({"_id": listing_id}, {"$set": {"status": "matched"}})

# All IDs are plain UUID strings stored as _id
# Use serialize_doc(raw) to rename _id → id after any find
```

---

## Key Env Variables

```bash
MONGODB_URL=mongodb://localhost:27017   # local MongoDB
MONGODB_DB=barter
GEMINI_API_KEY=AIza...                  # from aistudio.google.com
VISION_ENABLED=true                     # set false if torch is slow
SECRET_KEY=any-long-random-string
```
