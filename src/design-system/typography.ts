// Hush typography — Hanken Grotesk (UI), JetBrains Mono (addresses/proof hex),
// Space Grotesk (display numerals). Families load via Google Fonts on web.
// letterSpacing is in px (RN units); the handoff used ~-0.02em on large numerals.

export const fonts = {
  ui: "'Hanken Grotesk', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
  display: "'Space Grotesk', system-ui, sans-serif",
} as const;

export const typeScale = {
  balanceHero: { fontSize: 52, fontWeight: "800", letterSpacing: -1 },
  amount: { fontSize: 66, fontWeight: "800", letterSpacing: -1.3 },
  screenTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  sheetTitle: { fontSize: 18, fontWeight: "700" },
  rowTitle: { fontSize: 14.5, fontWeight: "600" },
  rowSub: { fontSize: 12.5, fontWeight: "400" },
  body: { fontSize: 14, fontWeight: "400" },
  caption: { fontSize: 12, fontWeight: "400" },
} as const;
