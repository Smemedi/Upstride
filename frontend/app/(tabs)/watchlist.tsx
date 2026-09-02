import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, Quote, ThemeSummary } from "@/src/api/client";
import { useWatchlist } from "@/src/state/watchlist";
import { useThemeTokens } from "@/src/theme/tokens";

type Mode = "themes" | "stocks";

export default function WatchlistScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, radii, spacing } = useThemeTokens();
  const { themes: themeSlugs, stocks: stockSymbols, toggleTheme, toggleStock } = useWatchlist();

  const [mode, setMode] = useState<Mode>("themes");
  const [themeData, setThemeData] = useState<ThemeSummary[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadThemes = useCallback(async () => {
    if (themeSlugs.length === 0) {
      setThemeData([]);
      return;
    }
    setLoading(true);
    try {
      const all = await api.listThemes();
      setThemeData(all.themes.filter((t) => themeSlugs.includes(t.slug)));
    } catch {
      setThemeData([]);
    } finally {
      setLoading(false);
    }
  }, [themeSlugs]);

  const loadQuotes = useCallback(async () => {
    if (stockSymbols.length === 0) {
      setQuotes([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.getQuotes(stockSymbols);
      setQuotes(res.quotes);
    } catch {
      setQuotes(stockSymbols.map((s) => ({ symbol: s, price: null, change: null, change_percent: null, error: "fetch_failed" })));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [stockSymbols]);

  useEffect(() => {
    if (mode === "themes") loadThemes();
    else loadQuotes();
  }, [mode, loadThemes, loadQuotes]);

  const s = makeStyles(colors, radii, spacing);

  return (
    <View style={s.container} testID="watchlist-screen">
      <View style={[s.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={s.eyebrow}>SAVED</Text>
        <Text style={s.title}>Watchlist</Text>

        <View style={s.segmented}>
          <SegBtn label={`Themes · ${themeSlugs.length}`} active={mode === "themes"} onPress={() => setMode("themes")} colors={colors} radii={radii} testID="seg-themes" />
          <SegBtn label={`Stocks · ${stockSymbols.length}`} active={mode === "stocks"} onPress={() => setMode("stocks")} colors={colors} radii={radii} testID="seg-stocks" />
        </View>
      </View>

      {mode === "themes" ? (
        <FlatList
          data={themeData}
          keyExtractor={(t) => t.slug}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/theme/${item.slug}`)}
              style={s.themeRow}
              testID={`watchlist-theme-${item.slug}`}
            >
              <Image source={{ uri: item.hero_image_url }} style={s.themeThumb} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={s.themeName}>{item.name}</Text>
                <Text style={s.themeSub} numberOfLines={1}>{item.category} · {item.stock_count} stocks</Text>
              </View>
              <TouchableOpacity onPress={() => toggleTheme(item.slug)} hitSlop={10}>
                <Ionicons name="bookmark" size={20} color={colors.brand} />
              </TouchableOpacity>
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="grid-outline"
              title="No saved themes yet"
              subtitle="Tap the bookmark icon on any theme to save it here."
              ctaLabel="Browse themes"
              onCta={() => router.push("/themes")}
              colors={colors} radii={radii} spacing={spacing}
              testID="empty-themes"
            />
          }
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadThemes().finally(() => setRefreshing(false)); }}
        />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.list}>
          {loading && quotes.length === 0 ? (
            <View style={s.center}><ActivityIndicator color={colors.textPrimary} /></View>
          ) : quotes.length === 0 ? (
            <EmptyState
              icon="trending-up-outline"
              title="No saved stocks yet"
              subtitle="Open a theme and tap the star next to a ticker to save it."
              ctaLabel="Browse themes"
              onCta={() => router.push("/themes")}
              colors={colors} radii={radii} spacing={spacing}
              testID="empty-stocks"
            />
          ) : (
            quotes.map((q) => (
              <View key={q.symbol} style={s.quoteRow} testID={`watchlist-stock-${q.symbol}`}>
                <View style={s.tickerAvatar}>
                  <Text style={s.tickerAvatarText}>{q.symbol.slice(0, 2)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.tickerText}>{q.symbol}</Text>
                  <Text style={s.tickerSub}>
                    {q.error === "rate_limited" ? "Daily quote limit reached" : q.error ? "Price unavailable" : "Last close"}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={s.priceText}>{q.price != null ? `$${q.price.toFixed(2)}` : "—"}</Text>
                  <ChangePill change={q.change} pct={q.change_percent} colors={colors} radii={radii} />
                </View>
                <TouchableOpacity onPress={() => toggleStock(q.symbol)} hitSlop={10} style={{ marginLeft: 8 }}>
                  <Ionicons name="star" size={18} color={colors.brand} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function ChangePill({ change, pct, colors, radii }: any) {
  if (change == null || pct == null) return <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: "800" }}>—</Text>;
  const pos = change >= 0;
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.sm, marginTop: 4, backgroundColor: pos ? colors.positiveBg : colors.negativeBg }}>
      <Text style={{ fontSize: 11, fontWeight: "800", color: pos ? colors.positiveText : colors.negativeText }}>
        {pos ? "+" : ""}{pct.toFixed(2)}%
      </Text>
    </View>
  );
}

function SegBtn({ label, active, onPress, colors, radii, testID }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[{ flex: 1, paddingVertical: 10, borderRadius: radii.md, alignItems: "center" }, active && { backgroundColor: colors.textPrimary }]}
      testID={testID}
    >
      <Text style={{ color: active ? colors.bg : colors.textSecondary, fontWeight: "700", fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function EmptyState({ icon, title, subtitle, ctaLabel, onCta, colors, radii, spacing, testID }: any) {
  return (
    <View style={{ alignItems: "center", paddingVertical: spacing.xxxl * 2, paddingHorizontal: spacing.xl, gap: spacing.md }} testID={testID}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border }}>
        <Ionicons name={icon} size={28} color={colors.textTertiary} />
      </View>
      <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "800" }}>{title}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "center", maxWidth: 280, lineHeight: 19 }}>{subtitle}</Text>
      <TouchableOpacity onPress={onCta} style={{ marginTop: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: 12, backgroundColor: colors.textPrimary, borderRadius: radii.pill }} testID={`${testID}-cta`}>
        <Text style={{ color: colors.bg, fontWeight: "800", fontSize: 13 }}>{ctaLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(colors: any, radii: any, spacing: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
    eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 2, color: colors.textTertiary, marginBottom: 4 },
    title: { fontSize: 36, fontWeight: "900", letterSpacing: -1.5, color: colors.textPrimary, marginBottom: spacing.lg },
    segmented: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radii.lg, padding: 4, borderWidth: 1, borderColor: colors.border },
    list: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
    themeRow: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1, borderColor: colors.border,
      gap: spacing.md,
    },
    themeThumb: { width: 56, height: 56, borderRadius: radii.md, backgroundColor: colors.surfaceElevated },
    themeName: { color: colors.textPrimary, fontSize: 15, fontWeight: "800", marginBottom: 2 },
    themeSub: { color: colors.textSecondary, fontSize: 12, fontWeight: "500" },
    quoteRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.md },
    tickerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
    tickerAvatarText: { color: colors.textPrimary, fontWeight: "900", fontSize: 12 },
    tickerText: { color: colors.textPrimary, fontSize: 15, fontWeight: "800" },
    tickerSub: { color: colors.textTertiary, fontSize: 11, fontWeight: "500", marginTop: 2 },
    priceText: { color: colors.textPrimary, fontSize: 16, fontWeight: "900", letterSpacing: -0.3 },
    center: { padding: spacing.xxxl, alignItems: "center" },
  });
}
