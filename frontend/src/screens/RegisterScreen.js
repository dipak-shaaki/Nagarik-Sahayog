import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const RegisterScreen = ({ navigation }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        address: '',
        idType: '',
        idNumber: '',
        password: '',
        role: 'CITIZEN',
        department: '',
    });

    const [departments, setDepartments] = useState([]);
    const [loadingDepts, setLoadingDepts] = useState(false);

    const { register, isLoading } = useAuth();
    const { t } = useLanguage();

    useEffect(() => {
        const fetchDepts = async () => {
            setLoadingDepts(true);
            try {
                const url = Platform.OS === 'web' ? 'http://localhost:8000/api/departments/' : 'http://10.0.2.2:8000/api/departments/';
                const res = await fetch(url);
                const data = await res.json();
                setDepartments(data);
            } catch (e) {
                console.log(e);
            } finally {
                setLoadingDepts(false);
            }
        };
        fetchDepts();
    }, []);

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const [error, setError] = useState('');

    const handleRegister = async () => {
        setError('');
        const result = await register(formData);
        if (result.success) {
            Alert.alert(
                "Success",
                "Account created successfully. Please login.",
                [{ text: "OK", onPress: () => navigation.navigate('Login') }]
            );
        } else {
            setError(result.message);
        }
    };

    return (
        <ScreenWrapper gradient>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>{t('register')}</Text>
                    <Text style={styles.subtitle}>{t('registerSubtitle')}</Text>
                </View>

                <View style={styles.formContainer}>
                    <CustomInput
                        label={t('fullName')}
                        placeholder="John Doe"
                        value={formData.fullName}
                        onChangeText={(text) => handleChange('fullName', text)}
                    />

                    <CustomInput
                        label={t('phone')}
                        placeholder="98XXXXXXXX"
                        value={formData.phone}
                        onChangeText={(text) => handleChange('phone', text)}
                        keyboardType="phone-pad"
                    />

                    <CustomInput
                        label={t('address')}
                        placeholder="Kathmandu, Nepal"
                        value={formData.address}
                        onChangeText={(text) => handleChange('address', text)}
                    />

                    <CustomInput
                        label={t('idType')}
                        placeholder="Citizenship / Passport / License"
                        value={formData.idType}
                        onChangeText={(text) => handleChange('idType', text)}
                    />

                    <CustomInput
                        label={t('idNumber')}
                        placeholder="XX-XX-XX-XXXX"
                        value={formData.idNumber}
                        onChangeText={(text) => handleChange('idNumber', text)}
                    />

                    <CustomInput
                        label="Password"
                        placeholder="********"
                        value={formData.password}
                        onChangeText={(text) => handleChange('password', text)}
                        secureTextEntry
                    />

                    <Text style={styles.label}>I am a:</Text>
                    <View style={styles.roleContainer}>
                        <TouchableOpacity
                            style={[styles.roleItem, formData.role === 'CITIZEN' && styles.activeRoleItem]}
                            onPress={() => handleChange('role', 'CITIZEN')}
                        >
                            <Ionicons name="person" size={20} color={formData.role === 'CITIZEN' ? COLORS.white : COLORS.primary} />
                            <Text style={[styles.roleText, formData.role === 'CITIZEN' && styles.activeRoleText]}>Citizen</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.roleItem, formData.role === 'FIELD_OFFICIAL' && styles.activeRoleItem]}
                            onPress={() => handleChange('role', 'FIELD_OFFICIAL')}
                        >
                            <Ionicons name="shield" size={20} color={formData.role === 'FIELD_OFFICIAL' ? COLORS.white : COLORS.primary} />
                            <Text style={[styles.roleText, formData.role === 'FIELD_OFFICIAL' && styles.activeRoleText]}>Field Official</Text>
                        </TouchableOpacity>
                    </View>

                    {formData.role === 'FIELD_OFFICIAL' && (
                        <>
                            <Text style={styles.label}>Select Department:</Text>
                            <View style={styles.deptContainer}>
                                {departments.map((dept) => (
                                    <TouchableOpacity
                                        key={dept.id}
                                        style={[styles.deptItem, formData.department === dept.id && styles.activeDeptItem]}
                                        onPress={() => handleChange('department', dept.id)}
                                    >
                                        <Text style={[styles.deptText, formData.department === dept.id && styles.activeDeptText]}>{dept.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    <CustomButton
                        title={t('register')}
                        onPress={handleRegister}
                        isLoading={isLoading}
                    />

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.link}>{t('login')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        padding: 20,
        paddingTop: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.white,
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    formContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
        marginTop: 15,
        marginBottom: 10,
    },
    roleContainer: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 10,
    },
    roleItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.primary,
        gap: 8,
    },
    activeRoleItem: {
        backgroundColor: COLORS.primary,
    },
    roleText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
    },
    activeRoleText: {
        color: COLORS.white,
    },
    deptContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 15,
    },
    deptItem: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eee',
    },
    activeDeptItem: {
        backgroundColor: COLORS.secondary,
        borderColor: COLORS.secondary,
    },
    deptText: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    activeDeptText: {
        color: COLORS.white,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    footerText: {
        color: COLORS.textLight,
    },
    link: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    errorText: {
        color: COLORS.danger,
        textAlign: 'center',
        marginBottom: 10,
    },
});

export default RegisterScreen;
