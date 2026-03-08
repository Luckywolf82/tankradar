import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Opprett prisvarsling med premium-krav og duplikat-kontroll
 * Frontend skal ikke calle UserPriceAlert.create() direkte
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Premium-krav
    if (user.role !== 'premium') {
      return Response.json({
        status: 'premium_required',
        message: 'Prisvarslinger er kun tilgjengelig for premium-brukere.',
      });
    }

    const { stationId, fuelType, alertType, thresholdValue } = await req.json();

    if (!stationId || !fuelType || !alertType || thresholdValue === undefined) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Sjekk duplikat
    const userAlerts = await base44.entities.UserPriceAlert.filter(
      { created_by: user.email }
    );

    const existing = userAlerts.find(
      (alert) =>
        alert.station === stationId &&
        alert.fuelType === fuelType &&
        alert.alertType === alertType
    );

    if (existing) {
      return Response.json({
        status: 'already_exists',
        message: 'Du har allerede et slikt varsling.',
        id: existing.id,
      });
    }

    // Opprett alert
    const newAlert = await base44.entities.UserPriceAlert.create({
      station: stationId,
      fuelType,
      alertType,
      thresholdValue,
      isActive: true,
    });

    return Response.json({
      status: 'created',
      id: newAlert.id,
      station: stationId,
      fuelType,
      alertType,
      thresholdValue,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});