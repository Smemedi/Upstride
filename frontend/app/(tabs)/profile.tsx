import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Linking, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/src/state/theme";
import { useWatchlist } from "@/src/state/watchlist";
import { useThemeTokens } from "@/src/theme/tokens";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mode, toggle, setMode } = useTheme();
  const { colors, radii, spacing } = useThemeTokens();
  const { themes, stocks } = useWatchlist();

  const isDark = mode === "dark";
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const s = makeStyles(colors, radii, spacing);

  return (
    <View style={s.container} testID="profile-screen">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        <View style={[s.header, { paddingTop: insets.top + spacing.md }]}>
          <Text style={s.eyebrow}>ACCOUNT</Text>
          <Text style={s.title}>Profile</Text>
        </View>

        {/* Brand identity card */}
        <View style={s.brandCard}>
          <LinearGradient
            colors={isDark ? ["#0F2A1E", "#0A0A0A"] : ["#E6F8EF", "#FFFFFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={s.brandCardInner}>
            <View style={s.brandLogo}>
              <Text style={[s.brandLogoText, { color: colors.brand }]}>U</Text>
            </View>
            <Text style={s.brandTitle}>Upstride</Text>
            <Text style={s.brandSubtitle}>Themes · ETFs · AI Signals</Text>
            <View style={s.brandStatsRow}>
              <Stat label="Saved Themes" value={String(themes.length)} colors={colors} />
              <View style={[s.statDivider, { backgroundColor: colors.border }]} />
              <Stat label="Saved Stocks" value={String(stocks.length)} colors={colors} />
            </View>
          </View>
        </View>

        {/* Appearance */}
        <Section title="Appearance" colors={colors} spacing={spacing}>
          <View style={s.card}>
            <View style={s.row}>
              <View style={s.rowLeft}>
                <View style={[s.iconWrap, { backgroundColor: colors.brandSoft }]}>
                  <Ionicons name={isDark ? "moon" : "sunny"} size={18} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>Dark mode</Text>
                  <Text style={s.rowSub}>Currently using {isDark ? "dark" : "light"} theme</Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggle}
                trackColor={{ false: colors.border, true: colors.brand }}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
                testID="theme-toggle"
              />
            </View>
            <View style={[s.divider, { backgroundColor: colors.border }]} />
            <View style={s.themePreviewRow}>
              <PreviewSwatch
                label="Dark"
                active={isDark}
                onPress={() => setMode("dark")}
                primary="#0A0A0A"
                accent="#00D084"
                colors={colors}
                testID="theme-dark"
              />
              <PreviewSwatch
                label="Light"
                active={!isDark}
                onPress={() => setMode("light")}
                primary="#F7F8FA"
                accent="#00A86B"
                colors={colors}
                testID="theme-light"
              />
            </View>
          </View>
        </Section>

        {/* Quick links */}
        <Section title="Browse" colors={colors} spacing={spacing}>
          <View style={s.card}>
            <NavRow
              icon="trending-up"
              title="ETFs"
              subtitle="VOO · SMH · SPY interactive charts"
              onPress={() => router.push("/")}
              colors={colors} spacing={spacing}
              testID="nav-etfs"
            />
            <View style={[s.divider, { backgroundColor: colors.border }]} />
            <NavRow
              icon="grid"
              title="Themes"
              subtitle="Curated investment narratives"
              onPress={() => router.push("/themes")}
              colors={colors} spacing={spacing}
              testID="nav-themes"
            />
            <View style={[s.divider, { backgroundColor: colors.border }]} />
            <NavRow
              icon="bookmark"
              title="Watchlist"
              subtitle={`${themes.length} themes, ${stocks.length} stocks saved`}
              onPress={() => router.push("/watchlist")}
              colors={colors} spacing={spacing}
              testID="nav-watchlist"
            />
          </View>
        </Section>

        {/* About */}
        <Section title="About" colors={colors} spacing={spacing}>
          <View style={s.card}>
            <View style={s.row}>
              <View style={s.rowLeft}>
                <View style={[s.iconWrap, { backgroundColor: colors.neutralBg }]}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>App version</Text>
                  <Text style={s.rowSub}>v{version}</Text>
                </View>
              </View>
            </View>
            <View style={[s.divider, { backgroundColor: colors.border }]} />
            <View style={s.row}>
              <View style={s.rowLeft}>
                <View style={[s.iconWrap, { backgroundColor: colors.neutralBg }]}>
                  <Ionicons name="flash" size={18} color={colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>Data sources</Text>
                  <Text style={s.rowSub}>Alpha Vantage quotes · Claude Sonnet 4.5 summaries</Text>
                </View>
              </View>
            </View>
            <View style={[s.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              onPress={() => Linking.openURL("https://www.alphavantage.co/")}
              style={s.row}
              testID="open-alpha"
            >
              <View style={s.rowLeft}>
                <View style={[s.iconWrap, { backgroundColor: colors.neutralBg }]}>
                  <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>Alpha Vantage</Text>
                  <Text style={s.rowSub}>Open in browser</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </Section>

        <Text style={s.footer}>Made with care · Not investment advice</Text>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, colors }: any) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: "900", letterSpacing: -0.5 }}>{value}</Text>
      <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: "700", letterSpacing: 1, marginTop: 2 }}>{label.toUpperCase()}</Text>
    </View>
  );
}

