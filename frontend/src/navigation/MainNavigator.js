import { createStackNavigator } from '@react-navigation/stack';
import ReportScreen from '../screens/ReportScreen';
import TabNavigator from './TabNavigator';

// Metro bundler will automatically use .web.js on web and regular file on native
import EmergencyTrackingScreen from '../screens/EmergencyTrackingScreen';

import MapScreen from '../screens/MapScreen';
import ServiceDetailScreen from '../screens/ServiceDetailScreen';

import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import ReportTrackingScreen from '../screens/ReportTrackingScreen';

const Stack = createStackNavigator();

const MainNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen
                name="CreateReport"
                component={ReportScreen}
                options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
            <Stack.Screen name="EmergencyTracking" component={EmergencyTrackingScreen} />
            <Stack.Screen name="MapScreen" component={MapScreen} />
            <Stack.Screen name="ReportTracking" component={ReportTrackingScreen} />
        </Stack.Navigator>
    );
};

export default MainNavigator;
