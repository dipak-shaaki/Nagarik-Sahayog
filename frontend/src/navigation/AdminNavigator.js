import { createStackNavigator } from '@react-navigation/stack';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import CreateStaffScreen from '../screens/CreateStaffScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen'; // Shared profile screen

import AlertsScreen from '../screens/AlertsScreen';

const Stack = createStackNavigator();

const AdminNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{
            headerStyle: { backgroundColor: '#fff' },
            headerTitleStyle: { fontWeight: 'bold' }
        }}>
            <Stack.Screen
                name="AdminDashboard"
                component={AdminDashboardScreen}
                options={{ title: 'Admin Panel' }}
            />
            <Stack.Screen
                name="MapScreen"
                component={MapScreen}
                options={{ headerShown: false }}
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
        </Stack.Navigator>
    );
};

export default AdminNavigator;
