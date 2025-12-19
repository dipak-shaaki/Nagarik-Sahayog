import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../context/NotificationContext';
import AlertsScreen from '../screens/AlertsScreen';
import CommunityFeedScreen from '../screens/CommunityFeedScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ReportScreen from '../screens/ReportScreen';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
    const { t } = useLanguage();
    const { unreadCount } = useNotifications();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Feeds') {
                        iconName = focused ? 'newspaper' : 'newspaper-outline';
                    } else if (route.name === 'Notifications') {
                        iconName = focused ? 'notifications' : 'notifications-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textLight,
                tabBarStyle: {
                    borderTopWidth: 0,
                    elevation: 10,
                    height: 60,
                    paddingBottom: 10,
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('home') }} />
            <Tab.Screen name="Feeds" component={CommunityFeedScreen} options={{ title: 'Feeds' }} />
            <Tab.Screen
                name="Report"
                component={ReportScreen}
                options={({ navigation }) => ({
                    title: '',
                    tabBarIcon: ({ focused }) => (
                        <Ionicons name="add" size={30} color={COLORS.white} />
                    ),
                    tabBarButton: (props) => (
                        <Pressable
                            style={({ pressed }) => [
                                styles.customButtonContainer,
                                pressed && { opacity: 0.8 }
                            ]}
                            onPress={() => {
                                navigation.navigate('CreateReport');
                            }}
                        >
                            <View style={styles.customButton}>
                                <Ionicons name="add" size={30} color={COLORS.white} />
                            </View>
                        </Pressable>
                    ),
                })}
            />
            <Tab.Screen
                name="Notifications"
                component={AlertsScreen}
                options={{
                    title: 'Notifications',
                    tabBarBadge: unreadCount > 0 ? unreadCount : null,
                }}
            />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t('profile') }} />
        </Tab.Navigator>
    );
};

export default TabNavigator;

const styles = StyleSheet.create({
    customButtonContainer: {
        top: -30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    customButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: COLORS.danger,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.danger,
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.5,
        elevation: 5,
    },
});
