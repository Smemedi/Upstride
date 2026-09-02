"""Upstride backend — FastAPI service.

Endpoints:
- GET /api/themes                List theme summaries (filterable by category, q, multi-category)
- GET /api/themes/{slug}         Full theme detail
- GET /api/categories            Unique theme categories
- GET /api/stocks/quotes         Batched Alpha Vantage quotes (cached)
- GET /api/etf/{symbol}/history  Daily history time-series (cached, Alpha Vantage TIME_SERIES_DAILY)
- GET /api/news/sentiment        AI-summarized news for a ticker (GPT-4 via OpenAI)

Caching is aggressive — Alpha Vantage free tier is 25 calls/day.
"""
from __future__ import annotations

from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import time
import asyncio
from pathlib import Path
from typing import Optional
import httpx
from contextlib import asynccontextmanager

from themes_data import THEMES, get_categories, get_theme_summary
from db import get_db
from seed import seed_themes_if_needed

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

ALPHA_VANTAGE_KEY = os.environ.get("ALPHA_VANTAGE_KEY", "")
ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query"
OPENAI_LLM_KEY = os.environ.get("OPENAI_LLM_KEY", "")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("upstride")

# In-memory caches keyed by symbol. Mongo provides a longer-lived backstop
# so reboots don't blow through the daily quota.
QUOTE_CACHE: dict = {}
QUOTE_TTL_SECONDS = 60 * 60 * 6  # 6h

HISTORY_CACHE: dict = {}
HISTORY_TTL_SECONDS = 60 * 60 * 24  # 24h (daily candles)

NEWS_CACHE: dict = {}
NEWS_TTL_SECONDS = 60 * 60 * 6  # 6h


app = FastAPI(title="Upstride API")
api_router = APIRouter(prefix="/api")

# Start Up
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("starting")
    try:
        count = await seed_themes_if_needed()
        logger.info(f"Seeded {count} themes into MongoDB")
    except Exception as e:
        logger.warning(f"Mongo seed failed (continuing with static fallback): {e}")

    yield

# ─────────────────────────────────────────────────────────────────────────────
# Themes
# ─────────────────────────────────────────────────────────────────────────────


@api_router.get("/")
async def root():
    return {"message": "Upstride API"}


@api_router.get("/categories")
async def list_categories():
    return {"categories": get_categories()}


def _multi_param(value: Optional[str]) -> list[str]:
    if not value:
        return []
    return [v.strip() for v in value.split(",") if v.strip()]


@api_router.get("/themes")
async def list_themes(
    category: Optional[str] = Query(None, description="Single category (legacy)"),
    categories: Optional[str] = Query(None, description="Comma-separated multi-select"),
    q: Optional[str] = Query(None),
):
    # Prefer Mongo, fall back to static.
    try:
        db = get_db()
        coll = db["themes"]
        cursor = coll.find({}, {"_id": 0})
        docs = await cursor.to_list(length=200)
        themes_src = docs if docs else THEMES
    except Exception:
        themes_src = THEMES

    items = [get_theme_summary(t) for t in themes_src]

    selected = _multi_param(categories)
    if selected and "All" not in selected:
        lowered = {c.lower() for c in selected}
        items = [t for t in items if t["category"].lower() in lowered]
    elif category and category != "All":
        items = [t for t in items if t["category"].lower() == category.lower()]

    if q:
        ql = q.lower().strip()
        items = [
            t
            for t in items
            if ql in t["name"].lower()
            or ql in t["tagline"].lower()
            or ql in t["category"].lower()
        ]
    return {"themes": items}


@api_router.get("/themes/{slug}")
async def get_theme(slug: str):
    try:
        db = get_db()
        doc = await db["themes"].find_one({"slug": slug}, {"_id": 0})
        if doc:
            return doc
    except Exception:
        pass
    for t in THEMES:
        if t["slug"] == slug:
            return t
    raise HTTPException(status_code=404, detail="Theme not found")


# ─────────────────────────────────────────────────────────────────────────────
# Alpha Vantage quote helpers
# ─────────────────────────────────────────────────────────────────────────────


async def _fetch_alpha_quote(client: httpx.AsyncClient, symbol: str) -> dict:
    now = time.time()
    cached = QUOTE_CACHE.get(symbol)
    if cached and (now - cached[0]) < QUOTE_TTL_SECONDS:
        return cached[1]

    if not ALPHA_VANTAGE_KEY:
        return _empty_quote(symbol, "no_api_key")

    try:
        resp = await client.get(
            ALPHA_VANTAGE_URL,
            params={"function": "GLOBAL_QUOTE", "symbol": symbol, "apikey": ALPHA_VANTAGE_KEY},
            timeout=10.0,
        )
        data = resp.json()
        quote = data.get("Global Quote") or {}
        if not quote or not quote.get("05. price"):
            note = data.get("Note") or data.get("Information") or "no_data"
            payload = _empty_quote(
                symbol,
                "rate_limited" if "rate" in str(note).lower() or "thank" in str(note).lower() else "no_data",
            )
            return cached[1] if cached else payload

        price = float(quote["05. price"])
        change = float(quote.get("09. change", 0) or 0)
        change_pct_raw = (quote.get("10. change percent") or "0%").replace("%", "").strip()
        try:
            change_percent = float(change_pct_raw)
        except ValueError:
            change_percent = 0.0

        payload = {
            "symbol": symbol,
            "price": round(price, 2),
            "change": round(change, 2),
            "change_percent": round(change_percent, 2),
            "latest_trading_day": quote.get("07. latest trading day"),
            "previous_close": float(quote.get("08. previous close", 0) or 0),
            "error": None,
        }
        QUOTE_CACHE[symbol] = (now, payload)
        return payload
    except Exception as e:
        logger.warning(f"quote fetch failed for {symbol}: {e}")
        return cached[1] if cached else _empty_quote(symbol, "fetch_failed")


