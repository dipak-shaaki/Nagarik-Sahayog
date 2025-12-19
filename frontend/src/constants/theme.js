import { Platform } from 'react-native';

export const COLORS = {
    primary: '#4A90E2', // Bright Blue
    secondary: '#50E3C2', // Teal
    accent: '#FF5A5F', // Red for emergency
    background: '#F5F7FA', // Light Gray
    surface: '#FFFFFF',
    text: '#333333',
    textLight: '#7F8C8D',
    white: '#FFFFFF',
    black: '#000000',
    success: '#2ECC71',
    warning: '#F1C40F',
    danger: '#E74C3C',
    darkOverlay: 'rgba(0, 0, 0, 0.6)',
    glass: 'rgba(255, 255, 255, 0.8)',
    glassBorder: 'rgba(255, 255, 255, 0.2)',
    gradientStart: '#1A2980',
    gradientEnd: '#26D0CE',
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
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
        }),
        medium: shadowToBox({
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
        }),
        large: shadowToBox({
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
        }),
    },
    default: {
        small: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
        },
        medium: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 5,
        },
        large: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 10,
        },
    }
});
