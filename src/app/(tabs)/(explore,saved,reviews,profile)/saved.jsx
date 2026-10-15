import { router } from "expo-router";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompanyCard } from "@/components/company-card";
import { Text } from "@/components/text";
import { Button, EmptyState, PageTitle } from "@/components/ui";
import { pluralize } from "@/lib/format";
import { useSaved } from "@/lib/saved";
import { colors } from "@/lib/theme";

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const { saved } = useSaved();

  return (
    <FlatList
      data={saved}
      keyExtractor={(c) => String(c.id)}
      renderItem={({ item }) => <CompanyCard company={item} />}
      style={{ flex: 1, backgroundColor: colors.groupedBackground }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 24, gap: 12 }}
      ListHeaderComponent={
        <View style={{ gap: 6, marginBottom: 8, marginTop: 8 }}>
          <PageTitle>Saved</PageTitle>
          {saved.length > 0 && <Text style={{ fontSize: 14, fontWeight: "500", color: colors.secondaryLabel }}>{pluralize(saved.length, "business", "businesses")}</Text>}
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon={{ sf: "bookmark", md: "bookmark_border" }}
          title="Nothing saved yet"
          message="Tap the bookmark on any supplier or shipping company to keep it here."
          action={<Button title="Discover Businesses" onPress={() => router.navigate("/")} />}
        />
      }
    />
  );
}
