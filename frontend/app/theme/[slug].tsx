import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, NewsSentiment, Quote, ThemeDetail } from "@/src/api/client";
import { useWatchlist } from "@/src/state/watchlist";
import { useThemeTokens } from "@/src/theme/tokens";

// Static ELI5 micro-thesis per theme — plain-English explanations.
const ELI5: Record<string, { eli5: string; analogy: string }> = {
  "artificial-intelligence": {
    eli5: "Companies are spending hundreds of billions building 'AI factories' (data centers full of chips) so apps can talk, see, and reason like humans. Whoever sells the picks and shovels — chips, power, software platforms — wins big.",
    analogy: "Think of AI like the early days of electricity. The folks who got rich weren't the lightbulb users — they were the ones building power plants and copper wires.",
  },
  "electric-vehicles": {
    eli5: "Gasoline cars are slowly being replaced by battery-powered ones. The hard part isn't making EVs cool — it's making the batteries cheap, the charging stations everywhere, and the supply chain reliable.",
    analogy: "It's like the shift from flip phones to smartphones, but with steel, chemistry, and government policy added in.",
  },
  "clean-energy": {
    eli5: "Solar panels and wind turbines now produce cheaper electricity than coal or gas in most places. The next bottleneck is storing that energy for when the sun isn't shining or the wind isn't blowing.",
    analogy: "Imagine a giant battery for your whole city. The companies that build those batteries — and the wires that connect everything — collect tolls forever.",
  },
  "cybersecurity": {
    eli5: "Every company on Earth is getting hacked, so security software is one of the last things they'll ever cut from the budget. The winners are platforms that protect laptops, identities, and cloud apps all in one place.",
    analogy: "It's the burglar alarm industry — but the burglars get smarter every year and homeowners have no choice but to keep upgrading.",
  },
  "semiconductors": {
    eli5: "Tiny silicon chips run literally everything — phones, cars, AI, fridges. Only a handful of companies in the world can actually make the most advanced ones, which makes them strategically priceless.",
    analogy: "Imagine if only three bakeries on Earth could make sourdough — and everyone, from McDonald's to NASA, needed sourdough every day.",
  },
  "cloud-computing": {
    eli5: "Instead of buying your own servers, you rent computing power from giant data centers run by Amazon, Microsoft, or Google. Most of the world hasn't fully made that switch yet, so it's still growing.",
    analogy: "It's the same shift as people moving from owning a car to using Uber — except for computing power.",
  },
  "fintech": {
    eli5: "Software is eating the old, slow, paper-based finance world. Payments, lending, investing — all are being rebuilt on faster, mobile-first rails by both startups and the big card networks.",
    analogy: "Think of how Netflix replaced Blockbuster. Fintech is doing the same thing to bank tellers, paper checks, and wire transfers.",
  },
  "biotechnology": {
    eli5: "We can now edit DNA like text and design drugs with AI. Weight-loss shots (GLP-1s), one-shot cures for genetic diseases, and faster drug discovery are reshaping healthcare economics.",
    analogy: "It's like going from rewriting books by hand to using a word processor — except the 'book' is your body.",
  },
  "space-economy": {
    eli5: "Rockets are now reusable, which made getting to space ~10x cheaper. That opened up businesses like satellite internet, Earth-imaging, and a brand new defense industry — all in orbit.",
    analogy: "It's like when airplanes went from a luxury for the rich to mass-market travel. Once costs drop, everything builds on top.",
  },
  "ecommerce": {
    eli5: "Buying stuff online is still only a small slice of total shopping globally. The winners own the logistics — warehouses, delivery, returns — not just the website you click on.",
    analogy: "It's like the railroad era: lots of stores and shoppers, but the people laying the tracks (warehouses, trucks, drones) ended up owning the future.",
  },
};

const DEFAULT_ELI5 = {
  eli5: "A long-running structural trend that's reshaping multiple industries at once. The names below are the most exposed pure-plays and infrastructure providers.",
  analogy: "Think of it like a tide — when it comes in, every well-positioned boat rises with it.",
};

