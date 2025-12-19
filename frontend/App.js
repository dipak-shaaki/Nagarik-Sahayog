import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/theme';

export default function App() {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const requestPermissions = async () => {
            try {
                // Request location permission on app startup for seamless navigation
                await Location.requestForegroundPermissionsAsync();
            } catch (error) {
                console.log('Permission request error:', error);
            } finally {
                setIsReady(true);
            }
        };

        requestPermissions();
    }, []);

    if (!isReady) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <LanguageProvider>
                <AuthProvider>
                    <NotificationProvider>
                        <AppNavigator />
                    </NotificationProvider>
                </AuthProvider>
            </LanguageProvider>
        </SafeAreaProvider>
    );
}
