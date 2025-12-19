import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from '../components/CustomButton';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SHADOWS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
const ProfileScreen = ({ navigation }) => {
    const { logout, user } = useAuth();
    const { t, locale, changeLanguage } = useLanguage();

    if (!user) return null;

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={[styles.avatarContainer, SHADOWS.medium]}>
                        <Image source={{ uri: 'https://placehold.co/150' }} style={styles.avatar} />
                    </View>
                    <Text style={styles.name}>{user.first_name || 'User'}</Text>
                    <Text style={styles.phone}>{user.phone}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: COLORS.primary + '20' }]}>
                        <Text style={styles.roleText}>{user.role?.replace('_', ' ')}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account Details</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>{t('address')}</Text>
                        <Text style={styles.value}>{user.address || 'N/A'}</Text>
                    </View>
                    {user.department && (
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Department</Text>
                            <Text style={styles.value}>{user.department_name || 'Assigned'}</Text>
                        </View>
                    )}
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>{t('idType')}</Text>
                        <Text style={styles.value}>{user.id_type || 'N/A'}</Text>
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

                <CustomButton
                    title={t('logout')}
                    onPress={logout}
                    type="danger"
                    style={styles.logoutButton}
                />
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.surface,
        padding: 3,
        marginBottom: 15,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    phone: {
        fontSize: 16,
        color: COLORS.textLight,
        marginBottom: 10,
    },
    roleBadge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        marginTop: 5,
    },
    roleText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    section: {
        marginBottom: 30,
        backgroundColor: COLORS.surface,
        padding: 20,
        borderRadius: 15,
        ...SHADOWS.small,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 15,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        paddingBottom: 10,
    },
    label: {
        color: COLORS.textLight,
        fontSize: 14,
    },
    value: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: '600',
    },
    languageContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    langButton: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.primary,
        alignItems: 'center',
    },
    activeLang: {
        backgroundColor: COLORS.primary,
    },
    langText: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    activeLangText: {
        color: COLORS.white,
    },
    logoutButton: {
        marginTop: 'auto',
    },
});

export default ProfileScreen;
