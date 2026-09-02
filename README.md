# Upstride

A full-stack investment theme explorer and market tracker. Browse themed portfolios (sectors, trends, strategies), track ETF performance with interactive charts, and get AI-powered news analysis on why stocks are moving.

## Tech Stack

**Backend:**
- **Framework:** FastAPI (Python)
- **Database:** MongoDB (with async motor driver)
- **APIs:** Alpha Vantage (stock quotes & history), OpenAI GPT-4 (news summarization)
- **Cache:** In-memory + MongoDB for persistent caching
- **Server:** Uvicorn

**Frontend:**
- **Framework:** Expo + React Native
- **Language:** TypeScript
- **Navigation:** Expo Router (file-based routing)
- **State:** React Context + Custom hooks
- **Charts:** react-native-wagmi-charts
- **Storage:** AsyncStorage

## Architecture

```
frontend/     → Mobile app (iOS/Android/Web via Expo)
  ├── app/         - File-based routing (Expo Router)
  ├── src/         - API client, hooks, theme tokens
  └── constants/   - Test IDs, theme data

backend/      → REST API (FastAPI)
  ├── server.py    - Main app, endpoints
  ├── db.py        - MongoDB connection
  ├── themes_data.py - Static theme data
  └── seed.py      - Database seeding
```

## Features

- **Theme Browser:** Filter investment themes by category, search by name
- **ETF Charts:** Interactive price history for VOO, SMH, SPY, QQQ, DIA, IWM
- **Live Quotes:** Real-time stock prices with % change (Alpha Vantage cached)
- **AI News Analysis:** GPT-4 summaries of why stocks are moving (from Alpha Vantage news feed)
- **Responsive UI:** Works on iOS, Android, and Web

## Setup

### Prerequisites
- Node.js 18+ (frontend)
- Python 3.9+ (backend)
- MongoDB (optional, falls back to static data)
- Alpha Vantage API key (free tier: 25 calls/day)
- OpenAI API key (for news summarization)

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create `.env`:
```
ALPHA_VANTAGE_KEY=your_key_here
OPENAI_LLM_KEY=sk-proj-your_key_here
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
```

Run:
```bash
python server.py
```

Server starts on `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
npm install
```

Create `.env`:
```
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
```

Run:
```bash
npm start
```

Then choose:
- **`w`** for web
- **`a`** for Android emulator
- **`i`** for iOS simulator
- Download **Expo Go** app to test on your phone

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/themes` | List all investment themes (filterable) |
| GET | `/api/themes/{slug}` | Get theme details with stocks |
| GET | `/api/categories` | Get unique theme categories |
| GET | `/api/stocks/quotes` | Batch fetch stock prices |
| GET | `/api/stocks/{symbol}/quote` | Single stock price |
| GET | `/api/etf/{symbol}/history` | ETF daily price history (~100 days) |
| GET | `/api/news/sentiment` | AI summary + articles for a ticker |

**Query Parameters:**
- `categories` (themes): Comma-separated, e.g. `?categories=Tech,Healthcare`
- `q` (themes): Search by name/tagline, e.g. `?q=AI`
- `symbols` (quotes): Comma-separated, e.g. `?symbols=AAPL,MSFT`
- `ticker` (news): Stock symbol, e.g. `?ticker=NVDA`

## Caching Strategy

- **Quotes:** 6 hours in-memory cache
- **ETF History:** 24 hours in-memory cache (daily candles only)
- **News:** 6 hours in-memory cache
- **MongoDB:** Persistent backup cache (survives server restarts)

Alpha Vantage free tier is rate-limited to **25 calls/day**, so aggressive caching is essential.

## Development

### Run Both Servers (Separate Terminals)

**Terminal 1 (Backend):**
```bash
cd backend && python server.py
```

**Terminal 2 (Frontend):**
```bash
cd frontend && npm start
```

Then press `w` for web or use Expo Go on your phone.

### Linting & Formatting

**Backend:**
```bash
cd backend
black . && isort . && flake8 . && mypy .
```

**Frontend:**
```bash
cd frontend
npm run lint
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Chart data unavailable" | Backend not running or not reachable. Check `EXPO_PUBLIC_BACKEND_URL` in frontend `.env` |
| "Daily quote limit reached" | Alpha Vantage rate limit hit. Wait 24h or use different API key |
| Date shows "Dec 31, 1969" | Timestamps are 0/null. Check if ETF history endpoint is returning data |
| Themes not loading | MongoDB might be down. Backend falls back to static data (themes_data.py) |
| "No fresh news catalysts" | No articles found for ticker. Try again or check Alpha Vantage news feed |

## Future Enhancements

- Real-time WebSocket for quote updates
- User accounts & saved watchlists
- More chart indicators (moving averages, RSI)
- Mobile notification system
- Offline mode with cached data
- Portfolio tracking with entry/exit prices
