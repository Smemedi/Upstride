"""Seed MongoDB themes collection from the static curated dataset.

Idempotent — uses upsert keyed on `slug`. Called at FastAPI startup.
"""
from db import get_db
from themes_data import THEMES


async def seed_themes_if_needed():
    db = get_db()
    coll = db["themes"]
    for t in THEMES:
        await coll.update_one({"slug": t["slug"]}, {"$set": t}, upsert=True)
    return await coll.count_documents({})
