import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, SHADOWS } from '../constants/theme';

const CustomButton = ({ title, onPress, type = 'primary', isLoading = false, style }) => {
    const getBackgroundColor = () => {
        switch (type) {
            case 'primary': return COLORS.primary;
            case 'secondary': return COLORS.secondary;
            case 'danger': return COLORS.danger;
            case 'outline': return 'transparent';
            default: return COLORS.primary;
        }
    };

    const getTextColor = () => {
        if (type === 'outline') return COLORS.primary;
        return COLORS.white;
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                { backgroundColor: getBackgroundColor(), borderColor: COLORS.primary, borderWidth: type === 'outline' ? 1 : 0 },
                type !== 'outline' && SHADOWS.medium,
                style,
            ]}
            onPress={onPress}
            disabled={isLoading}
        >
            {isLoading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
    },
    text: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default CustomButton;
