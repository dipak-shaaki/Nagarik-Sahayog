import { Platform } from 'react-native';

export const COLORS = {
    primary: '#2A80B9', // Sophisticated Blue
    secondary: '#1ABC9C', // Teal
    accent: '#E74C3C', // Red
    background: '#F0F3F6', // Very Light Blue-Gray for depth
    surface: '#FFFFFF',
    text: '#2C3E50', // Midnight Blue
    textLight: '#7F8C8D',
    white: '#FFFFFF',
    black: '#000000',
    success: '#27AE60',
    warning: '#F39C12',
    danger: '#C0392B',
    darkOverlay: 'rgba(44, 62, 80, 0.7)',
    glass: 'rgba(255, 255, 255, 0.9)',
    glassBorder: 'rgba(255, 255, 255, 0.5)',
    gradientStart: '#2980B9',
    gradientEnd: '#6DD5FA',
    cardBorder: 'rgba(0,0,0,0.05)',
};

export const FONTS = {
    regular: 'System',
    bold: 'System', // In a real app, we'd load custom fonts
    medium: 'System',
};

const shadowToBox = (s) => ({
    boxShadow: `${s.shadowOffset.width}px ${s.shadowOffset.height}px ${s.shadowRadius}px ${s.shadowColor}${Math.round(s.shadowOpacity * 255).toString(16).padStart(2, '0')}`
});

export const SHADOWS = Platform.select({
    web: {
        small: shadowToBox({
            shadowColor: '#2C3E50',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
        }),
        medium: shadowToBox({
            shadowColor: '#2C3E50',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
        }),
        large: shadowToBox({
            shadowColor: '#2C3E50',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
        }),
    },
    default: {
        small: {
            shadowColor: '#2C3E50',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        medium: {
            shadowColor: '#2C3E50',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 6,
        },
        large: {
            shadowColor: '#2C3E50',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 12,
        },
    }
});
