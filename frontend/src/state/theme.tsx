/**
 * Theme mode context — dark/light/system, persisted to AsyncStorage.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { storage } from "@/src/utils/storage";

export type ThemeMode = "dark" | "light";

type ThemeCtx = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
};

const KEY = "upstride.theme.mode.v1";

const Ctx = createContext<ThemeCtx>({
  mode: "dark",
  setMode: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    (async () => {
      const stored = await storage.getItem<string>(KEY, "dark");
      if (stored === "dark" || stored === "light") setModeState(stored);
    })();
  }, []);

  const setMode = useCallback(async (m: ThemeMode) => {
    setModeState(m);
    await storage.setItem(KEY, m);
  }, []);

  const toggle = useCallback(() => {
    setModeState((cur) => {
      const next: ThemeMode = cur === "dark" ? "light" : "dark";
      storage.setItem(KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ mode, setMode, toggle }), [mode, setMode, toggle]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
