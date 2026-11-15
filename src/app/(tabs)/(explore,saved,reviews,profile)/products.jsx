import { useInfiniteQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PRODUCT_CATEGORIES, ProductCard } from "@/components/product-card";
import { Text, TextInput } from "@/components/text";
import { EmptyState, ErrorState, haptic, Icon, Loading } from "@/components/ui";
import { api, errorMessage, PAGE_SIZE } from "@/lib/api";
import { keys } from "@/lib/query-keys";
import { colors } from "@/lib/theme";

/** All products from every supplier, two per row, with search and category chips. Opened from Explore. */
export default function ProductsScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState(typeof params.category === "string" ? params.category : "");
  const [text, setText] = useState(typeof params.q === "string" ? params.q : "");
  const [search, setSearch] = useState(text);

  // Search after typing pauses, not on every key.
  useEffect(() => {
    const t = setTimeout(() => setSearch(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);

  const filters = { search: search || undefined, category: category || undefined };
  const query = useInfiniteQuery({
    queryKey: [...keys.products(), "list", filters],
    queryFn: ({ pageParam }) => api.products.list(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.next ? pages.length * PAGE_SIZE : undefined),
  });
  const products = query.data?.pages.flatMap((p) => p.results) ?? [];
  const total = query.data?.pages[0]?.count ?? 0;
  const rows = [];
  for (let i = 0; i < products.length; i += 2) rows.push(products.slice(i, i + 2));

  return (
    <View style={{ flex: 1, backgroundColor: colors.cell }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.cell }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} accessibilityRole="button" accessibilityLabel="Back" hitSlop={6} style={{ width: 40, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Icon name={{ sf: "chevron.left", md: "arrow_back_ios_new" }} size={20} color={colors.ink} weight="semibold" />
          </Pressable>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, height: 46, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.steel }}>
            <Icon name={{ sf: "magnifyingglass", md: "search" }} size={19} color={colors.inkSecondary} />
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Search products"
              placeholderTextColor={colors.inkSecondary}
              accessibilityLabel="Search products"
              returnKeyType="search"
              autoFocus={params.focus === "1"}
              style={{ flex: 1, fontSize: 16, color: colors.ink, outlineWidth: 0 }}
            />
            {text ? (
              <Pressable onPress={() => setText("")} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8}>
                <Icon name={{ sf: "xmark.circle.fill", md: "cancel" }} size={18} color={colors.faint} />
              </Pressable>
            ) : null}
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
          {[{ value: "", label: "All", icon: { sf: "square.grid.2x2", md: "apps" } }, ...PRODUCT_CATEGORIES].map((c) => {
            const selected = c.value === category;
            return (
              <Pressable
                key={c.value || "all"}
                onPress={() => (haptic(), setCategory(c.value))}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, borderColor: selected ? colors.ink : colors.steelBorder, backgroundColor: selected ? colors.ink : colors.cell }}
              >
                <Icon name={c.icon} size={16} color={selected ? colors.onAccent : colors.teal} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: selected ? colors.onAccent : colors.ink }}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(row) => String(row[0].id)}
        renderItem={({ item: row }) => (
          <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16 }}>
            {row.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
            {row.length === 1 && <View style={{ flex: 1 }} />}
          </View>
        )}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 32, gap: 20, flexGrow: 1 }}
        ListHeaderComponent={
          query.isSuccess && total > 0 ? (
            <Text style={{ paddingHorizontal: 16, fontSize: 14, color: colors.inkSecondary }}>
              {total} {total === 1 ? "product" : "products"}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          query.isPending ? (
            <Loading />
          ) : query.isError ? (
            <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
          ) : (
            <EmptyState
              icon={{ sf: "shippingbox", md: "inventory_2" }}
              title={search || category ? "No matching products" : "No products yet"}
              message={search || category ? "Try another word or category." : "Suppliers' products will appear here as they add them."}
            />
          )
        }
        onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.container} /> : null}
        refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => query.refetch()} tintColor={colors.container} />}
      />
    </View>
  );
}
