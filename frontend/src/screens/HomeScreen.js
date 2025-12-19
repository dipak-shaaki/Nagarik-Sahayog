import { FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SHADOWS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const API_URL = Platform.OS === 'web' ? 'http://localhost:8000/api' : 'http://10.0.2.2:8000/api';

const HomeScreen = ({ navigation }) => {
    const { logout, user } = useAuth();
    const { t } = useLanguage();
    useEffect(() => {
        // Any initial load logic
    }, []);

    const handleEmergency = (type) => {
        navigation.navigate('EmergencyTracking', { serviceName: type });
    };

    const handleUtility = (type) => {
        navigation.navigate('ServiceDetail', { serviceName: type });
    };

    const EmergencyButton = ({ title, icon, color, onPress }) => (
        <TouchableOpacity
            style={[styles.emergencyButton, { backgroundColor: color }, SHADOWS.medium]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'transparent']}
                style={styles.glossOverlay}
            />
            <View style={styles.iconContainer}>
                {icon}
            </View>
            <Text style={styles.emergencyText}>{title}</Text>
        </TouchableOpacity>
    );

    const UtilityButton = ({ title, icon, color, onPress }) => (
        <TouchableOpacity
            style={[styles.utilityButton, SHADOWS.small]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.utilityIconContainer, { backgroundColor: color + '20' }]}>
                {icon}
            </View>
            <Text style={styles.utilityText}>{title}</Text>
        </TouchableOpacity>
    );


    return (
        <ScreenWrapper backgroundColor={COLORS.background}>
            <View style={styles.headerContainer}>
                <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerGradient}
                >
                    <View style={styles.headerContent}>
                        <View>
                            <Text style={styles.greeting}>{t('welcome')}</Text>
                            <Text style={styles.subGreeting}>Helping you build a better city.</Text>
                        </View>
                        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
                            <Ionicons name="log-out-outline" size={24} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={COLORS.primary} style={styles.searchIcon} />
                        <TextInput
                            placeholder="What do you need help with?"
                            placeholderTextColor={COLORS.textLight}
                            style={styles.searchInput}
                        />
                    </View>
                </LinearGradient>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('emergency')}</Text>
                    <Ionicons name="alert-circle-outline" size={20} color={COLORS.accent} />
                </View>

                <View style={styles.emergencyGrid}>
                    <EmergencyButton
                        title={t('police')}
                        icon={<MaterialIcons name="local-police" size={32} color={COLORS.white} />}
                        color="#2C3E50"
                        onPress={() => handleEmergency(t('police'))}
                    />
                    <EmergencyButton
                        title={t('ambulance')}
                        icon={<FontAwesome5 name="ambulance" size={28} color={COLORS.white} />}
                        color="#E74C3C"
                        onPress={() => handleEmergency(t('ambulance'))}
                    />
                    <EmergencyButton
                        title={t('fire')}
                        icon={<MaterialIcons name="local-fire-department" size={32} color={COLORS.white} />}
                        color="#F39C12"
                        onPress={() => handleEmergency(t('fire'))}
                    />
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Services</Text>
                </View>

                <View style={styles.utilityGrid}>
                    <UtilityButton
                        title="Water"
                        icon={<Ionicons name="water" size={24} color="#3498DB" />}
                        color="#3498DB"
                        onPress={() => handleUtility('Water Service')}
                    />
                    <UtilityButton
                        title="Sanitation"
                        icon={<MaterialCommunityIcons name="truck" size={24} color="#8E44AD" />}
                        color="#8E44AD"
                        onPress={() => handleUtility('Safety Tank Clean')}
                    />
                    <UtilityButton
                        title="Mechanic"
                        icon={<MaterialIcons name="car-repair" size={24} color="#E67E22" />}
                        color="#E67E22"
                        onPress={() => handleUtility('Mechanic')}
                    />
                    <UtilityButton
                        title="Blood Bank"
                        icon={<FontAwesome5 name="hand-holding-heart" size={20} color="#C0392B" />}
                        color="#C0392B"
                        onPress={() => handleUtility('Blood Donation')}
                    />
                    <UtilityButton
                        title="Medicine"
                        icon={<MaterialCommunityIcons name="pill" size={24} color="#27AE60" />}
                        color="#27AE60"
                        onPress={() => handleUtility('Medicine Service')}
                    />
                    <UtilityButton
                        title="Groceries"
                        icon={<MaterialCommunityIcons name="cart" size={24} color="#2ECC71" />}
                        color="#2ECC71"
                        onPress={() => handleUtility('Groceries')}
                    />
                </View>

            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
        ...SHADOWS.medium,
        marginBottom: 20,
    },
    headerGradient: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    greeting: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.white,
        letterSpacing: 0.5,
    },
    subGreeting: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 4,
    },
    logoutButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 10,
        borderRadius: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        ...SHADOWS.large,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
    },
    emergencyGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    emergencyButton: {
        width: '31%',
        aspectRatio: 1,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    glossOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
    },
    iconContainer: {
        marginBottom: 8,
    },
    emergencyText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 12,
    },
    utilityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    utilityButton: {
        width: '31%',
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 15,
        alignItems: 'center',
        marginBottom: 15,
    },
    utilityIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    utilityText: {
        color: COLORS.text,
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    seeAllText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '600',
    },
});

export default HomeScreen;
