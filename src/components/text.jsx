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

/** Drop-in for React Native's Text that renders in Figtree. */
export function Text({ style, ...props }) {
  return <RNText {...props} style={withFont(style)} />;
}

export const TextInput = forwardRef(function TextInput({ style, ...props }, ref) {
  return <RNTextInput ref={ref} {...props} style={withFont(style)} />;
});
