import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Hent brukerens prisvarslinger
 * Gratisbrukere får tom liste (de kan ikke opprette alerts)
 * Frontend skal ikke querye UserPriceAlert direkte
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Gratisbrukere kan ikke ha alerts
    if (user.role !== 'premium') {
      return Response.json({
        alerts: [],
        count: 0,
        message: 'Prisvarslinger er kun for premium-brukere.',
      });
    }

    // Hent brukerens alerts
    const alerts = await base44.entities.UserPriceAlert.filter({
      created_by: user.email,
    });

    // Hent stasjondetaljer for hver alert
    const enriched = await Promise.all(
      alerts.map(async (alert) => {
        const station = await base44.asServiceRole.entities.Station.get(
          alert.station
        );
        return {
          id: alert.id,
          stationId: alert.station,
          stationName: station?.name || 'Ukjent',
          fuelType: alert.fuelType,
          alertType: alert.alertType,
          thresholdValue: alert.thresholdValue,
          isActive: alert.isActive,
          lastTriggeredAt: alert.lastTriggeredAt,
          createdAt: alert.created_date,
        };
      })
    );

    return Response.json({
      alerts: enriched,
      count: enriched.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});