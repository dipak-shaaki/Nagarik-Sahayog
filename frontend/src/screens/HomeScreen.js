import { FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SHADOWS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const API_URL = Platform.OS === 'web' ? 'http://localhost:8000/api' : 'http://10.0.2.2:8000/api';

const HomeScreen = ({ navigation }) => {
    const { logout, user } = useAuth();
    const { t } = useLanguage();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchMyReports();
    }, []);

    const fetchMyReports = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_URL}/reports/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setReports(data.slice(0, 3)); // Only show top 3
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

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
        >
            <View style={styles.iconContainer}>
                {icon}
            </View>
            <Text style={styles.emergencyText}>{title}</Text>
        </TouchableOpacity>
    );

    const UtilityButton = ({ title, icon, color, onPress }) => (
        <TouchableOpacity
            style={[styles.utilityButton, { backgroundColor: COLORS.surface }, SHADOWS.small]}
            onPress={onPress}
        >
            <View style={[styles.utilityIconContainer, { backgroundColor: color }]}>
                {icon}
            </View>
            <Text style={styles.utilityText}>{title}</Text>
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View>
                            <Text style={styles.greeting}>{t('welcome')}</Text>
                            <Text style={styles.subGreeting}>How can we help you today?</Text>
                        </View>
                        <TouchableOpacity onPress={logout} style={{ padding: 5 }}>
                            <Ionicons name="log-out-outline" size={26} color={COLORS.danger} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={COLORS.textLight} style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search services..."
                        placeholderTextColor={COLORS.textLight}
                        style={styles.searchInput}
                    />
                </View>



                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('emergency')}</Text>
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
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>All Services</Text>
                    <View style={styles.utilityGrid}>
                        <UtilityButton
                            title="Water"
                            icon={<Ionicons name="water" size={24} color="#3498DB" />}
                            color="#EBF5FB"
                            onPress={() => handleUtility('Water Service')}
                        />
                        <UtilityButton
                            title="Safety Tank"
                            icon={<MaterialCommunityIcons name="truck" size={24} color="#8E44AD" />}
                            color="#F4ECF7"
                            onPress={() => handleUtility('Safety Tank Clean')}
                        />
                        <UtilityButton
                            title="Mechanic"
                            icon={<MaterialIcons name="car-repair" size={24} color="#E67E22" />}
                            color="#FDEBD0"
                            onPress={() => handleUtility('Mechanic')}
                        />
                        <UtilityButton
                            title="Blood"
                            icon={<FontAwesome5 name="hand-holding-heart" size={20} color="#C0392B" />}
                            color="#F9EBEA"
                            onPress={() => handleUtility('Blood Donation')}
                        />
                        <UtilityButton
                            title="Medicine"
                            icon={<MaterialCommunityIcons name="pill" size={24} color="#27AE60" />}
                            color="#E9F7EF"
                            onPress={() => handleUtility('Medicine Service')}
                        />
                        <UtilityButton
                            title="Groceries"
                            icon={<MaterialCommunityIcons name="cart" size={24} color="#2ECC71" />}
                            color="#EAFAF1"
                            onPress={() => handleUtility('Groceries')}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>My Activities</Text>
                        <TouchableOpacity onPress={fetchMyReports}>
                            <Ionicons name="refresh" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : reports.length > 0 ? (
                        reports.map((report) => (
                            <TouchableOpacity
                                key={report.id}
                                style={[styles.updateCard, SHADOWS.small, { marginBottom: 10 }]}
                                onPress={() => navigation.navigate('MapScreen', {
                                    selectionMode: false,
                                    problemLocation: {
                                        latitude: report.latitude,
                                        longitude: report.longitude,
                                        title: report.title
                                    }
                                })}
                            >
                                <View style={styles.updateHeader}>
                                    <Text style={styles.updateTitle}>{report.title}</Text>
                                    <View style={[styles.miniStatusBadge, { backgroundColor: report.status === 'PENDING' ? COLORS.danger : (report.status === 'RESOLVED' ? COLORS.primary : COLORS.secondary) }]}>
                                        <Text style={styles.miniStatusText}>{report.status}</Text>
                                    </View>
                                </View>
                                <Text style={styles.updateDesc} numberOfLines={1}>{report.location_address}</Text>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.emptyActivity}>
                            <Text style={styles.emptyActivityText}>No recent activities</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 100,
    },
    header: {
        marginBottom: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginBottom: 20,
        ...SHADOWS.small,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
    },

    greeting: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    subGreeting: {
        fontSize: 16,
        color: COLORS.textLight,
        marginTop: 5,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 15,
    },
    emergencyGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    emergencyButton: {
        width: '31%',
        aspectRatio: 1,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    utilityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    utilityButton: {
        width: '31%',
        aspectRatio: 1,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
        marginBottom: 15,
    },
    utilityIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    utilityText: {
        color: COLORS.text,
        fontWeight: '600',
        fontSize: 12,
        textAlign: 'center',
    },
    iconContainer: {
        marginBottom: 8,
    },
    emergencyText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 12,
    },
    actionGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionCard: {
        width: '48%',
        backgroundColor: COLORS.surface,
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
    },
    actionIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    actionText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    updateCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 15,
        padding: 20,
    },
    updateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    updateTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    updateDate: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    updateDesc: {
        fontSize: 14,
        color: COLORS.textLight,
        lineHeight: 20,
    },
    miniStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    miniStatusText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    emptyActivity: {
        padding: 30,
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#eee',
        borderStyle: 'dashed',
    },
    emptyActivityText: {
        color: COLORS.textLight,
        fontSize: 14,
    },
});

export default HomeScreen;
