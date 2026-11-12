import { router } from "expo-router";
import { useState } from "react";
import { FlatList, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompanyCard } from "@/components/company-card";
import { PillTabs } from "@/components/pill-tabs";
import { Button, Icon } from "@/components/ui";
import { Text } from "@/components/text";
import { useSaved } from "@/lib/saved";
import { colors, radius } from "@/lib/theme";

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { saved } = useSaved();
  const suppliers = saved.filter((c) => c.company_type !== "LOG");
  const shipping = saved.filter((c) => c.company_type === "LOG");
  // Open on whichever list has companies.
  const [tab, setTab] = useState(suppliers.length || !shipping.length ? "SUP" : "LOG");
  const rows = tab === "LOG" ? shipping : suppliers;
  const emptyMinHeight = Math.max(340, height - insets.top - insets.bottom - 270);

  return (
    <FlatList
      data={rows}
      keyExtractor={(c) => String(c.id)}
      renderItem={({ item }) => <CompanyCard company={item} />}
      style={{ flex: 1, backgroundColor: colors.groupedBackground }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 18, paddingBottom: 28, gap: 14, flexGrow: 1 }}
      ListHeaderComponent={
        <View style={{ gap: 16, marginTop: 4, marginBottom: 2 }}>
          <View style={{ gap: 8, paddingHorizontal: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "700", letterSpacing: 1.1, color: colors.forest }}>YOUR COLLECTION</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, backgroundColor: colors.limeSoft, paddingHorizontal: 11, paddingVertical: 7 }}>
                <Icon name={{ sf: "heart.fill", md: "favorite" }} size={13} color={colors.forest} />
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.forest }}>{saved.length} saved</Text>
              </View>
            </View>
            <View style={{ gap: 5 }}>
              <Text accessibilityRole="header" style={{ fontSize: 32, lineHeight: 38, fontWeight: "800", letterSpacing: -0.8, color: colors.forest }}>Favorites</Text>
              <Text style={{ fontSize: 15, lineHeight: 22, color: colors.secondaryLabel }}>
                Your trusted suppliers and shipping partners, all in one place.
              </Text>
            </View>
          </View>
          <PillTabs
            value={tab}
            onChange={setTab}
            activeColor={colors.lime}
            activeTextColor={colors.forestDeep}
            options={[
              { value: "SUP", label: "Suppliers", count: suppliers.length },
              { value: "LOG", label: "Shipping", count: shipping.length },
            ]}
          />
        </View>
      }
      ListEmptyComponent={
        <View style={{ minHeight: emptyMinHeight, flexGrow: 1, justifyContent: "center", paddingVertical: 18 }}>
          <View style={{ alignItems: "center", gap: 16, paddingHorizontal: 22, paddingTop: 30, paddingBottom: 26, borderRadius: 26, borderCurve: "continuous", backgroundColor: colors.cell, borderWidth: 1, borderColor: colors.border, boxShadow: "0 10px 28px rgba(16,38,63,0.045)" }}>
            <View style={{ width: 88, height: 88, borderRadius: 30, backgroundColor: colors.limeSoft, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-6deg" }] }}>
              <Icon name={{ sf: "heart", md: "favorite_border" }} size={36} color={colors.forest} />
            </View>
            <View style={{ alignItems: "center", gap: 7 }}>
              <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "700", letterSpacing: 1, color: colors.limeInk }}>YOUR SHORTLIST STARTS HERE</Text>
              <Text style={{ fontSize: 21, lineHeight: 27, fontWeight: "800", color: colors.forest, textAlign: "center" }}>
                {tab === "LOG" ? "Your shipping shortlist starts here" : "Your supplier shortlist starts here"}
              </Text>
              <Text style={{ maxWidth: 280, fontSize: 14, lineHeight: 21, color: colors.secondaryLabel, textAlign: "center" }}>
                Tap the heart on any {tab === "LOG" ? "shipping company" : "supplier"} to save it here for later.
              </Text>
            </View>
            <Button
              title="Explore companies"
              trailingIcon={{ sf: "arrow.right", md: "arrow_forward" }}
              onPress={() => router.navigate("/")}
              style={{ alignSelf: "stretch", marginTop: 2, borderRadius: 999 }}
            />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name={{ sf: "sparkle", md: "auto_awesome" }} size={14} color={colors.tertiaryLabel} />
              <Text style={{ fontSize: 12, lineHeight: 17, color: colors.tertiaryLabel }}>Build a list of partners you trust</Text>
            </View>
          </View>
        </View>
      }
    />
  );
}
