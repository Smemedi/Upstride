import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LineChart } from "react-native-wagmi-charts";

import { api, EtfHistory } from "@/src/api/client";
import { useThemeTokens } from "@/src/theme/tokens";

const ETFS = [
  { symbol: "VOO", name: "Vanguard S&P 500", color: "#00D084" },
  { symbol: "SMH", name: "VanEck Semiconductor", color: "#7C5CFF" },
  { symbol: "SPY", name: "SPDR S&P 500", color: "#00B4D8" },
];

type Range = { key: string; label: string; days: number };
const RANGES: Range[] = [
  { key: "1W", label: "1W", days: 7 },
  { key: "1M", label: "1M", days: 30 },
  { key: "3M", label: "3M", days: 90 },
  { key: "MAX", label: "All", days: 9999 },
];

export default function EtfScreen() {
  const insets = useSafeAreaInsets();
  const { colors, radii, spacing } = useThemeTokens();

  const [selected, setSelected] = useState(ETFS[0].symbol);
  const [range, setRange] = useState<Range>(RANGES[1]);
  const [history, setHistory] = useState<Record<string, EtfHistory>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (symbol: string) => {
    if (history[symbol]) return;
    setLoading(true);
    try {
      const h = await api.getEtfHistory(symbol);
      setHistory((prev) => ({ ...prev, [symbol]: h }));
    } catch {
      setHistory((prev) => ({ ...prev, [symbol]: { symbol, points: [], error: "fetch_failed" } }));
    } finally {
      setLoading(false);
    }
  }, [history]);

  useEffect(() => {
    load(selected);
  }, [selected, load]);

  // Preload others in background after first render
  useEffect(() => {
    const t = setTimeout(() => {
      ETFS.forEach((e) => {
        if (e.symbol !== selected) load(e.symbol);
      });
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = history[selected];
  const meta = ETFS.find((e) => e.symbol === selected)!;

  const slicedPoints = useMemo(() => {
    if (!current?.points?.length) return [] as { timestamp: number; value: number }[];
    const sliced = range.days >= 9999 ? current.points : current.points.slice(-range.days);
    return sliced.map((p) => {
      // Parse YYYY-MM-DD strings: append T00:00:00Z to ensure UTC parsing
      const dateTime = new Date(`${p.date}T00:00:00Z`).getTime();
      return { timestamp: dateTime, value: p.value };
    });
  }, [current, range.days]);

  const rangeStats = useMemo(() => {
    if (slicedPoints.length < 2) return null;
    const first = slicedPoints[0].value;
    const last = slicedPoints[slicedPoints.length - 1].value;
    const change = last - first;
    const pct = (change / first) * 100;
    return { first, last, change, pct };
  }, [slicedPoints]);

  const positive = (rangeStats?.change ?? 0) >= 0;
  const accent = positive ? colors.positiveText : colors.negativeText;

  const s = makeStyles(colors, radii, spacing);

  return (
    <View style={[s.container, { paddingTop: insets.top }]} testID="etf-screen">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        {/* Brand header */}
        <View style={s.brandRow}>
          <View style={s.logoBadge}>
            <Text style={[s.logoBadgeText, { color: colors.brand }]}>U</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.brand}>Upstride</Text>
            <Text style={s.brandSub}>Markets · ETFs</Text>
          </View>
          <View style={s.liveBadge}>
            <View style={[s.dot, { backgroundColor: colors.positiveText }]} />
            <Text style={[s.liveBadgeText, { color: colors.positiveText }]}>LIVE</Text>
          </View>
        </View>

        {/* ETF Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsRow}
        >
          {ETFS.map((e) => {
            const active = e.symbol === selected;
            return (
              <TouchableOpacity
                key={e.symbol}
                style={[s.chip, active && { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary }]}
                onPress={() => {
                  setSelected(e.symbol);
                  if (Platform.OS !== "web") Haptics.selectionAsync();
                }}
                testID={`etf-chip-${e.symbol}`}
              >
                <View style={[s.chipDot, { backgroundColor: e.color }]} />
                <Text style={[s.chipText, { color: active ? colors.bg : colors.textPrimary }]}>{e.symbol}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Hero price card */}
        <View style={[s.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.heroTicker, { color: colors.textPrimary }]}>{meta.symbol}</Text>
              <Text style={[s.heroName, { color: colors.textSecondary }]} numberOfLines={1}>{meta.name}</Text>
            </View>
            {loading && !current ? <ActivityIndicator color={colors.textPrimary} /> : null}
          </View>

          <LineChart.Provider data={slicedPoints.length > 0 ? slicedPoints : [{ timestamp: 0, value: 0 }]}>
            <View style={s.priceRow}>
              <LineChart.PriceText
                style={[s.bigPrice, { color: colors.textPrimary }]}
                format={({ value }) => {
                  "worklet";
                  if (!value) return rangeStats?.last ? `$${rangeStats.last.toFixed(2)}` : "--";
                  return `$${Number(value).toFixed(2)}`;
                }}
              />
            </View>
            <View style={s.subRow}>
              <View style={[s.changePill, { backgroundColor: positive ? colors.positiveBg : colors.negativeBg }]}>
                <Ionicons name={positive ? "caret-up" : "caret-down"} size={11} color={accent} />
                <Text style={[s.changePillText, { color: accent }]}>
                  {rangeStats ? `${positive ? "+" : ""}${rangeStats.change.toFixed(2)} (${positive ? "+" : ""}${rangeStats.pct.toFixed(2)}%)` : "—"}
                </Text>
              </View>
              <LineChart.DatetimeText
                style={[s.dateText, { color: colors.textTertiary }]}
                format={({ value }) => {
                  "worklet";
                  if (!value || value === 0) return range.label;
                  const d = new Date(value);
                  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                }}
              />
            </View>

            {/* Chart */}
            {slicedPoints.length >= 2 ? (
              <LineChart height={210} width={undefined as any}>
                <LineChart.Path color={accent} width={2.5}>
                  <LineChart.Gradient color={accent} />
                </LineChart.Path>
                <LineChart.CursorCrosshair color={accent}>
                  <LineChart.Tooltip
                    textStyle={{ color: colors.textPrimary, fontWeight: "700", fontSize: 12 }}
                    style={{ backgroundColor: colors.surfaceElevated, borderRadius: radii.sm, padding: 6 }}
                  />
                </LineChart.CursorCrosshair>
              </LineChart>
            ) : (
              <View style={[s.chartPlaceholder, { borderColor: colors.border }]}>
                {current?.error === "rate_limited" ? (
                  <Text style={[s.placeholderText, { color: colors.textSecondary }]}>Daily quote limit reached. Try again later.</Text>
                ) : current?.error ? (
                  <Text style={[s.placeholderText, { color: colors.textSecondary }]}>Chart data unavailable.</Text>
                ) : (
                  <ActivityIndicator color={colors.textPrimary} />
                )}
              </View>
            )}
          </LineChart.Provider>

          {/* Range selector */}
          <View style={[s.rangeRow, { borderTopColor: colors.border }]}>
            {RANGES.map((r) => {
              const active = r.key === range.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  style={[s.rangeBtn, active && { backgroundColor: colors.surfaceElevated }]}
                  onPress={() => {
                    setRange(r);
                    if (Platform.OS !== "web") Haptics.selectionAsync();
                  }}
                  testID={`range-${r.key}`}
                >
                  <Text style={[s.rangeText, { color: active ? colors.textPrimary : colors.textTertiary }]}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Mini cards for the other 2 ETFs */}
        <Text style={[s.sectionEyebrow, { color: colors.textTertiary }]}>OTHER ETFs</Text>
        <View style={s.miniGrid}>
          {ETFS.filter((e) => e.symbol !== selected).map((e) => (
            <MiniEtfCard
              key={e.symbol}
              meta={e}
              h={history[e.symbol]}
              onPress={() => {
                setSelected(e.symbol);
                if (Platform.OS !== "web") Haptics.selectionAsync();
              }}
              colors={colors}
              radii={radii}
              spacing={spacing}
            />
          ))}
        </View>

        <Text style={[s.disclaimer, { color: colors.textTertiary }]}>
          Live prices via Alpha Vantage. Free tier caps daily quotes — some data may be cached.
        </Text>
      </ScrollView>
    </View>
  );
}

function MiniEtfCard({
  meta,
  h,
  onPress,
  colors,
  radii,
  spacing,
}: any) {
  const points = (h?.points ?? []).slice(-30).map((p: any) => {
    const dateTime = new Date(`${p.date}T00:00:00Z`).getTime();
    return { timestamp: dateTime, value: p.value };
  });
  const first = points[0]?.value ?? 0;
  const last = points[points.length - 1]?.value ?? 0;
  const change = last - first;
  const pct = first ? (change / first) * 100 : 0;
  const pos = change >= 0;
  const accent = pos ? colors.positiveText : colors.negativeText;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      testID={`mini-etf-${meta.symbol}`}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: meta.color }} />
        <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "900" }}>{meta.symbol}</Text>
      </View>
      <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "900", letterSpacing: -0.4 }}>
        {last ? `$${last.toFixed(2)}` : "—"}
      </Text>
      <Text style={{ color: accent, fontSize: 12, fontWeight: "700", marginTop: 2 }}>
        {first ? `${pos ? "+" : ""}${pct.toFixed(2)}%` : "—"}
      </Text>
      {points.length >= 2 ? (
        <View style={{ marginTop: 8, height: 48 }}>
          <LineChart.Provider data={points}>
            <LineChart height={48}>
              <LineChart.Path color={accent} width={1.8}>
                <LineChart.Gradient color={accent} />
              </LineChart.Path>
            </LineChart>
          </LineChart.Provider>
        </View>
      ) : (
        <View style={{ height: 48 }} />
      )}
    </Pressable>
  );
}

