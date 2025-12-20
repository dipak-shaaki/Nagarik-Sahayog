import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useEffect, useState, useRef } from 'react';
import { Dimensions, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PlatformMapView from '../components/PlatformMapView';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SHADOWS } from '../constants/theme';
import { API_URL } from '../config/api';


const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const MapScreen = ({ route, navigation }) => {
    const { problemLocation, adminLocation, selectionMode, initialLocation, from } = route.params || {};

    console.log('=== MapScreen Loaded ===');
    console.log('problemLocation:', problemLocation);
    console.log('adminLocation:', adminLocation);
    console.log('from:', from);
    console.log('selectionMode:', selectionMode);

    const mapRef = useRef(null);

    const [region, setRegion] = useState({
        latitude: problemLocation?.latitude || initialLocation?.latitude || 27.7172,
        longitude: problemLocation?.longitude || initialLocation?.longitude || 85.3240,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
    });

    const [userLocation, setUserLocation] = useState(null);
    const [availableRoutes, setAvailableRoutes] = useState([]);
    const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    // Track center coordinate for selection
    const [selectedCoordinate, setSelectedCoordinate] = useState({
        latitude: initialLocation?.latitude || 27.7172,
        longitude: initialLocation?.longitude || 85.3240,
    });

    const currentProblemLocation = {
        latitude: problemLocation?.latitude || 27.7172,
        longitude: problemLocation?.longitude || 85.3240,
        id: problemLocation?.id,
        title: problemLocation?.title || "Problem Location",
        status: problemLocation?.status,
    };

    console.log('currentProblemLocation:', currentProblemLocation);

    // Helper function to get map markers
    const getMapMarkers = () => {
        const markers = [
            {
                coordinate: {
                    latitude: currentProblemLocation.latitude,
                    longitude: currentProblemLocation.longitude,
                },
                title: currentProblemLocation.title,
                description: "Issue Location",
                pinColor: COLORS.danger,
                icon: 'alert-circle', // Problem location icon
                isOfficial: false
            }
        ];

        const myLoc = userLocation || adminLocation || { latitude: 27.7221, longitude: 85.3123 };
        const isOffice = !userLocation && adminLocation;

        console.log('Official/User Location:', myLoc, 'isOffice:', isOffice);

        markers.push({
            coordinate: {
                latitude: myLoc.latitude,
                longitude: myLoc.longitude,
            },
            title: isOffice ? "Department Office" : "Your Location",
            description: isOffice ? "Starting Point" : "You are here",
            pinColor: COLORS.primary,
            icon: isOffice ? 'business' : 'navigate', // Official/office location icon
            isOfficial: true
        });

        console.log('Total markers:', markers.length);
        return markers;
    };

    // Helper function to get map polylines
    const getMapPolylines = () => {
        const polylines = availableRoutes.map((route, index) => ({
            coordinates: route.coordinates,
            strokeColor: index === selectedRouteIndex ? COLORS.primary : '#95a5a6',
            strokeWidth: index === selectedRouteIndex ? 6 : 4,
            lineDashPattern: index === selectedRouteIndex ? [] : [5, 5],
            zIndex: index === selectedRouteIndex ? 10 : index,
        }));

        console.log('Polylines count:', polylines.length);
        if (polylines.length > 0) {
            console.log('First polyline coordinates count:', polylines[0].coordinates.length);
        }

        return polylines;
    };



    const calculateRoute = async (type = 'fastest', startCoords = null) => {
        const start = startCoords || userLocation || adminLocation || { latitude: 27.7221, longitude: 85.3123 };

        console.log('========== CALCULATING ROUTE ==========');
        console.log('Start coordinates:', start);
        console.log('End coordinates (problem):', currentProblemLocation);

        if (!start || !currentProblemLocation) {
            console.error('Missing coordinates! Start:', start, 'Problem:', currentProblemLocation);
            alert('Error: Missing location coordinates');
            return;
        }

        // Validate coordinates
        if (!start.latitude || !start.longitude || !currentProblemLocation.latitude || !currentProblemLocation.longitude) {
            console.error('Invalid coordinates!');
            alert('Error: Invalid location coordinates');
            return;
        }

        setLoading(true);
        try {
            const startStr = `${start.longitude},${start.latitude}`;
            const endStr = `${currentProblemLocation.longitude},${currentProblemLocation.latitude}`;

            console.log('Start string:', startStr);
            console.log('End string:', endStr);

            // Improved OSRM request with better parameters for complete routes
            const url = `http://router.project-osrm.org/route/v1/driving/${startStr};${endStr}?overview=full&geometries=geojson&alternatives=true&steps=true&annotations=true`;

            console.log('OSRM URL:', url);
            console.log('Fetching route...');

            const response = await fetch(url);
            const data = await response.json();

            console.log('OSRM Response Code:', data.code);
            console.log('OSRM Full Response:', JSON.stringify(data, null, 2));

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                console.log('Routes found:', data.routes.length);

                const formattedRoutes = data.routes.map((r, idx) => {
                    // Start with the exact start coordinate
                    const coords = [
                        { latitude: Number(start.latitude), longitude: Number(start.longitude) },
                        ...r.geometry.coordinates.map(c => ({
                            latitude: Number(c[1]),
                            longitude: Number(c[0])
                        })),
                        // End with the exact destination coordinate
                        {
                            latitude: Number(currentProblemLocation.latitude),
                            longitude: Number(currentProblemLocation.longitude)
                        }
                    ];

                    // Filter out any invalid coordinates (NaN or null) that break rendering
                    const validCoords = coords.filter(c =>
                        !isNaN(c.latitude) &&
                        !isNaN(c.longitude) &&
                        c.latitude !== null &&
                        c.longitude !== null
                    );

                    console.log(`Route ${idx}:`, {
                        points: validCoords.length, // Log valid count
                        distance: r.distance,
                        duration: r.duration,
                    });

                    return {
                        id: idx,
                        coordinates: validCoords,
                        distance: r.distance,
                        duration: r.duration,
                        title: idx === 0 ? "Fastest" : `Option ${idx + 1}`
                    };
                });

                console.log('Formatted routes:', formattedRoutes.length);
                console.log('Setting routes to state...');
                setAvailableRoutes(formattedRoutes);
                console.log('Routes set successfully!');
            } else {
                console.error('OSRM Error - Code:', data.code);
                console.error('OSRM Error - Message:', data.message);
                alert(`Route calculation failed: ${data.message || data.code || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error calculating route:', error);
            console.error('Error stack:', error.stack);
            alert(`Failed to calculate route: ${error.message}`);
        } finally {
            setLoading(false);
            console.log('Route calculation finished');
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.round(seconds / 60);
        if (mins < 60) return `${mins}m`;
        return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    };

    const formatDistance = (meters) => {
        if (meters < 1000) return `${Math.round(meters)}m`;
        return `${(meters / 1000).toFixed(1)}km`;
    };

    const toggleRouteType = () => {
        const nextIndex = (selectedRouteIndex + 1) % availableRoutes.length;
        setSelectedRouteIndex(nextIndex);
    };

    useEffect(() => {
        let subscription;
        const initLocation = async () => {
            if (selectionMode) return;

            if (adminLocation) {
                calculateRoute('fastest', adminLocation);
            }

            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    // Get current position
                    let loc = await Location.getCurrentPositionAsync({});
                    setUserLocation(loc.coords);

                    if (!adminLocation) {
                        calculateRoute('fastest', loc.coords);
                    }

                    // Subscribe to location updates
                    subscription = await Location.watchPositionAsync(
                        {
                            accuracy: Location.Accuracy.High,
                            distanceInterval: 10, // Update every 10 meters
                        },
                        (newLoc) => {
                            setUserLocation(newLoc.coords);
                            // Recalculate route periodically or if significantly moved
                        }
                    );
                } else {
                    calculateRoute('fastest');
                }
            } catch (e) {
                console.log('Location error:', e);
                calculateRoute('fastest');
            }
        };

        initLocation();

        return () => {
            if (subscription) {
                subscription.remove();
            }
        };
    }, []);

    // Adjust map region when routes are calculated to show complete route
    // Adjust map region using fitToCoordinates for reliable route visibility
    useEffect(() => {
        if (availableRoutes.length > 0 && selectedRouteIndex < availableRoutes.length) {
            const selectedRoute = availableRoutes[selectedRouteIndex];

            if (selectedRoute.coordinates.length > 0 && mapRef.current) {
                console.log('Using fitToCoordinates to show complete route');
                try {
                    // Small delay to ensure map layout is complete
                    setTimeout(() => {
                        mapRef.current?.fitToCoordinates(selectedRoute.coordinates, {
                            edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
                            animated: true,
                        });
                    }, 500);
                } catch (error) {
                    console.log('Error fitting to coordinates:', error);
                }
            }
        }
    }, [availableRoutes, selectedRouteIndex]);

    // Dynamically update route if user moves, BUT ONLY if we are NOT in Admin/Office mode
    useEffect(() => {
        if (userLocation && !selectionMode && problemLocation?.id && !adminLocation) {
            calculateRoute('fastest', userLocation);
        }
    }, [userLocation?.latitude, userLocation?.longitude]);

    const handleRegionChange = (newRegion) => {
        setRegion(newRegion);
        if (selectionMode) {
            setSelectedCoordinate({
                latitude: newRegion.latitude,
                longitude: newRegion.longitude,
            });
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        if (!problemLocation?.id) return;
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_URL}/reports/${problemLocation.id}/status/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                alert(`Task marked as ${newStatus}`);
                navigation.goBack();
            } else {
                const data = await response.json();
                alert(data.error || "Failed to update status");
            }
        } catch (error) {
            alert("Error connecting to server");
        }
    };

    const confirmSelection = () => {
        if (route.params?.onSelectLocation) {
            // We can't pass functions via navigation params easily in strict React Nav, 
            // but if we are in the same stack it might work, or we pass back via route params
            // Standard way: navigation.navigate({ name: 'CreateReport', params: { selectedLocation: ... }, merge: true })
            navigation.navigate('CreateReport', {
                selectedLocation: selectedCoordinate
            });
        } else {
            navigation.navigate('CreateReport', {
                selectedLocation: selectedCoordinate
            });
        }
    };

    // ... existing effects ...

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => {
                            console.log('Back button clicked, from:', from);
                            // Directly navigate to the source screen
                            if (from === 'FieldOfficialDashboard') {
                                navigation.navigate('FieldOfficialDashboard');
                            } else if (from === 'AdminDashboard') {
                                navigation.navigate('AdminDashboard');
                            } else {
                                // Default fallback
                                navigation.navigate('AdminDashboard');
                            }
                        }}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>{selectionMode ? "Select Location" : "Route to Problem"}</Text>
                </View>

                <View style={styles.mapContainer}>
                    <PlatformMapView
                        ref={mapRef}
                        style={styles.map}
                        region={region}
                        onRegionChangeComplete={handleRegionChange}
                        // Only show markers/polylines if NOT in selection mode (or show specific ones)
                        markers={selectionMode ? [] : getMapMarkers()}
                        polylines={selectionMode ? [] : getMapPolylines()}
                    />

                    {selectionMode && (
                        <View style={[styles.centerMarkerContainer, { pointerEvents: 'none' }]}>
                            <Ionicons name="location" size={40} color={COLORS.danger} />
                        </View>
                    )}
                </View>

                {selectionMode ? (
                    <View style={styles.selectionFooter}>
                        <Text style={styles.selectionText}>
                            Lat: {selectedCoordinate.latitude.toFixed(4)}, Long: {selectedCoordinate.longitude.toFixed(4)}
                        </Text>
                        <TouchableOpacity style={styles.confirmButton} onPress={confirmSelection}>
                            <Text style={styles.confirmButtonText}>Confirm Location</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    /* Existing Route Toggle & Info Panel */
                    <>
                        {/* ... existing route toggle UI ... */}
                        {/* Route Type Toggle */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.routeToggleContainer}
                            contentContainerStyle={{ paddingRight: 20 }}
                        >
                            {availableRoutes.map((route, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.routeToggleButton,
                                        selectedRouteIndex === index && styles.activeRouteButton,
                                        { marginLeft: index === 0 ? 0 : 8 }
                                    ]}
                                    onPress={() => setSelectedRouteIndex(index)}
                                    disabled={loading}
                                >
                                    <View>
                                        <Text style={[
                                            styles.routeToggleText,
                                            selectedRouteIndex === index && styles.activeRouteText
                                        ]}>
                                            {route.title}
                                        </Text>
                                        <Text style={[
                                            styles.routeDetailText,
                                            selectedRouteIndex === index && styles.activeRouteText
                                        ]}>
                                            {formatTime(route.duration)} • {formatDistance(route.distance)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Info Panel / Task Details */}
                        <View style={[styles.infoPanel, SHADOWS.large]}>
                            {problemLocation?.id ? (
                                <>
                                    <View style={styles.taskInfoHeader}>
                                        <Text style={styles.taskTitle}>{problemLocation.title}</Text>
                                        <View style={[styles.miniBadge, { backgroundColor: problemLocation.status === 'PENDING' ? COLORS.danger : COLORS.secondary }]}>
                                            <Text style={styles.miniBadgeText}>{problemLocation.status}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.taskActions}>
                                        <TouchableOpacity
                                            style={styles.routeToggleMini}
                                            onPress={toggleRouteType}
                                        >
                                            <Ionicons name="shuffle" size={16} color={COLORS.primary} />
                                            <Text style={styles.miniRouteText}>{availableRoutes[selectedRouteIndex]?.title || 'Route'}</Text>
                                        </TouchableOpacity>

                                        {problemLocation.status === 'ASSIGNED' && (
                                            <TouchableOpacity
                                                style={[styles.miniActionButton, { backgroundColor: COLORS.secondary }]}
                                                onPress={() => handleStatusUpdate('IN_PROGRESS')}
                                            >
                                                <Text style={styles.miniActionText}>Start Work</Text>
                                            </TouchableOpacity>
                                        )}

                                        {problemLocation.status === 'IN_PROGRESS' && (
                                            <TouchableOpacity
                                                style={[styles.miniActionButton, { backgroundColor: COLORS.primary }]}
                                                onPress={() => handleStatusUpdate('RESOLVED')}
                                            >
                                                <Text style={styles.miniActionText}>Complete</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </>
                            ) : (
                                <>
                                    <View style={styles.infoRow}>
                                        <View style={styles.infoItem}>
                                            <View style={[styles.colorBox, { backgroundColor: COLORS.danger }]} />
                                            <Text style={styles.infoText}>Problem</Text>
                                        </View>
                                        <View style={styles.infoItem}>
                                            <View style={[styles.colorBox, { backgroundColor: COLORS.primary }]} />
                                            <Text style={styles.infoText}>You</Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.routeInfo}
                                        onPress={toggleRouteType}
                                        disabled={loading}
                                    >
                                        <Ionicons
                                            name="shuffle"
                                            size={20}
                                            color={COLORS.primary}
                                        />
                                        <Text style={styles.routeInfoText}>
                                            {availableRoutes[selectedRouteIndex]?.title || 'Calculating...'} ({formatTime(availableRoutes[selectedRouteIndex]?.duration || 0)})
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </>
                )}
            </View>
        </ScreenWrapper >
    );
};

const styles = StyleSheet.create({
    // ... existing styles ...
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
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 20,
        margin: 10,
        ...SHADOWS.medium,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        flex: 1,
    },
    centerMarkerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
        marginBottom: 40, // Offset for pin point
    },
    selectionFooter: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        backgroundColor: COLORS.surface,
        padding: 20,
        borderRadius: 15,
        alignItems: 'center',
        ...SHADOWS.large,
    },
    selectionText: {
        marginBottom: 15,
        color: COLORS.textLight,
        fontSize: 14,
    },
    confirmButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25,
        width: '100%',
        alignItems: 'center',
    },
    confirmButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    // ... rest of existing styles ...
    routeToggleContainer: {
        position: 'absolute',
        top: 20,
        right: 20,
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: 25,
        overflow: 'hidden',
        ...SHADOWS.medium,
    },
    routeToggleButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        justifyContent: 'center',
    },
    routeDetailText: {
        fontSize: 10,
        color: COLORS.textLight,
        marginTop: 2,
    },
    activeRouteButton: {
        backgroundColor: COLORS.primary,
    },
    routeToggleText: {
        color: COLORS.textLight,
        fontWeight: '600',
        fontSize: 14,
    },
    activeRouteText: {
        color: COLORS.white,
    },
    infoPanel: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: COLORS.surface,
        borderRadius: 15,
        padding: 15,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    colorBox: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    infoText: {
        fontSize: 14,
        color: COLORS.text,
    },
    routeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    routeInfoText: {
        fontSize: 14,
        color: COLORS.text,
        marginLeft: 8,
        fontWeight: '600',
    },
    taskInfoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        flex: 1,
    },
    miniBadge: {
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 4,
        marginLeft: 8,
    },
    miniBadgeText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    taskActions: {
        flexDirection: 'row',
        gap: 10,
    },
    routeToggleMini: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        paddingVertical: 8,
        gap: 5,
    },
    miniRouteText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.text,
    },
    miniActionButton: {
        flex: 2,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        paddingVertical: 8,
    },
    miniActionText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 12,
    },
});

export default MapScreen;
