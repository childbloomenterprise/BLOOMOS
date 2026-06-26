// contract/tokens.ts
//
// The Bloom OS design tokens — the single source of truth for color, spacing,
// and radius across BOTH surfaces: the patient app (this repo's src/) and the
// /clinic web view (Codex). Import these instead of hardcoding hex values so
// the patient and clinic screens look identical.
//
// Calm, clinical, trustworthy: generous spacing, one accent, soft shadows,
// large readable type.

export const bloom = {
  bg: '#f6faf8',
  surface: '#ffffff',
  ink: '#10231d',
  muted: '#5b6b65',
  primary: '#1f9d76',
  primaryInk: '#0c5c44',
  accent: '#bfe9d8',
  // Allergies / destructive states get a calm clinical red.
  danger: '#c0392b',
  radius: 18,
  gap: 16,
  fontFamily: 'System',
} as const;

export type BloomTokens = typeof bloom;
