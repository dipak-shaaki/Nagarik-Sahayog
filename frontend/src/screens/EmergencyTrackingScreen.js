import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, AnimatedRegion } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SHADOWS } from '../constants/theme';

import { API_URL } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

const EmergencyTrackingScreen = ({ route, navigation }) => {
    const { serviceName } = route.params || { serviceName: 'Emergency' };
    const [emergencyRequestId, setEmergencyRequestId] = useState(route.params?.emergencyRequestId);

    const [status, setStatus] = useState('pending');
    const [statusMessage, setStatusMessage] = useState('Finding nearest unit...');
    const [eta, setEta] = useState(null);
    const [distance, setDistance] = useState(null);
    const [unitDetails, setUnitDetails] = useState(null);
    const [unitLocation, setUnitLocation] = useState(null);
    const [userLocation, setUserLocation] = useState(null);

    const mapRef = useRef(null);
    const locationSubscription = useRef(null);
    const simulationInterval = useRef(null);
    const hasUnitLocation = useRef(false);

    // Animated region for smooth movement
    const unitAnimatedRegion = useRef(new AnimatedRegion({
        latitude: 27.7172,
        longitude: 85.3240,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
    })).current;

    const [unitBearing, setUnitBearing] = useState(0);

    useEffect(() => {
        initializeTracking();
        return () => {
            if (locationSubscription.current) locationSubscription.current.remove();
            if (simulationInterval.current) clearInterval(simulationInterval.current);
        };
    }, []);

    // Simulation loop
    useEffect(() => {
        if (emergencyRequestId && (status === 'DISPATCHED' || status === 'EN_ROUTE')) {
            simulationInterval.current = setInterval(() => {
                simulateMovement();
            }, 3000);
        } else {
            if (simulationInterval.current) clearInterval(simulationInterval.current);
        }
        return () => {
            if (simulationInterval.current) clearInterval(simulationInterval.current);
        };
    }, [emergencyRequestId, status]);

    const initializeTracking = async () => {
        try {
            const { status: pStatus } = await Location.requestForegroundPermissionsAsync();
            if (pStatus !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required');
                return;
            }

            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const coords = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            };
            setUserLocation(coords);

            // Create request if not exists
            if (!emergencyRequestId) {
                await createEmergencyRequest(coords);
            } else {
                fetchEmergencyDetails();
            }

            // Watch position
            locationSubscription.current = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
                (newLoc) => {
                    setUserLocation({
                        latitude: newLoc.coords.latitude,
                        longitude: newLoc.coords.longitude
                    });
                }
            );
        } catch (error) {
            console.error('Init error:', error);
        }
    };

    const createEmergencyRequest = async (coords) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_URL}/emergency/requests/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    service_type: serviceName.toUpperCase(),
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    address: 'Current Location'
                })
            });

            const data = await response.json();
            if (response.ok) {
                setEmergencyRequestId(data.id);
                updateFromData(data);
            } else {
                Alert.alert('Error', data.detail || 'Failed to create request');
            }
        } catch (error) {
            console.error('Create error:', error);
        }
    };

    const fetchEmergencyDetails = async () => {
        if (!emergencyRequestId) return;
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_URL}/emergency/requests/${emergencyRequestId}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                updateFromData(data);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        }
    };

    const simulateMovement = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_URL}/emergency/simulate/${emergencyRequestId}/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                const newLoc = {
                    latitude: data.latitude,
                    longitude: data.longitude
                };

                // Update state for Polyline/Distance
                setUnitLocation(newLoc);

                // Smooth Animation
                if (hasUnitLocation.current) {
                    unitAnimatedRegion.timing({
                        latitude: newLoc.latitude,
                        longitude: newLoc.longitude,
                        duration: 3000,
                        useNativeDriver: false,
                    }).start();
                } else {
                    unitAnimatedRegion.setValue({ ...newLoc, latitudeDelta: 0.005, longitudeDelta: 0.005 });
                    hasUnitLocation.current = true;
                }

                if (data.bearing !== undefined) {
                    setUnitBearing(data.bearing);
                }

                if (data.status !== status) {
                    setStatus(data.status);
                    fetchEmergencyDetails();
                }
                if (userLocation) {
                    calculateDistanceAndETA(newLoc, userLocation);
                }
            }
        } catch (error) {
            console.error('Simulate error:', error);
            Alert.alert('Simulation Error', error.message);
        }
    };

    const updateFromData = (data) => {
        setStatus(data.status);
        setStatusMessage(getStatusMessage(data.status));
        if (data.assigned_official_details) {
            setUnitDetails({
                officer_name: data.assigned_official_details.first_name,
                phone_number: data.assigned_official_details.phone,
                unit_number: data.assigned_official_details.id,
                vehicle_number: 'BA 2 JHA 1234'
            });
        }

        if (data.unit_location) {
            const loc = {
                latitude: data.unit_location.latitude,
                longitude: data.unit_location.longitude
            };

            // If this is the initial load or first time seeing unit, set value immediately
            if (!hasUnitLocation.current) {
                unitAnimatedRegion.setValue({
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005
                });
                hasUnitLocation.current = true;
            }

            setUnitLocation(loc);
            if (userLocation) calculateDistanceAndETA(loc, userLocation);
        }
    };

    const getStatusMessage = (status) => {
        switch (status) {
            case 'PENDING': return 'Finding nearest unit...';
            case 'DISPATCHED': return 'Unit dispatched to your location';
            case 'EN_ROUTE': return 'Unit is on the way';
            case 'ARRIVED': return 'Unit has arrived!';
            case 'COMPLETED': return 'Service completed';
            case 'CANCELLED': return 'Request cancelled';
            default: return 'Processing...';
        }
    };

    const calculateDistanceAndETA = (unitLoc, userLoc) => {
        const R = 6371;
        const dLat = (userLoc.latitude - unitLoc.latitude) * Math.PI / 180;
        const dLon = (userLoc.longitude - unitLoc.longitude) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(unitLoc.latitude * Math.PI / 180) * Math.cos(userLoc.latitude * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = R * c;
        setDistance(dist.toFixed(2));
        const etaMin = Math.round((dist / 40) * 60);
        setEta(etaMin > 0 ? `${etaMin} mins` : 'Arriving');
    };

    const getStatusColor = () => {
        switch (status) {
            case 'DISPATCHED':
            case 'EN_ROUTE': return COLORS.warning;
            case 'ARRIVED':
            case 'COMPLETED': return COLORS.success;
            case 'CANCELLED': return COLORS.danger;
            default: return COLORS.primary;
        }
    };

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>{serviceName} Tracking</Text>
                </View>

                <MapView
                    ref={mapRef}
                    style={styles.map}
                    provider={PROVIDER_GOOGLE}
                    initialRegion={{
                        latitude: userLocation?.latitude || 27.7172,
                        longitude: userLocation?.longitude || 85.3240,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                >
                    {userLocation && (
                        <Marker coordinate={userLocation} title="You">
                            <View style={styles.userMarker}>
                                <View style={styles.userMarkerDot} />
                            </View>
                        </Marker>
                    )}

                    {unitLocation && (
                        <Marker.Animated
                            coordinate={unitAnimatedRegion}
                            title="Emergency Unit"
                            anchor={{ x: 0.5, y: 0.5 }}
                            style={{ transform: [{ rotate: `${unitBearing}deg` }] }}
                        >
                            <View style={styles.unitMarker}>
                                <MaterialIcons
                                    name={serviceName === 'Police' ? 'local-police' : serviceName === 'Fire' ? 'fire-truck' : 'medical-services'}
                                    size={24}
                                    color={COLORS.white}
                                />
                            </View>
                        </Marker.Animated>
                    )}

                    {userLocation && unitLocation && (
                        <Polyline
                            coordinates={[unitLocation, userLocation]}
                            strokeColor={COLORS.primary}
                            strokeWidth={3}
                            lineDashPattern={[5, 5]}
                        />
                    )}
                </MapView>

                <View style={[styles.statusCard, SHADOWS.large]}>
                    <View style={styles.statusHeader}>
                        <View style={styles.statusLeft}>
                            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                            <Text style={styles.statusTitle}>{statusMessage}</Text>
                        </View>
                        {eta && <Text style={styles.etaText}>ETA: {eta}</Text>}
                    </View>

                    {unitDetails && (
                        <View style={styles.driverInfo}>
                            <Image
                                source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}
                                style={styles.driverImage}
                            />
                            <View style={styles.driverDetails}>
                                <Text style={styles.driverName}>{unitDetails.officer_name}</Text>
                                <Text style={styles.vehicleInfo}>
                                    Unit #{unitDetails.unit_number} • {unitDetails.vehicle_number}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.callDriverButton} onPress={() => Alert.alert('Calling', `Calling ${unitDetails.phone_number}`)}>
                                <Ionicons name="call" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.timeline}>
                        <View style={[styles.timelineDot, { backgroundColor: ['PENDING', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED'].includes(status) ? COLORS.success : COLORS.textLight }]} />
                        <View style={[styles.timelineLine, { backgroundColor: ['DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED'].includes(status) ? COLORS.success : COLORS.textLight }]} />
                        <View style={[styles.timelineDot, { backgroundColor: ['DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED'].includes(status) ? COLORS.success : COLORS.textLight }]} />
                        <View style={[styles.timelineLine, { backgroundColor: ['ARRIVED', 'COMPLETED'].includes(status) ? COLORS.success : COLORS.textLight }]} />
                        <View style={[styles.timelineDot, { backgroundColor: ['ARRIVED', 'COMPLETED'].includes(status) ? COLORS.success : COLORS.textLight }]} />
                    </View>
                    <View style={styles.timelineLabels}>
                        <Text style={styles.timelineLabel}>Requested</Text>
                        <Text style={styles.timelineLabel}>Dispatched</Text>
                        <Text style={styles.timelineLabel}>Arrived</Text>
                    </View>

                    {status !== 'COMPLETED' && status !== 'CANCELLED' && (
                        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
                            <Text style={styles.cancelButtonText}>Cancel Request</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        position: 'absolute',
        top: 40,
        left: 0,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        ...SHADOWS.small,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    map: { width: '100%', height: '100%' },
    userMarker: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(33, 150, 243, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userMarkerDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#2196F3',
        borderWidth: 2,
        borderColor: 'white',
    },
    unitMarker: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
        ...SHADOWS.medium,
    },
    statusCard: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 25,
        paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    },
    statusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    statusLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
    statusTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, flex: 1 },
    etaText: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
    driverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: COLORS.background,
        padding: 15,
        borderRadius: 15,
    },
    driverImage: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
    driverDetails: { flex: 1 },
    driverName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
    vehicleInfo: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
    callDriverButton: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    timeline: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 30,
        marginBottom: 10,
    },
    timelineDot: { width: 12, height: 12, borderRadius: 6 },
    timelineLine: { flex: 1, height: 2, marginHorizontal: 5 },
    timelineLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        marginBottom: 20,
    },
    timelineLabel: { fontSize: 11, color: COLORS.textLight },
    cancelButton: {
        backgroundColor: COLORS.danger + '15',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButtonText: { color: COLORS.danger, fontSize: 16, fontWeight: '600' },
});

export default EmergencyTrackingScreen;
