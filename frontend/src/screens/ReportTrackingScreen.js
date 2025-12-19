import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Dimensions, Animated, Linking, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MapRenderer from '../components/MapRenderer';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SHADOWS } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const API_URL = Platform.OS === 'web' ? 'http://localhost:8000/api' : 'http://10.0.2.2:8000/api';

const ReportTrackingScreen = ({ navigation, route }) => {
    const { user } = useAuth();
    const { reportId } = route.params;
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [officialLocation, setOfficialLocation] = useState(null);
    const [eta, setEta] = useState(null);

    // Animation for "pulsing" official marker
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        fetchReportDetails();
        startPulseAnimation();
    }, []);

    // Simulate official moving if status is IN_PROGRESS
    useEffect(() => {
        let interval;
        if (report?.status === 'IN_PROGRESS' && report?.latitude) {
            // Initial simulated location (slightly offset from report)
            setOfficialLocation({
                latitude: report.latitude - 0.005,
                longitude: report.longitude - 0.005,
            });
            setEta('15 mins');

            interval = setInterval(() => {
                setOfficialLocation(prev => {
                    if (!prev) return null;
                    // Move 10% closer to destination
                    const newLat = prev.latitude + (report.latitude - prev.latitude) * 0.1;
                    const newLng = prev.longitude + (report.longitude - prev.longitude) * 0.1;
                    return { latitude: newLat, longitude: newLng };
                });
                setEta(prev => {
                    const mins = parseInt(prev) || 15;
                    return mins > 1 ? `${mins - 1} mins` : 'Arriving now';
                });
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [report]);

    const startPulseAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const fetchReportDetails = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_URL}/reports/${reportId}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setReport(data);
                if (data.status === 'ASSIGNED') {
                    // Static official location for Assigned
                    setOfficialLocation({
                        latitude: data.latitude - 0.01, // Mock location
                        longitude: data.longitude - 0.01
                    });
                    setEta('Pending start');
                }
            }
        } catch (error) {
            console.error('Error fetching report:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStep = (status) => {
        switch (status) {
            case 'PENDING': return 1;
            case 'ASSIGNED': return 2;
            case 'TEAM_ARRIVED': return 3;
            case 'IN_PROGRESS': return 4;
            case 'RESOLVED': return 5;
            default: return 1;
        }
    };

    const callOfficial = () => {
        if (report?.official_phone) {
            Linking.openURL(`tel:${report.official_phone}`);
        }
    };

    const handleDelete = async () => {
        const deleteConfirmed = async () => {
            try {
                const token = await AsyncStorage.getItem('userToken');
                const response = await fetch(`${API_URL}/reports/${report.id}/`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    if (Platform.OS === 'web') {
                        alert("Report deleted successfully.");
                        navigation.goBack();
                    } else {
                        Alert.alert("Success", "Report deleted successfully.", [
                            { text: "OK", onPress: () => navigation.goBack() }
                        ]);
                    }
                } else {
                    const data = await response.json().catch(() => ({}));
                    const errorMsg = data.error || "Failed to delete report.";
                    if (Platform.OS === 'web') {
                        alert(errorMsg);
                    } else {
                        Alert.alert("Error", errorMsg);
                    }
                }
            } catch (error) {
                if (Platform.OS === 'web') {
                    alert("Connection error.");
                } else {
                    Alert.alert("Error", "Connection error.");
                }
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to delete this report?")) {
                deleteConfirmed();
            }
        } else {
            Alert.alert(
                "Delete Report",
                "Are you sure you want to delete this report?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: deleteConfirmed }
                ]
            );
        }
    };

    if (loading) {
        return (
            <ScreenWrapper backgroundColor={COLORS.background}>
                <View style={styles.loadingContainer}>
                    <Text>Loading tracking info...</Text>
                </View>
            </ScreenWrapper>
        );
    }

    const currentStep = getStatusStep(report?.status);

    return (
        <ScreenWrapper backgroundColor={COLORS.background}>
            <View style={styles.container}>
                {/* Header */}
                <View style={[styles.headerContainer, SHADOWS.medium]}>
                    <LinearGradient
                        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.headerGradient}
                    >
                        <View style={styles.headerRow}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Track Issue #{report?.id}</Text>
                        </View>
                    </LinearGradient>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Map View */}
                    <View style={[styles.mapContainer, SHADOWS.medium]}>
                        {report && (
                            <MapRenderer
                                style={styles.map}
                                region={{
                                    latitude: report.latitude,
                                    longitude: report.longitude,
                                    latitudeDelta: 0.02,
                                    longitudeDelta: 0.02,
                                }}
                                markers={[
                                    {
                                        coordinate: { latitude: report.latitude, longitude: report.longitude },
                                        title: "Issue Location",
                                        description: report.title,
                                        pinColor: COLORS.danger
                                    },
                                    officialLocation && {
                                        coordinate: officialLocation,
                                        title: "Official",
                                        description: "On the way",
                                        pinColor: COLORS.primary // We should use a custom icon ideally
                                    }
                                ].filter(Boolean)}
                            />
                        )}
                        {report?.status === 'IN_PROGRESS' && (
                            <View style={styles.etaBadge}>
                                <Text style={styles.etaLabel}>ETA</Text>
                                <Text style={styles.etaValue}>{eta}</Text>
                            </View>
                        )}
                    </View>

                    {/* Current Status Banner */}
                    <View style={[styles.card, styles.statusBanner, SHADOWS.medium]}>
                        <View style={[styles.statusIconBg, { backgroundColor: getStatusStep(report?.status) >= 3 ? COLORS.success : COLORS.primary }]}>
                            <Ionicons
                                name={getStatusStep(report?.status) >= 3 ? "hammer" : "time"}
                                size={32}
                                color={COLORS.white}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.bannerTitle}>
                                {report?.status === 'RESOLVED' ? 'Issue Resolved' :
                                    report?.status === 'IN_PROGRESS' ? 'Work in Progress' :
                                        report?.status === 'TEAM_ARRIVED' ? 'Team Arrived' :
                                            report?.status === 'ASSIGNED' ? 'Team Dispatched' : 'Report Received'}
                            </Text>
                            <Text style={styles.bannerSubtitle}>
                                {report?.status === 'RESOLVED' ? 'The reported issue has been fixed.' :
                                    report?.status === 'IN_PROGRESS' ? 'We are currently working on fixing the issue.' :
                                        report?.status === 'TEAM_ARRIVED' ? 'The team has arrived at the location.' :
                                            report?.status === 'ASSIGNED' ? 'An official is on the way to the location.' : 'We are looking for an available official.'}
                            </Text>
                        </View>
                    </View>

                    {/* Status Timeline */}
                    <View style={[styles.card, styles.timelineCard, SHADOWS.small]}>
                        <Text style={styles.sectionTitle}>Status Timeline</Text>
                        <View style={styles.timelineContainer}>
                            {['Reported', 'Dispatched', 'Arrived', 'Working', 'Resolved'].map((step, index) => {
                                const stepNum = index + 1;
                                const isActive = stepNum <= currentStep;
                                const isLast = index === 4;

                                return (
                                    <View key={step} style={styles.timelineItem}>
                                        <View style={[styles.timelineDot, isActive && styles.activeDot]}>
                                            {isActive && <Ionicons name="checkmark" size={12} color="white" />}
                                        </View>
                                        <Text style={[styles.timelineText, isActive && styles.activeText]}>{step}</Text>
                                        {!isLast && <View style={[styles.timelineLine, isActive && styles.activeLine]} />}
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* Official Info Card */}
                    {report?.official_name ? (
                        <View style={[styles.card, SHADOWS.small]}>
                            <Text style={styles.sectionTitle}>Assigned Official</Text>
                            <View style={styles.officialRow}>
                                <View style={styles.avatarContainer}>
                                    <Text style={styles.avatarText}>{report.official_name[0]}</Text>
                                </View>
                                <View style={styles.officialInfo}>
                                    <Text style={styles.officialName}>{report.official_name}</Text>
                                    <Text style={styles.officialRole}>Field Official • {report.department_name}</Text>
                                    <View style={styles.ratingContainer}>
                                        <Ionicons name="star" size={14} color="#FFD700" />
                                        <Text style={styles.ratingText}>4.8 (120 reviews)</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.callButton} onPress={callOfficial}>
                                    <Ionicons name="call" size={24} color={COLORS.white} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={[styles.card, SHADOWS.small]}>
                            <Text style={styles.sectionTitle}>Status</Text>
                            <Text style={styles.pendingText}>Waiting for assignment...</Text>
                        </View>
                    )}

                    {/* Report Details Brief */}
                    <View style={[styles.card, SHADOWS.small]}>
                        <Text style={styles.sectionTitle}>Issue Details</Text>
                        <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Title:</Text> {report?.title}</Text>
                        <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Location:</Text> {report?.location_address}</Text>

                        <View style={styles.actionRow}>
                            {report?.status === 'PENDING' && (user?.role === 'CITIZEN' || user?.role === 'DEPT_ADMIN') && (
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.editBtn]}
                                    onPress={() => navigation.navigate('CreateReport', { report })}
                                >
                                    <Ionicons name="create-outline" size={20} color={COLORS.white} />
                                    <Text style={styles.actionBtnText}>Edit</Text>
                                </TouchableOpacity>
                            )}

                            {['PENDING', 'RESOLVED', 'DECLINED'].includes(report?.status) && (user?.role === 'CITIZEN' || user?.role === 'DEPT_ADMIN') && (
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.deleteBtn]}
                                    onPress={handleDelete}
                                >
                                    <Ionicons name="trash-outline" size={20} color={COLORS.white} />
                                    <Text style={styles.actionBtnText}>Delete</Text>
                                </TouchableOpacity>
                            )}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContainer: {
        backgroundColor: COLORS.white,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
        zIndex: 10,
    },
    headerGradient: {
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    mapContainer: {
        height: 250,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
        backgroundColor: '#e0e0e0',
        position: 'relative',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    etaBadge: {
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: COLORS.white,
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'center',
        ...SHADOWS.small,
    },
    etaLabel: {
        fontSize: 10,
        color: COLORS.textLight,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    etaValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 15,
    },
    timelineContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start', // Align by top to keep text somewhat aligned
        marginTop: 10,
    },
    timelineItem: {
        alignItems: 'center',
        width: width / 5 - 12, // Distribute width for 5 items
        position: 'relative',
    },
    timelineDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        zIndex: 2,
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    activeDot: {
        backgroundColor: COLORS.success,
    },
    timelineText: {
        fontSize: 10,
        color: COLORS.textLight,
        textAlign: 'center',
    },
    activeText: {
        color: COLORS.success,
        fontWeight: 'bold',
    },
    timelineLine: {
        position: 'absolute',
        top: 10, // Center of dot (24/2) - half line height (2) -> 12 - 1 = 11? No custom top logic
        left: '50%',
        width: '100%', // Span to next item
        height: 2,
        backgroundColor: '#e0e0e0',
        zIndex: 1,
    },
    activeLine: {
        backgroundColor: COLORS.success,
    },
    officialRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    avatarText: {
        color: COLORS.white,
        fontSize: 20,
        fontWeight: 'bold',
    },
    officialInfo: {
        flex: 1,
    },
    officialName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    officialRole: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 2,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    ratingText: {
        fontSize: 12,
        color: COLORS.text,
        fontWeight: '600',
    },
    callButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.success,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: COLORS.success,
        shadowOpacity: 0.3,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: 20,
        marginBottom: 20,
        gap: 15,
    },
    statusIconBg: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bannerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    bannerSubtitle: {
        fontSize: 14,
        color: COLORS.textLight,
        lineHeight: 20,
    },
    pendingText: {
        color: COLORS.textLight,
        fontStyle: 'italic',
    },
    detailText: {
        fontSize: 14,
        color: COLORS.text,
        marginBottom: 8,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 15,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    editBtn: {
        backgroundColor: COLORS.primary,
    },
    deleteBtn: {
        backgroundColor: COLORS.danger,
    },
    actionBtnText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 15,
    }
});

export default ReportTrackingScreen;
