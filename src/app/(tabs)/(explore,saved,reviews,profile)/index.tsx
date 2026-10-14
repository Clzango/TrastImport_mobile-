import { useInfiniteQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ActionSheetIOS, ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import Animated, { type SharedValue, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { CompanyCard } from "@/components/company-card";
import { SegmentedControl } from "@/components/segmented-control";
import { Text, TextInput } from "@/components/text";
import { BrandMark, Chip, EmptyState, ErrorState, haptic, Icon, Loading } from "@/components/ui";
import { api, errorMessage, PAGE_SIZE, type CompanyFilters } from "@/lib/api";
import { pluralize } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { colors, radius } from "@/lib/theme";

type TypeFilter = "ALL" | "SUP" | "LOG";

const SORTS = [
  { value: "-average_rating", label: "Top rated" },
  { value: "-review_count", label: "Most reviewed" },
  { value: "-date_created", label: "Newest" },
  { value: "name", label: "Name (A–Z)" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Folds its children away as `progress` goes from 0 to 1. */
function Collapsible({ progress, children }: { progress: SharedValue<number>; children: ReactNode }) {
  const height = useSharedValue(0);
  const style = useAnimatedStyle(() => (height.value === 0 ? {} : { height: height.value * (1 - progress.value), opacity: 1 - progress.value }));
  return (
    <Animated.View style={[{ overflow: "hidden" }, style]}>
      <View onLayout={(e) => (height.value = e.nativeEvent.layout.height)}>{children}</View>
    </Animated.View>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [type, setType] = useState<TypeFilter>("ALL");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [fourPlus, setFourPlus] = useState(false);
  const [sort, setSort] = useState<Sort>("-average_rating");
  const debouncedSearch = useDebounced(search.trim());

  const filters = useMemo<CompanyFilters>(
    () => ({
      search: debouncedSearch || undefined,
      company_type: type === "ALL" ? undefined : type,
      is_verified: verifiedOnly || undefined,
      min_rating: fourPlus ? 4 : undefined,
      ordering: sort,
    }),
    [debouncedSearch, type, verifiedOnly, fourPlus, sort],
  );

  const query = useInfiniteQuery({
    queryKey: keys.companies(filters),
    queryFn: ({ pageParam }) => api.companies.list(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.next ? pages.length * PAGE_SIZE : undefined),
  });

  const companies = query.data?.pages.flatMap((p) => p.results) ?? [];
  const total = query.data?.pages[0]?.count ?? 0;
  const sortLabel = SORTS.find((s) => s.value === sort)!.label;

  const chooseSort = () => {
    if (process.env.EXPO_OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: "Sort businesses", options: [...SORTS.map((s) => s.label), "Cancel"], cancelButtonIndex: SORTS.length, tintColor: colors.accent },
        (i) => i < SORTS.length && setSort(SORTS[i]!.value),
      );
    } else {
      const i = SORTS.findIndex((s) => s.value === sort);
      setSort(SORTS[(i + 1) % SORTS.length]!.value);
    }
  };

  // The type switch stays on screen, so the badge only counts the chips that can be hidden.
  const activeFilters = (verifiedOnly ? 1 : 0) + (fourPlus ? 1 : 0);

  // Header collapse: 0 = fully shown, 1 = only search and the type switch are left.
  // Scrolling down hides the title and filter chips; scrolling up (or reaching the top) brings them back.
  const collapse = useSharedValue(0);
  const lastY = useSharedValue(0);
  const [collapsed, setCollapsed] = useState(false);
  const onScroll = useAnimatedScrollHandler((e) => {
    const y = e.contentOffset.y;
    const dy = y - lastY.value;
    lastY.value = y;
    // Short lists never collapse, or freeing up space would bounce them back to the top.
    const canHide = e.contentSize.height - e.layoutMeasurement.height > 240;
    const hide = y <= 24 ? false : dy > 6 && canHide ? true : dy < -10 ? false : null;
    if (hide === null || (collapse.value > 0.5) === hide) return;
    collapse.value = withTiming(hide ? 1 : 0, { duration: 220 });
    scheduleOnRN(setCollapsed, hide);
  });
  const toggleHeader = () => {
    haptic();
    collapse.value = withTiming(collapsed ? 0 : 1, { duration: 220 });
    setCollapsed(!collapsed);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.groupedBackground }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 8, backgroundColor: colors.groupedBackground, zIndex: 1 }}>
        <Collapsible progress={collapse}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 12 }}>
            <BrandMark size={34} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.secondaryLabel }}>TrastImport</Text>
              <Text accessibilityRole="header" numberOfLines={1} style={{ fontSize: 22, lineHeight: 26, fontWeight: "800", letterSpacing: -0.4, color: colors.label }}>
                Discover Businesses
              </Text>
            </View>
          </View>
        </Collapsible>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <View style={{ position: "absolute", left: 14, top: 13, zIndex: 1 }} pointerEvents="none">
              <Icon name={{ sf: "magnifyingglass", md: "search" }} size={18} color={colors.secondaryLabel} />
            </View>
            <TextInput
              value={search}
              onChangeText={setSearch}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search suppliers, products or shipping…"
              placeholderTextColor={colors.tertiaryLabel}
              selectionColor={colors.accent}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
              accessibilityLabel="Search"
              style={{
                height: 44,
                paddingLeft: 40,
                paddingRight: 14,
                borderWidth: 1.5,
                borderColor: focused ? colors.label : colors.inputBorder,
                borderRadius: radius.cell,
                borderCurve: "continuous",
                backgroundColor: colors.cell,
                fontSize: 15,
                color: colors.label,
                boxShadow: "0 1px 2px rgba(23,36,58,0.05)",
                outlineWidth: 0,
              }}
            />
          </View>
          <Pressable
            onPress={toggleHeader}
            accessibilityRole="button"
            accessibilityLabel={collapsed ? "Show filters" : "Hide filters"}
            accessibilityState={{ expanded: !collapsed }}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radius.cell,
              borderCurve: "continuous",
              borderWidth: 1.5,
              borderColor: activeFilters > 0 ? colors.label : colors.inputBorder,
              backgroundColor: pressed ? colors.fill : colors.cell,
            })}
          >
            <Icon name={{ sf: "line.3.horizontal.decrease", md: "tune" }} size={18} color={colors.label} weight="semibold" />
            {activeFilters > 0 && (
              <View style={{ position: "absolute", top: -6, right: -6, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: colors.onAccent }}>{activeFilters}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={{ paddingTop: 10 }}>
          <SegmentedControl<TypeFilter>
            value={type}
            onChange={setType}
            options={[
              { value: "ALL", label: "All" },
              { value: "SUP", label: "Suppliers" },
              { value: "LOG", label: "Shipping" },
            ]}
          />
        </View>

        <Collapsible progress={collapse}>
          <View style={{ paddingTop: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
              <Chip label="Verified" icon={{ sf: "checkmark", md: "check" }} active={verifiedOnly} onPress={() => setVerifiedOnly((v) => !v)} />
              <Chip label="4★ & up" active={fourPlus} onPress={() => setFourPlus((v) => !v)} />
            </ScrollView>
          </View>
        </Collapsible>
      </View>

      <Animated.FlatList
        data={companies}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item }) => <CompanyCard company={item} />}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, gap: 12 }}
        ListHeaderComponent={
          query.isSuccess ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, fontWeight: "500", color: colors.secondaryLabel }}>{pluralize(total, "business", "businesses")}</Text>
              <Pressable onPress={chooseSort} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 36 }} accessibilityLabel={`Sort: ${sortLabel}`}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.label }}>{sortLabel}</Text>
                <Icon name={{ sf: "chevron.down", md: "expand_more" }} size={14} color={colors.label} weight="semibold" />
              </Pressable>
            </View>
          ) : null
        }
        ListEmptyComponent={
          query.isPending ? (
            <Loading />
          ) : query.isError ? (
            <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
          ) : (
            <EmptyState icon={{ sf: "building.2", md: "domain" }} title="No businesses found" message="Try a different search or remove some filters." />
          )
        }
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={{ padding: 16 }} color={colors.accent} /> : null}
        onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => query.refetch()} tintColor={colors.accent} />}
      />
    </View>
  );
}
