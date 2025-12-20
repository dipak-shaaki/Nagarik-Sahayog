import { Platform, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

// Web fallback component
const EmergencyTrackingScreenWeb = () => (
    <View style={styles.container}>
        <Ionicons name="phone-portrait-outline" size={64} color={COLORS.textLight} />
        <Text style={styles.text}>
            Emergency Tracking is best experienced on mobile devices
        </Text>
        <Text style={styles.subtext}>
            We are working on bringing the full map experience to the web.
            Please use the mobile app to track your emergency request in real-time.
        </Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: COLORS.background || '#FFFFFF',
    },
    text: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text || '#000000',
        textAlign: 'center',
        marginTop: 20,
    },
    subtext: {
        fontSize: 14,
        color: COLORS.textLight || '#666666',
        textAlign: 'center',
        marginTop: 10,
    },
});

export default EmergencyTrackingScreenWeb;
