"""MongoDB client wrapper. Single async client shared across the app."""
import os
from motor.motor_asyncio import AsyncIOMotorClient

_client: AsyncIOMotorClient | None = None
_db = None


def get_db():
    global _client, _db
    if _db is None:
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "upstride")
        _client = AsyncIOMotorClient(mongo_url)
        _db = _client[db_name]
    return _db
