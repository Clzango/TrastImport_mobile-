import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/text";
import { haptic, Icon } from "@/components/ui";
import { colors } from "@/lib/theme";

/** Orange pill switcher from the design (All / Suppliers / Shipping, sort options). */
export function PillTabs({ options, value, onChange, size = "regular", scroll }) {
  const small = size === "small";
  const pills = options.map((o) => {
    const selected = o.value === value;
    return (
      <Pressable
        key={String(o.value)}
        onPress={() => {
          if (!selected) haptic();
          onChange(o.value);
        }}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        style={({ pressed }) => ({
          flex: scroll ? undefined : 1,
          height: small ? 32 : 38,
          paddingHorizontal: small ? 14 : 16,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: selected ? colors.accent : pressed ? colors.segment : colors.fill,
        })}
      >
        <Text numberOfLines={1} style={{ fontSize: small ? 13 : 14, fontWeight: selected ? "700" : "500", color: selected ? colors.onAccent : colors.bodyText }}>
          {o.label}
          {o.count !== undefined ? ` (${o.count})` : ""}
        </Text>
      </Pressable>
    );
  });

  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={{ gap: 8 }}>
        {pills}
      </ScrollView>
    );
  }
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 8 }}>
      {pills}
    </View>
  );
}

/** Grey filter chip with a chevron (Country ▾, Business Type ▾, Rating ▾). Orange when set. */
export function DropdownChip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={() => (haptic(), onPress())}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 36,
        paddingLeft: 14,
        paddingRight: 10,
        borderRadius: 999,
        backgroundColor: active ? colors.accentSoft : pressed ? colors.segment : colors.fill,
        borderWidth: 1,
        borderColor: active ? colors.accent : "transparent",
      })}
    >
      <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? colors.accentInk : colors.bodyText }}>
        {label}
      </Text>
      <Icon name={{ sf: "chevron.down", md: "expand_more" }} size={13} color={active ? colors.accentInk : colors.secondaryLabel} weight="semibold" />
    </Pressable>
  );
}
