// TrastImport design tokens (light theme), from the "Dragon Express Shipping" redesign (Nov 2026 handoff spec):
// navy (#0B1F33) headers and tickets, orange (#C2410C) for actions and air freight, steel blue (#1F5F99) for sea,
// green for verified, a cool grey page (#EEF1F4) and 1 px borders instead of shadows. Font: Barlow.

export const colors = {
  // Brand
  accent: "#C2410C",
  accentPressed: "#9A3412",
  accentSoft: "#FFF7ED",
  accentTint: "#FFEDE3",
  accentInk: "#9A3412",
  accentBorder: "#FDBA74",
  onAccent: "#FFFFFF",

  // Fresh green and lime accent used for account and discovery surfaces.
  forest: "#153B2B",
  forestDeep: "#0E2F20",
  lime: "#A8E849",
  limeSoft: "#EFF8DC",
  limeInk: "#31551A",

  // Navy: headers, tickets, the buyer's own chat bubbles
  navy: "#0B1F33",
  navyRaised: "#13293F",
  navyBorder: "rgba(255,255,255,0.28)",
  onNavy: "#FFFFFF",
  onNavySecondary: "#B8C4D1",
  onNavySuccess: "#86EFAC",

  // Amber: "Tomorrow", cut-off times
  amber: "#FDBA74",
  amberInk: "#0B1F33",
  amberText: "#FDBA74",

  // 2026 refresh: steel surfaces, container orange, teal for companies, cargo yellow for "soon".
  ink: "#0B1F33",
  inkSecondary: "#4A5866",
  steel: "#EEF1F4",
  steelBorder: "#DCE1E7",
  container: "#C2410C",
  containerRib: "rgba(120,30,0,0.16)",
  containerShine: "rgba(255,255,255,0.10)",
  teal: "#157347",
  tealSoft: "#DCFCE7",
  tealInk: "#166534",
  cargo: "#FDBA74",
  cargoInk: "#0B1F33",

  // Text
  label: "#0B1F33",
  bodyText: "#1E3247",
  secondaryLabel: "#4A5866",
  tertiaryLabel: "#5B6875",
  faint: "#9AA5B1",

  // Surfaces
  groupedBackground: "#EEF1F4",
  cell: "#FFFFFF",
  border: "#DCE1E7",
  separator: "#E6EAEF",
  fill: "#EEF1F4",
  segment: "#DCE1E7",
  inputBorder: "#DCE1E7",
  inputBackground: "#FFFFFF",

  // Shipping methods
  sea: "#1F5F99",
  seaSoft: "#E3EDF7",
  air: "#C2410C",
  airSoft: "#FFEDE3",

  // Status
  star: "#C2410C",
  starEmpty: "#DCE1E7",
  info: "#1C4F9C",
  infoSoft: "#E7EFFB",
  success: "#157347",
  successSoft: "#DCFCE7",
  online: "#22A45D",
  warning: "#B54708",
  danger: "#B42318",
  dangerSoft: "#FEE4E2",
};

export const accentHex = colors.accent;

export const radius = { chip: 10, cell: 12, button: 14, card: 18, sheet: 20, pill: 999 };

/** Solid logo tiles, picked per company so lists don't look uniform. `bar` underlines the initials. */
const LOGO_TINTS = [
  { background: "#0B1F33", ink: "#FFFFFF", bar: "#FB923C" },
  { background: "#0E6E8C", ink: "#FFFFFF", bar: "#A5F3FC" },
  { background: "#157347", ink: "#FFFFFF", bar: "#BBF7D0" },
  { background: "#4C2A85", ink: "#FFFFFF", bar: "#FCD34D" },
];

export function logoTint(id) {
  return LOGO_TINTS[Math.abs(id) % LOGO_TINTS.length];
}

export const fonts = {
  "400": "Barlow_400Regular",
  "500": "Barlow_500Medium",
  "600": "Barlow_600SemiBold",
  "700": "Barlow_700Bold",
  "800": "Barlow_800ExtraBold",
};
