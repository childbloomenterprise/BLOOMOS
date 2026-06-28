// contract/tokens.ts
//
// Bloom OS design tokens: shared source of truth for patient + clinic surfaces.
// Premium, calm, clinical, trustworthy.

export const bloom = {
  bg: '#eef6f1',
  surface: '#ffffff',
  surface2: '#f6faf8',
  hair: '#e4efe9',

  ink: '#0e2a22',
  muted: '#5e726b',

  primary: '#13a079',
  primaryInk: '#0a4d39',
  primaryDark: '#0c5c44',
  mint: '#cfefe2',
  mintSoft: '#e8f6ef',
  accent: '#cfefe2',

  gold: '#b6792a',
  goldSoft: '#fbf1de',
  goldLine: '#f0d9a8',

  danger: '#c0392b',
  dangerSoft: '#fcece9',
  dangerLine: '#f1c9c2',

  radius: 18,
  gap: 16,
  fontFamily: 'System',

  text: {
    display: { fontSize: 40, lineHeight: 44, fontWeight: '900' as const, letterSpacing: 0 },
    h1: { fontSize: 24, lineHeight: 30, fontWeight: '900' as const, letterSpacing: 0 },
    h2: { fontSize: 19, lineHeight: 25, fontWeight: '800' as const, letterSpacing: 0 },
    title: { fontSize: 16, lineHeight: 22, fontWeight: '800' as const, letterSpacing: 0 },
    body: { fontSize: 16, lineHeight: 25, fontWeight: '400' as const, letterSpacing: 0 },
    small: { fontSize: 13, lineHeight: 19, fontWeight: '600' as const, letterSpacing: 0 },
    eyebrow: { fontSize: 11, lineHeight: 14, fontWeight: '900' as const, letterSpacing: 0 },
  },

  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },

  radii: { sm: 12, md: 16, card: 22, pill: 999 },

  elevation: {
    sm: {
      shadowColor: '#0c3c2c',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    md: {
      shadowColor: '#0c3c2c',
      shadowOpacity: 0.1,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    lg: {
      shadowColor: '#0c3c2c',
      shadowOpacity: 0.16,
      shadowRadius: 44,
      shadowOffset: { width: 0, height: 22 },
      elevation: 9,
    },
  },

  gradient: ['#0c5c44', '#138a66', '#1aa97f'] as const,
} as const;

export type BloomTokens = typeof bloom;
