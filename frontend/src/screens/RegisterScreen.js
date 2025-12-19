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

    const { register, isLoading } = useAuth();
    const { t } = useLanguage();

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
