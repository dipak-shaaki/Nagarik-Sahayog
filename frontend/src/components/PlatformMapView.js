import MapRenderer from './MapRenderer';

// This component handles platform-specific map implementations
// React Native automatically picks MapRenderer.web.js or MapRenderer.native.js
const PlatformMapView = (props) => {
    return <MapRenderer {...props} />;
};

export default PlatformMapView;