export default function ThemeDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { hasTheme, toggleTheme, hasStock, toggleStock } = useWatchlist();
  const { colors, radii, spacing } = useThemeTokens();

  const [theme, setTheme] = useState<ThemeDetail | null>(null);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [news, setNews] = useState<NewsSentiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const t = await api.getTheme(slug);
      setTheme(t);
      setLoading(false);

      // Fetch quotes
      setQuotesLoading(true);
      const symbols = t.stocks.map((s) => s.symbol);
      api
        .getQuotes(symbols)
        .then((r) => {
          const map: Record<string, Quote> = {};
          r.quotes.forEach((q) => (map[q.symbol] = q));
          setQuotes(map);
        })
        .catch(() => {})
        .finally(() => setQuotesLoading(false));

      // Fetch AI news summary (uses top stock)
      const topTicker = t.stocks[0]?.symbol;
      if (topTicker) {
        setNewsLoading(true);
        api
          .getNewsSentiment(topTicker)
          .then(setNews)
          .catch(() => setNews(null))
          .finally(() => setNewsLoading(false));
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load theme");
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const s = makeStyles(colors, radii, spacing);

  if (loading) {
    return (
      <View style={[s.container, s.center]} testID="theme-loading">
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  if (error || !theme) {
    return (
      <View style={[s.container, s.center]} testID="theme-error">
        <Text style={s.errorText}>{error ?? "Theme not found"}</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtnPlain}>
          <Text style={s.backBtnPlainText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const eli5 = ELI5[theme.slug] ?? DEFAULT_ELI5;
  const saved = hasTheme(theme.slug);

  return (
    <View style={s.container} testID={`theme-screen-${theme.slug}`}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.hero}>
          <Image source={{ uri: theme.hero_image_url }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={200} />
          <LinearGradient
            colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0.6)", colors.bg]}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[s.heroTopRow, { top: insets.top + 8 }]}>
            <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} testID="back-btn">
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleTheme(theme.slug)} style={s.iconBtn} testID="save-theme-btn">
              <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={20} color={saved ? colors.brand : "#fff"} />
            </TouchableOpacity>
          </View>
          <View style={s.heroContent}>
            <View style={[s.categoryPill, { backgroundColor: `${theme.accent_color}26`, borderColor: `${theme.accent_color}66` }]}>
              <Text style={[s.categoryPillText, { color: theme.accent_color }]}>{theme.category.toUpperCase()}</Text>
            </View>
            <Text style={s.heroTitle}>{theme.name}</Text>
            <Text style={s.heroTagline}>{theme.tagline}</Text>
          </View>
        </View>

        {/* ELI5 */}
        <Section title="Explain Like I'm 5" eyebrow="ELI5" colors={colors} spacing={spacing}>
          <View style={[s.eli5Card, { borderColor: theme.accent_color }]}>
            <View style={s.eli5Badge}>
              <Ionicons name="bulb" size={14} color={theme.accent_color} />
              <Text style={[s.eli5BadgeText, { color: theme.accent_color }]}>PLAIN ENGLISH</Text>
            </View>
            <Text style={s.eli5Text}>{eli5.eli5}</Text>
            <View style={[s.analogyBox, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="chatbubble-ellipses" size={14} color={colors.textSecondary} style={{ marginTop: 2 }} />
              <Text style={s.analogyText}>{eli5.analogy}</Text>
            </View>
          </View>
        </Section>

        {/* AI: Why Price is Moving */}
        <Section
          title="Why It's Moving"
          eyebrow="AI NEWS PULSE"
          right={newsLoading ? <ActivityIndicator size="small" color={colors.textTertiary} /> : null}
          colors={colors}
          spacing={spacing}
        >
          <View style={s.newsCard}>
            <View style={s.newsHeader}>
              <View style={[s.aiAvatar, { backgroundColor: colors.brandSoft }]}>
                <Ionicons name="sparkles" size={16} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.newsTitle}>AI Summary{news?.ticker ? ` · ${news.ticker}` : ""}</Text>
                <Text style={s.newsSub}>Claude Sonnet 4.5 · Updated hourly</Text>
              </View>
            </View>
            <Text style={s.newsBody}>
              {newsLoading
                ? "Analyzing the latest headlines..."
                : news?.summary || "No fresh AI pulse available right now. Check back shortly."}
            </Text>
            {!!news?.articles?.length && (
              <View style={s.headlines}>
                <Text style={s.headlinesEyebrow}>RECENT HEADLINES</Text>
                {news.articles.slice(0, 4).map((a, i) => (
                  <Pressable
                    key={i}
                    onPress={() => a.url && Linking.openURL(a.url)}
                    style={s.headlineRow}
                    testID={`news-article-${i}`}
                  >
                    <View style={[s.sentimentDot, { backgroundColor: sentimentColor(a.sentiment, colors) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.headlineText} numberOfLines={2}>{a.title}</Text>
                      <Text style={s.headlineSource}>{a.source || "Source"} · {a.sentiment || "Neutral"}</Text>
                    </View>
                    <Ionicons name="open-outline" size={14} color={colors.textTertiary} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </Section>

        {/* Top 5 Stocks */}
        <Section
          title="Top 5 Stocks"
          eyebrow="HOW TO PLAY IT"
          right={quotesLoading ? <ActivityIndicator size="small" color={colors.textTertiary} /> : null}
          colors={colors}
          spacing={spacing}
        >
          <View style={s.stockList}>
            {theme.stocks.slice(0, 5).map((stock, idx) => {
              const q = quotes[stock.symbol];
              const starred = hasStock(stock.symbol);
              return (
                <Pressable
                  key={stock.symbol}
                  style={[s.stockRow, idx === Math.min(4, theme.stocks.length - 1) && { borderBottomWidth: 0 }]}
                  onPress={() => toggleStock(stock.symbol)}
                  testID={`stock-row-${stock.symbol}`}
                >
                  <View style={[s.rank, { borderColor: theme.accent_color }]}>
                    <Text style={[s.rankText, { color: theme.accent_color }]}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.tickerText}>{stock.symbol}</Text>
                    <Text style={s.tickerSub} numberOfLines={1}>{stock.name}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={s.priceText}>{q?.price != null ? `$${q.price.toFixed(2)}` : "—"}</Text>
                    <ChangePill q={q} colors={colors} radii={radii} />
                  </View>
                  <View style={s.starWrap}>
                    <Ionicons name={starred ? "star" : "star-outline"} size={18} color={starred ? colors.brand : colors.textTertiary} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {/* Micro-thesis */}
        <Section title="Micro-Thesis" eyebrow="WHY THIS MATTERS" colors={colors} spacing={spacing}>
          <View style={s.thesisCard}>
            {theme.micro_thesis.map((p, i) => (
              <View key={i} style={s.thesisRow}>
                <View style={[s.bullet, { backgroundColor: theme.accent_color }]} />
                <Text style={s.thesisText}>{p}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* Key Risks */}
        <Section title="Key Risks" eyebrow="WHAT COULD GO WRONG" colors={colors} spacing={spacing}>
          <View style={s.thesisCard}>
            {theme.key_risks.map((r, i) => (
              <View key={i} style={s.thesisRow}>
                <View style={[s.riskBullet, { backgroundColor: colors.negativeBg }]}>
                  <Ionicons name="warning" size={11} color={colors.negativeText} />
                </View>
                <Text style={s.thesisText}>{r}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Text style={s.disclaimer}>
          Not investment advice. Prices via Alpha Vantage (free tier — some tickers may show a dash until quota resets).
        </Text>
      </ScrollView>
    </View>
  );
}

function sentimentColor(sentiment: string | undefined, colors: any) {
  const s = (sentiment || "").toLowerCase();
  if (s.includes("bullish") || s.includes("positive")) return colors.positiveText;
  if (s.includes("bearish") || s.includes("negative")) return colors.negativeText;
  return colors.textTertiary;
}

function ChangePill({ q, colors, radii }: any) {
  if (!q || q.change == null || q.change_percent == null) return <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: "800" }}>—</Text>;
  const pos = q.change >= 0;
  return (
    <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: radii.sm, marginTop: 3, backgroundColor: pos ? colors.positiveBg : colors.negativeBg }}>
      <Text style={{ fontSize: 11, fontWeight: "800", color: pos ? colors.positiveText : colors.negativeText }}>
        {pos ? "+" : ""}{q.change_percent.toFixed(2)}%
      </Text>
    </View>
  );
}

function Section({ title, eyebrow, children, right, colors, spacing }: any) {
  return (
    <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xxl }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: spacing.md, gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: "800", letterSpacing: 2, marginBottom: 2 }}>{eyebrow}</Text>
          <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: "900", letterSpacing: -0.5 }}>{title}</Text>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

function makeStyles(colors: any, radii: any, spacing: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    center: { alignItems: "center", justifyContent: "center", gap: spacing.md },
    errorText: { color: colors.textSecondary, padding: spacing.xl, textAlign: "center" },
    hero: { height: 340, backgroundColor: colors.surface, justifyContent: "flex-end", overflow: "hidden" },
    heroTopRow: { position: "absolute", left: spacing.lg, right: spacing.lg, flexDirection: "row", justifyContent: "space-between", zIndex: 2 },
    iconBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    },
    heroContent: { padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.sm },
    categoryPill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill, borderWidth: 1, marginBottom: spacing.sm },
    categoryPillText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
    heroTitle: { color: "#fff", fontSize: 36, fontWeight: "900", letterSpacing: -1.5, lineHeight: 38 },
    heroTagline: { color: "rgba(255,255,255,0.85)", fontSize: 15, fontWeight: "500", lineHeight: 21 },
    eli5Card: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xl, borderWidth: 1, gap: spacing.md },
    eli5Badge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: colors.surfaceElevated },
    eli5BadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
    eli5Text: { color: colors.textPrimary, fontSize: 15, fontWeight: "600", lineHeight: 23 },
    analogyBox: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderRadius: radii.md },
    analogyText: { flex: 1, color: colors.textSecondary, fontSize: 13, fontWeight: "500", lineHeight: 20, fontStyle: "italic" },
    newsCard: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.border },
    newsHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
    aiAvatar: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    newsTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: "900" },
    newsSub: { color: colors.textTertiary, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginTop: 1 },
    newsBody: { color: colors.textPrimary, fontSize: 15, fontWeight: "500", lineHeight: 22 },
    headlines: { marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
    headlinesEyebrow: { color: colors.textTertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginBottom: spacing.xs },
    headlineRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingVertical: 8 },
    sentimentDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
    headlineText: { color: colors.textPrimary, fontSize: 13, fontWeight: "700", lineHeight: 18 },
    headlineSource: { color: colors.textTertiary, fontSize: 11, fontWeight: "600", marginTop: 2 },
    stockList: { backgroundColor: colors.surface, borderRadius: radii.xl, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border },
    stockRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.md },
    rank: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
    rankText: { fontWeight: "900", fontSize: 13 },
    tickerText: { color: colors.textPrimary, fontSize: 15, fontWeight: "800" },
    tickerSub: { color: colors.textTertiary, fontSize: 12, fontWeight: "500", marginTop: 2 },
    priceText: { color: colors.textPrimary, fontSize: 15, fontWeight: "900", letterSpacing: -0.2 },
    starWrap: { paddingLeft: spacing.sm, width: 30, alignItems: "center" },
    thesisCard: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
    thesisRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
    bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
    riskBullet: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", marginTop: 2 },
    thesisText: { flex: 1, color: colors.textSecondary, fontSize: 14, fontWeight: "500", lineHeight: 21 },
    disclaimer: { color: colors.textTertiary, fontSize: 11, marginTop: spacing.xxl, paddingHorizontal: spacing.xl, fontWeight: "500", fontStyle: "italic", lineHeight: 16 },
    backBtnPlain: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
    backBtnPlainText: { color: colors.textPrimary, fontWeight: "700" },
  });
}
