import { View } from "react-native";
import { Text } from "@/components/text";
import { colors, fonts, radius } from "@/lib/theme";

const pad = (n) => String(n).padStart(2, "0");

function toInput(value, mode) {
  if (!value) return "";
  if (mode === "time") return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function fromInput(text, mode, previous) {
  if (!text) return null;
  if (mode === "time") {
    const [h, m] = text.split(":").map(Number);
    const d = new Date(previous ?? Date.now());
    d.setHours(h, m, 0, 0);
    return d;
  }
  const [y, mo, day] = text.split("-").map(Number);
  return new Date(y, mo - 1, day);
}

/** Web: the browser's own date / time input, styled like the other fields. */
export function DateField({ label, mode = "date", value, onChange, minimumDate }) {
  return (
    <View style={{ gap: 6, flex: 1 }}>
      {label ? <Text style={{ fontSize: 16, color: colors.secondaryLabel }}>{label}</Text> : null}
      <input
        type={mode === "time" ? "time" : "date"}
        aria-label={label}
        value={toInput(value, mode)}
        min={minimumDate && mode !== "time" ? toInput(minimumDate, "date") : undefined}
        onChange={(e) => onChange(fromInput(e.target.value, mode, value))}
        style={{
          boxSizing: "border-box",
          width: "100%",
          height: 56,
          padding: "0 16px",
          border: `1.5px solid ${colors.inputBorder}`,
          borderRadius: radius.button,
          backgroundColor: colors.cell,
          color: colors.label,
          fontFamily: fonts["500"],
          fontSize: 18,
          outline: "none",
        }}
      />
    </View>
  );
}
