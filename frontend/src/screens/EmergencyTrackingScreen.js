import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SHADOWS } from '../constants/theme';

const { width } = Dimensions.get('window');

// WebSocket connection for real-time updates
const WS_URL = 'wss://your-backend.com/ws/emergency-tracking/';

const EmergencyTrackingScreen = ({ route, navigation }) => {
    const { serviceName, emergencyRequestId } = route.params || { 
        serviceName: 'Emergency',
        emergencyRequestId: null 
    };
    
    const [status, setStatus] = useState('pending');
    const [statusMessage, setStatusMessage] = useState('Finding nearest unit...');
    const [eta, setEta] = useState(null);
    const [distance, setDistance] = useState(null);
    const [unitDetails, setUnitDetails] = useState(null);
    const [unitLocation, setUnitLocation] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [trackingHistory, setTrackingHistory] = useState([]);
    
    const wsRef = useRef(null);
    const locationSubscription = useRef(null);

    // Initialize location tracking
    useEffect(() => {
        initializeTracking();
        return () => {
            cleanup();
        };
    }, []);

    const initializeTracking = async () => {
        try {
            // Request location permissions
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required for emergency tracking');
                return;
            }

            // Get initial user location
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High
            });
            
            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });

            // Start watching user location (in case they move)
            locationSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000, // Update every 5 seconds
                    distanceInterval: 10, // Update every 10 meters
                },
                (newLocation) => {
                    setUserLocation({
                        latitude: newLocation.coords.latitude,
                        longitude: newLocation.coords.longitude
                    });
                    // Send updated location to backend via WebSocket
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({
                            type: 'user_location_update',
                            location: {
                                latitude: newLocation.coords.latitude,
                                longitude: newLocation.coords.longitude
                            }
                        }));
                    }
                }
            );

            // Connect to WebSocket for real-time updates
            connectWebSocket();

            // Initial API call to create/fetch emergency request
            if (!emergencyRequestId) {
                createEmergencyRequest(location.coords);
            } else {
                fetchEmergencyDetails();
            }

        } catch (error) {
            console.error('Error initializing tracking:', error);
            Alert.alert('Error', 'Failed to initialize tracking');
        }
    };

    const connectWebSocket = () => {
        const ws = new WebSocket(`${WS_URL}${emergencyRequestId}/`);
        
        ws.onopen = () => {
            console.log('WebSocket connected');
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('WebSocket closed, attempting to reconnect...');
            // Attempt to reconnect after 3 seconds
            setTimeout(() => {
                if (status !== 'completed' && status !== 'cancelled') {
                    connectWebSocket();
                }
            }, 3000);
        };

        wsRef.current = ws;
    };

    const handleWebSocketMessage = (data) => {
        switch (data.type) {
            case 'status_update':
                setStatus(data.status);
                setStatusMessage(data.message);
                if (data.eta) setEta(data.eta);
                if (data.distance) setDistance(data.distance);
                break;

            case 'unit_assigned':
                setUnitDetails(data.unit);
                setStatusMessage('Unit dispatched to your location');
                break;

            case 'unit_location_update':
                setUnitLocation(data.location);
                // Calculate new ETA and distance based on location
                if (userLocation) {
                    calculateDistanceAndETA(data.location, userLocation);
                }
                break;

            case 'tracking_update':
                setTrackingHistory(prev => [...prev, data.update]);
                break;

            case 'emergency_completed':
                setStatus('completed');
                setStatusMessage('Emergency service completed');
                Alert.alert('Completed', 'Emergency service has been completed');
                break;

            default:
                console.log('Unknown message type:', data.type);
        }
    };

    const createEmergencyRequest = async (coords) => {
        try {
            const response = await fetch('https://your-backend.com/api/emergency/request/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${yourAuthToken}` // Add your auth token
                },
                body: JSON.stringify({
                    service_type: serviceName.toLowerCase(),
                    location: {
                        latitude: coords.latitude,
                        longitude: coords.longitude
                    },
                    address: await getAddressFromCoords(coords.latitude, coords.longitude)
                })
            });

            const data = await response.json();
            if (response.ok) {
                // Update the emergencyRequestId and reconnect WebSocket
                navigation.setParams({ emergencyRequestId: data.id });
            }
        } catch (error) {
            console.error('Error creating emergency request:', error);
            Alert.alert('Error', 'Failed to create emergency request');
        }
    };

    const fetchEmergencyDetails = async () => {
        try {
            const response = await fetch(
                `https://your-backend.com/api/emergency/request/${emergencyRequestId}/`,
                {
                    headers: {
                        'Authorization': `Bearer ${yourAuthToken}`
                    }
                }
            );

            const data = await response.json();
            if (response.ok) {
                setStatus(data.status);
                setStatusMessage(data.status_message);
                if (data.unit) setUnitDetails(data.unit);
                if (data.eta) setEta(data.eta);
                if (data.distance) setDistance(data.distance);
                if (data.unit_location) setUnitLocation(data.unit_location);
            }
        } catch (error) {
            console.error('Error fetching emergency details:', error);
        }
    };

    const calculateDistanceAndETA = (unitLoc, userLoc) => {
        // Haversine formula to calculate distance
        const R = 6371; // Earth's radius in km
        const dLat = toRad(userLoc.latitude - unitLoc.latitude);
        const dLon = toRad(userLoc.longitude - unitLoc.longitude);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(toRad(unitLoc.latitude)) * Math.cos(toRad(userLoc.latitude)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distanceKm = R * c;
        
        setDistance(distanceKm.toFixed(2));
        
        // Estimate ETA (assuming average speed of 40 km/h in Nepal's traffic)
        const avgSpeed = 40;
        const etaMinutes = Math.round((distanceKm / avgSpeed) * 60);
        setEta(`${etaMinutes} mins`);
    };

    const toRad = (degrees) => {
        return degrees * (Math.PI / 180);
    };

    const getAddressFromCoords = async (latitude, longitude) => {
        try {
            const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (addresses.length > 0) {
                const addr = addresses[0];
                return `${addr.street || ''}, ${addr.district || ''}, ${addr.city || ''}`.trim();
            }
        } catch (error) {
            console.error('Error getting address:', error);
        }
        return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    };

    const callUnit = () => {
        if (unitDetails?.phone_number) {
            // Implement phone call functionality
            Alert.alert('Call Unit', `Calling ${unitDetails.phone_number}`);
        }
    };

    const cancelEmergency = () => {
        Alert.alert(
            'Cancel Emergency',
            'Are you sure you want to cancel this emergency request?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await fetch(
                                `https://your-backend.com/api/emergency/request/${emergencyRequestId}/cancel/`,
                                {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${yourAuthToken}`
                                    }
                                }
                            );
                            navigation.goBack();
                        } catch (error) {
                            console.error('Error cancelling emergency:', error);
                        }
                    }
                }
            ]
        );
    };

    const cleanup = () => {
        if (locationSubscription.current) {
            locationSubscription.current.remove();
        }
        if (wsRef.current) {
            wsRef.current.close();
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'dispatched':
            case 'en_route':
                return COLORS.warning;
            case 'arrived':
                return COLORS.success;
            case 'completed':
                return COLORS.success;
            case 'cancelled':
                return COLORS.danger;
            default:
                return COLORS.primary;
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

                {/* Map Placeholder - Replace with actual map library like react-native-maps */}
                <View style={[styles.mapContainer, SHADOWS.medium]}>
                    <Image
                        source={{ uri: 'https://placehold.co/400x400/e0e0e0/808080?text=Map+View' }}
                        style={styles.mapImage}
                    />
                    
                    {/* User Location Pin */}
                    {userLocation && (
                        <View style={styles.pinContainer}>
                            <MaterialIcons name="location-on" size={40} color={COLORS.danger} />
                        </View>
                    )}

                    {/* Unit Icon */}
                    {unitLocation && (
                        <View style={styles.unitContainer}>
                            <View style={styles.unitIconBg}>
                                <MaterialIcons name="local-police" size={24} color={COLORS.white} />
                            </View>
                        </View>
                    )}

                    {/* Distance Badge */}
                    {distance && (
                        <View style={styles.distanceBadge}>
                            <Text style={styles.distanceText}>{distance} km away</Text>
                        </View>
                    )}
                </View>

                {/* Status Card */}
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
                                source={{ uri: unitDetails.officer_image || 'https://randomuser.me/api/portraits/men/32.jpg' }} 
                                style={styles.driverImage} 
                            />
                            <View style={styles.driverDetails}>
                                <Text style={styles.driverName}>{unitDetails.officer_name || 'Officer Ram Kumar'}</Text>
                                <Text style={styles.vehicleInfo}>
                                    Unit #{unitDetails.unit_number || '402'} • {unitDetails.vehicle_number || 'Ba 2 Jha 1234'}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.callDriverButton} onPress={callUnit}>
                                <Ionicons name="call" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.timeline}>
                        <View style={[styles.timelineDot, { 
                            backgroundColor: ['pending', 'dispatched', 'en_route', 'arrived', 'completed'].includes(status) 
                                ? COLORS.success : COLORS.textLight 
                        }]} />
                        <View style={[styles.timelineLine, { 
                            backgroundColor: ['dispatched', 'en_route', 'arrived', 'completed'].includes(status) 
                                ? COLORS.success : COLORS.textLight 
                        }]} />
                        <View style={[styles.timelineDot, { 
                            backgroundColor: ['dispatched', 'en_route', 'arrived', 'completed'].includes(status) 
                                ? COLORS.success : COLORS.textLight 
                        }]} />
                        <View style={[styles.timelineLine, { 
                            backgroundColor: ['en_route', 'arrived', 'completed'].includes(status) 
                                ? COLORS.success : COLORS.textLight 
                        }]} />
                        <View style={[styles.timelineDot, { 
                            backgroundColor: ['arrived', 'completed'].includes(status) 
                                ? COLORS.success : COLORS.textLight 
                        }]} />
                    </View>
                    <View style={styles.timelineLabels}>
                        <Text style={styles.timelineLabel}>Requested</Text>
                        <Text style={styles.timelineLabel}>Dispatched</Text>
                        <Text style={styles.timelineLabel}>Arrived</Text>
                    </View>

                    {status !== 'completed' && status !== 'cancelled' && (
                        <TouchableOpacity style={styles.cancelButton} onPress={cancelEmergency}>
                            <Text style={styles.cancelButtonText}>Cancel Request</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        position: 'absolute',
        top: 0,
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
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 8,
    },
    mapContainer: {
        flex: 1,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    pinContainer: {
        position: 'absolute',
    },
    unitContainer: {
        position: 'absolute',
        top: '40%',
        left: '40%',
    },
    unitIconBg: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.white,
        ...SHADOWS.medium,
    },
    distanceBadge: {
        position: 'absolute',
        top: 100,
        backgroundColor: COLORS.surface,
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        ...SHADOWS.small,
    },
    distanceText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    statusCard: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        padding: 25,
        paddingBottom: 40,
    },
    statusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    statusLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 10,
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        flex: 1,
    },
    etaText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    driverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
        backgroundColor: COLORS.background,
        padding: 15,
        borderRadius: 15,
    },
    driverImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
    },
    driverDetails: {
        flex: 1,
    },
    driverName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    vehicleInfo: {
        fontSize: 14,
        color: COLORS.textLight,
        marginTop: 2,
    },
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
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    timelineLine: {
        flex: 1,
        height: 2,
        marginHorizontal: 5,
    },
    timelineLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        marginBottom: 20,
    },
    timelineLabel: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    cancelButton: {
        backgroundColor: COLORS.danger,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
});

export default EmergencyTrackingScreen;
