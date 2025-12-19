import React, { forwardRef } from 'react';
import MapRenderer from './MapRenderer';

// This component handles platform-specific map implementations
// React Native automatically picks MapRenderer.web.js or MapRenderer.native.js
const PlatformMapView = forwardRef((props, ref) => {
    return <MapRenderer {...props} ref={ref} />;
});

export default PlatformMapView;