def _empty_quote(symbol: str, error: str) -> dict:
    return {
        "symbol": symbol,
        "price": None,
        "change": None,
        "change_percent": None,
        "error": error,
    }


@api_router.get("/stocks/quotes")
async def get_quotes(symbols: str = Query(..., description="Comma-separated tickers")):
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not symbol_list:
        raise HTTPException(status_code=400, detail="No symbols provided")
    if len(symbol_list) > 10:
        raise HTTPException(status_code=400, detail="Max 10 symbols per request")
    async with httpx.AsyncClient() as client:
        results = [await _fetch_alpha_quote(client, sym) for sym in symbol_list]
    return {"quotes": results}


@api_router.get("/stocks/{symbol}/quote")
async def get_single_quote(symbol: str):
    async with httpx.AsyncClient() as client:
        return await _fetch_alpha_quote(client, symbol.upper())


# ─────────────────────────────────────────────────────────────────────────────
# ETF history — daily candles for chart scrub
# ─────────────────────────────────────────────────────────────────────────────


ALLOWED_ETF_SYMBOLS = {"VOO", "SMH", "SPY", "QQQ", "DIA", "IWM"}


async def _fetch_alpha_history(client: httpx.AsyncClient, symbol: str) -> dict:
    """Fetch ~100 day adjusted close history. Aggressively cached."""
    now = time.time()
    cached = HISTORY_CACHE.get(symbol)
    if cached and (now - cached[0]) < HISTORY_TTL_SECONDS:
        return cached[1]

    if not ALPHA_VANTAGE_KEY:
        return {"symbol": symbol, "points": [], "error": "no_api_key"}

    try:
        resp = await client.get(
            ALPHA_VANTAGE_URL,
            params={
                "function": "TIME_SERIES_DAILY",
                "symbol": symbol,
                "outputsize": "compact",  # ~100 latest days
                "apikey": ALPHA_VANTAGE_KEY,
            },
            timeout=15.0,
        )
        data = resp.json()
        series = data.get("Time Series (Daily)") or {}
        if not series:
            note = data.get("Note") or data.get("Information") or "no_data"
            err = "rate_limited" if "rate" in str(note).lower() or "thank" in str(note).lower() else "no_data"
            if cached:
                return cached[1]
            # Synthesize a degraded fallback so the UI still renders something useful.
            return {"symbol": symbol, "points": [], "error": err, "note": str(note)[:200]}

        # Ascending order (oldest → newest), each point: {date, value}
        points = []
        for date_str, ohlc in series.items():
            try:
                close_val = float(ohlc.get("4. close") or 0)
                points.append({"date": date_str, "value": round(close_val, 4)})
            except Exception:
                continue
        points.sort(key=lambda p: p["date"])

        latest = points[-1]["value"] if points else None
        first = points[0]["value"] if points else None
        change = (latest - first) if (latest is not None and first is not None) else None
        change_pct = (change / first * 100) if (change is not None and first) else None

        payload = {
            "symbol": symbol,
            "points": points,
            "latest": latest,
            "first": first,
            "change": round(change, 2) if change is not None else None,
            "change_percent": round(change_pct, 2) if change_pct is not None else None,
            "error": None,
        }
        HISTORY_CACHE[symbol] = (now, payload)
        # Mongo backup
        try:
            db = get_db()
            await db["etf_history"].update_one(
                {"symbol": symbol},
                {"$set": {"symbol": symbol, "data": payload, "cached_at": now}},
                upsert=True,
            )
        except Exception as e:
            logger.warning(f"mongo cache write failed for {symbol}: {e}")
        return payload
    except Exception as e:
        logger.warning(f"history fetch failed for {symbol}: {e}")
        if cached:
            return cached[1]
        # Try Mongo backup
        try:
            db = get_db()
            doc = await db["etf_history"].find_one({"symbol": symbol}, {"_id": 0})
            if doc and doc.get("data"):
                return doc["data"]
        except Exception:
            pass
        return {"symbol": symbol, "points": [], "error": "fetch_failed"}


