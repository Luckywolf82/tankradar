import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, isPremium } = await req.json();
    await base44.asServiceRole.entities.User.update(userId, { isPremium });

    return Response.json({ success: true });
});