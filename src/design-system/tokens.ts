// Hush design tokens — ported verbatim from design_handoff_hush/hifi.css.
// Single source of truth for color, spacing, radius, shadow. (v1 targets web via
// react-native-web, so rgba()/gradient strings + RN shadow objects both apply.)

export const palette = {
  avRed: "#E84142",
  avRedDeep: "#C9282A",
  avRedGlow: "#FF5658",
  actBlue: "#2563EB", // every interactive element
} as const;

export const light = {
  bg: "#F4F3F0",
  card: "#FFFFFF",
  ink: "#0B0B0E",
  sub: "#8C887F",
  line: "rgba(0,0,0,0.07)",
  chip: "#EFEEE9",
  positive: "#1F9D63",
  ...palette,
} as const;

export const dark = {
  bg: "#0C0C10",
  card: "#17171C",
  ink: "#F4F3F0",
  sub: "rgba(255,255,255,0.52)",
  line: "rgba(255,255,255,0.09)",
  chip: "rgba(255,255,255,0.07)",
  positive: "#46C98A",
  ...palette,
} as const;

export type ThemeColors = Record<keyof typeof light, string>;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  screen: 22, // screen horizontal padding
  cardInset: 18,
  safeTop: 58, // iOS notch inset used in the handoff
} as const;

export const radius = {
  tile: 12,
  input: 15,
  button: 16,
  card: 22,
  cardLg: 28,
  sheet: 26,
  pill: 999,
} as const;

export const layout = {
  wide: 900, // ≥ this viewport width (px) → desktop: left sidebar + centered content
  sidebar: 236,
  content: 720,
} as const;

export const shadow = {
  card: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  buttonBlue: { shadowColor: palette.actBlue, shadowOpacity: 0.34, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  buttonRed: { shadowColor: palette.avRed, shadowOpacity: 0.34, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  sheet: { shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 50, shadowOffset: { width: 0, height: -20 }, elevation: 20 },
} as const;

// Gradients: sign-in red panel (150deg) + dark balance card.
export const gradients = {
  avRed: ["#E84142", "#C9282A"] as const,
  balanceDark: ["#18181F", "#121217"] as const,
} as const;
