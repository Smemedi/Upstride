/**
 * Local watchlist — stores saved theme slugs and stock symbols.
 * Uses the shared storage util backed by AsyncStorage.
 */
import { useCallback, useEffect, useState } from "react";

import { storage } from "@/src/utils/storage";

const THEMES_KEY = "watchlist.themes.v1";
const STOCKS_KEY = "watchlist.stocks.v1";

type Watchlist = {
  themes: string[];
  stocks: string[];
};

let memory: Watchlist = { themes: [], stocks: [] };
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

async function hydrate() {
  const t = (await storage.getItem<string>(THEMES_KEY, "[]")) ?? "[]";
  const s = (await storage.getItem<string>(STOCKS_KEY, "[]")) ?? "[]";
  try {
    memory = { themes: JSON.parse(t), stocks: JSON.parse(s) };
  } catch {
    memory = { themes: [], stocks: [] };
  }
  notify();
}

hydrate();

async function persist() {
  await storage.setItem(THEMES_KEY, JSON.stringify(memory.themes));
  await storage.setItem(STOCKS_KEY, JSON.stringify(memory.stocks));
}

export function useWatchlist() {
  const [snap, setSnap] = useState<Watchlist>(memory);

  useEffect(() => {
    const l = () => setSnap({ ...memory });
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const toggleTheme = useCallback(async (slug: string) => {
    const has = memory.themes.includes(slug);
    memory.themes = has ? memory.themes.filter((s) => s !== slug) : [...memory.themes, slug];
    notify();
    await persist();
  }, []);

  const toggleStock = useCallback(async (symbol: string) => {
    const has = memory.stocks.includes(symbol);
    memory.stocks = has ? memory.stocks.filter((s) => s !== symbol) : [...memory.stocks, symbol];
    notify();
    await persist();
  }, []);

  return {
    themes: snap.themes,
    stocks: snap.stocks,
    hasTheme: (slug: string) => snap.themes.includes(slug),
    hasStock: (symbol: string) => snap.stocks.includes(symbol),
    toggleTheme,
    toggleStock,
  };
}
