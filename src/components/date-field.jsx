import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/text";
import { Icon } from "@/components/ui";
import { colors, radius } from "@/lib/theme";

function format(value, mode) {
  if (!value) return mode === "time" ? "--:--" : "mm/dd/yyyy";
  if (mode === "time") return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
  return `${String(value.getMonth() + 1).padStart(2, "0")}/${String(value.getDate()).padStart(2, "0")}/${value.getFullYear()}`;
}

/**
 * Labelled date or time field. Android opens the system dialog on tap; iOS shows the compact
 * picker once a value is set (tap the placeholder to start). `value` is a Date or null.
 */
export function DateField({ label, mode = "date", value, onChange, minimumDate, defaultValue }) {
  const [open, setOpen] = useState(false);
  const ios = process.env.EXPO_OS === "ios";
  const start = () => {
    if (ios) onChange(value ?? defaultValue ?? new Date());
    else setOpen(true);
  };

  return (
    <View style={{ gap: 6, flex: 1 }}>
      {label ? <Text style={{ fontSize: 16, color: colors.secondaryLabel }}>{label}</Text> : null}
      {ios && value ? (
        <View style={{ minHeight: 56, borderWidth: 1.5, borderColor: colors.inputBorder, borderRadius: radius.button, paddingHorizontal: 10, justifyContent: "center", alignItems: "flex-start", backgroundColor: colors.cell }}>
          <DateTimePicker value={value} mode={mode} display="compact" minimumDate={minimumDate} accentColor={colors.accent} onValueChange={(_, d) => onChange(d)} />
        </View>
      ) : (
        <Pressable
          onPress={start}
          accessibilityRole="button"
          accessibilityLabel={`${label ?? (mode === "time" ? "Time" : "Date")}: ${value ? format(value, mode) : "not set"}`}
          style={{ flexDirection: "row", alignItems: "center", minHeight: 56, paddingHorizontal: 16, borderWidth: 1.5, borderColor: colors.inputBorder, borderRadius: radius.button, backgroundColor: colors.cell }}
        >
          <Text style={{ flex: 1, fontSize: 18, color: value ? colors.label : colors.tertiaryLabel }}>{format(value, mode)}</Text>
          <Icon name={mode === "time" ? { sf: "clock", md: "schedule" } : { sf: "calendar", md: "calendar_today" }} size={20} color={colors.label} />
        </Pressable>
      )}
      {open && (
        <DateTimePicker
          value={value ?? defaultValue ?? new Date()}
          mode={mode}
          minimumDate={minimumDate}
          is24Hour
          accentColor={colors.accent}
          onValueChange={(_, d) => {
            setOpen(false);
            onChange(d);
          }}
          onDismiss={() => setOpen(false)}
        />
      )}
    </View>
  );
}
