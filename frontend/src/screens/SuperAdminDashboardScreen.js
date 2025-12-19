import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SHADOWS } from '../constants/theme';

import { useAuth } from '../context/AuthContext';

const SuperAdminDashboardScreen = ({ navigation }) => {
    const { logout } = useAuth();

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Super Admin</Text>
                    <View style={{ flexDirection: 'row', gap: 15 }}>
                        <TouchableOpacity onPress={() => navigation.navigate('CreateStaff')}>
                            <Ionicons name="person-add" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={logout}>
                            <Ionicons name="log-out-outline" size={24} color={COLORS.danger} />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView style={styles.content}>
                    <Text style={styles.sectionTitle}>Manage Departments</Text>

                    <View style={styles.grid}>
                        <TouchableOpacity style={[styles.card, SHADOWS.small]}>
                            <View style={[styles.iconContainer, { backgroundColor: '#FF6B6B' }]}>
                                <Ionicons name="trash" size={30} color="#fff" />
                            </View>
                            <Text style={styles.cardLabel}>Waste Mgmt</Text>
                            <Text style={styles.cardSub}>3 Admins</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.card, SHADOWS.small]}>
                            <View style={[styles.iconContainer, { backgroundColor: '#4D96FF' }]}>
                                <Ionicons name="construct" size={30} color="#fff" />
                            </View>
                            <Text style={styles.cardLabel}>Road Dept</Text>
                            <Text style={styles.cardSub}>5 Admins</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.card, SHADOWS.small]}>
                            <View style={[styles.iconContainer, { backgroundColor: '#6BCB77' }]}>
                                <Ionicons name="water" size={30} color="#fff" />
                            </View>
                            <Text style={styles.cardLabel}>Water Board</Text>
                            <Text style={styles.cardSub}>2 Admins</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.card, SHADOWS.small, styles.addCard]}>
                            <Ionicons name="add" size={40} color={COLORS.primary} />
                            <Text style={[styles.cardLabel, { color: COLORS.primary }]}>New Dept</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.manageReportsBtn, SHADOWS.medium]}
                        onPress={() => navigation.navigate('AdminDashboard')}
                    >
                        <Ionicons name="clipboard-outline" size={24} color={COLORS.white} />
                        <Text style={styles.manageReportsText}>Manage All Reports</Text>
                    </TouchableOpacity>

                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Global Stats</Text>
                    <View style={styles.statsCard}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>1,240</Text>
                            <Text style={styles.statLabel}>Total Reports</Text>
                        </View>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: COLORS.white,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 15,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
    },
    card: {
        width: '47%',
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
    },
    addCard: {
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderStyle: 'dashed',
        backgroundColor: 'transparent',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    cardSub: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 4,
    },
    manageReportsBtn: {
        backgroundColor: COLORS.secondary,
        borderRadius: 15,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginTop: 25,
    },
    manageReportsText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
    statsCard: {
        backgroundColor: COLORS.primary,
        borderRadius: 20,
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    statLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
    }
});

export default SuperAdminDashboardScreen;
