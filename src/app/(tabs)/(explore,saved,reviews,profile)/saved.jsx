import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompanyLogo } from "@/components/company-card";
import { ContainerPanel } from "@/components/container-panel";
import { Text } from "@/components/text";
import { Button, haptic, Icon } from "@/components/ui";
import { formatRating, pluralize, ratingValue } from "@/lib/format";
import { useSaved } from "@/lib/saved";
import { homeCity, relativeDay, shipsTo } from "@/lib/shipping";
import { colors } from "@/lib/theme";

// Saved companies live on the device (lib/saved.jsx); each row is a snapshot, and tapping it loads fresh data.

function FavoriteRow({ company: c, onRemove, last }) {
  const rating = ratingValue(c.average_rating);
  const shipping = c.company_type === "LOG";
  const from = homeCity(c);
  const to = shipping ? shipsTo(c).slice(0, 2).join(", ") : "";
  const place = from && to ? `${from} to ${to}` : from || (shipping ? "Shipping company" : "Supplier");
  const next = shipping && c.next_departure ? relativeDay(c.next_departure) : null;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.separator }}>
      <Pressable
        onPress={() => router.push(`/company/${c.id}`)}
        accessibilityRole="link"
        accessibilityLabel={`${c.name}, ${place}, ${formatRating(rating)} stars`}
        style={({ pressed }) => ({ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.7 : 1 })}
      >
        <CompanyLogo company={c} size={54} />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 16, fontWeight: "700", color: colors.ink }}>
              {c.name}
            </Text>
            {c.is_verified && <Icon name={{ sf: "checkmark.seal.fill", md: "verified" }} size={16} color={colors.teal} />}
          </View>
          <Text numberOfLines={1} style={{ fontSize: 14, color: colors.inkSecondary }}>
            {place}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Icon name={{ sf: "star.fill", md: "star" }} size={14} color={rating === null ? colors.starEmpty : colors.container} />
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink }}>{formatRating(rating)}</Text>
              <Text style={{ fontSize: 13, color: colors.inkSecondary }}>({pluralize(c.review_count ?? 0, "review")})</Text>
            </View>
            {next ? (
              <View style={{ height: 20, paddingHorizontal: 7, borderRadius: 6, justifyContent: "center", backgroundColor: colors.cargo }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: colors.cargoInk }}>Leaves {next.toLowerCase()}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
      <Pressable
        onPress={() => (haptic(), onRemove(c))}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${c.name} from favorites`}
        hitSlop={6}
        style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.accentTint : colors.accentSoft })}
      >
        <Icon name={{ sf: "heart.fill", md: "favorite" }} size={20} color={colors.container} />
      </Pressable>
    </View>
  );
}

function EmptyFavorites({ shipping }) {
  return (
    <ContainerPanel style={{ marginTop: 8, borderRadius: 20, padding: 22, gap: 18 }}>
      <View style={{ width: 64, height: 64, borderRadius: 20, borderCurve: "continuous", backgroundColor: colors.cell, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-6deg" }], boxShadow: "0 10px 24px rgba(0,0,0,0.18)" }}>
        <Icon name={{ sf: "heart.fill", md: "favorite" }} size={30} color={shipping ? colors.teal : colors.container} />
      </View>
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 24, lineHeight: 28, fontWeight: "800", letterSpacing: -0.6, color: colors.onAccent }}>
          {shipping ? "Save carriers you trust" : "Save suppliers you like"}
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: colors.onAccent }}>
          Tap the heart on any {shipping ? "shipping company" : "supplier"} to keep it here, ready for your next order.
        </Text>
      </View>
      <Button
        title={shipping ? "Find shipping companies" : "Find suppliers"}
        variant="ink"
        onPress={() => router.push({ pathname: "/search", params: { type: shipping ? "LOG" : "SUP" } })}
      />
    </ContainerPanel>
  );
}

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { saved, toggle } = useSaved();
  const suppliers = saved.filter((c) => c.company_type !== "LOG");
  const shipping = saved.filter((c) => c.company_type === "LOG");
  // Open on whichever list has companies.
  const [tab, setTab] = useState(suppliers.length || !shipping.length ? "SUP" : "LOG");
  const rows = tab === "LOG" ? shipping : suppliers;
  const tabs = [
    { value: "SUP", label: "Suppliers", count: suppliers.length },
    { value: "LOG", label: "Shipping", count: shipping.length },
  ];

  return (
    <FlatList
      data={rows}
      keyExtractor={(c) => String(c.id)}
      renderItem={({ item, index }) => <FavoriteRow company={item} onRemove={toggle} last={index === rows.length - 1} />}
      style={{ flex: 1, backgroundColor: colors.cell }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 48, flexGrow: 1 }}
      ListHeaderComponent={
        <View style={{ gap: 16, marginBottom: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text accessibilityRole="header" style={{ fontSize: 34, lineHeight: 40, fontWeight: "800", letterSpacing: -1.2, color: colors.ink }}>
              Favorites
            </Text>
            {saved.length > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 32, paddingHorizontal: 11, borderRadius: 999, backgroundColor: colors.accentSoft }}>
                <Icon name={{ sf: "heart.fill", md: "favorite" }} size={14} color={colors.container} />
                <Text style={{ fontSize: 13, fontWeight: "800", color: colors.accentInk }}>{saved.length} saved</Text>
              </View>
            )}
          </View>
          <View accessibilityRole="tablist" style={{ flexDirection: "row", padding: 3, borderRadius: 12, borderCurve: "continuous", backgroundColor: colors.steel }}>
            {tabs.map((t) => {
              const selected = t.value === tab;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => (haptic(), setTab(t.value))}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${t.label}, ${t.count}`}
                  style={{ flex: 1, height: 36, borderRadius: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: selected ? colors.cell : "transparent", boxShadow: selected ? "0 1px 3px rgba(15,27,42,0.12)" : undefined }}
                >
                  <Text style={{ fontSize: 14, fontWeight: selected ? "700" : "600", color: selected ? colors.ink : colors.inkSecondary }}>{t.label}</Text>
                  <View style={{ minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: selected ? colors.ink : colors.steelBorder }}>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: selected ? colors.onAccent : colors.inkSecondary }}>{t.count}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      }
      ListEmptyComponent={<EmptyFavorites shipping={tab === "LOG"} />}
    />
  );
}
