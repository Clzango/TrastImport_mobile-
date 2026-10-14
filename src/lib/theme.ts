// TrastImport design tokens (light theme), from the "TrastImport Redesign" canvas.

export const colors = {
  // Brand
  accent: "#C4520A",
  accentPressed: "#9A3F07",
  accentSoft: "#FFF1E6",
  accentTint: "#FDEBDD",
  accentInk: "#8A3806",
  onAccent: "#FFFFFF",

  // Text
  label: "#17243A",
  bodyText: "#2A3B55",
  secondaryLabel: "#4A5565",
  tertiaryLabel: "#6B7684",
  faint: "#9AA4B1",

  // Surfaces
  groupedBackground: "#F4F6F8",
  cell: "#FFFFFF",
  border: "#E3E8EE",
  separator: "#EEF1F4",
  fill: "#F0F2F5",
  segment: "#E6EAEF",
  inputBorder: "#D5DBE3",
  inputBackground: "#F9FAFB",

  // Status
  star: "#F36B12",
  starEmpty: "#D5DBE3",
  info: "#1C4F9C",
  infoSoft: "#E7EFFB",
  success: "#1D5C3F",
  successSoft: "#E4F1EA",
  warning: "#B54708",
  danger: "#B42318",
  dangerSoft: "#FEE4E2",
};

export const accentHex = colors.accent;

export const radius = { chip: 8, cell: 12, button: 14, card: 16, sheet: 18, pill: 999 } as const;

/** Logo tile colours, picked per company so the list doesn't look uniform. */
const LOGO_TINTS = [
  { background: "#FDEBDD", ink: "#8A3806" },
  { background: "#E3EBF7", ink: "#17243A" },
  { background: "#E4F1EA", ink: "#1D5C3F" },
  { background: "#EFE7F6", ink: "#55297A" },
];

export function logoTint(id: number) {
  return LOGO_TINTS[Math.abs(id) % LOGO_TINTS.length]!;
}

export const fonts = {
  "400": "Figtree_400Regular",
  "500": "Figtree_500Medium",
  "600": "Figtree_600SemiBold",
  "700": "Figtree_700Bold",
  "800": "Figtree_800ExtraBold",
} as const;
