import { Ionicons } from '@expo/vector-icons';
import { Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SHADOWS } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';
import { REPORTS } from '../data/dummy';

const DashboardScreen = ({ navigation }) => {
    const { t } = useLanguage();

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return COLORS.warning;
            case 'In Progress': return COLORS.primary;
            case 'Resolved': return COLORS.success;
            default: return COLORS.textLight;
        }
    };

    const renderItem = ({ item }) => (
        <View style={[styles.card, SHADOWS.small]}>
            <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                    <Image source={{ uri: item.userImage }} style={styles.userImage} />
                    <View>
                        <Text style={styles.userName}>{item.userName}</Text>
                        <Text style={styles.cardDate}>{item.date} • {item.location}</Text>
                    </View>
                </View>
            </View>

            <Image source={{ uri: item.image }} style={styles.cardImage} />

            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={3}>{item.description}</Text>
                <Text style={styles.cardType}>Type: {item.type}</Text>
            </View>

            <View style={styles.actionContainer}>
                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="caret-up-circle-outline" size={24} color={COLORS.textLight} />
                    <Text style={styles.actionText}>Upvote</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => Alert.alert('Comments', 'Comment section coming soon!')}
                >
                    <Ionicons name="chatbubble-outline" size={22} color={COLORS.textLight} />
                    <Text style={styles.actionText}>Comment</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="share-social-outline" size={22} color={COLORS.textLight} />
                    <Text style={styles.actionText}>Share</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.routeContainer}>
                <TouchableOpacity
                    style={styles.routeButton}
                    onPress={() => navigation.navigate('MapScreen', {
                        problemLocation: {
                            latitude: 27.7172,
                            longitude: 85.3240,
                            title: item.title
                        },
                        adminLocation: {
                            latitude: 27.7221,
                            longitude: 85.3123,
                            title: 'Your Location'
                        }
                    })}
                >
                    <Ionicons name="navigate" size={20} color={COLORS.white} />
                    <Text style={styles.routeButtonText}>View Route</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <Text style={styles.title}>Community Feeds</Text>
                <FlatList
                    data={REPORTS}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        paddingBottom: 0,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 20,
    },
    list: {
        paddingBottom: 20,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 15,
        marginBottom: 20,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    userName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    cardDate: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    cardImage: {
        width: '100%',
        height: 200,
    },
    cardContent: {
        padding: 15,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 5,
    },
    cardDesc: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 10,
        lineHeight: 20,
    },
    cardType: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '600',
    },
    actionContainer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingVertical: 10,
        paddingHorizontal: 5,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        marginLeft: 5,
        color: COLORS.textLight,
        fontSize: 14,
        fontWeight: '500',
    },
    routeContainer: {
        paddingHorizontal: 15,
        paddingBottom: 15,
    },
    routeButton: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    routeButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        marginLeft: 8,
    },
});

export default DashboardScreen;
