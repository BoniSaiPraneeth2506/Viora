export const COLORS = {
  // Base colors (theme-independent)
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  // Theme-specific colors
  light: {
    primary: '#007AFF',
    background: '#FFFFFF',
    card: '#F2F2F7',
    text: '#000000',
    textSecondary: '#666666',
    border: '#E5E5EA',
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FF9500',
    pink: '#FF2D55',
    pinkLight: '#FFE5EC',
  },
  dark: {
    primary: '#0A84FF',
    background: '#000000',
    card: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    border: '#38383A',
    success: '#32D74B',
    error: '#FF453A',
    warning: '#FF9F0A',
    pink: '#FF375F',
    pinkLight: '#2C1E21',
  },
};

export const FONTS = {
  regular: 'WorkSans-Regular',
  medium: 'WorkSans-Medium',
  semiBold: 'WorkSans-SemiBold',
  bold: 'WorkSans-Bold',
};

export const FONT_SIZES = {
  tiny: 11,
  caption: 12,
  bodySmall: 14,
  body: 16,
  title: 18,
  subHeading: 18,
  heading: 28,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

export const BORDER_RADIUS = {
  small: 4,
  medium: 8,
  large: 12,
  pill: 24,
  circle: 9999,
};

export const SIZES = {
  header: 56,
  bottomNav: 60,
  searchBar: 48,
  input: 48,
  button: 52,
  avatar: {
    small: 32,
    medium: 40,
    large: 48,
    xlarge: 140,
  },
  icon: {
    small: 16,
    medium: 24,
    large: 32,
  },
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

export const MIN_TOUCH_TARGET = 44; // Apple HIG minimum

// Convenience export for components that expect a simpler theme structure
export const theme = {
  colors: {
    primary: COLORS.light.primary,
    background: COLORS.light.background,
    card: COLORS.light.card,
    text: COLORS.light.text,
    textLight: COLORS.light.textSecondary,
    border: COLORS.light.border,
  },
};
