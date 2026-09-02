import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { ThemeProvider, useTheme } from "@/src/state/theme";
import { darkColors, lightColors } from "@/src/theme/tokens";

SplashScreen.preventAutoHideAsync();

function StackWithTheme() {
  const { mode } = useTheme();
  const palette = mode === "light" ? lightColors : darkColors;
  return (
    <>
      <StatusBar style={mode === "light" ? "dark" : "light"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.bg },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="theme/[slug]" options={{ presentation: "card" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  // On web (and dev fallback) useFonts({}) may still report loaded=false the
  // first tick; never wedge the tree — only block briefly, then render anyway.
  const [showFallback, setShowFallback] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowFallback(true), 200);
    return () => clearTimeout(t);
  }, []);
  if (!loaded && !error && !showFallback) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StackWithTheme />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
