# MongoDB collection name constants — import these in routers/services
USERS = "users"
LISTINGS = "listings"
SWIPES = "swipes"
MATCHES = "matches"
MESSAGES = "messages"

# Listing enum values — shared between models and schemas
CATEGORIES = [
    "electronics", "clothing", "books", "furniture",
    "sports", "instruments", "gaming", "outdoor", "art", "other",
]
CONDITIONS = ["new", "like_new", "good", "fair", "poor"]
STATUSES   = ["active", "matched", "traded", "deleted"]
