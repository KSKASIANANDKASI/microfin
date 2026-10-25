/**
 * BillionBrains Tech Ltd — design tokens.
 *
 * Plain data only: consumed identically by the web app (turned into CSS custom
 * properties, see ./css) and by React Native StyleSheets. Nothing in here may
 * import from `react`, `react-native` or the DOM.
 *
 * Palette is sampled from the Finance Easy logo: navy #062045, gold #C28E14.
 */

export const palette = {
  // Brand navy — the logo tile, primary actions, headings.
  navy900: '#04162F',
  navy800: '#062045',
  navy700: '#0B2C57',
  navy600: '#123A6E',
  navy400: '#3E5C8C',
  navy200: '#8FA3C0',
  navy050: '#EDF1F8',

  // Brand gold — the "F" and "Easy" in the logo, accents, focus and "premium" emphasis.
  gold700: '#8F6A0F',
  gold600: '#A97C12',
  gold500: '#C28E14',
  gold400: '#D6A73A',
  gold200: '#EED692',
  gold050: '#FBF4E1',

  // Accent teal — a second series colour that reads apart from both navy and
  // gold, cool enough to sit beside the brand without competing with it.
  teal700: '#0B5F63',
  teal600: '#0E767B',
  teal500: '#128C92',
  teal400: '#2FA6AC',
  teal200: '#9AD4D7',
  teal050: '#E8F5F6',

  // Neutrals — warm-white to match the logo's off-white ground.
  white: '#FFFFFF',
  paper: '#FDFDFB',
  surface: '#F7F8FB',
  field: '#EEF1F6',
  border: '#DDE3ED',
  borderStrong: '#C6D0E0',
  slate600: '#5A6B85',
  slate500: '#78869C',
  ink: '#0D1B33',

  // Status — reserved for state, never for series identity. Each ships with an
  // icon or text label, never colour alone (warning is sub-3:1 on white by design).
  statusGood: '#0CA30C',
  statusWarning: '#FAB219',
  statusCritical: '#D03B3B',

  // Chart chrome — one shade off the surface, deliberately recessive.
  gridline: '#E6EAF1',
  axis: '#C6D0E0',
  axisLabel: '#78869C',

  success: '#1E8E62',
  successBg: '#E6F4EE',
  danger: '#C0392B',
  dangerBg: '#FBEBE9',
  warning: '#B8791B',
} as const;

export const colors = {
  brand: palette.navy800,
  brandHover: palette.navy700,
  brandPressed: palette.navy900,
  accent: palette.gold500,
  accentSoft: palette.gold050,

  bg: palette.surface,
  bgElevated: palette.white,
  bgField: palette.field,
  bgInverse: palette.navy800,

  text: palette.ink,
  textMuted: palette.slate600,
  textFaint: palette.slate500,
  textOnBrand: palette.white,
  textOnBrandMuted: palette.navy200,

  border: palette.border,
  borderStrong: palette.borderStrong,
  focusRing: palette.gold500,

  success: palette.success,
  danger: palette.danger,
} as const;

/**
 * Chart roles. The single series is accent teal — one measure, one colour, never
 * a value-ramp across nominal categories. Status steps are for state only.
 */
export const chart = {
  surface: palette.white,
  series: palette.teal600,
  seriesHover: palette.teal500,
  reference: palette.slate500,
  gridline: palette.gridline,
  axis: palette.axis,
  axisLabel: palette.axisLabel,
  status: {
    good: palette.statusGood,
    warning: palette.statusWarning,
    critical: palette.statusCritical,
  },
} as const;

export type StatusTone = keyof typeof chart.status;

/** 4px base scale. Use `space[n]` rather than raw numbers. */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48,
  10: 64,
  11: 80,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const fonts = {
  /** Geometric sans matching the logo wordmark. */
  display: 'Poppins',
  /** UI / body text. */
  body: 'Inter',
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

/** size / lineHeight / letterSpacing, in px. */
export const type = {
  display: { size: 34, lineHeight: 40, letterSpacing: -0.6 },
  h1: { size: 28, lineHeight: 34, letterSpacing: -0.4 },
  h2: { size: 22, lineHeight: 28, letterSpacing: -0.2 },
  h3: { size: 18, lineHeight: 24, letterSpacing: -0.1 },
  body: { size: 15, lineHeight: 22, letterSpacing: 0 },
  bodySm: { size: 13.5, lineHeight: 20, letterSpacing: 0 },
  label: { size: 13, lineHeight: 18, letterSpacing: 0.1 },
  caption: { size: 12, lineHeight: 16, letterSpacing: 0.2 },
  overline: { size: 11, lineHeight: 14, letterSpacing: 1.4 },
} as const;

/** Control heights — shared so web inputs and RN inputs line up visually. */
export const sizing = {
  fieldHeight: 52,
  buttonHeight: 52,
  buttonHeightSm: 40,
  logoBadge: 56,
  maxFormWidth: 420,
} as const;

/**
 * Shadows. Web consumes `web`; React Native uses `ios` (shadow*) merged with
 * `android` (elevation) — spreading both is safe on either platform.
 */
export const shadow = {
  card: {
    web: '0 1px 2px rgba(6, 32, 69, 0.04), 0 12px 32px rgba(6, 32, 69, 0.08)',
    ios: {
      shadowColor: '#062045',
      shadowOpacity: 0.1,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
    },
    android: { elevation: 4 },
  },
  button: {
    web: '0 6px 16px rgba(6, 32, 69, 0.24)',
    ios: {
      shadowColor: '#062045',
      shadowOpacity: 0.24,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 3 },
  },
} as const;

export const theme = {
  palette,
  colors,
  chart,
  space,
  radius,
  fonts,
  fontWeight,
  type,
  sizing,
  shadow,
} as const;

export type Theme = typeof theme;
