import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Linking } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SHADOWS } from '../constants/theme';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const PROVIDERS = [
    {
        id: '1',
        name: 'City Care Services',
        rating: 4.8,
        distance: '1.2 km',
        contact: '9841XXXXXX',
        image: 'https://placehold.co/100',
        price: '$$',
    },
    {
        id: '2',
        name: 'Quick Fix Solutions',
        rating: 4.5,
        distance: '2.5 km',
        contact: '9803XXXXXX',
        image: 'https://placehold.co/100',
        price: '$',
    },
    {
        id: '3',
        name: 'Reliable Helpers',
        rating: 4.2,
        distance: '3.0 km',
        contact: '9860XXXXXX',
        image: 'https://placehold.co/100',
        price: '$$$',
    },
];

const ServiceDetailScreen = ({ route, navigation }) => {
    const { serviceName, serviceType } = route.params || { serviceName: 'Service', serviceType: 'General' };

    const handleCall = (number) => {
        Linking.openURL(`tel:${number}`);
    };

    const renderProvider = ({ item }) => (
        <View style={[styles.card, SHADOWS.small]}>
            <Image source={{ uri: item.image }} style={styles.providerImage} />
            <View style={styles.cardContent}>
                <View style={styles.headerRow}>
                    <Text style={styles.providerName}>{item.name}</Text>
                    <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={16} color={COLORS.warning} />
                        <Text style={styles.ratingText}>{item.rating}</Text>
                    </View>
                </View>
                <Text style={styles.detailsText}>
                    <Ionicons name="location-outline" size={14} color={COLORS.textLight} /> {item.distance} • {item.price}
                </Text>
                <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => handleCall(item.contact)}
                >
                    <Ionicons name="call" size={20} color={COLORS.white} />
                    <Text style={styles.callButtonText}>Call Now</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>{serviceName}</Text>
                </View>
                <Text style={styles.subtitle}>Available Providers nearby</Text>
                <FlatList
                    data={PROVIDERS}
                    renderItem={renderProvider}
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
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        marginRight: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textLight,
        marginBottom: 20,
    },
    list: {
        paddingBottom: 20,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        alignItems: 'center',
    },
    providerImage: {
        width: 80,
        height: 80,
        borderRadius: 10,
        marginRight: 15,
    },
    cardContent: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    providerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        flex: 1,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: {
        marginLeft: 4,
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    detailsText: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 10,
    },
    callButton: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 8,
        alignItems: 'center',
        alignSelf: 'flex-start',
    },
    callButtonText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default ServiceDetailScreen;
