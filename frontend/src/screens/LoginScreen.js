import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const LoginScreen = ({ navigation }) => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const { login, isLoading } = useAuth();
    const { t } = useLanguage();

    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (phone && password) {
            setError('');
            const result = await login(phone, password);
            if (!result.success) {
                setError(result.message);
            }
        }
    };

    return (
        <ScreenWrapper gradient>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>Nagarik Sahyog</Text>
                    <Text style={styles.subtitle}>{t('loginSubtitle')}</Text>
                </View>

                <View style={styles.formContainer}>
                    <Text style={styles.formTitle}>{t('login')}</Text>

                    <CustomInput
                        label={t('phone')}
                        placeholder="98XXXXXXXX"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                    />

                    <CustomInput
                        label="Password"
                        placeholder="********"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    <CustomButton
                        title={t('login')}
                        onPress={handleLogin}
                        isLoading={isLoading}
                    />

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                            <Text style={styles.link}>{t('register')}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Demo Hints */}
                    <View style={styles.demoHints}>
                        <Text style={styles.hintTitle}>Demo Login Hints:</Text>
                        <Text style={styles.hintText}>• 9800000000: Super Admin</Text>
                        <Text style={styles.hintText}>• 91XXXXXXXX: Dept Admin</Text>
                        <Text style={styles.hintText}>• 92XXXXXXXX: Field Official</Text>
                        <Text style={styles.hintText}>• Others: Citizen</Text>
                    </View>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.white,
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
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
    },
    formTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 20,
        textAlign: 'center',
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
    demoHints: {
        marginTop: 30,
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    hintTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    hintText: {
        fontSize: 12,
        color: COLORS.textLight,
        marginBottom: 4,
    },
});

export default LoginScreen;