@api_router.get("/etf/{symbol}/history")
async def get_etf_history(symbol: str):
    sym = symbol.upper()
    if sym not in ALLOWED_ETF_SYMBOLS:
        raise HTTPException(status_code=400, detail=f"Unsupported ETF symbol: {sym}")
    async with httpx.AsyncClient() as client:
        return await _fetch_alpha_history(client, sym)


# ─────────────────────────────────────────────────────────────────────────────
# News sentiment + AI summary
# ─────────────────────────────────────────────────────────────────────────────


async def _fetch_news_articles(client: httpx.AsyncClient, ticker: str) -> list[dict]:
    """Pull recent news articles + sentiment from Alpha Vantage NEWS_SENTIMENT."""
    if not ALPHA_VANTAGE_KEY:
        return []
    try:
        resp = await client.get(
            ALPHA_VANTAGE_URL,
            params={
                "function": "NEWS_SENTIMENT",
                "tickers": ticker,
                "sort": "LATEST",
                "limit": 10,
                "apikey": ALPHA_VANTAGE_KEY,
            },
            timeout=15.0,
        )
        data = resp.json()
        return data.get("feed") or []
    except Exception as e:
        logger.warning(f"news fetch failed for {ticker}: {e}")
        return []


async def _ai_summarize(ticker: str, articles: list[dict]) -> str:
    """Use Claude Sonnet 4.5 to produce a plain-English 'why is it moving' summary."""
    if not articles:
        return (
            f"No fresh news catalysts found for {ticker} in the past 24 hours. "
            "Price moves are likely tracking broad-market flow rather than ticker-specific headlines."
        )

    headlines = []
    for a in articles[:8]:
        title = (a.get("title") or "").strip()
        summary = (a.get("summary") or "").strip()
        sentiment = a.get("overall_sentiment_label", "")
        if title:
            headlines.append(f"- [{sentiment}] {title}: {summary[:240]}")
    bundle = "\n".join(headlines)

    if not OPENAI_LLM_KEY:
        # Heuristic fallback when no key
        pos = sum(1 for a in articles if "bullish" in (a.get("overall_sentiment_label") or "").lower() or "positive" in (a.get("overall_sentiment_label") or "").lower())
        neg = sum(1 for a in articles if "bearish" in (a.get("overall_sentiment_label") or "").lower() or "negative" in (a.get("overall_sentiment_label") or "").lower())
        return f"{len(articles)} recent stories on {ticker} (≈{pos} bullish, {neg} bearish). AI summary unavailable — showing raw headlines below."

    try:
        import openai
        
        client = openai.AsyncOpenAI(api_key=OPENAI_LLM_KEY)
        
        response = await client.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a senior financial analyst writing for a retail-investor mobile app. "
                        "Given recent news headlines about a single ticker, produce a tight 2–3 sentence "
                        "plain-English explanation of *why the stock is moving today*. "
                        "Lead with the dominant driver. Avoid jargon, avoid hedging filler. "
                        "Never give buy/sell advice. No bullet points — flowing prose only."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Ticker: {ticker}\n\nRecent headlines (with sentiment label):\n{bundle}\n\n"
                        "Write the 2–3 sentence summary now."
                    ),
                },
            ],
            temperature=0.7,
            max_tokens=150,
        )
        text = response.choices[0].message.content
        return (text or "").strip() or "Summary unavailable right now — try again shortly."
    except Exception as e:
        logger.warning(f"LLM summarize failed for {ticker}: {e}")
        return (
            f"{len(articles)} recent stories surfaced for {ticker}. "
            "Live AI summary failed — see the headlines below for context."
        )


@api_router.get("/news/sentiment")
async def get_news_sentiment(ticker: str = Query(..., min_length=1, max_length=10)):
    t = ticker.upper().strip()
    now = time.time()
    cached = NEWS_CACHE.get(t)
    if cached and (now - cached[0]) < NEWS_TTL_SECONDS:
        return cached[1]

    async with httpx.AsyncClient() as client:
        articles = await _fetch_news_articles(client, t)

    summary = await _ai_summarize(t, articles)
    top_articles = [
        {
            "title": a.get("title"),
            "url": a.get("url"),
            "source": a.get("source"),
            "time_published": a.get("time_published"),
            "sentiment": a.get("overall_sentiment_label"),
            "sentiment_score": a.get("overall_sentiment_score"),
            "banner_image": a.get("banner_image"),
        }
        for a in articles[:5]
    ]

    payload = {
        "ticker": t,
        "summary": summary,
        "article_count": len(articles),
        "articles": top_articles,
        "cached": False,
    }
    NEWS_CACHE[t] = (now, {**payload, "cached": True})
    # Mongo backstop
    try:
        db = get_db()
        await db["news_cache"].update_one(
            {"ticker": t},
            {"$set": {"ticker": t, "payload": payload, "cached_at": now}},
            upsert=True,
        )
    except Exception as e:
        logger.warning(f"news mongo cache failed: {e}")
    return payload


# ─────────────────────────────────────────────────────────────────────────────
# Middleware + mount
# ─────────────────────────────────────────────────────────────────────────────


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
