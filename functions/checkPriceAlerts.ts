import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * checkPriceAlerts
 * 
 * Scheduled automation function: checks all active PriceAlert records against new FuelPrice entries.
 * If a new price matches alert criteria (fuelType, maxPrice, within radiusKm), creates a PriceAlertEvent.
 * 
 * No push notifications sent — events stored only for UI display.
 * 
 * Invoked by: scheduled automation on FuelPrice.create or checkPriceAlerts.invoke()
 * Auth: curator or admin (or service role for automation)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Service-role fetch of all active alerts and recent prices
    const alerts = await base44.asServiceRole.entities.PriceAlert.filter({
      enabled: true,
    });

    if (alerts.length === 0) {
      return Response.json({
        success: true,
        message: "No active alerts to check",
        eventsCreated: 0,
      });
    }

    // Get recent fuel prices (last 1000 records, most recent first)
    const prices = await base44.asServiceRole.entities.FuelPrice.list("-fetchedAt", 1000);
    let eventsCreated = 0;

    for (const alert of alerts) {
      for (const price of prices) {
        // 1. Fuel type must match
        if (price.fuelType !== alert.fuelType) continue;

        // 2. Price must be <= maxPrice
        if (price.priceNok > alert.maxPrice) continue;

        // 3. Only process station-level prices with stationId
        if (!price.stationId) continue;

        // 4. Fetch station to check distance
        let station;
        let canonicalStationId = price.stationId;
        try {
          station = await base44.asServiceRole.entities.Station.get(price.stationId);
        } catch {
          // Station not found, skip
          continue;
        }

        if (!station || station.latitude === undefined || station.longitude === undefined) {
          continue;
        }

        // Phase 6B: Canonical station guard — if station is archived duplicate, resolve to canonical
        if (station.status === 'archived_duplicate') {
          // Station has been merged into a canonical. Try to find canonical by querying stations
          // that reference this one in their stationId (parent would have been updated).
          // For now, we'll store the archived reference but flag it for manual reconciliation.
          // In future, we may maintain a canonical_station_id field on Station directly.
          // Skip processing if duplicate — do not create alert events for merged stations.
          continue;
        }

        // 5. Calculate distance using Haversine formula
        const distance = calculateDistance(
          alert.latitude,
          alert.longitude,
          station.latitude,
          station.longitude
        );

        // 6. Check if within radius
        if (distance > alert.radiusKm) continue;

        // 7. Check if event already exists for this alert + price combination
        const existingEvent = await base44.asServiceRole.entities.PriceAlertEvent.filter({
          priceAlertId: alert.id,
          stationId: price.stationId,
          detectedAt: price.fetchedAt, // Assume same fetchedAt = same price instance
        });

        if (existingEvent.length > 0) {
          // Event already created for this price, skip
          continue;
        }

        // 8. Create PriceAlertEvent (with canonical station integrity guard)
        try {
          await base44.asServiceRole.entities.PriceAlertEvent.create({
            priceAlertId: alert.id,
            stationId: price.stationId,
            canonicalStationId: canonicalStationId, // Phase 6B: always references canonical or original if no merge
            stationName: station.name,
            fuelType: price.fuelType,
            priceNok: price.priceNok,
            detectedAt: price.fetchedAt,
            distance: Math.round(distance * 10) / 10, // Round to 1 decimal
          });

          // Update alert's lastTriggeredAt and lastTriggeredPrice
          await base44.asServiceRole.entities.PriceAlert.update(alert.id, {
            lastTriggeredAt: new Date().toISOString(),
            lastTriggeredPrice: price.priceNok,
          });

          eventsCreated++;
        } catch (err) {
          console.error(`Failed to create PriceAlertEvent for alert ${alert.id}:`, err);
        }
      }
    }

    return Response.json({
      success: true,
      message: `Checked ${alerts.length} active alerts against ${prices.length} prices`,
      eventsCreated,
    });
  } catch (error) {
    console.error("checkPriceAlerts error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Haversine formula to calculate distance between two lat/lon points in km
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}