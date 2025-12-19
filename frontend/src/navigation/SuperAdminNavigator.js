import { createStackNavigator } from '@react-navigation/stack';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import CreateStaffScreen from '../screens/CreateStaffScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SuperAdminDashboardScreen from '../screens/SuperAdminDashboardScreen';

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
        </Stack.Navigator>
    );
};

export default SuperAdminNavigator;
