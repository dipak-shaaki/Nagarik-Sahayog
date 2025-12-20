import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SHADOWS } from '../constants/theme';
import { API_URL } from '../config/api';


const CreateStaffScreen = ({ navigation, route }) => {
    const [formData, setFormData] = useState({
        phone: '',
        password: '',
        first_name: '',
        role: 'DEPT_ADMIN',
        department: '',
    });
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingDepts, setFetchingDepts] = useState(true);

    const [availableRoles, setAvailableRoles] = useState(['DEPT_ADMIN', 'FIELD_OFFICIAL']);

    useEffect(() => {
        if (route.params?.roleType) {
            setFormData(prev => ({ ...prev, role: route.params.roleType }));
            setAvailableRoles([route.params.roleType]);
        }
    }, [route.params]);

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const response = await fetch(`${API_URL}/departments/`);
            const data = await response.json();
            setDepartments(data);
        } catch (error) {
            console.error(error);
        } finally {
            setFetchingDepts(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.phone || !formData.password || !formData.first_name || !formData.department) {
            Alert.alert("Error", "Please fill all fields");
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_URL}/auth/staff/create/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                Alert.alert("Success", "Staff created successfully");
                navigation.goBack();
            } else {
                const data = await response.json();
                Alert.alert("Error", JSON.stringify(data));
            }
        } catch (error) {
            Alert.alert("Error", "Server unreachable");
        } finally {
            setLoading(false);
        }
    };

    if (fetchingDepts) {
        return <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
    }

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Create Staff</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.form}>
                    <CustomInput
                        label="Full Name"
                        placeholder="Full Name"
                        value={formData.first_name}
                        onChangeText={(t) => setFormData({ ...formData, first_name: t })}
                    />
                    <CustomInput
                        label="Phone"
                        placeholder="98XXXXXXXX"
                        value={formData.phone}
                        onChangeText={(t) => setFormData({ ...formData, phone: t })}
                        keyboardType="phone-pad"
                    />
                    <CustomInput
                        label="Password"
                        placeholder="********"
                        value={formData.password}
                        onChangeText={(t) => setFormData({ ...formData, password: t })}
                        secureTextEntry
                    />

                    <Text style={styles.label}>Select Role</Text>
                    <View style={styles.roleRow}>
                        {availableRoles.map((r) => (
                            <TouchableOpacity
                                key={r}
                                style={[styles.roleBtn, formData.role === r && styles.activeRoleBtn]}
                                onPress={() => setFormData({ ...formData, role: r })}
                            >
                                <Text style={[styles.roleText, formData.role === r && styles.activeRoleText]}>{r.replace('_', ' ')}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Select Department</Text>
                    <View style={styles.deptRow}>
                        {departments.map((d) => (
                            <TouchableOpacity
                                key={d.id}
                                style={[styles.deptBtn, formData.department === d.id && styles.activeDeptBtn]}
                                onPress={() => setFormData({ ...formData, department: d.id })}
                            >
                                <Text style={[styles.deptText, formData.department === d.id && styles.activeDeptText]}>{d.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <CustomButton title="Create Staff User" onPress={handleCreate} isLoading={loading} />
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
    form: { backgroundColor: COLORS.white, padding: 20, borderRadius: 20, ...SHADOWS.small },
    label: { fontSize: 14, fontWeight: 'bold', color: COLORS.text, marginTop: 15, marginBottom: 10 },
    roleRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    roleBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary, alignItems: 'center' },
    activeRoleBtn: { backgroundColor: COLORS.primary },
    roleText: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' },
    activeRoleText: { color: COLORS.white },
    deptRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    deptBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
    activeDeptBtn: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
    deptText: { color: COLORS.textLight, fontSize: 12 },
    activeDeptText: { color: COLORS.white, fontWeight: 'bold' },
});

export default CreateStaffScreen;
