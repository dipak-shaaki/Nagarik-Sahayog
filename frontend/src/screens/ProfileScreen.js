import React, { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, FlatList, Image, Platform, StyleSheet, Text, TouchableOpacity, View, RefreshControl, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SHADOWS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const API_URL = Platform.OS === 'web' ? 'http://localhost:8000/api' : 'http://10.0.2.2:8000/api';
const BASE_URL = Platform.OS === 'web' ? 'http://localhost:8000' : 'http://10.0.2.2:8000';

const ProfileScreen = ({ navigation }) => {
    const { logout, user, refreshUser } = useAuth();
    const { t, locale, changeLanguage } = useLanguage();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (user?.role === 'CITIZEN') {
            fetchMyReports();
        }
    }, [user]);

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            handleUploadPhoto(result.assets[0].uri);
        }
    };

    const handleUploadPhoto = async (uri) => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const formData = new FormData();

            const uriParts = uri.split('.');
            const fileType = uriParts[uriParts.length - 1];

            formData.append('profile_photo', {
                uri,
                name: `profile_${user.id}.${fileType}`,
                type: `image/${fileType}`,
            });

            const response = await fetch(`${API_URL}/auth/me/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (response.ok) {
                Alert.alert("Success", "Profile photo updated successfully.");
                refreshUser();
            } else {
                const errorData = await response.json();
                console.error('Upload failed:', errorData);
                Alert.alert("Error", "Failed to upload photo.");
            }
        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert("Error", "An error occurred during upload.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteReport = async (reportId) => {
        Alert.alert(
            "Delete Report",
            "Are you sure you want to delete this pending report?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('userToken');
                            const response = await fetch(`${API_URL}/reports/${reportId}/`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                }
                            });
                            if (response.ok) {
                                Alert.alert("Success", "Report deleted successfully.");
                                fetchMyReports();
                            } else {
                                const data = await response.json().catch(() => ({}));
                                Alert.alert("Error", data.error || `Failed to delete report (Status: ${response.status})`);
                            }
                        } catch (error) {
                            Alert.alert("Error", "Connection error.");
                        }
                    }
                }
            ]
        );
    };

    const fetchMyReports = async () => {
        if (!refreshing) setLoading(true);
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
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchMyReports();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING': return COLORS.danger;
            case 'ASSIGNED': return COLORS.info || COLORS.primary;
            case 'RESOLVED': return COLORS.success;
            default: return COLORS.textLight;
        }
    };

    const renderReportItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.historyCard, SHADOWS.small]}
            onPress={() => navigation.navigate('ReportTracking', { reportId: item.id })}
        >
            <View style={styles.historyCardHeader}>
                <Text style={styles.historyTitle}>{item.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                    {['PENDING', 'RESOLVED', 'DECLINED'].includes(item.status) && (
                        <TouchableOpacity
                            onPress={() => handleDeleteReport(item.id)}
                            style={{ padding: 5 }}
                        >
                            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            <View style={styles.historyDetails}>
                <Text style={styles.historyAddress} numberOfLines={1}>
                    <Ionicons name="location-outline" size={12} color={COLORS.textLight} /> {item.location_address || 'No address'}
                </Text>
                <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
        </TouchableOpacity>
    );

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const renderHeader = () => (
        <>
            <View style={styles.headerContainer}>
                <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.headerGradient}
                >
                    <View style={styles.headerContent}>
                        <TouchableOpacity
                            style={[styles.avatarContainer, SHADOWS.medium]}
                            onPress={handlePickImage}
                            activeOpacity={0.8}
                        >
                            {user.profile_photo ? (
                                <Image
                                    source={{ uri: user.profile_photo.startsWith('http') ? user.profile_photo : `${BASE_URL}${user.profile_photo}` }}
                                    style={styles.avatar}
                                />
                            ) : (
                                <View style={[styles.avatar, styles.initialsContainer]}>
                                    <Text style={styles.initialsText}>{getInitials(user.first_name)}</Text>
                                </View>
                            )}
                            <View style={styles.editBadge}>
                                <Ionicons name="camera" size={16} color={COLORS.white} />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.name}>{user.first_name} {user.last_name || ''}</Text>
                        <Text style={styles.phone}>{user.phone}</Text>
                        <View style={styles.roleWrapper}>
                            <View style={styles.roleBadge}>
                                <Text style={styles.roleText}>{user.role?.replace('_', ' ')}</Text>
                            </View>
                        </View>
                    </View>
                </LinearGradient>
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account Details</Text>

                    <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                            <Ionicons name="location" size={18} color={COLORS.primary} />
                        </View>
                        <View style={styles.infoData}>
                            <Text style={styles.label}>{t('address')}</Text>
                            <Text style={styles.value}>{user.address || 'Not provided'}</Text>
                        </View>
                    </View>

                    {user.department && (
                        <View style={styles.infoRow}>
                            <View style={styles.infoIcon}>
                                <Ionicons name="business" size={18} color={COLORS.primary} />
                            </View>
                            <View style={styles.infoData}>
                                <Text style={styles.label}>Department</Text>
                                <Text style={styles.value}>{user.department_name}</Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                            <Ionicons name="card" size={18} color={COLORS.primary} />
                        </View>
                        <View style={styles.infoData}>
                            <Text style={styles.label}>{t('idType')}</Text>
                            <Text style={styles.value}>{user.id_type || 'N/A'}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                            <Ionicons name="finger-print" size={18} color={COLORS.primary} />
                        </View>
                        <View style={styles.infoData}>
                            <Text style={styles.label}>ID Number</Text>
                            <Text style={styles.value}>{user.id_number || 'N/A'}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('language')}</Text>
                    <View style={styles.languageContainer}>
                        <TouchableOpacity
                            style={[styles.langButton, locale === 'en' && styles.activeLang]}
                            onPress={() => changeLanguage('en')}
                        >
                            <Text style={[styles.langText, locale === 'en' && styles.activeLangText]}>English</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.langButton, locale === 'ne' && styles.activeLang]}
                            onPress={() => changeLanguage('ne')}
                        >
                            <Text style={[styles.langText, locale === 'ne' && styles.activeLangText]}>नेपाली</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {user?.role === 'CITIZEN' && (
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderTitle}>Report History</Text>
                    </View>
                )}
            </View>
        </>
    );

    const renderFooter = () => (
        <View style={styles.footerContainer}>
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
                <Text style={styles.logoutText}>{t('logout')}</Text>
            </TouchableOpacity>
            <Text style={styles.versionText}>App Version 1.0.0</Text>
        </View>
    );

    const renderEmpty = () => (
        <View style={styles.emptyState}>
            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} />
            ) : (
                <>
                    <Ionicons name="document-text-outline" size={48} color={COLORS.textLight} />
                    <Text style={styles.emptyText}>No reports found</Text>
                </>
            )}
        </View>
    );

    if (!user) return null;

    return (
        <ScreenWrapper backgroundColor={COLORS.background}>
            <View style={styles.container}>
                <FlatList
                    data={user?.role === 'CITIZEN' ? reports : []}
                    renderItem={user?.role === 'CITIZEN' ? renderReportItem : null}
                    keyExtractor={item => item.id.toString()}
                    ListHeaderComponent={renderHeader}
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={user?.role === 'CITIZEN' ? renderEmpty : null}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
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
    listContent: {
        paddingBottom: 20,
    },
    headerContainer: {
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
        ...SHADOWS.medium,
        backgroundColor: COLORS.white,
        marginBottom: 20,
    },
    headerGradient: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 30,
        alignItems: 'center',
    },
    headerContent: {
        alignItems: 'center',
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.3)',
        marginBottom: 15,
        overflow: 'hidden',
        position: 'relative',
    },
    editBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: COLORS.primary,
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    initialsContainer: {
        backgroundColor: COLORS.white + '30', // Semi-transparent white
        justifyContent: 'center',
        alignItems: 'center',
    },
    initialsText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.white,
        marginBottom: 4,
    },
    phone: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 10,
    },
    roleWrapper: {
        flexDirection: 'row',
    },
    roleBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
    },
    roleText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.white,
        textTransform: 'capitalize',
    },
    contentContainer: {
        paddingHorizontal: 20,
    },
    section: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        ...SHADOWS.small,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 15,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
        paddingLeft: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    infoIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary + '10', // 10% opacity
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    infoData: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: COLORS.textLight,
        marginBottom: 2,
    },
    value: {
        fontSize: 15,
        color: COLORS.text,
        fontWeight: '600',
    },
    languageContainer: {
        flexDirection: 'row',
        gap: 15,
    },
    langButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        alignItems: 'center',
        backgroundColor: '#FCFCFC',
    },
    activeLang: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    langText: {
        color: COLORS.text,
        fontWeight: '600',
    },
    activeLangText: {
        color: COLORS.white,
    },
    sectionHeader: {
        marginTop: 10,
        marginBottom: 15,
    },
    sectionHeaderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    historyCard: {
        backgroundColor: COLORS.white,
        borderRadius: 15,
        padding: 16,
        marginBottom: 15,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
        marginHorizontal: 20,
    },
    historyCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    historyTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginRight: 10,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    historyDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    historyAddress: {
        flex: 1,
        fontSize: 12,
        color: COLORS.textLight,
        marginRight: 10,
    },
    historyDate: {
        fontSize: 12,
        color: COLORS.textLight,
        fontStyle: 'italic',
    },
    emptyState: {
        alignItems: 'center',
        padding: 30,
        marginTop: 10,
    },
    emptyText: {
        color: COLORS.textLight,
        marginTop: 10,
        fontSize: 16,
    },
    footerContainer: {
        padding: 20,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        backgroundColor: COLORS.danger + '10', // Light red
        borderRadius: 15,
        gap: 10,
        marginBottom: 20,
    },
    logoutText: {
        color: COLORS.danger,
        fontWeight: 'bold',
        fontSize: 16,
    },
    versionText: {
        textAlign: 'center',
        color: COLORS.textLight,
        fontSize: 12,
        paddingBottom: 20,
    },
});

export default ProfileScreen;
