// HyperTrophy Design Tokens — The 'Active-Wear' System
// Inspired by Nike Run Club, Strava, and Duolingo
// High-vibrancy accent on deep-space canvas

export const Colors = {
  // Base — Deep Space
  background: '#040405',
  surface: '#0F0F12',
  surfaceElevated: '#16161A',
  surfaceBorder: '#24242A',
  surfaceGlass: 'rgba(255, 255, 255, 0.03)',

  // Text — Clean Typography
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A5',
  textMuted: '#6B6B72',
  textDisabled: '#404045',

  // Accent — Electric Lime (High Energy)
  accent: '#D4FF00',
  accentDim: '#A8CC00',
  accentMuted: 'rgba(212, 255, 0, 0.12)',
  accentGlow: 'rgba(212, 255, 0, 0.4)',

  // Semantic
  success: '#00E676',
  warning: '#FFD600',
  error: '#FF1744',
  info: '#2979FF',

  // Achievement States
  prGold: '#FFD700',
  prGoldBg: 'rgba(255, 215, 0, 0.12)',
  unlockGreen: '#00FF88',
  unlockGreenBg: 'rgba(0, 255, 136, 0.12)',

  // Muscle Group System
  push: '#FF4D4D',
  pull: '#4D8BFF',
  core: '#FFB300',
  legs: '#00D4FF',

  // App States
  deloadBg: 'rgba(255, 152, 0, 0.12)',
  deloadBorder: '#FF9800',
  locked: 'rgba(255, 255, 255, 0.2)',
  lockedBg: 'rgba(255, 255, 255, 0.03)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const FontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 19,
  xxl: 24,
  xxxl: 32,
  display: 42,
  hero: 56,
  timer: 110,
};

export const BorderRadius = {
  none: 0,
  sm: 6,
  md: 12,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
};

// Premium Shadow Elevations
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  accent: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
};

export const MuscleGroupColors: Record<string, string> = {
  Push: Colors.push,
  Pull: Colors.pull,
  Core: Colors.core,
  Legs: Colors.legs,
};
