import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SHADOWS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

const API_URL = Platform.OS === 'web' ? 'http://localhost:8000/api' : 'http://10.0.2.2:8000/api';

import { useFocusEffect } from '@react-navigation/native';

const FieldOfficialDashboardScreen = ({ navigation }) => {
    const { logout, user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDeclineModal, setShowDeclineModal] = useState(false);
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
        <ScreenWrapper>
            <View style={styles.container}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Field Tasks</Text>
                        <Text style={styles.headerSubtitle}>{user?.first_name || user?.phone} • {user?.department_name || 'Official'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{tasks.length} Active</Text>
                        </View>
                        <TouchableOpacity onPress={logout}>
                            <Ionicons name="log-out-outline" size={24} color={COLORS.danger} />
                        </TouchableOpacity>
                    </View>
                </View>

                <FlatList
                    data={tasks}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <View style={[styles.card, SHADOWS.small]}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>{item.title}</Text>
                                <View style={[styles.priorityBadge, { backgroundColor: COLORS.secondary }]}>
                                    <Text style={styles.priorityText}>{item.status}</Text>
                                </View>
                            </View>

                            <View style={styles.cardBody}>
                                <View style={styles.infoRow}>
                                    <Ionicons name="navigate-circle" size={16} color={COLORS.primary} />
                                    <Text style={styles.infoText}>{item.location_address || `${item.latitude?.toFixed(4)}, ${item.longitude?.toFixed(4)}`}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
                                    <Text style={styles.infoText}>Reported: {new Date(item.created_at).toLocaleDateString()}</Text>
                                </View>
                            </View>

                            <View style={styles.cardFooter}>
                                <TouchableOpacity
                                    style={styles.routeButton}
                                    onPress={() => navigation.navigate('MapScreen', {
                                        selectionMode: false,
                                        problemLocation: {
                                            id: item.id,
                                            latitude: item.latitude,
                                            longitude: item.longitude,
                                            title: item.title,
                                            status: item.status
                                        }
                                    })}
                                >
                                    <Ionicons name="map-outline" size={18} color={COLORS.white} />
                                    <Text style={styles.routeButtonText}>Navigate</Text>
                                </TouchableOpacity>

                                {item.status === 'ASSIGNED' && (
                                    <View style={{ flexDirection: 'row', gap: 8, flex: 2 }}>
                                        <TouchableOpacity
                                            style={[styles.statusButton, { backgroundColor: COLORS.secondary }]}
                                            onPress={() => handleAccept(item.id)}
                                        >
                                            <Text style={styles.statusButtonText}>Accept</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.statusButton, { backgroundColor: COLORS.danger }]}
                                            onPress={() => {
                                                setSelectedTask(item);
                                                setShowDeclineModal(true);
                                            }}
                                        >
                                            <Text style={styles.statusButtonText}>Decline</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {item.status === 'IN_PROGRESS' && (
                                    <TouchableOpacity
                                        style={[styles.statusButton, { backgroundColor: COLORS.primary }]}
                                        onPress={() => handleStatusUpdate(item.id, 'RESOLVED')}
                                    >
                                        <Text style={styles.statusButtonText}>Resolve</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyText}>No tasks assigned to you yet.</Text>}
                    refreshing={loading}
                    onRefresh={fetchTasks}
                />

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
    headerSubtitle: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 2,
    },
    badge: {
        backgroundColor: COLORS.primary + '20',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
    },
    badgeText: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 12,
    },
    list: {
        padding: 20,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        flex: 1,
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    priorityText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    cardBody: {
        padding: 15,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    infoText: {
        color: COLORS.text,
        fontSize: 14,
    },
    cardFooter: {
        flexDirection: 'row',
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 10,
    },
    routeButton: {
        flex: 1.2,
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        gap: 8,
    },
    statusButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
    },
    statusButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    routeButtonText: {
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
        padding: 20,
        width: '100%',
        maxWidth: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
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
        padding: 12,
        height: 100,
        textAlignVertical: 'top',
        marginBottom: 20,
        color: COLORS.text,
    },
    submitDeclineButton: {
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    submitDeclineText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 16,
    }
});

export default FieldOfficialDashboardScreen;
