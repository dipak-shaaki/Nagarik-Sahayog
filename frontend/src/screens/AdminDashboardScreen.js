import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SHADOWS } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';

import { useFocusEffect } from '@react-navigation/native';
import MapRenderer from '../components/MapRenderer';

const AdminDashboardScreen = ({ navigation }) => {
    const { logout, user } = useAuth();
    const [reports, setReports] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [selectedReport, setSelectedReport] = useState(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [isMapView, setIsMapView] = useState(false);

    const [region, setRegion] = useState({
        latitude: 27.7172,
        longitude: 85.3240,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    });

    useFocusEffect(
        useCallback(() => {
            fetchReports();
            if (user?.role === 'SUPER_ADMIN' || user?.role === 'DEPT_ADMIN') {
                fetchStaff();
            }
        }, [user])
    );

    const fetchReports = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_URL}/reports/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setReports(data);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStaff = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_URL}/auth/staff/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setStaff(data);
            }
        } catch (error) {
            console.error('Error fetching staff:', error);
        }
    };

    const handleAssign = async (officialId) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_URL}/reports/${selectedReport.id}/assign/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ official_id: officialId })
            });

            if (response.ok) {
                Alert.alert('Success', 'Report assigned successfully');
                setShowAssignModal(false);
                fetchReports();
            } else {
                const data = await response.json();
                Alert.alert('Error', data.error || 'Failed to assign report');
            }
        } catch (error) {
            Alert.alert('Error', 'Connection error');
        }
    };

    const handleDeleteReport = async () => {
        const deleteConfirmed = async () => {
            try {
                if (!selectedReport?.id) {
                    Alert.alert('Error', 'Invalid Report ID');
                    return;
                }
                const token = await AsyncStorage.getItem('userToken');
                const response = await fetch(`${API_URL}/reports/${selectedReport.id}/`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    if (Platform.OS === 'web') {
                        alert('Report deleted successfully');
                    } else {
                        Alert.alert('Success', 'Report deleted successfully');
                    }
                    setShowDetailModal(false);
                    fetchReports();
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMsg = errorData.error || `Failed to delete report: ${response.status}`;
                    Alert.alert('Error', errorMsg);
                }
            } catch (error) {
                Alert.alert('Error', 'Connection error');
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
                deleteConfirmed();
            }
        } else {
            Alert.alert(
                'Delete Report',
                'Are you sure you want to delete this report? This action cannot be undone.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: deleteConfirmed }
                ]
            );
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING': return COLORS.danger;
            case 'ASSIGNED': return COLORS.info || COLORS.primary;
            case 'TEAM_ARRIVED': return COLORS.secondary || '#F39C12';
            case 'IN_PROGRESS': return COLORS.primary;
            case 'RESOLVED': return COLORS.success;
            default: return COLORS.textLight;
        }
    };

    const getPriorityColor = (level) => {
        switch (level) {
            case 'CRITICAL': return '#DC2626'; // Red
            case 'HIGH': return '#EA580C'; // Orange
            case 'MEDIUM': return '#CA8A04'; // Yellow
            case 'LOW': return '#16A34A'; // Green
            default: return COLORS.textLight;
        }
    };

    const filteredReports = filter === 'ALL'
        ? reports
        : reports.filter(r => r.status === filter);

    const renderItem = ({ item }) => {
        return (
            <TouchableOpacity
                onPress={() => {
                    setSelectedReport(item);
                    setShowDetailModal(true);
                }}
                activeOpacity={0.7}
            >
                <View style={[styles.card, SHADOWS.small, { borderLeftColor: getStatusColor(item.status) }]}>
                    <Image source={{ uri: item.image || 'https://placehold.co/150' }} style={styles.cardImage} />

                    <View style={styles.cardContent}>
                        <View style={styles.cardHeaderRow}>
                            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                <View style={[styles.statusPill, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                    <Text style={[styles.statusPillText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                                </View>
                                {item.priority_level && (
                                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority_level) }]}>
                                        <Ionicons name="flame" size={10} color={COLORS.white} />
                                        <Text style={styles.priorityText}>{item.priority_level}</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.cardRow}>
                            <Ionicons name="location-outline" size={14} color={COLORS.textLight} />
                            <Text style={styles.cardAddress} numberOfLines={1}>{item.location_address || 'No address'}</Text>
                        </View>

                        <View style={styles.cardRow}>
                            <Ionicons name="time-outline" size={14} color={COLORS.textLight} />
                            <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

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
                        < View style={styles.headerContent}>
                            <View>
                                <Text style={styles.headerTitle}>
                                    {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : `${user?.department_name || 'Department'} Admin`}
                                </Text>
                                <Text style={styles.headerSubtitle}>
                                    {user?.role === 'SUPER_ADMIN' ? 'System Control Panel' : `Managing ${user?.department_name || 'Department'} Operations`}
                                </Text>
                            </View>

                            <View style={styles.headerActions}>
                                <TouchableOpacity onPress={() => navigation.navigate('CreateStaff')} style={styles.iconButton}>
                                    <Ionicons name="person-add" size={22} color={COLORS.white} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.iconButton, isMapView && { backgroundColor: 'rgba(255,255,255,0.3)' }]}
                                    onPress={() => setIsMapView(!isMapView)}
                                >
                                    <Ionicons name={isMapView ? "list" : "map"} size={22} color={COLORS.white} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.iconButton}
                                    onPress={() => navigation.navigate('Alerts')}
                                >
                                    <Ionicons name="notifications-outline" size={26} color={COLORS.white} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={logout} style={styles.iconButton}>
                                    <Ionicons name="log-out-outline" size={26} color={COLORS.white} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.statsContainer}>
                            <View style={styles.statCard}>
                                <Text style={[styles.statCount, { color: COLORS.danger }]}>
                                    {reports.filter(r => r.status === 'PENDING').length}
                                </Text>
                                <Text style={styles.statLabel}>Pending</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={[styles.statCount, { color: COLORS.primary }]}>
                                    {reports.filter(r => ['ASSIGNED', 'TEAM_ARRIVED', 'IN_PROGRESS'].includes(r.status)).length}
                                </Text>
                                <Text style={styles.statLabel}>Active</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={[styles.statCount, { color: COLORS.success }]}>
                                    {reports.filter(r => r.status === 'RESOLVED').length}
                                </Text>
                                <Text style={styles.statLabel}>Resolved</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Filter Bar */}
                <View style={styles.filterContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        {['ALL', 'PENDING', 'ASSIGNED', 'TEAM_ARRIVED', 'IN_PROGRESS', 'RESOLVED'].map((f) => (
                            <TouchableOpacity
                                key={f}
                                onPress={() => setFilter(f)}
                            >
                                <LinearGradient
                                    colors={filter === f ? [COLORS.primary, COLORS.gradientEnd] : [COLORS.surface, COLORS.surface]}
                                    style={[styles.filterTab, filter === f && styles.activeFilterTab]}
                                >
                                    <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>
                                        {f}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Updating Dashboard...</Text>
                    </View>
                ) : isMapView ? (
                    <View style={styles.mapContainer}>
                        <MapRenderer
                            style={{ flex: 1 }}
                            region={region}
                            onRegionChangeComplete={setRegion}
                            markers={filteredReports.map(report => ({
                                coordinate: { latitude: report.latitude, longitude: report.longitude },
                                title: report.title,
                                description: `Status: ${report.status}`,
                                pinColor: report.status === 'PENDING' ? 'red' :
                                    report.status === 'ASSIGNED' ? 'blue' : 'green'
                            }))}
                        />
                    </View>
                ) : (
                    <FlatList
                        data={filteredReports}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        style={{ flex: 1 }}
                    />
                )}

                {/* Detail Modal */}
                <Modal
                    visible={showDetailModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowDetailModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.detailContainer, SHADOWS.large]}>
                            <View style={styles.detailHeader}>
                                <Text style={styles.detailTitle} numberOfLines={1}>{selectedReport?.title}</Text>
                                <TouchableOpacity onPress={() => setShowDetailModal(false)} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color={COLORS.textLight} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                {selectedReport?.image && (
                                    <Image
                                        source={{ uri: selectedReport.image }}
                                        style={styles.detailImage}
                                        resizeMode="cover"
                                    />
                                )}

                                <View style={styles.detailBody}>
                                    <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedReport?.status) }]}>
                                        <Text style={styles.statusTextLarge}>{selectedReport?.status}</Text>
                                    </View>

                                    <View style={styles.infoGrid}>
                                        <View style={styles.infoItem}>
                                            <Text style={styles.infoLabel}>Category</Text>
                                            <Text style={styles.infoValue}>{selectedReport?.category_name}</Text>
                                        </View>
                                        <View style={styles.infoItem}>
                                            <Text style={styles.infoLabel}>Reporter</Text>
                                            <Text style={styles.infoValue}>{selectedReport?.citizen_name}</Text>
                                        </View>
                                        <View style={styles.infoItem}>
                                            <Text style={styles.infoLabel}>Date</Text>
                                            <Text style={styles.infoValue}>
                                                {selectedReport ? new Date(selectedReport.created_at).toLocaleDateString() : ''}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={styles.sectionHeader}>Description</Text>
                                    <Text style={styles.descriptionText}>{selectedReport?.description}</Text>

                                    <Text style={styles.sectionHeader}>Location</Text>
                                    <Text style={styles.addressText}>{selectedReport?.location_address}</Text>

                                    {selectedReport?.official_name && (
                                        <View style={styles.assignedBox}>
                                            <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
                                            <Text style={styles.assignedText}>Assigned: {selectedReport.official_name}</Text>
                                        </View>
                                    )}

                                    {selectedReport?.ai_reasoning && (
                                        <>
                                            <Text style={styles.sectionHeader}>AI Priority Analysis</Text>
                                            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(selectedReport.priority_level), alignSelf: 'flex-start', marginBottom: 10, paddingHorizontal: 12, paddingVertical: 6 }]}>
                                                <Ionicons name="flame" size={14} color={COLORS.white} />
                                                <Text style={[styles.priorityText, { fontSize: 14 }]}>{selectedReport.priority_level} ({selectedReport.priority_score}/100)</Text>
                                            </View>
                                            <Text style={styles.aiReasoningText}>{selectedReport.ai_reasoning}</Text>
                                        </>
                                    )}
                                </View>
                            </ScrollView>

                            <View style={styles.detailActions}>
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.primaryBtn]}
                                    onPress={() => {
                                        setShowDetailModal(false);
                                        navigation.navigate('MapScreen', {
                                            problemLocation: {
                                                id: selectedReport.id,
                                                latitude: selectedReport.latitude,
                                                longitude: selectedReport.longitude,
                                                title: selectedReport.title,
                                                status: selectedReport.status,
                                                image: selectedReport.image
                                            },
                                            adminLocation: {
                                                latitude: selectedReport.office_latitude,
                                                longitude: selectedReport.office_longitude
                                            },
                                            from: 'AdminDashboard'
                                        });
                                    }}
                                >
                                    <Ionicons name="navigate-circle" size={24} color={COLORS.white} />
                                    <Text style={styles.btnText}>Route</Text>
                                </TouchableOpacity>

                                {selectedReport?.status === 'PENDING' && (
                                    <TouchableOpacity
                                        style={[styles.actionBtn, styles.assignBtn]}
                                        onPress={() => {
                                            setShowDetailModal(false);
                                            setShowAssignModal(true);
                                        }}
                                    >
                                        <Ionicons name="person-add" size={20} color={COLORS.white} />
                                        <Text style={styles.btnText}>Assign</Text>
                                    </TouchableOpacity>
                                )}

                                {user?.role === 'DEPT_ADMIN' && (
                                    <>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: COLORS.info || COLORS.primary }]}
                                            onPress={() => {
                                                setShowDetailModal(false);
                                                navigation.navigate('CreateReport', { report: selectedReport });
                                            }}
                                        >
                                            <Ionicons name="create" size={20} color={COLORS.white} />
                                            <Text style={styles.btnText}>Edit</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.deleteBtn]}
                                            onPress={handleDeleteReport}
                                        >
                                            <Ionicons name="trash" size={20} color={COLORS.white} />
                                            <Text style={styles.btnText}>Delete</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </View>
                    </View>
                </Modal>

                <Modal
                    visible={showAssignModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowAssignModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Assign Official</Text>
                                <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.text} />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.modalSubtitle}>Report: {selectedReport?.title}</Text>

                            <FlatList
                                data={staff}
                                keyExtractor={item => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.staffItem}
                                        onPress={() => handleAssign(item.id)}
                                    >
                                        <View style={styles.staffAvatar}>
                                            <Text style={styles.staffInitials}>{item.first_name[0]}</Text>
                                        </View>
                                        <View style={styles.staffInfo}>
                                            <Text style={styles.staffName}>{item.first_name} {item.last_name}</Text>
                                            <Text style={styles.staffPhone}>{item.phone}</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={<Text style={styles.emptyText}>No officials found.</Text>}
                            />
                        </View>
                    </View>
                </Modal>
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
        marginBottom: 10,
        backgroundColor: COLORS.white,
    },
    headerGradient: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 25,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 10,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EEE',
        ...SHADOWS.small,
        elevation: 2,
    },
    statCount: {
        fontSize: 20,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 11,
        color: COLORS.textLight,
        fontWeight: '600',
        marginTop: 2,
        textTransform: 'uppercase',
    },
    filterContainer: {
        paddingTop: 10,
        paddingBottom: 5,
    },
    filterScroll: {
        paddingHorizontal: 20,
        gap: 10,
    },
    filterTab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        ...SHADOWS.small,
        minWidth: 80,
        alignItems: 'center',
    },
    activeFilterTab: {
        // Handled by conditional gradient checks
    },
    filterText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text,
    },
    activeFilterText: {
        color: COLORS.white,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: COLORS.textLight,
    },
    mapContainer: {
        flex: 1,
        marginTop: 10,
        overflow: 'hidden',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    listContent: {
        padding: 20,
        paddingTop: 10,
        paddingBottom: 100,
    },
    card: {
        borderRadius: 12,
        marginBottom: 12,
        backgroundColor: COLORS.white,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
        overflow: 'hidden',
        // removed background image gradient overlay logic to make it cleaner list style
        flexDirection: 'row',
        padding: 15,
        alignItems: 'center',
    },
    cardImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        marginRight: 15,
    },
    cardContent: {
        flex: 1,
        justifyContent: 'center',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        flex: 1,
        marginRight: 8,
    },
    statusPill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusPillText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    cardAddress: {
        fontSize: 13,
        color: COLORS.textLight,
        marginLeft: 4,
        flex: 1,
    },
    cardDate: {
        fontSize: 12,
        color: COLORS.textLight,
        marginLeft: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    detailContainer: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        height: '90%',
        paddingBottom: 30,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    detailTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    closeButton: {
        padding: 4,
    },
    detailImage: {
        width: '100%',
        height: 250,
    },
    detailBody: {
        padding: 24,
    },
    statusBadgeLarge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 20,
    },
    statusTextLarge: {
        color: COLORS.white,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontSize: 12,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
    },
    infoItem: {
        width: '47%',
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 12,
    },
    infoLabel: {
        fontSize: 12,
        color: COLORS.textLight,
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
        marginTop: 8,
    },
    descriptionText: {
        color: COLORS.textLight,
        lineHeight: 22,
        fontSize: 15,
        marginBottom: 16,
    },
    addressText: {
        color: COLORS.text,
        fontSize: 15,
        marginBottom: 20,
    },
    assignedBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(42, 128, 185, 0.1)',
        padding: 12,
        borderRadius: 12,
        gap: 10,
    },
    assignedText: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    detailActions: {
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
    },
    primaryBtn: {
        backgroundColor: COLORS.primary,
        flex: 1.5,
    },
    assignBtn: {
        backgroundColor: COLORS.secondary,
    },
    deleteBtn: {
        backgroundColor: COLORS.danger,
    },
    btnText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        paddingBottom: 40,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    modalSubtitle: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 20,
    },
    staffItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    staffAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    staffInitials: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
    staffInfo: {
        flex: 1,
    },
    staffName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    staffPhone: {
        fontSize: 13,
        color: COLORS.textLight,
    },
    emptyText: {
        textAlign: 'center',
        color: COLORS.textLight,
        marginTop: 20,
    },
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        gap: 3,
    },
    priorityText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    aiReasoningText: {
        fontSize: 14,
        lineHeight: 20,
        color: COLORS.textLight,
        fontStyle: 'italic',
        marginTop: 5,
    },
});

export default AdminDashboardScreen;
