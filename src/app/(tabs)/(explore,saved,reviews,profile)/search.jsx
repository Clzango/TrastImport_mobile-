import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Checkbox } from "@/components/auth-ui";
import { CompanyCard } from "@/components/company-card";
import { countryChipLabel, CountryFilterSheet, useCountries } from "@/components/country-filter";
import { DropdownChip, PillTabs } from "@/components/pill-tabs";
import { OptionsSheet } from "@/components/select-field";
import { Text, TextInput } from "@/components/text";
import { Button, EmptyState, ErrorState, Icon, Loading } from "@/components/ui";
import { api, errorMessage, PAGE_SIZE } from "@/lib/api";
import { pluralize } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { colors, radius } from "@/lib/theme";

const TYPES = [
  { value: "ALL", label: "All" },
  { value: "SUP", label: "Suppliers" },
  { value: "LOG", label: "Shipping" },
];

// Sent as ?business_type=; the API needs this field on companies for it to filter.
const BUSINESS_TYPES = {
  SUP: [
    { value: "MFR", label: "Manufacturer" },
    { value: "TRD", label: "Trading Company" },
  ],
  LOG: [
    { value: "FF", label: "Freight Forwarder" },
    { value: "SL", label: "Shipping Line" },
    { value: "EXP", label: "Express / Courier" },
  ],
};

const SORTS = [
  { value: "", label: "Relevance" },
  { value: "-average_rating", label: "Rating" },
  { value: "-date_created", label: "Newest" },
];

const RATINGS = [
  { value: 0, label: "Any rating" },
  { value: 4.5, label: "4.5★ & up" },
  { value: 4, label: "4★ & up" },
  { value: 3, label: "3★ & up" },
];

