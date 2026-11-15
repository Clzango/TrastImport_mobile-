import { forwardRef } from "react";
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from "react-native";
import { fonts } from "@/lib/theme";

// Figtree ships one font file per weight, so a fontWeight has to become a fontFamily.
function withFont(style) {
  const flat = (StyleSheet.flatten(style) ?? {});
  const raw = String(flat.fontWeight ?? "400");
  const weight = raw === "bold" ? "700" : raw === "normal" ? "400" : raw;
  const family = fonts[weight] ?? (Number(weight) > 700 ? fonts["800"] : fonts["400"]);
  return [style, { fontFamily: flat.fontFamily ?? family, fontWeight: "normal" }];
}

// Large system font sizes (Android Settings > Display > Font size, iOS Larger Text) still enlarge
// text, but only up to 1.2x, so layouts don't break. Pass maxFontSizeMultiplier to change it.
const MAX_FONT_SCALE = 1.2;

/** Drop-in for React Native's Text that renders in Figtree. */
export function Text({ style, maxFontSizeMultiplier = MAX_FONT_SCALE, ...props }) {
  return <RNText maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} style={withFont(style)} />;
}

export const TextInput = forwardRef(function TextInput({ style, maxFontSizeMultiplier = MAX_FONT_SCALE, ...props }, ref) {
  return <RNTextInput ref={ref} maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} style={withFont(style)} />;
});
