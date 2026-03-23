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

    // Create conversation with the station_verifier agent
    const conversation = await base44.agents.createConversation({
      agent_name: 'station_verifier',
      metadata: {
        name: `Batch verification - ${new Date().toISOString()}`,
        description: `Verifying ${pendingStations.length} pending stations`
      }
    });

    // Prepare station data for agent
    const stationSummary = pendingStations.map(s => 
      `STATION_ID: ${s.id} | ${s.name} (${s.city || 'unknown'}, chain: ${s.chain || 'none'}, coords: ${s.latitude},${s.longitude})`
    ).join('\n');

    // Send to agent for verification
    await base44.agents.addMessage(conversation, {
      role: 'user',
      content: `Verify each station against Google Maps. For flagged stations, respond with: FLAGGED: [STATION_ID]. For reviewed ok stations, respond with: REVIEWED: [STATION_ID].\n\n${stationSummary}`
    });

    // Give agent a moment to respond
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Fetch updated conversation to read agent's response
    const updatedConversation = await base44.agents.getConversation(conversation.id);
    
    // Parse agent response to find flagged/reviewed stations
    const messages = updatedConversation.messages || [];
    const agentResponse = messages.find(m => m.role === 'assistant')?.content || '';
    
    const flaggedIds = [...agentResponse.matchAll(/FLAGGED:\s*([a-zA-Z0-9_-]+)/g)].map(m => m[1]);
    const reviewedIds = [...agentResponse.matchAll(/REVIEWED:\s*([a-zA-Z0-9_-]+)/g)].map(m => m[1]);

    // Update station statuses
    let updated = 0;
    for (const station of pendingStations) {
      if (flaggedIds.includes(station.id)) {
        await base44.entities.Station.update(station.id, { reviewStatus: 'flagged' });
        updated++;
      } else if (reviewedIds.includes(station.id)) {
        await base44.entities.Station.update(station.id, { reviewStatus: 'reviewed' });
        updated++;
      }
    }

    return Response.json({
      message: 'Batch verification completed',
      processed: pendingStations.length,
      flagged: flaggedIds.length,
      reviewed: reviewedIds.length,
      updated,
      conversationId: conversation.id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});