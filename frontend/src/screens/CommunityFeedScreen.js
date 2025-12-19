import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SHADOWS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');
const API_URL = Platform.OS === 'web' ? 'http://localhost:8000/api' : 'http://10.0.2.2:8000/api';
const BASE_URL = Platform.OS === 'web' ? 'http://localhost:8000' : 'http://10.0.2.2:8000';

const CommunityFeedScreen = ({ navigation }) => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchFeed();
    }, []);

    const fetchFeed = async () => {
        if (!refreshing) setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_URL}/community-feed/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setReports(data);
            } else {
                console.error('Failed to fetch feed:', data);
            }
        } catch (error) {
            console.error('Error fetching feed:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleLike = async (reportId) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_URL}/reports/${reportId}/like/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setReports(prev => prev.map(report =>
                    report.id === reportId
                        ? { ...report, is_liked: data.liked, like_count: data.like_count }
                        : report
                ));
            }
        } catch (error) {
            console.error('Like error:', error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchFeed();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING': return COLORS.danger;
            case 'ASSIGNED': return COLORS.info || COLORS.primary;
            case 'IN_PROGRESS': return COLORS.warning || '#f1c40f';
            case 'RESOLVED': return COLORS.success;
            case 'TEAM_ARRIVED': return COLORS.secondary || '#9b59b6';
            default: return COLORS.textLight;
        }
    };

    const renderReportItem = ({ item, index }) => (
        <View
            style={[styles.reportCard, SHADOWS.medium]}
        >
            {/* Card Header: User Info */}
            <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                    <View style={styles.userAvatar}>
                        <Text style={styles.avatarText}>{item.citizen_name?.[0]?.toUpperCase() || 'U'}</Text>
                    </View>
                    <View>
                        <Text style={styles.userName}>{item.citizen_name}</Text>
                        <Text style={styles.timeText}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                </View>
            </View>

            {/* Media Section */}
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.navigate('ReportTracking', { reportId: item.id })}
                style={styles.imageContainer}
            >
                {item.image ? (
                    <Image
                        source={{ uri: item.image.startsWith('http') ? item.image : `${BASE_URL}${item.image}` }}
                        style={styles.reportImage}
                        resizeMode="cover"
                    />
                ) : (
                    <LinearGradient
                        colors={['#f8f9fa', '#e9ecef']}
                        style={styles.placeholderContainer}
                    >
                        <Ionicons name="image-outline" size={40} color="#adb5bd" />
                        <Text style={styles.placeholderText}>No photo provided</Text>
                    </LinearGradient>
                )}
                <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{item.category_name}</Text>
                </View>
            </TouchableOpacity>

            {/* Content Section */}
            <View style={styles.cardContent}>
                <Text style={styles.reportTitle}>{item.title}</Text>
                <Text style={styles.reportDescription} numberOfLines={3}>
                    {item.description}
                </Text>

                <View style={styles.locationWrapper}>
                    <Ionicons name="location" size={16} color={COLORS.primary} />
                    <Text style={styles.locationText} numberOfLines={1}>
                        {item.location_address || 'Unknown Location'}
                    </Text>
                </View>
            </View>

            {/* Actions Section */}
            <View style={styles.actionSection}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleLike(item.id)}
                >
                    <Ionicons
                        name={item.is_liked ? "heart" : "heart-outline"}
                        size={24}
                        color={item.is_liked ? COLORS.danger : COLORS.textLight}
                    />
                    <Text style={[styles.actionText, item.is_liked && { color: COLORS.danger }]}>
                        {item.like_count || 0} Upvotes
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('ReportTracking', { reportId: item.id })}
                >
                    <Ionicons name="eye-outline" size={24} color={COLORS.textLight} />
                    <Text style={styles.actionText}>View Details</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderHeader = () => (
        <View style={styles.header}>
            <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.headerGradient}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>
                        Community Feed
                    </Text>
                    <Text style={styles.headerSubtitle}>Discover and support local initiatives</Text>
                </View>
            </LinearGradient>
            <View style={styles.searchBarPlaceholder}>
                <Ionicons name="search" size={20} color={COLORS.textLight} />
                <Text style={styles.searchPlaceholderText}>Search issues...</Text>
            </View>
        </View>
    );

    return (
        <ScreenWrapper backgroundColor="#F8F9FB">
            <View style={styles.container}>
                <FlatList
                    data={reports}
                    renderItem={renderReportItem}
                    keyExtractor={item => item.id.toString()}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                    }
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            {loading ? (
                                <ActivityIndicator size="large" color={COLORS.primary} />
                            ) : (
                                <>
                                    <Ionicons name="planet-outline" size={80} color={COLORS.textLight + '50'} />
                                    <Text style={styles.emptyText}>Nothing here yet!</Text>
                                    <TouchableOpacity style={styles.refreshButton} onPress={fetchFeed}>
                                        <Text style={styles.refreshButtonText}>Reload Feed</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    )}
                />
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 30,
    },
    header: {
        marginBottom: 10,
    },
    headerGradient: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 40,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
    },
    headerContent: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 5,
        fontWeight: '500',
    },
    searchBarPlaceholder: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        marginHorizontal: 20,
        marginTop: -25,
        borderRadius: 15,
        padding: 12,
        ...SHADOWS.medium,
    },
    searchPlaceholderText: {
        color: COLORS.textLight,
        marginLeft: 10,
        fontSize: 14,
    },
    reportCard: {
        backgroundColor: COLORS.white,
        borderRadius: 25,
        marginHorizontal: 15,
        marginTop: 20,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userAvatar: {
        width: 45,
        height: 45,
        borderRadius: 15,
        backgroundColor: COLORS.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: COLORS.primary + '30',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    timeText: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    imageContainer: {
        width: '100%',
        height: 220,
        position: 'relative',
    },
    reportImage: {
        width: '100%',
        height: '100%',
    },
    placeholderContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        marginTop: 10,
        color: '#adb5bd',
        fontSize: 12,
        fontWeight: '600',
    },
    categoryBadge: {
        position: 'absolute',
        top: 15,
        right: 15,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    categoryText: {
        color: COLORS.white,
        fontSize: 11,
        fontWeight: 'bold',
    },
    cardContent: {
        padding: 15,
    },
    reportTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 8,
    },
    reportDescription: {
        fontSize: 14,
        color: COLORS.textLight,
        lineHeight: 22,
        marginBottom: 15,
    },
    locationWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F3F5',
        padding: 10,
        borderRadius: 12,
    },
    locationText: {
        fontSize: 13,
        color: COLORS.text,
        marginLeft: 6,
        fontWeight: '500',
        flex: 1,
    },
    actionSection: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#F1F3F5',
        padding: 10,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 8,
    },
    actionText: {
        fontSize: 14,
        color: COLORS.textLight,
        fontWeight: '700',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
        marginTop: 40,
    },
    emptyText: {
        fontSize: 18,
        color: COLORS.textLight,
        fontWeight: '600',
        marginTop: 15,
        marginBottom: 25,
    },
    refreshButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 15,
        ...SHADOWS.small,
    },
    refreshButtonText: {
        color: COLORS.white,
        fontWeight: '800',
        fontSize: 15,
    },
});

export default CommunityFeedScreen;