function Section({ title, children, colors, spacing }: any) {
  return (
    <View style={{ marginTop: spacing.xl, paddingHorizontal: spacing.xl }}>
      <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: "800", letterSpacing: 2, marginBottom: spacing.sm }}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function NavRow({ icon, title, subtitle, onPress, colors, spacing, testID }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, gap: spacing.md }} testID={testID}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={icon} size={18} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: "800" }}>{title}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "500", marginTop: 2 }}>{subtitle}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

function PreviewSwatch({ label, active, onPress, primary, accent, colors, testID }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flex: 1, borderRadius: 14, padding: 4, borderWidth: 2, borderColor: active ? colors.brand : colors.border }}
      testID={testID}
    >
      <View style={{ borderRadius: 10, overflow: "hidden", backgroundColor: primary, height: 64, padding: 8, justifyContent: "space-between" }}>
        <View style={{ width: 22, height: 4, borderRadius: 2, backgroundColor: accent }} />
        <View style={{ width: "60%", height: 4, borderRadius: 2, backgroundColor: "rgba(150,150,150,0.4)" }} />
      </View>
      <Text style={{ color: active ? colors.brand : colors.textSecondary, fontWeight: "800", fontSize: 12, textAlign: "center", marginTop: 6 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function makeStyles(colors: any, radii: any, spacing: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
    eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 2, color: colors.textTertiary, marginBottom: 4 },
    title: { fontSize: 36, fontWeight: "900", letterSpacing: -1.5, color: colors.textPrimary },
    brandCard: {
      marginHorizontal: spacing.xl,
      borderRadius: radii.xxl,
      borderWidth: 1, borderColor: colors.border,
      overflow: "hidden",
    },
    brandCardInner: {
      padding: spacing.xl,
      alignItems: "center",
    },
    brandLogo: {
      width: 56, height: 56, borderRadius: 16,
      backgroundColor: colors.brandSoft,
      alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: colors.border,
    },
    brandLogoText: { fontSize: 28, fontWeight: "900", letterSpacing: -1 },
    brandTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: "900", letterSpacing: -0.8, marginTop: spacing.sm },
    brandSubtitle: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 1, marginTop: 4 },
    brandStatsRow: { flexDirection: "row", marginTop: spacing.lg, width: "100%", paddingHorizontal: spacing.md },
    statDivider: { width: 1 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      paddingHorizontal: spacing.lg,
      borderWidth: 1, borderColor: colors.border,
    },
    row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, gap: spacing.md },
    rowLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 },
    iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    rowTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "800" },
    rowSub: { color: colors.textSecondary, fontSize: 12, fontWeight: "500", marginTop: 2 },
    divider: { height: 1, marginHorizontal: -spacing.lg },
    themePreviewRow: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md },
    footer: { color: colors.textTertiary, fontSize: 11, textAlign: "center", marginTop: spacing.xxxl, fontStyle: "italic" },
  });
}
