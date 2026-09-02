/**
 * Design tokens for Upstride. Supports dark + light palettes.
 * `useThemeTokens()` reads the current ThemeMode from context.
 */
import { useTheme } from "@/src/state/theme";

export type ColorPalette = {
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  brand: string;
  brandSoft: string;
  positiveText: string;
  positiveBg: string;
  negativeText: string;
  negativeBg: string;
  neutralBg: string;
  shadow: string;
};

export const darkColors: ColorPalette = {
  bg: "#0A0A0A",
  bgElevated: "#0F1216",
  surface: "#14171A",
  surfaceElevated: "#1E2226",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  textPrimary: "#FFFFFF",
  textSecondary: "#A0AAB4",
  textTertiary: "#64748B",
  brand: "#00D084",
  brandSoft: "rgba(0,208,132,0.16)",
  positiveText: "#00D084",
  positiveBg: "rgba(0,208,132,0.15)",
  negativeText: "#FF453A",
  negativeBg: "rgba(255,69,58,0.15)",
  neutralBg: "rgba(160,170,180,0.12)",
  shadow: "rgba(0,0,0,0.5)",
};

export const lightColors: ColorPalette = {
  bg: "#F7F8FA",
  bgElevated: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceElevated: "#F1F3F6",
  border: "rgba(15,23,42,0.08)",
  borderStrong: "rgba(15,23,42,0.16)",
  textPrimary: "#0B0F19",
  textSecondary: "#475569",
  textTertiary: "#94A3B8",
  brand: "#00A86B",
  brandSoft: "rgba(0,168,107,0.12)",
  positiveText: "#00A86B",
  positiveBg: "rgba(0,168,107,0.13)",
  negativeText: "#E11D48",
  negativeBg: "rgba(225,29,72,0.10)",
  neutralBg: "rgba(100,116,139,0.10)",
  shadow: "rgba(15,23,42,0.08)",
};

// Default export for places that need a static reference (e.g. tab bar default).
export const colors = darkColors;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export function useThemeTokens() {
  const { mode } = useTheme();
  const c = mode === "light" ? lightColors : darkColors;
  return { colors: c, radii, spacing, mode };
}
