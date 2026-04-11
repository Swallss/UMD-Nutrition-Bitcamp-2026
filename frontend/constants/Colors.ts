// UMD Nutrition — Design tokens from stitch/terp_shell/DESIGN.md
// "The Kinetic Heritage" system: Maryland Red + Gold, Plus Jakarta Sans, no-border tonal layering.

export const Colors = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  primary: '#b61825',           // Maryland Red — CTAs, active states, hero bg
  primaryContainer: '#d9353a',  // Gradient endpoint (135° from primary)
  onPrimary: '#ffffff',
  primaryFixed: '#ffdad7',
  primaryFixedDim: '#ffb3ae',

  // ── Maryland Gold — use sparingly as tactical highlights ───────────────────
  secondaryContainer: '#fdd000',    // Bright gold — icon bg, badge fills
  secondaryFixed: '#ffe07c',        // Active chips, calorie badge bg
  secondaryFixedDim: '#ecc200',     // Carb bar fill, bar-chart accents
  onSecondaryContainer: '#6e5900',
  onSecondaryFixed: '#231b00',
  onSecondaryFixedVariant: '#564500',

  // ── Surface hierarchy (NO 1px borders — use tonal layering) ───────────────
  surface: '#f9f9f9',                 // App background
  surfaceContainerLowest: '#ffffff',  // Cards (highest elevation / "lifted")
  surfaceContainerLow: '#f3f3f3',     // Secondary content areas, bento cells
  surfaceContainer: '#eeeeee',
  surfaceContainerHigh: '#e8e8e8',    // Inactive chips, skeleton placeholders
  surfaceContainerHighest: '#e2e2e2', // Unfocused input background
  surfaceDim: '#dadada',
  surfaceVariant: '#e2e2e2',

  // ── Text ──────────────────────────────────────────────────────────────────
  onSurface: '#1b1b1b',
  onSurfaceVariant: '#5b403e',
  onBackground: '#1b1b1b',
  inverseSurface: '#303030',
  inverseOnSurface: '#f1f1f1',
  inversePrimary: '#ffb3ae',

  // ── Neutral / Tertiary ────────────────────────────────────────────────────
  tertiary: '#5c5c5c',            // Fat bar fill, tertiary icon tint
  tertiaryContainer: '#747474',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#fcfcfc',

  // ── Outline ───────────────────────────────────────────────────────────────
  outline: '#8f6f6d',
  outlineVariant: '#e3bebb',      // Ghost border — use at ≤10% opacity only

  // ── Error ─────────────────────────────────────────────────────────────────
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  onErrorContainer: '#93000a',

  // ── Status colours (not in stitch tokens, added for open/closed indicators)
  openGreen: '#22c55e',
  openGreenText: '#16a34a',
} as const;

// ── Typography — all Plus Jakarta Sans ────────────────────────────────────────
// Use these font family strings after loading via @expo-google-fonts/plus-jakarta-sans
export const FONTS = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
} as const;

// ── Border radii ──────────────────────────────────────────────────────────────
export const Radii = {
  pill: 9999,   // Buttons, chips, avatars
  card: 32,     // Hero sections, large cards
  innerCard: 16, // Inner cards, tag chips
  chip: 20,     // Filter chips
  input: 9999,  // Text inputs (pill shape)
  thumb: 14,    // Food card thumbnails
  bar: 8,       // Progress bar fill
} as const;

// ── Spacing ───────────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ── Backward-compat shim for hooks/use-theme-color.ts ─────────────────────────
export const ColorsCompat = {
  light: {
    text: Colors.onSurface,
    background: Colors.surface,
    tint: Colors.primary,
    icon: Colors.onSurfaceVariant,
    tabIconDefault: Colors.onSurfaceVariant,
    tabIconSelected: Colors.primary,
  },
  dark: {
    text: Colors.onSurface,
    background: Colors.surface,
    tint: Colors.primary,
    icon: Colors.onSurfaceVariant,
    tabIconDefault: Colors.onSurfaceVariant,
    tabIconSelected: Colors.primary,
  },
};
