// HyperTrophy Design Tokens
// Dark theme with electric lime accent

export const Colors = {
  // Base
  background: '#0A0A0A',
  surface: '#141414',
  surfaceElevated: '#1C1C1C',
  surfaceBorder: '#2A2A2A',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#999999',
  textMuted: '#666666',
  textDisabled: '#444444',

  // Accent — Electric Lime
  accent: '#C8FF00',
  accentDim: '#8AB300',
  accentMuted: 'rgba(200, 255, 0, 0.15)',

  // Semantic
  success: '#00FF88',
  warning: '#FFB800',
  error: '#FF4444',
  info: '#4488FF',

  // PR / Unlock
  prGold: '#FFD700',
  prGoldBg: 'rgba(255, 215, 0, 0.15)',
  unlockGreen: '#00FF88',
  unlockGreenBg: 'rgba(0, 255, 136, 0.15)',

  // Muscle Group Colors
  push: '#FF5C5C',
  pull: '#5C8AFF',
  core: '#FFB84D',
  legs: '#5CFFB8',

  // Deload
  deloadBg: 'rgba(255, 184, 0, 0.15)',
  deloadBorder: '#FFB800',

  // Locked
  locked: 'rgba(255, 255, 255, 0.4)',
  lockedBg: 'rgba(255, 255, 255, 0.05)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 48,
  timer: 120,
};

export const BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
};

export const MuscleGroupColors: Record<string, string> = {
  Push: Colors.push,
  Pull: Colors.pull,
  Core: Colors.core,
  Legs: Colors.legs,
};
