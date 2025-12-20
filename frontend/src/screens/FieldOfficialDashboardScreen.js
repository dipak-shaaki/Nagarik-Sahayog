import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SHADOWS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';



import { useFocusEffect } from '@react-navigation/native';

const FieldOfficialDashboardScreen = ({ navigation }) => {
    const { logout, user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedTask, setSelectedTask] = useState(null);

    useFocusEffect(
        useCallback(() => {
            fetchTasks();
        }, [])
    );

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_URL}/reports/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setTasks(data);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (reportId) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_URL}/reports/${reportId}/accept/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                Alert.alert("Success", "Task accepted!");
                fetchTasks();
            } else {
                const data = await response.json();
                Alert.alert("Error", data.error || "Failed to accept task");
            }
        } catch (error) {
            Alert.alert("Error", "Connection error");
        }
    };

    const handleDecline = async () => {
        if (!rejectionReason.trim()) {
            Alert.alert("Error", "Please provide a reason");
            return;
        }

        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_URL}/reports/${selectedTask.id}/decline/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason: rejectionReason })
            });

            if (response.ok) {
                Alert.alert("Success", "Task declined");
                setShowDeclineModal(false);
                setRejectionReason('');
                fetchTasks();
            } else {
                const data = await response.json();
                Alert.alert("Error", data.error || "Failed to decline task");
            }
        } catch (error) {
            Alert.alert("Error", "Connection error");
        }
    };

    const handleStatusUpdate = async (reportId, newStatus) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_URL}/reports/${reportId}/status/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                Alert.alert("Success", `Status updated to ${newStatus}`);
                fetchTasks();
            } else {
                const data = await response.json();
                Alert.alert("Error", data.error || "Failed to update status");
            }
        } catch (error) {
            Alert.alert("Error", "Connection error");
        }
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
                        <View style={styles.headerTop}>
                            <View style={styles.headerInfo}>
                                <Text style={styles.welcomeText}>Welcome back,</Text>
                                <Text style={styles.headerTitle}>{user?.first_name || 'Official'}</Text>
                                <View style={styles.deptBadge}>
                                    <Ionicons name="business" size={14} color="rgba(255,255,255,0.9)" />
                                    <Text style={styles.deptText}>{user?.department_name || 'General Field'}</Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                                <TouchableOpacity
                                    style={styles.iconButton}
                                    onPress={() => navigation.navigate('Alerts')}
                                >
                                    <Ionicons name="notifications-outline" size={28} color={COLORS.white} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.iconButton}
                                    onPress={() => navigation.navigate('Profile')}
                                >
                                    <Ionicons name="person-circle-outline" size={28} color={COLORS.white} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.iconButton}
                                    onPress={logout}
                                >
                                    <Ionicons name="log-out-outline" size={24} color={COLORS.white} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.statsCard}>
                            <View style={styles.statItem}>
                                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255,107,107,0.2)' }]}>
                                    <Ionicons name="time" size={20} color="#FF6B6B" />
                                </View>
                                <View>
                                    <Text style={styles.statNumber}>{tasks.filter(t => t.status === 'ASSIGNED').length}</Text>
                                    <Text style={styles.statLabel}>Pending</Text>
                                </View>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(77,150,255,0.2)' }]}>
                                    <Ionicons name="construct" size={20} color="#4D96FF" />
                                </View>
                                <View>
                                    <Text style={styles.statNumber}>{tasks.filter(t => ['TEAM_ARRIVED', 'IN_PROGRESS'].includes(t.status)).length}</Text>
                                    <Text style={styles.statLabel}>Active</Text>
                                </View>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(107,203,119,0.2)' }]}>
                                    <Ionicons name="checkmark-circle" size={20} color="#6BCB77" />
                                </View>
                                <View>
                                    <Text style={styles.statNumber}>{tasks.filter(t => t.status === 'RESOLVED').length}</Text>
                                    <Text style={styles.statLabel}>Resolved</Text>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                <FlatList
                    data={tasks}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    style={{ flex: 1 }}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={fetchTasks} colors={[COLORS.primary]} />
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => {
                                setSelectedTask(item);
                                setShowDetailModal(true);
                            }}
                        >
                            <View style={[styles.card, SHADOWS.medium]}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.categoryTag}>
                                        <Ionicons name="folder-open" size={14} color={COLORS.primary} />
                                        <Text style={styles.categoryTagText}>{item.category_name}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'RESOLVED' ? COLORS.success : COLORS.secondary }]}>
                                        <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
                                    </View>
                                </View>

                                <Text style={styles.cardTitle}>{item.title}</Text>

                                <View style={styles.cardBody}>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="location" size={16} color={COLORS.primary} />
                                        <Text style={styles.infoText} numberOfLines={1}>{item.location_address || 'View on map'}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="calendar-outline" size={16} color={COLORS.textLight} />
                                        <Text style={styles.infoText}>Reported on {new Date(item.created_at).toLocaleDateString()}</Text>
                                    </View>
                                </View>

                                <View style={styles.cardFooter}>
                                    <TouchableOpacity
                                        style={styles.navigateBtn}
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            navigation.navigate('MapScreen', {
                                                selectionMode: false,
                                                problemLocation: {
                                                    id: item.id,
                                                    latitude: item.latitude,
                                                    longitude: item.longitude,
                                                    title: item.title,
                                                    status: item.status
                                                },
                                                from: 'FieldOfficialDashboard'
                                            });
                                        }}
                                    >
                                        <LinearGradient
                                            colors={[COLORS.primary, '#3498db']}
                                            style={styles.btnGradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                        >
                                            <Ionicons name="navigate-outline" size={18} color={COLORS.white} />
                                            <Text style={styles.btnText}>Navigate</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>

                                    {item.status === 'ASSIGNED' && (
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: COLORS.secondary }]}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                handleStatusUpdate(item.id, 'TEAM_ARRIVED');
                                            }}
                                        >
                                            <Text style={styles.actionBtnText}>Arrived</Text>
                                        </TouchableOpacity>
                                    )}

                                    {item.status === 'TEAM_ARRIVED' && (
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: '#3498DB' }]}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                handleStatusUpdate(item.id, 'IN_PROGRESS');
                                            }}
                                        >
                                            <Text style={styles.actionBtnText}>Start Work</Text>
                                        </TouchableOpacity>
                                    )}

                                    {item.status === 'IN_PROGRESS' && (
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                handleStatusUpdate(item.id, 'RESOLVED');
                                            }}
                                        >
                                            <Text style={styles.actionBtnText}>Finish</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyText}>No tasks assigned to you yet.</Text>}
                />

                {/* Task Detail Modal */}
                <Modal
                    visible={showDetailModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowDetailModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.detailContainer}>
                            <View style={styles.detailHeader}>
                                <Text style={styles.detailTitle}>{selectedTask?.title}</Text>
                                <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* Image Section */}
                                {selectedTask?.image && (
                                    <Image
                                        source={{ uri: selectedTask.image }}
                                        style={styles.detailImage}
                                        resizeMode="cover"
                                    />
                                )}

                                {/* Task Information */}
                                <View style={styles.detailInfo}>
                                    {/* Status Badge */}
                                    <View style={[styles.statusBadgeLarge, { backgroundColor: COLORS.secondary }]}>
                                        <Text style={styles.statusTextLarge}>{selectedTask?.status}</Text>
                                    </View>

                                    {/* Category */}
                                    <View style={styles.detailRow}>
                                        <Ionicons name="folder-outline" size={18} color={COLORS.primary} />
                                        <Text style={styles.detailLabel}>Category:</Text>
                                        <Text style={styles.detailValue}>{selectedTask?.category_name}</Text>
                                    </View>

                                    {/* Citizen Info */}
                                    <View style={styles.detailRow}>
                                        <Ionicons name="person-outline" size={18} color={COLORS.primary} />
                                        <Text style={styles.detailLabel}>Reported by:</Text>
                                        <Text style={styles.detailValue}>{selectedTask?.citizen_name}</Text>
                                    </View>

                                    {/* Date/Time */}
                                    <View style={styles.detailRow}>
                                        <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                                        <Text style={styles.detailLabel}>Submitted:</Text>
                                        <Text style={styles.detailValue}>
                                            {selectedTask ? new Date(selectedTask.created_at).toLocaleString() : ''}
                                        </Text>
                                    </View>

                                    {/* Location */}
                                    <View style={styles.detailRow}>
                                        <Ionicons name="location-outline" size={18} color={COLORS.primary} />
                                        <Text style={styles.detailLabel}>Location:</Text>
                                        <Text style={styles.detailValue} numberOfLines={2}>
                                            {selectedTask?.location_address ||
                                                `${selectedTask?.latitude?.toFixed(6)}, ${selectedTask?.longitude?.toFixed(6)}`}
                                        </Text>
                                    </View>

                                    {/* Coordinates */}
                                    <View style={styles.detailRow}>
                                        <Ionicons name="navigate-outline" size={18} color={COLORS.primary} />
                                        <Text style={styles.detailLabel}>Coordinates:</Text>
                                        <Text style={styles.detailValue}>
                                            {selectedTask?.latitude?.toFixed(6)}, {selectedTask?.longitude?.toFixed(6)}
                                        </Text>
                                    </View>

                                    <View style={styles.divider} />

                                    {/* Description Section */}
                                    <Text style={styles.sectionLabel}>Description</Text>
                                    <Text style={styles.descriptionText}>{selectedTask?.description}</Text>
                                </View>
                            </ScrollView>

                            {/* Action Buttons */}
                            <View style={styles.detailActions}>
                                {/* Get Route Button - Primary Action */}
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.primaryButton]}
                                    onPress={() => {
                                        setShowDetailModal(false);
                                        navigation.navigate('MapScreen', {
                                            selectionMode: false,
                                            problemLocation: {
                                                id: selectedTask.id,
                                                latitude: selectedTask.latitude,
                                                longitude: selectedTask.longitude,
                                                title: selectedTask.title,
                                                status: selectedTask.status,
                                                image: selectedTask.image
                                            },
                                            from: 'FieldOfficialDashboard'
                                        });
                                    }}
                                >
                                    <Ionicons name="navigate" size={20} color={COLORS.white} />
                                    <Text style={styles.modalButtonText}>Get Route</Text>
                                </TouchableOpacity>

                                {/* Status Movement Buttons */}
                                {selectedTask?.status === 'ASSIGNED' && (
                                    <TouchableOpacity
                                        style={[styles.modalButton, { backgroundColor: COLORS.secondary }]}
                                        onPress={() => {
                                            setShowDetailModal(false);
                                            handleStatusUpdate(selectedTask.id, 'TEAM_ARRIVED');
                                        }}
                                    >
                                        <Text style={styles.modalButtonText}>Mark Arrived</Text>
                                    </TouchableOpacity>
                                )}

                                {selectedTask?.status === 'TEAM_ARRIVED' && (
                                    <TouchableOpacity
                                        style={[styles.modalButton, { backgroundColor: COLORS.info || '#3498DB' }]}
                                        onPress={() => {
                                            setShowDetailModal(false);
                                            handleStatusUpdate(selectedTask.id, 'IN_PROGRESS');
                                        }}
                                    >
                                        <Text style={styles.modalButtonText}>Start Working</Text>
                                    </TouchableOpacity>
                                )}

                                {selectedTask?.status === 'IN_PROGRESS' && (
                                    <TouchableOpacity
                                        style={[styles.modalButton, { backgroundColor: COLORS.primary }]}
                                        onPress={() => {
                                            setShowDetailModal(false);
                                            handleStatusUpdate(selectedTask.id, 'RESOLVED');
                                        }}
                                    >
                                        <Text style={styles.modalButtonText}>Mark Resolved</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                </Modal>

                <Modal
                    visible={showDeclineModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowDeclineModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Decline Task</Text>
                                <TouchableOpacity onPress={() => setShowDeclineModal(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.text} />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.modalSubtitle}>Please provide a reason for declining this task:</Text>

                            <TextInput
                                style={styles.rejectionInput}
                                placeholder="Reason for rejection..."
                                multiline
                                numberOfLines={4}
                                value={rejectionReason}
                                onChangeText={setRejectionReason}
                            />

                            <TouchableOpacity
                                style={[styles.submitDeclineButton, { backgroundColor: COLORS.danger }]}
                                onPress={handleDecline}
                            >
                                <Text style={styles.submitDeclineText}>Submit Decline</Text>
                            </TouchableOpacity>
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
        backgroundColor: COLORS.white,
    },
    headerGradient: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        padding: 20,
        paddingBottom: 25,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerInfo: {
        flex: 1,
    },
    welcomeText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    deptBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginTop: 8,
        gap: 6,
    },
    deptText: {
        fontSize: 12,
        color: COLORS.white,
        fontWeight: '600',
    },
    iconButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 8,
        borderRadius: 20,
    },
    statsCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 20,
        marginTop: 10,
        ...SHADOWS.small,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textLight,
        fontWeight: '500',
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#f0f0f0',
        marginHorizontal: 10,
    },
    list: {
        padding: 20,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    categoryTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary + '10',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        gap: 6,
    },
    categoryTagText: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    statusText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 15,
    },
    cardBody: {
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    infoText: {
        fontSize: 14,
        color: COLORS.textLight,
        flex: 1,
    },
    cardFooter: {
        flexDirection: 'row',
        gap: 12,
    },
    navigateBtn: {
        flex: 1.5,
        borderRadius: 15,
        overflow: 'hidden',
    },
    btnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
    },
    btnText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    actionBtn: {
        flex: 1,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
    },
    actionBtnText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: COLORS.textLight,
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        ...SHADOWS.large,
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
        marginBottom: 15,
    },
    rejectionInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 15,
        height: 120,
        textAlignVertical: 'top',
        marginBottom: 20,
        color: COLORS.text,
        backgroundColor: '#fafafa',
    },
    submitDeclineButton: {
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitDeclineText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
    detailContainer: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        borderRadius: Platform.OS === 'web' ? 30 : 0, // Rounded on web modal
        borderRadius: 30,
        padding: 24,
        height: '90%', // Fixed height for consistency
        width: '100%',
        maxWidth: 500,
        ...SHADOWS.large,
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
        marginRight: 10,
    },
    detailImage: {
        width: '100%',
        height: 250,
        borderRadius: 20,
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
        fontWeight: '500',
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
        marginVertical: 20,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 10,
    },
    descriptionText: {
        fontSize: 15,
        lineHeight: 24,
        color: COLORS.text,
    },
    detailActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 'auto', // Push to bottom
        flexWrap: 'wrap',
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    modalButton: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: COLORS.primary,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 16,
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
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    dangerButton: {
        backgroundColor: COLORS.danger,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
});

export default FieldOfficialDashboardScreen;
