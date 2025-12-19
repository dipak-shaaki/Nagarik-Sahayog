import { Platform, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

// Web fallback component
const WebFallback = () => (
    <View style={styles.container}>
        <Ionicons name="phone-portrait-outline" size={64} color={COLORS.textLight} />
        <Text style={styles.text}>
            Emergency Tracking is only available on mobile devices
        </Text>
        <Text style={styles.subtext}>
            Please use the mobile app to track your emergency request in real-time
        </Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: COLORS.background,
    },
    text: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
        marginTop: 20,
    },
    subtext: {
        fontSize: 14,
        color: COLORS.textLight,
        textAlign: 'center',
        marginTop: 10,
    },
});

export default WebFallback;
