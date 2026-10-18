import { router } from "expo-router";
import { useState } from "react";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompanyCard } from "@/components/company-card";
import { PillTabs } from "@/components/pill-tabs";
import { Button, EmptyState, PageTitle } from "@/components/ui";
import { useSaved } from "@/lib/saved";
import { colors } from "@/lib/theme";

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { saved } = useSaved();
  const suppliers = saved.filter((c) => c.company_type !== "LOG");
  const shipping = saved.filter((c) => c.company_type === "LOG");
  // Open on whichever list has companies.
  const [tab, setTab] = useState(suppliers.length || !shipping.length ? "SUP" : "LOG");
  const rows = tab === "LOG" ? shipping : suppliers;

  return (
    <FlatList
      data={rows}
      keyExtractor={(c) => String(c.id)}
      renderItem={({ item }) => <CompanyCard company={item} />}
      style={{ flex: 1, backgroundColor: colors.groupedBackground }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 24, gap: 12, flexGrow: 1 }}
      ListHeaderComponent={
        <View style={{ gap: 16, marginTop: 8, marginBottom: 4 }}>
          <PageTitle>Favorites</PageTitle>
          <PillTabs
            value={tab}
            onChange={setTab}
            options={[
              { value: "SUP", label: "Suppliers", count: suppliers.length },
              { value: "LOG", label: "Shipping", count: shipping.length },
            ]}
          />
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon={{ sf: "heart", md: "favorite_border" }}
          title={tab === "LOG" ? "No shipping companies saved" : "No suppliers saved"}
          message="Tap the heart on any company to keep it here."
          action={<Button title="Discover Companies" onPress={() => router.navigate("/")} style={{ borderRadius: 999 }} />}
        />
      }
    />
  );
}
