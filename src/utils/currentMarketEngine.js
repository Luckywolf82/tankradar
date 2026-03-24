import { isFreshEnoughForNearbyRanking } from "@/utils/currentPriceResolver";

export function getCurrentMarketContext({
  cspRows,
  selectedFuel,
  currentStationId,
  userCoords,
  radiusKm = 10,
}) {
  if (!cspRows || !selectedFuel || !userCoords) return null;

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

  // ───────── current station (separat!)
  const currentRaw = cspRows.find(r => r.stationId === currentStationId);
  const currentFuel = currentRaw ? getFuelBlock(currentRaw) : null;

  const currentStationPrice =
    currentFuel &&
    currentFuel.price &&
    currentFuel.fetchedAt &&
    isFreshEnoughForNearbyRanking({
      fetchedAt: currentFuel.fetchedAt,
      priceNok: currentFuel.price,
    })
      ? currentFuel.price
      : null;

  // ───────── usable nearby
  const usable = cspRows
    .map((row) => {
      const fuel = getFuelBlock(row);

      if (!fuel.price || !fuel.fetchedAt || !row.latitude || !row.longitude) return null;

      const mockRow = {
        fetchedAt: fuel.fetchedAt,
        priceNok: fuel.price,
      };

      if (!isFreshEnoughForNearbyRanking(mockRow)) return null;

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
        distance,
      };
    })
    .filter(Boolean);

  if (usable.length === 0) {
    return {
      currentStationPrice,
      cheapestNearbyPrice: null,
      cheapestStation: null,
      savingsVsCheapest: 0,
      priceSpread: 0,
      isCurrentStationCheapest: false,
      nearbyStationCount: 0,
    };
  }

  const sorted = [...usable].sort((a, b) => a.price - b.price);

  const cheapest = sorted[0];
  const mostExpensive = sorted[sorted.length - 1];

  const isCurrentStationCheapest =
    currentStationPrice && cheapest && currentStationId === cheapest.stationId;

  const savingsVsCheapest =
    currentStationPrice && cheapest
      ? Math.max(0, (currentStationPrice - cheapest.price) * 40)
      : 0;

  const priceSpread = mostExpensive.price - cheapest.price;

  return {
    currentStationPrice,
    cheapestNearbyPrice: cheapest.price,
    cheapestStation: cheapest,
    savingsVsCheapest,
    priceSpread,
    isCurrentStationCheapest,
    nearbyStationCount: usable.length,
  };
}
