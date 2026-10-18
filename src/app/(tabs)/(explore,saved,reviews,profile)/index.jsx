import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Wordmark } from "@/components/auth-ui";
import { CompanyCard } from "@/components/company-card";
import { LanguageButton } from "@/components/language";
import { Text } from "@/components/text";
import { ErrorState, Icon, Loading } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { photos } from "@/lib/photos";
import { keys } from "@/lib/query-keys";
import { colors, radius } from "@/lib/theme";

const TINTS = {
  blue: { bg: "#E8F0FE", fg: "#2F6FE4" },
  green: { bg: "#E4F4EC", fg: "#1F8A5B" },
  orange: { bg: "#FFF0E3", fg: "#E8701F" },
  pink: { bg: "#FDE8EE", fg: "#E0457B" },
  purple: { bg: "#EFEAFD", fg: "#6E56CF" },
  teal: { bg: "#E2F5F6", fg: "#13858F" },
};

const QUICK = [
  { label: "Suppliers", icon: { sf: "building.2.fill", md: "factory" }, tint: TINTS.blue, params: { type: "SUP" } },
  { label: "Shipping", icon: { sf: "ferry.fill", md: "directions_boat" }, tint: TINTS.green, params: { type: "LOG" } },
  { label: "Products", icon: { sf: "shippingbox.fill", md: "inventory_2" }, tint: TINTS.orange, params: { type: "SUP", focus: "1" } },
  { label: "Industries", icon: { sf: "square.grid.2x2.fill", md: "category" }, tint: TINTS.blue, industries: true },
];

// Keyword searches; the API matches them against products, routes, names and descriptions.
const CATEGORIES = [
  { label: "Electronics", icon: { sf: "desktopcomputer", md: "computer" }, tint: TINTS.blue },
  { label: "Textiles", icon: { sf: "tshirt.fill", md: "checkroom" }, tint: TINTS.pink },
  { label: "Machinery", icon: { sf: "gearshape.2.fill", md: "precision_manufacturing" }, tint: TINTS.orange },
  { label: "Home & Living", query: "Furniture", icon: { sf: "house.fill", md: "chair" }, tint: TINTS.purple },
  { label: "Packaging", icon: { sf: "shippingbox.fill", md: "inventory_2" }, tint: TINTS.teal },
  { label: "Auto Parts", icon: { sf: "car.fill", md: "directions_car" }, tint: TINTS.green },
];

const openSearch = (params = {}) => router.push({ pathname: "/search", params });

function SectionHeader({ title, onSeeAll }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 }}>
      <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: "800", color: colors.label }}>
        {title}
      </Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} hitSlop={8} accessibilityRole="link" style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.accent }}>See all</Text>
          <Icon name={{ sf: "arrow.right", md: "arrow_forward" }} size={14} color={colors.accent} weight="semibold" />
        </Pressable>
      )}
    </View>
  );
}

function Tile({ label, icon, tint, onPress, size = 60 }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => ({ alignItems: "center", gap: 8, width: size + 20, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ width: size, height: size, borderRadius: 18, borderCurve: "continuous", backgroundColor: tint.bg, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={size * 0.45} color={tint.fg} />
      </View>
      <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "600", color: colors.bodyText, textAlign: "center" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function CompanyList({ query, empty }) {
  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />;
  const rows = query.data.results.slice(0, 5);
  if (!rows.length) return empty;
  return (
    <View style={{ gap: 12, paddingHorizontal: 20 }}>
      {rows.map((c) => (
        <CompanyCard key={c.id} company={c} />
      ))}
    </View>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const featured = useQuery({
    queryKey: keys.companies({ featured: true }),
    queryFn: () => api.companies.list({ is_verified: true, ordering: "-average_rating" }),
  });
  const scroll = useRef(null);
  const [categoriesY, setCategoriesY] = useState(0);

  return (
    <ScrollView
      ref={scroll}
      style={{ flex: 1, backgroundColor: colors.cell }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, gap: 24 }}
      refreshControl={
        <RefreshControl
          refreshing={featured.isRefetching}
          onRefresh={() => featured.refetch()}
          tintColor={colors.accent}
        />
      }
    >
      {/* Brand + search */}
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Wordmark size={22} />
          <LanguageButton />
        </View>
        <Pressable
          onPress={() => openSearch({ focus: "1" })}
          accessibilityRole="search"
          accessibilityLabel="Search suppliers, products or shipping"
          style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 48, paddingLeft: 14, paddingRight: 6, borderRadius: radius.button, borderCurve: "continuous", backgroundColor: colors.cell, borderWidth: 1, borderColor: colors.border, boxShadow: "0 1px 3px rgba(23,36,58,0.05)" }}
        >
          <Icon name={{ sf: "magnifyingglass", md: "search" }} size={18} color={colors.secondaryLabel} />
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, color: colors.tertiaryLabel }}>Search suppliers, products or shipping…</Text>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" }}>
            <Icon name={{ sf: "slider.horizontal.3", md: "tune" }} size={18} color={colors.accent} />
          </View>
        </Pressable>
      </View>

      {/* Hero */}
      <Pressable onPress={() => openSearch({ type: "LOG" })} accessibilityRole="link" style={({ pressed }) => ({ marginHorizontal: 20, opacity: pressed ? 0.9 : 1 })}>
        <View style={{ borderRadius: radius.sheet, borderCurve: "continuous", overflow: "hidden", minHeight: 160, padding: 20, justifyContent: "center" }}>
          <Image source={photos.exploreHero} contentFit="cover" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} accessible={false} />
          <LinearGradient colors={["rgba(20,26,40,0.85)", "rgba(20,26,40,0.35)", "rgba(20,26,40,0)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
          <View style={{ maxWidth: "62%", gap: 8 }}>
            <Text style={{ fontSize: 20, lineHeight: 25, fontWeight: "800", color: "#FFFFFF" }}>Reliable Shipping for Your Global Business</Text>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.88)" }}>Sea Freight · Air Freight · Express</Text>
          </View>
        </View>
      </Pressable>

      {/* Quick links */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16 }}>
        {QUICK.map((q) => (
          <Tile
            key={q.label}
            label={q.label}
            icon={q.icon}
            tint={q.tint}
            onPress={() => (q.industries ? scroll.current?.scrollTo({ y: categoriesY - 12, animated: true }) : openSearch(q.params))}
          />
        ))}
      </View>

      {/* Featured: verified companies only, so the section is left out until there are some. */}
      {!(featured.isSuccess && featured.data.results.length === 0) && (
        <View style={{ gap: 12 }}>
          <SectionHeader title="Featured Companies" onSeeAll={() => openSearch({ verified: "1", sort: "-average_rating" })} />
          <CompanyList query={featured} empty={null} />
        </View>
      )}

      {/* Categories */}
      <View style={{ gap: 12 }} onLayout={(e) => setCategoriesY(e.nativeEvent.layout.y)}>
        <SectionHeader title="Popular Categories" onSeeAll={() => openSearch({ focus: "1" })} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 4 }}>
          {CATEGORIES.map((c) => (
            <Tile key={c.label} label={c.label} icon={c.icon} tint={c.tint} size={56} onPress={() => openSearch({ q: c.query ?? c.label })} />
          ))}
        </ScrollView>
      </View>

    </ScrollView>
  );
}
