import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SHADOWS } from '../constants/theme';

import { useAuth } from '../context/AuthContext';

const SuperAdminDashboardScreen = ({ navigation }) => {
    const { logout } = useAuth();

    return (
        <ScreenWrapper backgroundColor={COLORS.background}>
            <View style={styles.container}>
                <View style={styles.headerContainer}>
                    <LinearGradient
                        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.headerGradient}
                    >
                        <View style={styles.headerTop}>
                            <Text style={styles.headerTitle}>Super Admin Control</Text>
                            <View style={{ flexDirection: 'row', gap: 15 }}>
                                <TouchableOpacity
                                    style={styles.iconButton}
                                    onPress={() => navigation.navigate('CreateStaff')}
                                >
                                    <Ionicons name="person-add" size={24} color={COLORS.white} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.iconButton}
                                    onPress={() => navigation.navigate('Alerts')}
                                >
                                    <Ionicons name="notifications-outline" size={28} color={COLORS.white} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.iconButton}
                                    onPress={logout}
                                >
                                    <Ionicons name="log-out-outline" size={28} color={COLORS.white} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <Text style={styles.headerSubtitle}>Manage Departments & Global Settings</Text>
                    </LinearGradient>
                </View>

                <ScrollView style={[styles.content, { flex: 1 }]} showsVerticalScrollIndicator={false}>
                    <Text style={styles.sectionTitle}>Manage Departments</Text>

                    <View style={styles.grid}>
                        <TouchableOpacity style={[styles.card, SHADOWS.medium]}>
                            <View style={[styles.iconContainer, { backgroundColor: '#FF6B6B' }]}>
                                <Ionicons name="trash" size={28} color="#fff" />
                            </View>
                            <Text style={styles.cardLabel}>Waste Mgmt</Text>
                            <Text style={styles.cardSub}>3 Admins</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.card, SHADOWS.medium]}>
                            <View style={[styles.iconContainer, { backgroundColor: '#4D96FF' }]}>
                                <Ionicons name="construct" size={28} color="#fff" />
                            </View>
                            <Text style={styles.cardLabel}>Road Dept</Text>
                            <Text style={styles.cardSub}>5 Admins</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.card, SHADOWS.medium]}>
                            <View style={[styles.iconContainer, { backgroundColor: '#6BCB77' }]}>
                                <Ionicons name="water" size={28} color="#fff" />
                            </View>
                            <Text style={styles.cardLabel}>Water Board</Text>
                            <Text style={styles.cardSub}>2 Admins</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.card, SHADOWS.medium, styles.addCard]}>
                            <Ionicons name="add" size={32} color={COLORS.primary} />
                            <Text style={[styles.cardLabel, { color: COLORS.primary }]}>New Dept</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.manageReportsBtn, SHADOWS.medium]}
                        onPress={() => navigation.navigate('AdminDashboard')}
                    >
                        <LinearGradient
                            colors={[COLORS.secondary, '#2980b9']}
                            style={styles.btnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Ionicons name="clipboard-outline" size={24} color={COLORS.white} />
                            <Text style={styles.manageReportsText}>Manage All Reports</Text>
                            <Ionicons name="arrow-forward" size={24} color={COLORS.white} style={{ marginLeft: 'auto' }} />
                        </LinearGradient>
                    </TouchableOpacity>

                    <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Global Stats</Text>
                    <View style={[styles.statsCard, SHADOWS.medium]}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>1,240</Text>
                            <Text style={styles.statLabel}>Total Reports</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>85%</Text>
                            <Text style={styles.statLabel}>Resolution Rate</Text>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerContainer: {
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
        ...SHADOWS.medium,
        backgroundColor: COLORS.white,
        marginBottom: 10,
    },
    headerGradient: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        padding: 24,
        paddingBottom: 30,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
    },
    iconButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 8,
        borderRadius: 20,
    },
    content: {
        padding: 20,
        paddingBottom: 100,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 20,
        marginLeft: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    card: {
        width: '47%',
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        marginBottom: 8,
    },
    addCard: {
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderStyle: 'dashed',
        backgroundColor: COLORS.primary + '05', // 5% opacity
        justifyContent: 'center',
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        ...SHADOWS.small,
    },
    cardLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    cardSub: {
        fontSize: 12,
        color: COLORS.textLight,
        fontWeight: '600',
    },
    manageReportsBtn: {
        borderRadius: 20,
        marginTop: 10,
        overflow: 'hidden',
    },
    btnGradient: {
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    manageReportsText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
    statsCard: {
        backgroundColor: COLORS.primary,
        borderRadius: 24,
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 40,
    },
    statItem: {
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    statLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 4,
        fontWeight: '500',
    }
});

export default SuperAdminDashboardScreen;
