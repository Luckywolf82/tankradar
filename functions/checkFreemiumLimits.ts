import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Sentralisert hjelperfunksjon for freemium-regler
 * Returnerer grenser basert på brukerrolle
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isPremium = user.role === 'premium';

    const limits = {
      maxFavorites: isPremium ? 999999 : 3,
      maxHistoryDays: isPremium ? 365 : 30,
      canCreateAlerts: isPremium,
      canAccessRegionalBenchmark: isPremium,
      isPremium,
    };

    return Response.json({ limits });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});