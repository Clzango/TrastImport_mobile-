import { Pressable, View } from "react-native";
import { Text } from "@/components/text";
import { colors } from "@/lib/theme";
import { haptic } from "./ui";

/** Three-way tab switch from the Explore design. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 2, backgroundColor: colors.segment, borderRadius: 10, borderCurve: "continuous", padding: 3 }} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) haptic();
              onChange(option.value);
            }}
            style={{
              flex: 1,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              borderCurve: "continuous",
              backgroundColor: selected ? colors.cell : "transparent",
              boxShadow: selected ? "0 1px 3px rgba(23,36,58,0.12)" : undefined,
            }}
          >
            <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: selected ? "700" : "500", color: selected ? colors.label : colors.secondaryLabel }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
