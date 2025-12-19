import React, { forwardRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import MapView, { Callout, Marker, Polyline } from 'react-native-maps';
import { COLORS } from '../constants/theme';

const MapRenderer = forwardRef(({ region, onRegionChangeComplete, style, markers, polylines }, ref) => {
    return (
        <MapView
            ref={ref}
            style={style}
            region={region}
            onRegionChangeComplete={onRegionChangeComplete}
            showsUserLocation={true}
            showsMyLocationButton={true}
        >
            {markers && markers.map((marker, index) => (
                <Marker
                    key={index}
                    coordinate={marker.coordinate}
                >
                    <View style={{
                        backgroundColor: marker.pinColor || COLORS.primary,
                        padding: 8,
                        borderRadius: 20,
                        borderWidth: 2,
                        borderColor: '#fff',
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 3.84,
                        elevation: 5,
                    }}>
                        <Ionicons
                            name={marker.icon || (marker.isOfficial ? 'person' : 'alert')}
                            size={20}
                            color="#fff"
                        />
                    </View>
                    <Callout>
                        <View style={{ padding: 10, minWidth: 150 }}>
                            <Text style={{ fontWeight: 'bold', fontSize: 14 }}>{marker.title}</Text>
                            {marker.description && <Text style={{ fontSize: 12, color: COLORS.textLight, marginTop: 4 }}>{marker.description}</Text>}
                        </View>
                    </Callout>
                </Marker>
            ))}

            {polylines && polylines.map((polyline, index) => (
                <Polyline
                    key={index}
                    coordinates={polyline.coordinates}
                    strokeColor={polyline.strokeColor}
                    strokeWidth={polyline.strokeWidth}
                    lineDashPattern={polyline.lineDashPattern}
                />
            ))}
        </MapView>
    );
});

export default MapRenderer;
