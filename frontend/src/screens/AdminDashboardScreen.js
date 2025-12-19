import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SHADOWS } from '../constants/theme';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { useAuth } from '../context/AuthContext';

const API_URL = Platform.OS === 'web' ? 'http://localhost:8000/api' : 'http://10.0.2.2:8000/api';


import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

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
            fetchStaff();
        }, [])
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
        Alert.alert(
            'Delete Report',
            'Are you sure you want to delete this report? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('userToken');
                            const response = await fetch(`${API_URL}/reports/${selectedReport.id}/`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });

                            if (response.ok) {
                                Alert.alert('Success', 'Report deleted successfully');
                                setShowDetailModal(false);
                                fetchReports();
                            } else {
                                Alert.alert('Error', 'Failed to delete report');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Connection error');
                        }
                    }
                }
            ]
        );
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING': return COLORS.danger;
            case 'ASSIGNED': return COLORS.secondary;
            case 'RESOLVED': return COLORS.primary;
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
        // The original category lookup is no longer strictly needed if category_name is directly available
        // const category = CATEGORIES.find(c => c.id === item.category); 

        return (
            <View style={[styles.card, SHADOWS.small]}>
                <Image source={{ uri: item.image || 'https://placehold.co/150' }} style={styles.cardImage} />
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                                <Text style={styles.statusText}>{item.status}</Text>
                            </View>
                            {item.priority_level && (
                                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority_level) }]}>
                                    <Ionicons name="flame" size={10} color={COLORS.white} />
                                    <Text style={styles.priorityText}>{item.priority_level}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>

                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.address} numberOfLines={1}>
                        <Ionicons name="location-outline" size={14} color={COLORS.textLight} /> {item.location_address || `${item.latitude?.toFixed(4)}, ${item.longitude?.toFixed(4)}`}
                    </Text>

                    <View style={styles.actionRow}>
                        <View style={styles.categoryBadge}>
                            <Ionicons name="alert-circle" size={14} color={COLORS.primary} />
                            <Text style={[styles.categoryText, { color: COLORS.primary }]}>
                                {item.category_name}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {item.status === 'PENDING' && (
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: COLORS.secondary }]}
                                    onPress={() => {
                                        setSelectedReport(item);
                                        setShowAssignModal(true);
                                    }}
                                >
                                    <Text style={styles.actionButtonText}>Assign</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => navigation.navigate('MapScreen', {
                                    problemLocation: {
                                        id: item.id,
                                        latitude: item.latitude,
                                        longitude: item.longitude,
                                        title: item.title,
                                        status: item.status
                                    },
                                    adminLocation: {
                                        latitude: item.office_latitude,
                                        longitude: item.office_longitude
                                    }
                                })}
                            >
                                <Text style={styles.actionButtonText}>View</Text>
                                <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>
                        {user?.role === 'SUPER_ADMIN' ? 'Super Admin Panel' : 'Department Dashboard'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity onPress={() => navigation.navigate('CreateStaff')}>
                            <Ionicons name="person-add" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.mapViewButton, isMapView && { backgroundColor: COLORS.primary }]}
                            onPress={() => setIsMapView(!isMapView)}
                        >
                            <Ionicons name={isMapView ? "list" : "map"} size={22} color={isMapView ? COLORS.white : COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={logout} style={styles.mapViewButton}>
                            <Ionicons name="log-out-outline" size={22} color={COLORS.danger} />
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.statsSummary}>
                    <View style={[styles.statBox, { borderLeftColor: COLORS.danger }]}>
                        <Text style={styles.statCount}>{reports.filter(r => r.status === 'PENDING').length}</Text>
                        <Text style={styles.statLabel}>Pending</Text>
                    </View>
                    <View style={[styles.statBox, { borderLeftColor: COLORS.secondary }]}>
                        <Text style={styles.statCount}>{reports.filter(r => r.status === 'ASSIGNED').length}</Text>
                        <Text style={styles.statLabel}>Assigned</Text>
                    </View>
                    <View style={[styles.statBox, { borderLeftColor: COLORS.primary }]}>
                        <Text style={styles.statCount}>{reports.filter(r => r.status === 'RESOLVED').length}</Text>
                        <Text style={styles.statLabel}>Resolved</Text>
                    </View>
                </View>

                {/* Filter Bar */}
                <View style={styles.filterContainer}>
                    {['ALL', 'PENDING', 'ASSIGNED', 'RESOLVED'].map((f) => (
                        <TouchableOpacity
                            key={f}
                            style={[styles.filterTab, filter === f && styles.activeFilterTab]}
                            onPress={() => setFilter(f)}
                        >
                            <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>
                                {f}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Fetching latest reports...</Text>
                    </View>
                ) : isMapView ? (
                    <View style={{ flex: 1 }}>
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
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => {
                                    setSelectedReport(item);
                                    setShowDetailModal(true);
                                }}
                            >
                                {renderItem({ item })}
                            </TouchableOpacity>
                        )}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                )}

                {/* Detail Modal */}
                <Modal
                    visible={showDetailModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowDetailModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.detailContainer}>
                            <View style={styles.detailHeader}>
                                <Text style={styles.detailTitle}>{selectedReport?.title}</Text>
                                <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.text} />
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

                                <View style={styles.detailInfo}>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                                        <Text style={styles.detailLabel}>Reported on:</Text>
                                        <Text style={styles.detailValue}>{selectedReport ? new Date(selectedReport.created_at).toLocaleString() : ''}</Text>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Ionicons name="location-outline" size={18} color={COLORS.primary} />
                                        <Text style={styles.detailLabel}>Address:</Text>
                                        <Text style={styles.detailValue}>{selectedReport?.location_address || 'Address not available'}</Text>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Ionicons name="person-outline" size={18} color={COLORS.primary} />
                                        <Text style={styles.detailLabel}>Citizen:</Text>
                                        <Text style={styles.detailValue}>{selectedReport?.citizen_name}</Text>
                                    </View>

                                    <View style={styles.divider} />

                                    <Text style={styles.sectionLabel}>Description</Text>
                                    <Text style={styles.descriptionText}>{selectedReport?.description}</Text>

                                    {selectedReport?.ai_reasoning && (
                                        <>
                                            <View style={styles.divider} />
                                            <Text style={styles.sectionLabel}>AI Priority Analysis</Text>
                                            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(selectedReport.priority_level), alignSelf: 'flex-start', marginBottom: 10 }]}>
                                                <Ionicons name="flame" size={14} color={COLORS.white} />
                                                <Text style={[styles.priorityText, { fontSize: 14 }]}>{selectedReport.priority_level} ({selectedReport.priority_score}/100)</Text>
                                            </View>
                                            <Text style={styles.aiReasoningText}>{selectedReport.ai_reasoning}</Text>
                                        </>
                                    )}
                                </View>
                            </ScrollView>

                            <View style={styles.detailActions}>
                                {selectedReport?.status === 'PENDING' && (
                                    <TouchableOpacity
                                        style={[styles.modalButton, { backgroundColor: COLORS.secondary }]}
                                        onPress={() => {
                                            setShowDetailModal(false);
                                            setShowAssignModal(true);
                                        }}
                                    >
                                        <Text style={styles.modalButtonText}>Assign Official</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={styles.modalButton}
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
                                            }
                                        });
                                    }}
                                >
                                    <Text style={styles.modalButtonText}>View on Map</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: COLORS.danger }]}
                                    onPress={handleDeleteReport}
                                >
                                    <Text style={styles.modalButtonText}>Delete</Text>
                                </TouchableOpacity>
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
                                        <View>
                                            <Text style={styles.staffName}>{item.first_name}</Text>
                                            <Text style={styles.staffPhone}>{item.phone}</Text>
                                        </View>
                                        <Ionicons name="add-circle" size={24} color={COLORS.primary} />
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={<Text style={styles.emptyText}>No officials in your department</Text>}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: COLORS.textLight,
        fontWeight: '500',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: COLORS.white,
        ...SHADOWS.small,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    mapViewButton: {
        padding: 8,
        backgroundColor: COLORS.surface,
        borderRadius: 8,
    },
    statsSummary: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 15,
        gap: 12,
    },
    statBox: {
        flex: 1,
        backgroundColor: COLORS.white,
        padding: 12,
        borderRadius: 12,
        borderLeftWidth: 4,
        ...SHADOWS.small,
    },
    statCount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    statLabel: {
        fontSize: 10,
        color: COLORS.textLight,
        textTransform: 'uppercase',
        marginTop: 2,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 15,
        gap: 10,
    },
    filterTab: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    activeFilterTab: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    filterText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textLight,
    },
    activeFilterText: {
        color: COLORS.white,
    },
    listContent: {
        padding: 20,
        paddingTop: 5,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 15,
        marginBottom: 15,
        overflow: 'hidden',
        flexDirection: 'row',
        height: 140, // Fixed height for consistency
    },
    cardImage: {
        width: 120,
        height: '100%',
        backgroundColor: '#eee',
    },
    cardContent: {
        flex: 1,
        padding: 12,
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    dateText: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginTop: 5,
        marginBottom: 2,
    },
    address: {
        fontSize: 12,
        color: COLORS.textLight,
        marginBottom: 8,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '600',
    },
    actionButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionButtonText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: 'bold',
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
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
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
        fontStyle: 'italic',
    },
    staffItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    staffName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    staffPhone: {
        fontSize: 14,
        color: COLORS.textLight,
    },
    emptyText: {
        textAlign: 'center',
        color: COLORS.textLight,
        marginTop: 20,
    },
    detailContainer: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        maxHeight: '90%',
    },
    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    detailTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text,
        flex: 1,
    },
    detailImage: {
        width: '100%',
        height: 250,
        borderRadius: 15,
        marginBottom: 20,
    },
    detailInfo: {
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    detailLabel: {
        fontSize: 14,
        color: COLORS.textLight,
        width: 100,
    },
    detailValue: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '600',
        flex: 1,
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 15,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 15,
        lineHeight: 22,
        color: COLORS.text,
    },
    detailActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
    },
    modalButton: {
        flex: 1,
        backgroundColor: COLORS.primary,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default AdminDashboardScreen;
