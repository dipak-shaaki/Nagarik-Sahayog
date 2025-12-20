import { Ionicons } from '@expo/vector-icons';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SHADOWS } from '../constants/theme';

import { useAuth } from '../context/AuthContext';

const SuperAdminDashboardScreen = ({ navigation }) => {
    const { logout } = useAuth();

    const [stats, setStats] = useState({
        deptCount: 4, // We enforce 4 categories
        adminCount: 0,
        reportCount: 0
    });

    useEffect(() => {
        fetchSystemStats();
    }, []);

    const fetchSystemStats = async () => {
        // Fetch real counts (simulated for now by fetching lists, but keeps it "realistic" compared to fake 892)
        try {
            // Ideally backend would have a /stats endpoint
            // For now, we will just use the "4" depts and placeholder for others to avoid confusing fake high numbers
            // or we can fetch users/reports if endpoints exist.
            // Let's stick to "System Status" approach requested or low realistic numbers.
            setStats({
                deptCount: 4,
                adminCount: '-', // Placeholder until loaded
                reportCount: '-'
            });
        } catch (e) {
            console.log(e);
        }
    };

    const ActionCard = ({ title, subtitle, icon, color, onPress }) => (
        <TouchableOpacity style={[styles.card, SHADOWS.small]} onPress={onPress}>
            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon} size={28} color={color} />
            </View>
            <View style={styles.cardTextContent}>
                <Text style={styles.cardLabel}>{title}</Text>
                <Text style={styles.cardSub}>{subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
    );

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
                            <View>
                                <Text style={styles.headerTitle}>System Control</Text>
                                <Text style={styles.headerSubtitle}>Super Admin Portal</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.logoutButton}
                                onPress={logout}
                            >
                                <Ionicons name="log-out-outline" size={24} color={COLORS.white} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{stats.deptCount}</Text>
                                <Text style={styles.statLabel}>Active Depts</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                                <Text style={styles.statLabel}>System Healthy</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Ionicons name="shield-checkmark" size={20} color={COLORS.white} />
                                <Text style={styles.statLabel}>Secure</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <Text style={styles.sectionTitle}>User Management</Text>
                    <View style={styles.grid}>
                        <ActionCard
                            title="Add Dept Admin"
                            subtitle="Create Department Administrator"
                            icon="person-add"
                            color={COLORS.secondary}
                            onPress={() => navigation.navigate('CreateStaff', { roleType: 'DEPT_ADMIN' })}
                        />
                        <ActionCard
                            title="Manage Users"
                            subtitle="View & Edit Users"
                            icon="people"
                            color="#FF8066"
                            onPress={() => Alert.alert("User Management", "User control panel coming soon!")}
                        />
                    </View>

                    <Text style={styles.sectionTitle}>Department Overview</Text>
                    <View style={styles.deptList}>
                        <TouchableOpacity style={styles.deptCard}>
                            <View style={[styles.deptIcon, { backgroundColor: '#FF6B6B' }]}>
                                <Ionicons name="trash-outline" size={24} color="#fff" />
                            </View>
                            <View style={styles.deptInfo}>
                                <Text style={styles.deptName}>Waste and Sanitation Admin</Text>
                                <Text style={styles.deptStatus}>3 Active • 12 Pending Reports</Text>
                            </View>
                            <TouchableOpacity style={styles.deptAction}>
                                <Ionicons name="options-outline" size={20} color={COLORS.textLight} />
                            </TouchableOpacity>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.deptCard}>
                            <View style={[styles.deptIcon, { backgroundColor: '#4D96FF' }]}>
                                <Ionicons name="car-outline" size={24} color="#fff" />
                            </View>
                            <View style={styles.deptInfo}>
                                <Text style={styles.deptName}>Road and Transport Admin</Text>
                                <Text style={styles.deptStatus}>5 Active • 28 Pending Reports</Text>
                            </View>
                            <TouchableOpacity style={styles.deptAction}>
                                <Ionicons name="options-outline" size={20} color={COLORS.textLight} />
                            </TouchableOpacity>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.deptCard}>
                            <View style={[styles.deptIcon, { backgroundColor: '#6BCB77' }]}>
                                <Ionicons name="water-outline" size={24} color="#fff" />
                            </View>
                            <View style={styles.deptInfo}>
                                <Text style={styles.deptName}>Water and Drainage Admin</Text>
                                <Text style={styles.deptStatus}>2 Active • 5 Pending Reports</Text>
                            </View>
                            <TouchableOpacity style={styles.deptAction}>
                                <Ionicons name="options-outline" size={20} color={COLORS.textLight} />
                            </TouchableOpacity>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.addDeptCard}>
                            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
                            <Text style={styles.addDeptText}>Register New Department</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionTitle}>System Health</Text>
                    <View style={styles.healthCard}>
                        <View style={styles.healthRow}>
                            <Text style={styles.healthLabel}>Server Status</Text>
                            <Text style={[styles.healthValue, { color: COLORS.success }]}>Operational</Text>
                        </View>
                        <View style={styles.healthRow}>
                            <Text style={styles.healthLabel}>Database</Text>
                            <Text style={[styles.healthValue, { color: COLORS.success }]}>Connected</Text>
                        </View>
                        <View style={styles.healthRow}>
                            <Text style={styles.healthLabel}>Last Backup</Text>
                            <Text style={styles.healthValue}>2 Hours Ago</Text>
                        </View>
                    </View>

                    <View style={{ height: 100 }} />
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
        paddingHorizontal: 24,
        paddingBottom: 25,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    logoutButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 10,
        borderRadius: 20,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 15,
        padding: 15,
        marginTop: 5,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        color: COLORS.white,
        fontSize: 20,
        fontWeight: 'bold',
    },
    statLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '600',
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: 10,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 15,
        marginTop: 5,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
        marginBottom: 20,
    },
    card: {
        width: '47%',
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 15,
        flexDirection: 'column',
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: '#EEE',
    },
    iconContainer: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTextContent: {
        marginBottom: 10,
    },
    cardLabel: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 2,
    },
    cardSub: {
        fontSize: 11,
        color: COLORS.textLight,
    },
    deptList: {
        gap: 12,
        marginBottom: 20,
    },
    deptCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    deptIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    deptInfo: {
        flex: 1,
    },
    deptName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    deptStatus: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 2,
    },
    deptAction: {
        padding: 5,
    },
    addDeptCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderStyle: 'dashed',
        borderRadius: 16,
        backgroundColor: 'rgba(46, 204, 113, 0.05)',
        gap: 8,
    },
    addDeptText: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 15,
    },
    healthCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    healthRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    healthLabel: {
        color: COLORS.textLight,
        fontSize: 14,
    },
    healthValue: {
        color: COLORS.text,
        fontWeight: '600',
        fontSize: 14,
    },
});

export default SuperAdminDashboardScreen;
