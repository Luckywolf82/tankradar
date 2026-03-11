import React from 'react';
import NearbyPrices from './NearbyPrices';

// RadarCard — nearby cheap stations (core Dashboard feature)
export default function RadarCard({ selectedFuel }) {
  return <NearbyPrices selectedFuel={selectedFuel} />;
}