function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Search & Filters. Opened from Explore with optional ?q, ?type, ?verified, ?sort, ?focus. */
export default function SearchScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const input = useRef(null);
  const [search, setSearch] = useState(typeof params.q === "string" ? params.q : "");
  const [type, setType] = useState(TYPES.some((t) => t.value === params.type) ? params.type : "ALL");
  const [businessType, setBusinessType] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(params.verified === "1");
  const [minRating, setMinRating] = useState(0);
  const [countries, setCountries] = useState([]);
  const [sheet, setSheet] = useState(null); // "country" | "business" | "rating" | "more"
  const [sort, setSort] = useState(SORTS.some((s) => s.value === params.sort) ? params.sort : "");
  const debouncedSearch = useDebounced(search.trim());
  const companyType = type === "ALL" ? undefined : type;
  const countryList = useCountries(companyType);
  const businessOptions = companyType ? BUSINESS_TYPES[companyType] : [...BUSINESS_TYPES.SUP, ...BUSINESS_TYPES.LOG];

  useEffect(() => {
    if (params.focus === "1") setTimeout(() => input.current?.focus(), 300);
  }, [params.focus]);

  // A business type from the other company type no longer applies.
  useEffect(() => {
    if (businessType && !businessOptions.some((o) => o.value === businessType)) setBusinessType("");
  }, [businessType, businessOptions]);

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      company_type: companyType,
      business_type: businessType || undefined,
      is_verified: verifiedOnly || undefined,
      min_rating: minRating || undefined,
      country: countries.length ? countries.join(",") : undefined,
      ordering: sort || undefined,
    }),
    [debouncedSearch, companyType, businessType, verifiedOnly, minRating, countries, sort],
  );

  const query = useInfiniteQuery({
    queryKey: keys.companies(filters),
    queryFn: ({ pageParam }) => api.companies.list(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.next ? pages.length * PAGE_SIZE : undefined),
  });
  const companies = query.data?.pages.flatMap((p) => p.results) ?? [];
  const total = query.data?.pages[0]?.count ?? 0;
  const businessLabel = businessOptions.find((o) => o.value === businessType)?.label;
  const ratingLabel = RATINGS.find((r) => r.value === minRating)?.label;
  const moreActive = verifiedOnly;

  return (
    <View style={{ flex: 1, backgroundColor: colors.cell }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 12, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <View style={{ position: "absolute", left: 14, top: 14, zIndex: 1, pointerEvents: "none" }}>
              <Icon name={{ sf: "magnifyingglass", md: "search" }} size={18} color={colors.secondaryLabel} />
            </View>
            <TextInput
              ref={input}
              value={search}
              onChangeText={setSearch}
              placeholder="Search suppliers, products or shipping…"
              placeholderTextColor={colors.tertiaryLabel}
              selectionColor={colors.accent}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search"
              style={{ height: 46, paddingLeft: 42, paddingRight: 40, borderRadius: radius.button, borderCurve: "continuous", backgroundColor: colors.fill, fontSize: 15, fontWeight: "600", color: colors.label, outlineWidth: 0 }}
            />
            {search ? (
              <Pressable onPress={() => setSearch("")} accessibilityLabel="Clear search" hitSlop={8} style={{ position: "absolute", right: 6, top: 7, width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
                <Icon name={{ sf: "xmark", md: "close" }} size={16} color={colors.secondaryLabel} weight="semibold" />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={() => setSheet("more")}
            accessibilityRole="button"
            accessibilityLabel="More filters"
            hitSlop={6}
            style={({ pressed }) => ({ width: 40, height: 46, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
          >
            <Icon name={{ sf: "slider.horizontal.3", md: "tune" }} size={22} color={moreActive ? colors.accent : colors.label} />
            {moreActive && <View style={{ position: "absolute", top: 8, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />}
          </Pressable>
        </View>

        <PillTabs options={TYPES} value={type} onChange={setType} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          <DropdownChip label={countryChipLabel(countries, countryList.data)} active={countries.length > 0} onPress={() => setSheet("country")} />
          <DropdownChip label={businessLabel ?? "Business Type"} active={!!businessType} onPress={() => setSheet("business")} />
          <DropdownChip label={minRating ? ratingLabel : "Rating"} active={minRating > 0} onPress={() => setSheet("rating")} />
        </ScrollView>
      </View>

      <FlatList
        data={companies}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item }) => <CompanyCard company={item} />}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1, backgroundColor: colors.groupedBackground }}
        contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 12 }}
        ListHeaderComponent={query.isSuccess ? <Text style={{ fontSize: 13, fontWeight: "500", color: colors.secondaryLabel }}>{pluralize(total, "result")}</Text> : null}
        ListEmptyComponent={
          query.isPending ? (
            <Loading />
          ) : query.isError ? (
            <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
          ) : (
            <EmptyState icon={{ sf: "magnifyingglass", md: "search_off" }} title="No companies found" message="Try a different search or remove some filters." />
          )
        }
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={{ padding: 16 }} color={colors.accent} /> : null}
        onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => query.refetch()} tintColor={colors.accent} />}
      />

      <CountryFilterSheet visible={sheet === "country"} onClose={() => setSheet(null)} companyType={companyType} selected={countries} onApply={setCountries} />
      <OptionsSheet
        visible={sheet === "business"}
        onClose={() => setSheet(null)}
        title="Business type"
        options={[{ value: "", label: "All business types" }, ...businessOptions]}
        value={businessType}
        onChange={setBusinessType}
      />
      <OptionsSheet visible={sheet === "rating"} onClose={() => setSheet(null)} title="Rating" options={RATINGS} value={minRating} onChange={setMinRating} />
      <Modal visible={sheet === "more"} transparent animationType="fade" onRequestClose={() => setSheet(null)}>
        <Pressable onPress={() => setSheet(null)} accessibilityLabel="Close" style={{ flex: 1, backgroundColor: "rgba(23,36,58,0.4)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.cell, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: 20, paddingBottom: insets.bottom + 20, gap: 16, width: "100%", maxWidth: 560, alignSelf: "center" }}>
            <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "800", color: colors.label }}>
              More filters
            </Text>
            <Checkbox label="Verified companies only" value={verifiedOnly} onChange={setVerifiedOnly} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                title="Reset all"
                variant="outline"
                onPress={() => {
                  setVerifiedOnly(false);
                  setBusinessType("");
                  setMinRating(0);
                  setCountries([]);
                  setSort("");
                  setSheet(null);
                }}
                style={{ flex: 1, borderRadius: 999 }}
              />
              <Button title="Done" onPress={() => setSheet(null)} style={{ flex: 1, borderRadius: 999 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
