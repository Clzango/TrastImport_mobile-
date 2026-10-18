import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/text";
import { Icon } from "@/components/ui";
import { colors, radius } from "@/lib/theme";

// The app's text is English only for now; the others are listed so people can see what's coming.
export const LANGUAGES = [
  { code: "EN", name: "English", native: "English", available: true },
  { code: "ZH", name: "Chinese", native: "中文" },
  { code: "ES", name: "Spanish", native: "Español" },
  { code: "PT", name: "Portuguese", native: "Português" },
];
export const currentLanguage = LANGUAGES[0];

export function LanguageSheet({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} accessibilityLabel="Close" style={{ flex: 1, backgroundColor: "rgba(23,36,58,0.4)", justifyContent: "flex-end" }}>
        <Pressable
          onPress={() => {}}
          style={{ backgroundColor: colors.cell, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingTop: 8, paddingBottom: insets.bottom + 12, width: "100%", maxWidth: 560, alignSelf: "center" }}
        >
          <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: colors.segment, marginBottom: 8 }} />
          <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "800", color: colors.label, paddingHorizontal: 20, paddingVertical: 8 }}>
            Language
          </Text>
          {LANGUAGES.map((l) => {
            const selected = l.code === currentLanguage.code;
            return (
              <Pressable
                key={l.code}
                onPress={l.available ? onClose : undefined}
                disabled={!l.available}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected, disabled: !l.available }}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, minHeight: 56, backgroundColor: pressed ? colors.fill : "transparent" })}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 16, fontWeight: selected ? "700" : "600", color: l.available ? colors.label : colors.tertiaryLabel }}>{l.native}</Text>
                  {l.native !== l.name && <Text style={{ fontSize: 13, color: colors.tertiaryLabel }}>{l.name}</Text>}
                </View>
                {selected ? (
                  <Icon name={{ sf: "checkmark", md: "check" }} size={18} color={colors.accent} weight="bold" />
                ) : (
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.tertiaryLabel }}>Coming soon</Text>
                )}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Globe + "EN" + chevron, from the Explore header. */
export function LanguageButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Language: ${currentLanguage.name}`}
        hitSlop={8}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 5, height: 36, paddingHorizontal: 8, borderRadius: 10, backgroundColor: pressed ? colors.fill : "transparent" })}
      >
        <Icon name={{ sf: "globe", md: "language" }} size={19} color={colors.label} />
        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.label }}>{currentLanguage.code}</Text>
        <Icon name={{ sf: "chevron.down", md: "expand_more" }} size={12} color={colors.label} weight="semibold" />
      </Pressable>
      <LanguageSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
