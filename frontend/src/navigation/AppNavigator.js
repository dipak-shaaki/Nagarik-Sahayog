import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import AdminNavigator from './AdminNavigator';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import OfficialNavigator from './OfficialNavigator';
import SuperAdminNavigator from './SuperAdminNavigator';

const AppNavigator = () => {
    const { user, isLoading } = useAuth();

    const renderNavigator = () => {
        if (!user) return <AuthNavigator />;

        switch (user.role) {
            case 'SUPER_ADMIN':
                return <SuperAdminNavigator />;
            case 'DEPT_ADMIN':
                return <AdminNavigator />;
            case 'FIELD_OFFICIAL':
                return <OfficialNavigator />;
            case 'CITIZEN':
            default:
                return <MainNavigator />;
        }
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer key={user ? 'authenticated' : 'guest'}>
            {renderNavigator()}
        </NavigationContainer>
    );
};

export default AppNavigator;
