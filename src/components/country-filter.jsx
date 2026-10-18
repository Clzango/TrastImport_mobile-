import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, TextInput } from "@/components/text";
import { Button, EmptyState, ErrorState, haptic, Icon, Loading } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { countryFlag, countryName } from "@/lib/format";
import { keys } from "@/lib/query-keys";
import { colors, radius } from "@/lib/theme";

/** Countries that have companies, for the Explore filter. Names are localized from the code. */
export function useCountries(companyType) {
  return useQuery({
    queryKey: keys.countries(companyType),
    queryFn: () => api.companies.countries(companyType),
    select: (rows) => rows.map((c) => ({ ...c, label: countryName(c.code, c.name) })),
    staleTime: 5 * 60_000,
  });
}

/**
 * Multi-select country picker in a sheet. Changes apply when the person taps "Show results",
 * so the list behind doesn't reload on every tap.
 */
export function CountryFilterSheet({ visible, onClose, companyType, selected, onApply }) {
  const insets = useSafeAreaInsets();
  const countries = useCountries(companyType);
  const [draft, setDraft] = useState(selected);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (visible) {
      setDraft(selected);
      setSearch("");
    }
  }, [visible, selected]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = countries.data ?? [];
    return q ? all.filter((c) => c.label.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q) : all;
  }, [countries.data, search]);

  const toggle = (code) => {
    haptic();
    setDraft((d) => (d.includes(code) ? d.filter((c) => c !== code) : [...d, code]));
  };

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide" presentationStyle="pageSheet" transparent={process.env.EXPO_OS === "web"}>
      <View style={{ flex: 1, backgroundColor: colors.cell, ...(process.env.EXPO_OS === "web" && { maxWidth: 560, width: "100%", alignSelf: "center", marginTop: 48, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, boxShadow: "0 -8px 32px rgba(23,36,58,0.18)" }) }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 }}>
          <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "800", color: colors.label }}>
            Country
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" }}>
            <Icon name={{ sf: "xmark", md: "close" }} size={15} color={colors.secondaryLabel} weight="bold" />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <View style={{ position: "absolute", left: 34, top: 13, zIndex: 1, pointerEvents: "none" }}>
            <Icon name={{ sf: "magnifyingglass", md: "search" }} size={17} color={colors.secondaryLabel} />
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search countries"
            placeholderTextColor={colors.tertiaryLabel}
            selectionColor={colors.accent}
            autoCorrect={false}
            accessibilityLabel="Search countries"
            style={{ height: 44, paddingLeft: 40, paddingRight: 14, borderRadius: radius.cell, borderCurve: "continuous", backgroundColor: colors.fill, fontSize: 15, color: colors.label, outlineWidth: 0 }}
          />
        </View>

        <FlatList
          data={rows}
          keyExtractor={(c) => c.code}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.separator, marginLeft: 44 }} />}
          renderItem={({ item }) => {
            const checked = draft.includes(item.code);
            return (
              <Pressable
                onPress={() => toggle(item.code)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={`${item.label}, ${item.count} ${item.count === 1 ? "company" : "companies"}`}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, opacity: pressed ? 0.6 : 1 })}
              >
                <Text style={{ fontSize: 22, width: 32, textAlign: "center" }}>{countryFlag(item.code)}</Text>
                <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, fontWeight: checked ? "700" : "500", color: colors.label }}>
                  {item.label}
                </Text>
                <Text style={{ fontSize: 14, color: colors.tertiaryLabel }}>{item.count}</Text>
                <View style={{ width: 22, height: 22, borderRadius: 6, borderCurve: "continuous", borderWidth: 1.5, borderColor: checked ? colors.accent : colors.inputBorder, backgroundColor: checked ? colors.accent : colors.cell, alignItems: "center", justifyContent: "center" }}>
                  {checked && <Icon name={{ sf: "checkmark", md: "check" }} size={14} color={colors.onAccent} weight="bold" />}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            countries.isPending ? (
              <Loading />
            ) : countries.isError ? (
              <ErrorState message={errorMessage(countries.error)} onRetry={() => countries.refetch()} />
            ) : (
              <EmptyState icon={{ sf: "globe", md: "public" }} title="No countries" message={search ? "No country matches that search." : "No companies list a country yet."} />
            )
          }
        />

        <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 16, borderTopWidth: 1, borderTopColor: colors.separator }}>
          <Button title="Clear" variant="outline" onPress={() => setDraft([])} disabled={draft.length === 0} style={{ flex: 1, borderRadius: 999 }} />
          <Button
            title={draft.length ? `Show results (${draft.length})` : "Show results"}
            onPress={() => {
              onApply(draft);
              onClose();
            }}
            style={{ flex: 2, borderRadius: 999 }}
          />
        </View>
      </View>
    </Modal>
  );
}

/** Chip text: "Country", "China", or "China +2". */
export function countryChipLabel(selected, countries) {
  if (selected.length === 0) return "Country";
  const first = countries?.find((c) => c.code === selected[0]);
  const name = first?.label ?? countryName(selected[0]);
  return selected.length === 1 ? name : `${name} +${selected.length - 1}`;
}
