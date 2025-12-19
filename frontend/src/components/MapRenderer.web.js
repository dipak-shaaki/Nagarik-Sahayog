import L from 'leaflet';
import { useEffect, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/theme';

// Fix for Leaflet default icon not appearing correctly in Webpack/Expo environments
const fixLeafletIcon = () => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
        iconUrl: require('leaflet/dist/images/marker-icon.png'),
        shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
    });
};

// Component to handle map movement events and report back to parent
const MapEvents = ({ onRegionChangeComplete }) => {
    const map = useMapEvents({
        moveend: () => {
            if (onRegionChangeComplete) {
                const center = map.getCenter();
                const zoom = map.getZoom();
                // Approximate Delta calculation (simplified)
                const co = 360 / Math.pow(2, zoom);
                onRegionChangeComplete({
                    latitude: center.lat,
                    longitude: center.lng,
                    latitudeDelta: co, // Use full approximate delta
                    longitudeDelta: co,
                });
            }
        },
    });
    return null;
};

// Component to sync map center when props change (e.g. initial location or "Navigate to" actions)
const MapUpdater = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (!center) return;

        const currentZoom = map.getZoom();
        const currentCenter = map.getCenter();

        // Calculate distance to see if we need to move
        const dist = Math.sqrt(
            Math.pow(center[0] - currentCenter.lat, 2) +
            Math.pow(center[1] - currentCenter.lng, 2)
        );

        // Only fly if there is a significant change to avoid feedback loops
        // dist > 0.0001 is approx 10m
        // zoom change check ensures we don't re-zoom if strictly equal
        if (dist > 0.0001 || (zoom !== undefined && zoom !== currentZoom)) {
            map.setView(center, zoom || currentZoom);
        }
    }, [center, zoom, map]);
    return null;
};

const MapRenderer = ({ region, style, markers, polylines, onRegionChangeComplete }) => {
    const [leafletReady, setLeafletReady] = useState(false);

    useEffect(() => {
        // Inject Leaflet CSS
        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }

        // Fix icons using CDN as 'require' can be flaky in some Expo setups
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        setLeafletReady(true);
    }, []);

    if (!leafletReady) return <Text>Loading Map...</Text>;

    // Default center
    const center = region ? [region.latitude, region.longitude] : [27.7172, 85.3240];

    // Zoom level calculation
    // log2(360 / delta) gives precise zoom level. 
    // We round it to match Leaflet's integer levels (usually).
    const zoom = region ? Math.round(Math.log2(360 / region.longitudeDelta)) : 13;
    const safeZoom = Math.max(2, Math.min(18, isFinite(zoom) ? zoom : 13));

    // Convert RN style to web style if possible, or just force full size
    // We use a div to ensure Leaflet gets a correct container
    return (
        <View style={[styles.container, style]}>
            <div style={{ height: '100%', width: '100%', minHeight: '400px', flex: 1 }}>
                {typeof window !== 'undefined' && (
                    <MapContainer
                        center={center}
                        zoom={safeZoom}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={true}
                        zoomControl={false}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <MapEvents onRegionChangeComplete={onRegionChangeComplete} />
                        <MapUpdater center={center} zoom={safeZoom} />

                        {markers && markers.map((marker, index) => (
                            <Marker
                                key={`marker-${index}`}
                                position={[marker.coordinate.latitude, marker.coordinate.longitude]}
                            >
                                {(marker.title || marker.description) && (
                                    <Popup>
                                        <div style={{ padding: '5px' }}>
                                            <strong style={{ display: 'block' }}>{marker.title}</strong>
                                            {marker.description && <span style={{ fontSize: '12px', color: '#666' }}>{marker.description}</span>}
                                        </div>
                                    </Popup>
                                )}
                            </Marker>
                        ))}

                        {polylines && polylines.map((line, index) => (
                            <Polyline
                                key={`poly-${index}`}
                                positions={line.coordinates.map(c => [c.latitude, c.longitude])}
                                color={line.strokeColor || COLORS.primary}
                                weight={line.strokeWidth || 3}
                            />
                        ))}
                    </MapContainer>
                )}
            </div>

            {/* Legacy Legend logic - kept for compatibility if needed */}
            {markers && markers.length > 0 && (
                <View style={styles.legendContainer}>
                    <Text style={styles.legendTitle}>Locations:</Text>
                    {markers.map((marker, index) => (
                        <View key={index} style={styles.legendItem}>
                            <View style={[styles.legendColorBox, { backgroundColor: marker.pinColor || 'red' }]} />
                            <Text style={styles.legendText}>{marker.title}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#e0e0e0',
        overflow: 'hidden',
        flex: 1, // Ensure it takes full space
    },
    legendContainer: {
        position: 'absolute',
        bottom: 20, // Adjusted for attribution
        left: 10,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 10,
        borderRadius: 8,
        zIndex: 1000, // Leaflet z-index is high, so this needs to be higher or placed outside
        pointerEvents: 'none', // Allow clicking through if needed, though this blocks legend clicks
    },
    legendTitle: {
        fontWeight: 'bold',
        marginBottom: 5,
        fontSize: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 2,
    },
    legendColorBox: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 5,
    },
    legendText: {
        fontSize: 12,
        color: COLORS.text,
    }
});

export default MapRenderer;
