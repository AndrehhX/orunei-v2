/**
 * Orunei Mobile Design Tokens
 * Protocol: Warm Editorial Cinema
 * Strictly derived from Stitch Design System (DESIGN.md)
 */

export const colors = {
  // Canvas & Backgrounds (Matte Charcoal & OLED Deep)
  base0: '#0B0C0E',
  base1: '#0F1012',
  surface: '#121315',
  surfaceDim: '#121315',
  surfaceBright: '#38393B',

  // Surfaces & Containers
  surface1: '#15171A', // Standard cards & panels
  surface2: '#1C1F23', // Active, floating, bottom sheets
  surfaceContainerLowest: '#0D0E10',
  surfaceContainerLow: '#1B1C1E',
  surfaceContainer: '#1F2022',
  surfaceContainerHigh: '#292A2C',
  surfaceContainerHighest: '#343537',

  // Typography & On-Surface
  onSurface: '#E3E2E5',
  onSurfaceVariant: '#C4C7C8',
  textMuted: '#787774',
  textSecondary: '#9E9B97',

  // Primary CTA (High-contrast pure white)
  primary: '#FFFFFF',
  onPrimary: '#000000',
  primaryContainer: '#E2E2E2',

  // Hairlines & Boundaries (1px crisp lines, no heavy drop-shadows)
  hairline: 'rgba(255, 255, 255, 0.07)',
  hairlineActive: 'rgba(255, 255, 255, 0.16)',
  hairlineStrong: 'rgba(255, 255, 255, 0.25)',

  // Editorial Accents (Scarce, refined semantic markers)
  sakura: '#E8B4B8',
  sakuraMuted: '#EEB9BD',
  sakuraContainer: '#623C40',
  sakuraTagBg: 'rgba(232, 180, 184, 0.12)',

  forest: '#4E7A62',
  forestMint: '#BDEED0',
  forestTagBg: 'rgba(78, 122, 98, 0.15)',

  warmStone: '#9E9B97',
  error: '#FFB4AB',
  errorContainer: '#93000A',
} as const;

export const radii = {
  sm: 4,
  md: 8,       // Interactive buttons & inputs
  lg: 12,      // Cards & posters
  xl: 16,      // Modals & Bottom sheets
  full: 9999,  // Filter pills
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  gutter: 12,
  margin: 16,
} as const;

import { Platform } from 'react-native';

const FONT_GEIST = Platform.OS === 'web' ? "'Geist', -apple-system, BlinkMacSystemFont, sans-serif" : undefined;
const FONT_INTER = Platform.OS === 'web' ? "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" : undefined;
const FONT_MONO = Platform.OS === 'web' ? "'JetBrains Mono', monospace" : undefined;

export const typography = {
  displayHero: {
    fontFamily: FONT_GEIST,
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.8,
    color: colors.primary,
  },
  headlineLg: {
    fontFamily: FONT_GEIST,
    fontSize: 24,
    fontWeight: '600' as const,
    letterSpacing: -0.6,
    color: colors.primary,
  },
  headlineMd: {
    fontFamily: FONT_GEIST,
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.4,
    color: colors.primary,
  },
  headlineSm: {
    fontFamily: FONT_GEIST,
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    color: colors.onSurface,
  },
  bodyLg: {
    fontFamily: FONT_INTER,
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
    color: colors.onSurface,
  },
  bodyMd: {
    fontFamily: FONT_INTER,
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  bodySm: {
    fontFamily: FONT_INTER,
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    color: colors.textMuted,
  },
  labelMono: {
    fontFamily: FONT_MONO,
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
  labelMonoSm: {
    fontFamily: FONT_MONO,
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
} as const;