function makeStyles(colors: any, radii: any, spacing: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
    },
    logoBadge: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: colors.brandSoft,
      alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: colors.border,
    },
    logoBadgeText: { fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
    brand: { color: colors.textPrimary, fontSize: 22, fontWeight: "900", letterSpacing: -0.8 },
    brandSub: { color: colors.textTertiary, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginTop: 2 },
    liveBadge: {
      flexDirection: "row", alignItems: "center", gap: 5,
      paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: radii.pill,
      backgroundColor: colors.positiveBg,
    },
    dot: { width: 6, height: 6, borderRadius: 3 },
    liveBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
    chipsRow: {
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
      paddingBottom: spacing.lg,
    },
    chip: {
      flexDirection: "row", alignItems: "center", gap: 6,
      height: 38, paddingHorizontal: 14,
      borderRadius: radii.pill,
      backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
    },
    chipDot: { width: 7, height: 7, borderRadius: 4 },
    chipText: { fontSize: 13, fontWeight: "800" },
    heroCard: {
      marginHorizontal: spacing.xl,
      borderRadius: radii.xxl,
      borderWidth: 1,
      paddingTop: spacing.xl,
    },
    heroTopRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    heroTicker: { fontSize: 16, fontWeight: "900", letterSpacing: 1 },
    heroName: { fontSize: 12, fontWeight: "600", marginTop: 2 },
    priceRow: { paddingHorizontal: spacing.xl, marginTop: spacing.sm },
    bigPrice: { fontSize: 40, fontWeight: "900", letterSpacing: -1.5 },
    subRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.xl,
      marginTop: 4,
      marginBottom: spacing.lg,
    },
    changePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radii.sm },
    changePillText: { fontSize: 12, fontWeight: "800" },
    dateText: { fontSize: 11, fontWeight: "700" },
    chartPlaceholder: {
      height: 210,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      alignItems: "center", justifyContent: "center",
      paddingHorizontal: spacing.xl,
    },
    placeholderText: { fontSize: 13, fontWeight: "600", textAlign: "center" },
    rangeRow: {
      flexDirection: "row",
      borderTopWidth: 1,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      marginTop: spacing.md,
    },
    rangeBtn: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: radii.md },
    rangeText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
    sectionEyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 2, paddingHorizontal: spacing.xl, marginTop: spacing.xxl, marginBottom: spacing.md },
    miniGrid: { flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.xl },
    disclaimer: {
      fontSize: 11,
      paddingHorizontal: spacing.xl,
      marginTop: spacing.xxl,
      fontStyle: "italic",
      lineHeight: 16,
    },
  });
}
