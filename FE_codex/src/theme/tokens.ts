export const colors = {
  canvas: '#F6F8F7',
  surface: '#FFFFFF',
  ink: '#14263B',
  muted: '#475569',
  action: '#00665D',
  actionPressed: '#00534B',
  actionSurface: '#E5F2EF',
  focus: '#00665D',
  divider: '#DCE5E4',
  fieldBorder: '#657C7B',
  errorInk: '#9F231F',
  errorSurface: '#FFF0EF',
  disabledInk: '#475569',
  disabledSurface: '#E7ECEC',
  supportSurface: '#EBF1F4',
  supportBorder: '#D6E2E8',
} as const;

export const riskColors = {
  SAFE: { ink: '#145649', surface: '#E8F5EF' },
  SUSPICIOUS: { ink: '#754000', surface: '#FFF4D9' },
  DANGER: { ink: '#98251E', surface: '#FFF0EF' },
  UNABLE_TO_ASSESS: { ink: '#48366B', surface: '#F2EDF9' },
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, section: 24, large: 32, hero: 40, touch: 48,
} as const;

export const radii = { card: 20, control: 14 } as const;

export const layout = {
  narrowWidth: 360,
  maxWidth: 560,
  touchTarget: spacing.touch,
  buttonHeight: 52,
} as const;

export const typography = {
  homeTitle: { fontSize: 32, lineHeight: 40, fontWeight: '600' },
  screenTitle: { fontSize: 26, lineHeight: 34, fontWeight: '600' },
  sectionTitle: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24 },
  control: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  secondary: { fontSize: 14, lineHeight: 20 },
} as const;
