import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, ThemeSummary } from "@/src/api/client";
import { useThemeTokens } from "@/src/theme/tokens";

export default function ThemesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, radii, spacing } = useThemeTokens();

  const [themes, setThemes] = useState<ThemeSummary[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean; cats?: string[] }) => {
      if (!opts?.silent) setLoading(true);
      setError(null);
      try {
        const cats = opts?.cats ?? selectedCats;
        const [tRes, cRes] = await Promise.all([
          api.listThemes(undefined, undefined, cats),
          allCategories.length === 0 ? api.listCategories() : Promise.resolve({ categories: allCategories }),
        ]);
        setThemes(tRes.themes);
        if (cRes.categories) setAllCategories(cRes.categories.filter((c) => c !== "All"));
      } catch (e: any) {
        setError(e?.message ?? "Failed to load");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedCats, allCategories]
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilter = (newCats: string[]) => {
    setSelectedCats(newCats);
    setFilterOpen(false);
    load({ cats: newCats });
  };

  const s = makeStyles(colors, radii, spacing);

  const header = useMemo(
    () => (
      <View style={[s.header, { paddingTop: insets.top + spacing.md }]} testID="themes-header">
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>EXPLORE</Text>
            <Text style={s.title}>Themes</Text>
          </View>
          <TouchableOpacity
            style={[s.filterBtn, selectedCats.length > 0 && { backgroundColor: colors.brandSoft, borderColor: colors.brand }]}
            onPress={() => setFilterOpen(true)}
            testID="filter-btn"
          >
            <Ionicons name="options-outline" size={18} color={selectedCats.length > 0 ? colors.brand : colors.textPrimary} />
            <Text style={[s.filterBtnText, selectedCats.length > 0 && { color: colors.brand }]}>
              Filter{selectedCats.length > 0 ? ` · ${selectedCats.length}` : ""}
            </Text>
          </TouchableOpacity>
        </View>

        {selectedCats.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: spacing.sm }}>
            {selectedCats.map((c) => (
              <View key={c} style={s.activeChip}>
                <Text style={s.activeChipText}>{c}</Text>
                <TouchableOpacity
                  onPress={() => applyFilter(selectedCats.filter((x) => x !== c))}
                  hitSlop={8}
                  testID={`remove-cat-${c}`}
                >
                  <Ionicons name="close" size={14} color={colors.brand} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity onPress={() => applyFilter([])} style={s.clearBtn} testID="clear-filters">
              <Text style={s.clearBtnText}>Clear all</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [insets.top, selectedCats, colors]
  );

  return (
    <View style={s.container} testID="themes-screen">
      <FlatList
        data={themes}
        keyExtractor={(t) => t.slug}
        ListHeaderComponent={header}
        stickyHeaderIndices={[0]}
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        renderItem={({ item }) => (
          <ThemeCard item={item} onPress={() => router.push(`/theme/${item.slug}`)} colors={colors} radii={radii} spacing={spacing} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
        ListEmptyComponent={
          loading ? (
            <View style={s.center}><ActivityIndicator color={colors.textPrimary} /></View>
          ) : error ? (
            <View style={s.center}>
              <Text style={s.emptyText}>{error}</Text>
              <TouchableOpacity onPress={() => load()} style={s.retryBtn}><Text style={s.retryText}>Retry</Text></TouchableOpacity>
            </View>
          ) : (
            <View style={s.center}><Text style={s.emptyText}>No themes match your filters.</Text></View>
          )
        }
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); load({ silent: true }); }}
      />

      {/* Filter modal */}
      <Modal
        visible={filterOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterOpen(false)}
      >
        <View style={s.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setFilterOpen(false)} />
          <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]} testID="filter-sheet">
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Filter Themes</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)} hitSlop={10} testID="sheet-close">
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={s.sheetSubtitle}>Select one or more categories</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: spacing.md }}>
              <View style={s.catGrid}>
                {allCategories.map((c) => {
                  const active = selectedCats.includes(c);
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[s.catChip, active && s.catChipActive]}
                      onPress={() => {
                        setSelectedCats((cur) => (active ? cur.filter((x) => x !== c) : [...cur, c]));
                      }}
                      testID={`filter-${c}`}
                    >
                      {active ? (
                        <Ionicons name="checkmark-circle" size={16} color={colors.brand} />
                      ) : (
                        <Ionicons name="ellipse-outline" size={16} color={colors.textTertiary} />
                      )}
                      <Text style={[s.catChipText, active && s.catChipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <View style={s.sheetFooter}>
              <TouchableOpacity style={s.resetBtn} onPress={() => setSelectedCats([])} testID="reset-filter">
                <Text style={s.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.applyBtn} onPress={() => applyFilter(selectedCats)} testID="apply-filter">
                <Text style={s.applyBtnText}>Show results</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ThemeCard({ item, onPress, colors, radii, spacing }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{
        height: 200,
        marginHorizontal: spacing.xl,
        borderRadius: radii.xxl,
        overflow: "hidden",
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      }]}
      testID={`theme-card-${item.slug}`}
    >
      <Image source={{ uri: item.hero_image_url }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={200} />
      <LinearGradient
        colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.95)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={{ flex: 1, padding: spacing.xl, justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{
            paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill, borderWidth: 1,
            backgroundColor: `${item.accent_color}26`, borderColor: `${item.accent_color}66`,
          }}>
            <Text style={{ fontSize: 10, fontWeight: "800", letterSpacing: 1, color: item.accent_color }}>
              {item.category.toUpperCase()}
            </Text>
          </View>
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 4,
            paddingHorizontal: 10, paddingVertical: 5,
            borderRadius: radii.pill,
            backgroundColor: "rgba(0,0,0,0.55)",
            borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
          }}>
            <Ionicons name="trending-up" size={12} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{item.stock_count} stocks</Text>
          </View>
        </View>
        <View>
          <Text style={{ color: "#fff", fontSize: 26, fontWeight: "900", letterSpacing: -0.8, marginBottom: 4 }} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "500", lineHeight: 18 }} numberOfLines={2}>
            {item.tagline}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function makeStyles(colors: any, radii: any, spacing: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, backgroundColor: colors.bg },
    headerRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: spacing.md },
    eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 2, color: colors.textTertiary, marginBottom: 4 },
    title: { fontSize: 36, fontWeight: "900", letterSpacing: -1.5, color: colors.textPrimary },
    filterBtn: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingHorizontal: 14, height: 42,
      borderRadius: radii.pill,
      backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
    },
    filterBtnText: { color: colors.textPrimary, fontSize: 13, fontWeight: "800" },
    activeChip: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingHorizontal: 11, paddingVertical: 6,
      borderRadius: radii.pill,
      backgroundColor: colors.brandSoft,
      borderWidth: 1, borderColor: colors.brand,
    },
    activeChipText: { color: colors.brand, fontSize: 12, fontWeight: "800" },
    clearBtn: { justifyContent: "center", paddingHorizontal: 10 },
    clearBtnText: { color: colors.textTertiary, fontSize: 12, fontWeight: "700", textDecorationLine: "underline" },
    center: { alignItems: "center", justifyContent: "center", padding: spacing.xxxl, gap: spacing.md },
    emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: "center" },
    retryBtn: {
      paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 1, borderColor: colors.border,
    },
    retryText: { color: colors.textPrimary, fontWeight: "700" },
    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      maxHeight: "75%",
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, alignSelf: "center", marginBottom: spacing.md },
    sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    sheetTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
    sheetSubtitle: { color: colors.textSecondary, fontSize: 13, fontWeight: "500", marginTop: 4 },
    catGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingVertical: spacing.md },
    catChip: {
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingHorizontal: 14, paddingVertical: 10,
      borderRadius: radii.pill,
      backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
    },
    catChipActive: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
    catChipText: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
    catChipTextActive: { color: colors.brand },
    sheetFooter: { flexDirection: "row", gap: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.md },
    resetBtn: { paddingHorizontal: spacing.xl, paddingVertical: 14, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    resetBtnText: { color: colors.textPrimary, fontWeight: "800", fontSize: 13 },
    applyBtn: { flex: 1, paddingVertical: 14, borderRadius: radii.pill, backgroundColor: colors.brand, alignItems: "center" },
    applyBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 14 },
  });
}
