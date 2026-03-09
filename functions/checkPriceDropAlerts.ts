import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Sjekker om en ny FuelPrice utløser price_drop-varsler for brukere
 * Kalles automatisk via entity-automation når en ny FuelPrice opprettes
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;

    if (!data || !data.stationId || !data.fuelType || data.priceNok == null) {
      return Response.json({ skipped: true, reason: 'missing_required_fields' });
    }

    const { stationId, fuelType, priceNok: newPrice, plausibilityStatus } = data;
    const newPriceEntityId = event?.entity_id;

    // Kun realistiske priser
    if (plausibilityStatus && plausibilityStatus !== 'realistic_price') {
      return Response.json({ skipped: true, reason: 'non_realistic_price' });
    }

    // Hent tidligere priser for samme stasjon+drivstofftype
    const recentPrices = await base44.asServiceRole.entities.FuelPrice.filter(
      { stationId, fuelType },
      '-fetchedAt',
      10
    );

    // Filtrer ut den nettopp opprettede
    const previousPrices = recentPrices.filter(p => p.id !== newPriceEntityId && p.plausibilityStatus === 'realistic_price');

    if (previousPrices.length === 0) {
      return Response.json({ skipped: true, reason: 'no_previous_price' });
    }

    const previousPrice = previousPrices[0].priceNok;

    // Sjekk om prisen faktisk falt
    if (newPrice >= previousPrice) {
      return Response.json({ skipped: true, reason: 'no_price_drop', newPrice, previousPrice });
    }

    const priceDrop = +(previousPrice - newPrice).toFixed(2);

    // Finn alle aktive price_drop-varsler for denne stasjonen+drivstofftypen
    const allAlerts = await base44.asServiceRole.entities.UserPriceAlert.filter({
      station: stationId,
      fuelType,
      isActive: true,
    });

    const priceDropAlerts = allAlerts.filter(a => a.alertType === 'price_drop');

    if (priceDropAlerts.length === 0) {
      return Response.json({ skipped: true, reason: 'no_matching_alerts', stationId, fuelType });
    }

    // Utløs hvert varsling
    let triggered = 0;
    for (const alert of priceDropAlerts) {
      await base44.asServiceRole.entities.UserPriceAlert.update(alert.id, {
        lastTriggeredAt: new Date().toISOString(),
        isUnread: true,
        triggeredPriceNok: newPrice,
        previousPriceNok: previousPrice,
      });
      triggered++;
    }

    return Response.json({
      success: true,
      triggered,
      priceDrop,
      newPrice,
      previousPrice,
      stationId,
      fuelType,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});