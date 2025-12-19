import { createStackNavigator } from '@react-navigation/stack';
import FieldOfficialDashboardScreen from '../screens/FieldOfficialDashboardScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AlertsScreen from '../screens/AlertsScreen';
import ReportScreen from '../screens/ReportScreen';
import ReportTrackingScreen from '../screens/ReportTrackingScreen';

const Stack = createStackNavigator();

const OfficialNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{
            headerStyle: { backgroundColor: '#fff' },
            headerTitleStyle: { fontWeight: 'bold' }
        }}>
            <Stack.Screen
                name="FieldOfficialDashboard"
                component={FieldOfficialDashboardScreen}
                options={{ title: 'My Tasks' }}
            />
            <Stack.Screen
                name="MapScreen"
                component={MapScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ title: 'My Profile' }}
            />
            <Stack.Screen
                name="Alerts"
                component={AlertsScreen}
                options={{ title: 'Notifications' }}
            />
            <Stack.Screen
                name="CreateReport"
                component={ReportScreen}
                options={{ title: 'Edit Report' }}
            />
            <Stack.Screen
                name="ReportTracking"
                component={ReportTrackingScreen}
                options={{ title: 'Report Tracking' }}
            />
        </Stack.Navigator>
    );
};

export default OfficialNavigator;
