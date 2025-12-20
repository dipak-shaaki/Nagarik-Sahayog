import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, RefreshControl, StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SHADOWS } from '../constants/theme';
import { API_URL } from '../config/api';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../context/NotificationContext';



const AlertsScreen = ({ navigation }) => {
    const { t } = useLanguage();
    const { fetchUnreadCount, markAllRead } = useNotifications();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const handleMarkAllRead = async () => {
        await markAllRead();
        fetchNotifications();
    };

    useEffect(() => {
        fetchNotifications();
        // Mark all as read when screen is focused
        const unsubscribe = navigation.addListener('focus', () => {
            markAllRead();
            // We don't necessarily want to refetch the whole list on focus 
            // but we should update the global count
        });
        return unsubscribe;
    }, [navigation]);

    const deleteNotification = async (id) => {
        Alert.alert(
            "Delete Alert",
            "Are you sure you want to delete this notification?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('userToken');
                            const response = await fetch(`${API_URL}/notifications/${id}/`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (response.ok) {
                                Alert.alert("Success", "Notification deleted.");
                                setNotifications(notifications.filter(n => n.id !== id));
                                fetchUnreadCount();
                            }
                        } catch (error) {
                            console.error('Error deleting notification:', error);
                        }
                    }
                }
            ]
        );
    };

    const fetchNotifications = async () => {
        if (!refreshing) setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_URL}/notifications/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setNotifications(data);
                // Also update global count just in case
                fetchUnreadCount();
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.card, SHADOWS.small, !item.is_read && styles.unreadCard]}
            onPress={() => {
                // If the notification has a report ID linked
                if (item.report) {
                    // Try to navigate to Tracking Screen, falling back if navigation prop is missing
                    try {
                        /* 
                           We need to access the parent navigation here. 
                           Since this is inside AlertsScreen, 'navigation' prop should be available if passed. 
                           However, renderItem doesn't have direct access to 'navigation' from props unless passed down or captured in closure.
                           Since renderItem is defined inside the component, it captures 'navigation' from component scope.
                        */
                        // Assuming report ID is available as item.report (which is an ID from serializer)
                        // But wait, serializer might return full object or just ID. 
                        // Based on models, it's a ForeignKey. Serializer usually returns ID unless nested.
                        // Let's assume it returns ID. If not valid, we might need to fix serializer.
                        // Actually, let's just use item.report as the ID.
                        navigation.navigate('ReportTracking', { reportId: item.report });
                    } catch (e) {
                        console.error("Navigation failed", e);
                    }
                }
            }}
        >
            <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                    <View style={styles.iconContainer}>
                        <Ionicons
                            name={item.title.toLowerCase().includes('assigned') || item.title.toLowerCase().includes('dispatched') ? "car" : "notifications"}
                            size={18}
                            color={COLORS.primary}
                        />
                    </View>
                    <Text style={[styles.cardTitle, !item.is_read && styles.unreadText]}>{item.title}</Text>
                    {!item.is_read && <View style={styles.activeDot} />}
                </View>
            </View>
            <Text style={styles.cardDesc}>{item.message}</Text>
            <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleString()}</Text>
        </TouchableOpacity>
    );

    const renderEmpty = () => (
        <View style={styles.emptyState}>
            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} />
            ) : (
                <>
                    <Ionicons name="notifications-off-outline" size={48} color={COLORS.textLight} />
                    <Text style={styles.emptyText}>No notifications yet</Text>
                </>
            )}
        </View>
    );

    return (
        <ScreenWrapper backgroundColor={COLORS.background}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <LinearGradient
                        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.headerGradient}
                    >
                        <View style={styles.headerTop}>
                            <Text style={styles.headerTitle}>Notifications</Text>
                            {notifications.some(n => !n.is_read) && (
                                <TouchableOpacity onPress={handleMarkAllRead} style={styles.readAllBtn}>
                                    <Ionicons name="checkmark-done" size={20} color={COLORS.white} />
                                    <Text style={styles.readAllText}>Mark all as read</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text style={styles.headerSubtitle}>Recent updates on your reports</Text>
                    </LinearGradient>
                </View>

                <FlatList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    style={{ flex: 1 }}
                    ListEmptyComponent={renderEmpty}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                    }
                />
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
        marginBottom: 20,
        backgroundColor: COLORS.white,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
        ...SHADOWS.medium,
    },
    headerGradient: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        padding: 20,
        paddingBottom: 30,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.white,
        marginBottom: 5,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    readAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    readAllText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: '600',
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
    },
    list: {
        padding: 20,
        paddingTop: 10,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        marginBottom: 15,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
    },
    unreadCard: {
        backgroundColor: COLORS.surface,
        borderLeftColor: COLORS.secondary,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        flex: 1,
    },
    deleteBtn: {
        padding: 8,
        marginLeft: 10,
    },
    unreadText: {
        color: COLORS.text,
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.danger,
        marginLeft: 8,
    },
    cardDesc: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 10,
        lineHeight: 20,
    },
    cardDate: {
        fontSize: 12,
        color: COLORS.textLight,
        alignSelf: 'flex-end',
        fontStyle: 'italic',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        color: COLORS.textLight,
        marginTop: 10,
        fontSize: 16,
    },
});

export default AlertsScreen;
