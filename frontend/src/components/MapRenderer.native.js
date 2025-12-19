import { Text, View } from 'react-native';
import MapView, { Callout, Marker, Polyline } from 'react-native-maps';
import { COLORS } from '../constants/theme';

const MapRenderer = ({ region, onRegionChangeComplete, style, markers, polylines }) => {
    return (
        <MapView
            style={style}
            region={region}
            onRegionChangeComplete={onRegionChangeComplete}
        >
            {markers && markers.map((marker, index) => (
                <Marker
                    key={index}
                    coordinate={marker.coordinate}
                    pinColor={marker.pinColor}
                >
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
};

export default MapRenderer;
