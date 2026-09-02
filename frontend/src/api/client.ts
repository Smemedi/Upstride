/**
 * Lightweight API client. Reads EXPO_PUBLIC_BACKEND_URL from .env.
 * All endpoints are prefixed with /api per ingress rules.
 */
const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

export type ThemeSummary = {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  accent_color: string;
  hero_image_url: string;
  stock_count: number;
};

export type Stock = { symbol: string; name: string };

export type ThemeDetail = {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  accent_color: string;
  hero_image_url: string;
  micro_thesis: string[];
  key_risks: string[];
  stocks: Stock[];
};

export type Quote = {
  symbol: string;
  price: number | null;
  change: number | null;
  change_percent: number | null;
  latest_trading_day?: string;
  previous_close?: number;
  error: string | null;
};

export type EtfPoint = { date: string; value: number };

export type EtfHistory = {
  symbol: string;
  points: EtfPoint[];
  latest?: number | null;
  first?: number | null;
  change?: number | null;
  change_percent?: number | null;
  error: string | null;
  note?: string;
};

export type NewsArticle = {
  title: string;
  url: string;
  source?: string;
  time_published?: string;
  sentiment?: string;
  sentiment_score?: number;
  banner_image?: string | null;
};

export type NewsSentiment = {
  ticker: string;
  summary: string;
  article_count: number;
  articles: NewsArticle[];
  cached?: boolean;
};

async function get<T>(path: string): Promise<T> {
  const url = `${BASE}/api${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  listThemes: (category?: string, q?: string, categories?: string[]) => {
    const params = new URLSearchParams();
    if (categories && categories.length > 0 && !categories.includes("All")) {
      params.set("categories", categories.join(","));
    } else if (category && category !== "All") {
      params.set("category", category);
    }
    if (q) params.set("q", q);
    const qs = params.toString();
    return get<{ themes: ThemeSummary[] }>(`/themes${qs ? `?${qs}` : ""}`);
  },
  getTheme: (slug: string) => get<ThemeDetail>(`/themes/${slug}`),
  listCategories: () => get<{ categories: string[] }>(`/categories`),
  getQuotes: (symbols: string[]) =>
    get<{ quotes: Quote[] }>(`/stocks/quotes?symbols=${symbols.join(",")}`),
  getSingleQuote: (symbol: string) => get<Quote>(`/stocks/${symbol}/quote`),
  getEtfHistory: (symbol: string) => get<EtfHistory>(`/etf/${symbol}/history`),
  getNewsSentiment: (ticker: string) =>
    get<NewsSentiment>(`/news/sentiment?ticker=${encodeURIComponent(ticker)}`),
};
