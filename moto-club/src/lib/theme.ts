export const colors = {
  bg: '#0B0B0D',
  surface: '#16161A',
  surface2: '#1E1E24',
  surface3: '#2A2A32',
  line: '#2E2E37',
  text: '#F4F4F6',
  muted: '#A0A0AB',
  faint: '#6B6B76',
  accent: '#E10600',
  accentSoft: '#FF4D3D',
  gold: '#F5B700',
  ok: '#2ECC71',
  warn: '#FF9F1C',
  danger: '#FF3B30',
  checkered: '#FFFFFF',
} as const;

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const font = {
  // Titres « racing » : gras, italique, majuscules.
  display: { fontWeight: '900' as const, fontStyle: 'italic' as const, letterSpacing: 0.5 },
  label: { fontWeight: '700' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const, fontSize: 11 },
  mono: { fontVariant: ['tabular-nums' as const] },
};
