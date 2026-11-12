// TrastImport design tokens (light theme), from the "Dragon Express Shipping" redesign:
// navy headers and tickets, orange actions, amber for "soon" (next departure, drop-off cut-off).

export const colors = {
  // Brand
  accent: "#D94F12",
  accentPressed: "#B63D0B",
  accentSoft: "#FFF1E8",
  accentTint: "#FFE3D3",
  accentInk: "#9F3508",
  accentBorder: "#F4B58E",
  onAccent: "#FFFFFF",

  // Fresh green and lime accent used for account and discovery surfaces.
  forest: "#153B2B",
  forestDeep: "#0E2F20",
  lime: "#A8E849",
  limeSoft: "#EFF8DC",
  limeInk: "#31551A",

  // Navy: headers, tickets, the buyer's own chat bubbles
  navy: "#10263F",
  navyRaised: "#1A3858",
  navyBorder: "rgba(255,255,255,0.28)",
  onNavy: "#FFFFFF",
  onNavySecondary: "rgba(255,255,255,0.72)",
  onNavySuccess: "#7EE0A1",

  // Amber: "Tomorrow", cut-off times
  amber: "#F6B26B",
  amberInk: "#3B2205",
  amberText: "#F9B56E",

  // Text
  label: "#0D1F33",
  bodyText: "#24364B",
  secondaryLabel: "#4A5565",
  tertiaryLabel: "#6B7684",
  faint: "#9AA4B1",

  // Surfaces
  groupedBackground: "#F4F6F9",
  cell: "#FFFFFF",
  border: "#E3E8EF",
  separator: "#EDF0F4",
  fill: "#F1F4F7",
  segment: "#E6EBF1",
  inputBorder: "#D9E0E8",
  inputBackground: "#FFFFFF",

  // Shipping methods
  sea: "#24609B",
  seaSoft: "#E1ECF7",
  air: "#C2450C",
  airSoft: "#FCE7DD",

  // Status
  star: "#C2450C",
  starEmpty: "#D5DBE3",
  info: "#1C4F9C",
  infoSoft: "#E7EFFB",
  success: "#1D5C3F",
  successSoft: "#E4F1EA",
  online: "#22A45D",
  warning: "#B54708",
  danger: "#B42318",
  dangerSoft: "#FEE4E2",
};

export const accentHex = colors.accent;

export const radius = { chip: 10, cell: 14, button: 16, card: 22, sheet: 24, pill: 999 };

/** Solid logo tiles, picked per company so lists don't look uniform. `bar` underlines the initials. */
const LOGO_TINTS = [
  { background: "#0D1F33", ink: "#FFFFFF", bar: "#F28C38" },
  { background: "#13708F", ink: "#FFFFFF", bar: "#9EE7F5" },
  { background: "#1D5C3F", ink: "#FFFFFF", bar: "#9FE3BC" },
  { background: "#55297A", ink: "#FFFFFF", bar: "#E1C6F7" },
];

export function logoTint(id) {
  return LOGO_TINTS[Math.abs(id) % LOGO_TINTS.length];
}

export const fonts = {
  "400": "Figtree_400Regular",
  "500": "Figtree_500Medium",
  "600": "Figtree_600SemiBold",
  "700": "Figtree_700Bold",
  "800": "Figtree_800ExtraBold",
};
