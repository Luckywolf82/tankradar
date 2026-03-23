
export function getCurrentMarketContext({
  cspRows,
  selectedFuel,
  currentStationId,
  userCoords,
  radiusKm = 10,
}) {
  if (!cspRows || !selectedFuel || !userCoords) {
    return null;
  }

  const getFuelBlock = (row) => {
    if (selectedFuel === "diesel") {
      return {
        price: row.diesel_price,
        fetchedAt: row.diesel_fetchedAt,
      };
    }

    return {
      price: row.gasoline_95_price,
      fetchedAt: row.gasoline_95_fetchedAt,
    };
  };

  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // ─────────────────────────────
  // 1. Filter usable rows
  // ─────────────────────────────
  const usable = cspRows
    .map((row) => {
      const fuel = getFuelBlock(row);

      if (!fuel.price || !row.latitude || !row.longitude) return null;

      const distance = haversineKm(
        userCoords.lat,
        userCoords.lon,
        row.latitude,
        row.longitude
      );

      if (distance > radiusKm) return null;

      return {
        stationId: row.stationId,
        stationName: row.stationName,
        price: fuel.price,
        fetchedAt: fuel.fetchedAt,
        distance,
      };
    })
    .filter(Boolean);

  if (usable.length === 0) {
    return null;
  }

  // ─────────────────────────────
  // 2. Current station
  // ─────────────────────────────
  const current = usable.find((r) => r.stationId === currentStationId);

  // ─────────────────────────────
  // 3. Cheapest station
  // ─────────────────────────────
  const sorted = [...usable].sort((a, b) => a.price - b.price);
  const cheapest = sorted[0];

  // ─────────────────────────────
  // 4. Most expensive (for spread)
  // ─────────────────────────────
  const mostExpensive = [...usable].sort((a, b) => b.price - a.price)[0];

  // ─────────────────────────────
  // 5. Calculations
  // ─────────────────────────────
  const isCurrentStationCheapest =
    current && cheapest && current.stationId === cheapest.stationId;

  const savingsVsCheapest =
    current && cheapest
      ? Math.max(0, (current.price - cheapest.price) * 40)
      : 0;

  const priceSpread =
    cheapest && mostExpensive
      ? mostExpensive.price - cheapest.price
      : 0;

  // ─────────────────────────────
  // 6. Output
  // ─────────────────────────────
  return {
    currentStationPrice: current?.price ?? null,
    cheapestNearbyPrice: cheapest.price,
    cheapestStation: cheapest,

    savingsVsCheapest,
    priceSpread,

    isCurrentStationCheapest,
    nearbyStationCount: usable.length,
  };
}
