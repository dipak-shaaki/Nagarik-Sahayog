import { createStackNavigator } from '@react-navigation/stack';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import CreateStaffScreen from '../screens/CreateStaffScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SuperAdminDashboardScreen from '../screens/SuperAdminDashboardScreen';

import AlertsScreen from '../screens/AlertsScreen';
import ReportScreen from '../screens/ReportScreen';
import ReportTrackingScreen from '../screens/ReportTrackingScreen';

const Stack = createStackNavigator();

const SuperAdminNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{
            headerStyle: { backgroundColor: '#fff' },
            headerTitleStyle: { fontWeight: 'bold' }
        }}>
            <Stack.Screen
                name="SuperAdminDashboard"
                component={SuperAdminDashboardScreen}
                options={{ title: 'Global Settings' }}
            />
            <Stack.Screen
                name="AdminDashboard"
                component={AdminDashboardScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="MapScreen"
                component={MapScreen}
            />
            <Stack.Screen
                name="CreateStaff"
                component={CreateStaffScreen}
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

export default SuperAdminNavigator;
