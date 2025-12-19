import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';

const ScreenWrapper = ({ children, style, gradient = false }) => {
    if (gradient) {
        return (
            <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                style={[styles.container, style]}
            >
                <StatusBar barStyle="light-content" />
                <SafeAreaView style={styles.safeArea}>
                    {children}
                </SafeAreaView>
            </LinearGradient>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: COLORS.background }, style]}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
            <SafeAreaView style={styles.safeArea}>
                {children}
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
});

export default ScreenWrapper;
