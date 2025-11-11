/**
 * Unified Design System for LiveDance
 * Consistent colors, spacing, and styling across the application
 */

export const colors = {
  // Primary gradient
  gradientStart: '#667eea',
  gradientEnd: '#764ba2',
  
  // Glassmorphism
  glass: {
    light: 'rgba(255, 255, 255, 0.1)',
    medium: 'rgba(255, 255, 255, 0.15)',
    heavy: 'rgba(255, 255, 255, 0.25)',
  },
  
  // Text
  textPrimary: 'white',
  textSecondary: 'rgba(255, 255, 255, 0.9)',
  textTertiary: 'rgba(255, 255, 255, 0.7)',
  
  // Accents
  accent: {
    pink: '#ff6b9d',
    teal: '#40E0D0',
    gold: '#ffd700',
    purple: '#c77dff',
    lightBlue: '#a0d8f1',
  },
  
  // UI Elements
  border: 'rgba(255, 255, 255, 0.3)',
  borderLight: 'rgba(255, 255, 255, 0.2)',
  divider: 'rgba(255, 255, 255, 0.15)',
};

export const spacing = {
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '20px',
  xl: '24px',
  xxl: '30px',
};

export const borderRadius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
};

export const shadows = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.1)',
  md: '0 4px 12px rgba(0, 0, 0, 0.1)',
  lg: '0 6px 16px rgba(0, 0, 0, 0.15)',
  xl: '0 8px 24px rgba(0, 0, 0, 0.2)',
};

export const buttonStyles = {
  base: {
    padding: '14px 28px',
    backdropFilter: 'blur(10px)',
    color: colors.textPrimary,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    boxShadow: shadows.md,
  },
  
  primary: {
    background: colors.glass.light,
  },
  
  active: {
    background: colors.glass.heavy,
  },
};

export const containerStyles = {
  glass: {
    background: colors.glass.light,
    backdropFilter: 'blur(10px)',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    boxShadow: shadows.xl,
    border: `1px solid ${colors.borderLight}`,
  },
};

