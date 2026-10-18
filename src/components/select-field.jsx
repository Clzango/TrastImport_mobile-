import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/text";
import { haptic, Icon } from "@/components/ui";
import { colors, radius } from "@/lib/theme";

/** Bottom sheet with a single-choice list. */
export function OptionsSheet({ visible, onClose, title, options, value, onChange }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} accessibilityLabel="Close" style={{ flex: 1, backgroundColor: "rgba(23,36,58,0.4)", justifyContent: "flex-end" }}>
        <Pressable
          onPress={() => {}}
          style={{ backgroundColor: colors.cell, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingTop: 8, paddingBottom: insets.bottom + 12, width: "100%", maxWidth: 560, alignSelf: "center" }}
        >
          <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: colors.segment, marginBottom: 8 }} />
          {title ? (
            <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "800", color: colors.label, paddingHorizontal: 20, paddingVertical: 8 }}>
              {title}
            </Text>
          ) : null}
          {options.map((o) => {
            const checked = o.value === value;
            return (
              <Pressable
                key={String(o.value)}
                onPress={() => {
                  haptic();
                  onChange(o.value);
                  onClose();
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked }}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, minHeight: 56, backgroundColor: pressed ? colors.fill : "transparent" })}
              >
                {o.icon && (
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" }}>
                    <Icon name={o.icon} size={20} color={colors.accent} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 16, fontWeight: checked ? "700" : "600", color: colors.label }}>{o.label}</Text>
                  {o.description ? <Text style={{ fontSize: 13, color: colors.secondaryLabel }}>{o.description}</Text> : null}
                </View>
                {checked && <Icon name={{ sf: "checkmark", md: "check" }} size={18} color={colors.accent} weight="bold" />}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Form field that opens a bottom sheet of options, styled like Field. */
export function SelectField({ label, icon, placeholder = "Select…", options, value, onChange, error }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={{ fontSize: 14, fontWeight: "600", color: colors.label }}>{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? placeholder}: ${selected?.label ?? "not selected"}`}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          minHeight: 52,
          paddingHorizontal: 16,
          borderWidth: 1.5,
          borderColor: error ? colors.danger : open ? colors.label : colors.inputBorder,
          borderRadius: radius.button,
          borderCurve: "continuous",
          backgroundColor: colors.inputBackground,
        }}
      >
        {icon && <Icon name={icon} size={19} color={colors.tertiaryLabel} />}
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, color: selected ? colors.label : colors.tertiaryLabel }}>
          {selected?.label ?? placeholder}
        </Text>
        <Icon name={{ sf: "chevron.down", md: "expand_more" }} size={16} color={colors.secondaryLabel} weight="semibold" />
      </Pressable>
      {error ? <Text style={{ fontSize: 13, color: colors.danger }}>{error}</Text> : null}
      <OptionsSheet visible={open} onClose={() => setOpen(false)} title={label} options={options} value={value} onChange={onChange} />
    </View>
  );
}
