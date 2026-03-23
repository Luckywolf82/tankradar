import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch pending stations (reviewStatus = "pending")
    const pendingStations = await base44.entities.Station.filter(
      { reviewStatus: 'pending' },
      '-updated_date',
      50
    );

    if (pendingStations.length === 0) {
      return Response.json({ 
        message: 'No pending stations to verify',
        processed: 0 
      });
    }

    // Create or start a conversation with the station_verifier agent
    const conversation = await base44.agents.createConversation({
      agent_name: 'station_verifier',
      metadata: {
        name: `Batch verification - ${new Date().toISOString()}`,
        description: `Verifying ${pendingStations.length} pending stations`
      }
    });

    // Prepare station data for agent
    const stationSummary = pendingStations.map(s => 
      `${s.name} (${s.city || 'unknown city'}, chain: ${s.chain || 'none'}, coords: ${s.latitude},${s.longitude})`
    ).join('\n');

    // Send to agent for verification
    await base44.agents.addMessage(conversation, {
      role: 'user',
      content: `Please verify the following ${pendingStations.length} fuel stations against Google Maps. For each, check if the name, address, and GPS coordinates match. Flag any that seem incorrect or suspicious:\n\n${stationSummary}`
    });

    return Response.json({
      message: 'Batch verification started',
      processed: pendingStations.length,
      conversationId: conversation.id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});