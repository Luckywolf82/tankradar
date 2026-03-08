import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ALLOWED_DECISIONS = [
  'keep_chain_unconfirmed',
  'reclassify_local_fuel_site',
  'reclassify_specialty_fuel',
  'reclassify_non_fuel_poi',
  'mark_foreign_or_border_manual',
  'mark_service_or_trade_not_fuel',
];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { reviewId, stationId, decision } = body;

  if (!reviewId || !stationId || !decision) {
    return Response.json(
      { error: 'Missing required fields: reviewId, stationId, decision' },
      { status: 400 }
    );
  }

  if (!ALLOWED_DECISIONS.includes(decision)) {
    return Response.json(
      { error: `Invalid decision. Allowed: ${ALLOWED_DECISIONS.join(', ')}` },
      { status: 400 }
    );
  }

  console.log(`[applyManualChainUnconfirmedDecision] Applying decision: ${decision} for reviewId=${reviewId}`);

  // Fetch the review to verify it exists and matches stationId
  const review = await base44.asServiceRole.entities.StationReview.filter(
    { id: reviewId }
  );

  if (!review || review.length === 0) {
    return Response.json(
      { error: `Review not found: ${reviewId}` },
      { status: 404 }
    );
  }

  const existingReview = review[0];

  if (existingReview.stationId !== stationId) {
    return Response.json(
      { error: `StationId mismatch: expected ${stationId}, found ${existingReview.stationId}` },
      { status: 400 }
    );
  }

  if (existingReview.review_type !== 'chain_unconfirmed') {
    return Response.json(
      { error: `Review is not chain_unconfirmed: ${existingReview.review_type}` },
      { status: 400 }
    );
  }

  if (existingReview.status !== 'pending') {
    return Response.json(
      { error: `Review is not pending: ${existingReview.status}` },
      { status: 400 }
    );
  }

  const beforeState = {
    id: existingReview.id,
    review_type: existingReview.review_type,
    status: existingReview.status,
    notes: existingReview.notes,
  };

  let afterState = { ...beforeState };
  let newReviewCreated = null;

  // Apply the decision
  if (decision === 'keep_chain_unconfirmed') {
    // Add note and keep pending
    const updatedNotes = (existingReview.notes || '') + 
      `\n[MANUAL DECISION ${new Date().toISOString()}] Kept as chain_unconfirmed after manual review.`;
    
    await base44.asServiceRole.entities.StationReview.update(reviewId, {
      notes: updatedNotes,
    });

    afterState.notes = updatedNotes;
  } else if (decision === 'reclassify_local_fuel_site') {
    // Auto-resolve existing review
    const resolveNotes = (existingReview.notes || '') + 
      `\n[MANUAL DECISION ${new Date().toISOString()}] Reclassified to local_fuel_site_review (manual review).`;
    
    await base44.asServiceRole.entities.StationReview.update(reviewId, {
      status: 'auto_resolved',
      notes: resolveNotes,
    });

    // Create new local_fuel_site_review
    const newReview = await base44.asServiceRole.entities.StationReview.create({
      stationId: stationId,
      review_type: 'local_fuel_site_review',
      status: 'pending',
      station_name: existingReview.station_name,
      station_chain: existingReview.station_chain,
      station_operator: existingReview.station_operator,
      station_stationType: existingReview.station_stationType,
      station_latitude: existingReview.station_latitude,
      station_longitude: existingReview.station_longitude,
      reviewReason: 'manual_reclassification',
      issue_description: 'Station reclassified to local fuel site based on manual review.',
      notes: `Created from chain_unconfirmed [${existingReview.id}] via manual decision.`,
    });

    newReviewCreated = {
      id: newReview.id,
      review_type: 'local_fuel_site_review',
      status: 'pending',
    };

    afterState.status = 'auto_resolved';
    afterState.notes = resolveNotes;
  } else if (decision === 'reclassify_specialty_fuel') {
    const resolveNotes = (existingReview.notes || '') + 
      `\n[MANUAL DECISION ${new Date().toISOString()}] Reclassified to specialty_fuel_review (manual review).`;
    
    await base44.asServiceRole.entities.StationReview.update(reviewId, {
      status: 'auto_resolved',
      notes: resolveNotes,
    });

    const newReview = await base44.asServiceRole.entities.StationReview.create({
      stationId: stationId,
      review_type: 'specialty_fuel_review',
      status: 'pending',
      station_name: existingReview.station_name,
      station_chain: existingReview.station_chain,
      station_operator: existingReview.station_operator,
      station_stationType: existingReview.station_stationType,
      station_latitude: existingReview.station_latitude,
      station_longitude: existingReview.station_longitude,
      reviewReason: 'manual_reclassification',
      issue_description: 'Station reclassified to specialty fuel based on manual review.',
      notes: `Created from chain_unconfirmed [${existingReview.id}] via manual decision.`,
    });

    newReviewCreated = {
      id: newReview.id,
      review_type: 'specialty_fuel_review',
      status: 'pending',
    };

    afterState.status = 'auto_resolved';
    afterState.notes = resolveNotes;
  } else if (decision === 'reclassify_non_fuel_poi') {
    const resolveNotes = (existingReview.notes || '') + 
      `\n[MANUAL DECISION ${new Date().toISOString()}] Reclassified to non_fuel_poi_review (manual review).`;
    
    await base44.asServiceRole.entities.StationReview.update(reviewId, {
      status: 'auto_resolved',
      notes: resolveNotes,
    });

    const newReview = await base44.asServiceRole.entities.StationReview.create({
      stationId: stationId,
      review_type: 'non_fuel_poi_review',
      status: 'pending',
      station_name: existingReview.station_name,
      station_chain: existingReview.station_chain,
      station_operator: existingReview.station_operator,
      station_stationType: existingReview.station_stationType,
      station_latitude: existingReview.station_latitude,
      station_longitude: existingReview.station_longitude,
      reviewReason: 'manual_reclassification',
      issue_description: 'Station reclassified to non-fuel POI based on manual review.',
      notes: `Created from chain_unconfirmed [${existingReview.id}] via manual decision.`,
    });

    newReviewCreated = {
      id: newReview.id,
      review_type: 'non_fuel_poi_review',
      status: 'pending',
    };

    afterState.status = 'auto_resolved';
    afterState.notes = resolveNotes;
  } else if (decision === 'mark_foreign_or_border_manual') {
    const resolveNotes = (existingReview.notes || '') + 
      `\n[MANUAL DECISION ${new Date().toISOString()}] Marked as possible foreign/border station (manual review).`;
    
    await base44.asServiceRole.entities.StationReview.update(reviewId, {
      status: 'auto_resolved',
      notes: resolveNotes,
    });

    const newReview = await base44.asServiceRole.entities.StationReview.create({
      stationId: stationId,
      review_type: 'possible_foreign_station',
      status: 'pending',
      station_name: existingReview.station_name,
      station_chain: existingReview.station_chain,
      station_operator: existingReview.station_operator,
      station_stationType: existingReview.station_stationType,
      station_latitude: existingReview.station_latitude,
      station_longitude: existingReview.station_longitude,
      reviewReason: 'manual_foreign_flag',
      issue_description: 'Station flagged as possible foreign or border station based on manual review.',
      notes: `Created from chain_unconfirmed [${existingReview.id}] via manual decision.`,
    });

    newReviewCreated = {
      id: newReview.id,
      review_type: 'possible_foreign_station',
      status: 'pending',
    };

    afterState.status = 'auto_resolved';
    afterState.notes = resolveNotes;
  } else if (decision === 'mark_service_or_trade_not_fuel') {
    const resolveNotes = (existingReview.notes || '') + 
      `\n[MANUAL DECISION ${new Date().toISOString()}] Marked as service/trade (not fuel) based on manual review.`;
    
    await base44.asServiceRole.entities.StationReview.update(reviewId, {
      status: 'auto_resolved',
      notes: resolveNotes,
    });

    const newReview = await base44.asServiceRole.entities.StationReview.create({
      stationId: stationId,
      review_type: 'non_fuel_poi_review',
      status: 'pending',
      station_name: existingReview.station_name,
      station_chain: existingReview.station_chain,
      station_operator: existingReview.station_operator,
      station_stationType: existingReview.station_stationType,
      station_latitude: existingReview.station_latitude,
      station_longitude: existingReview.station_longitude,
      reviewReason: 'manual_service_trade',
      issue_description: 'Station reclassified as service/trade (not fuel) based on manual review.',
      notes: `Created from chain_unconfirmed [${existingReview.id}] via manual decision.`,
    });

    newReviewCreated = {
      id: newReview.id,
      review_type: 'non_fuel_poi_review',
      status: 'pending',
    };

    afterState.status = 'auto_resolved';
    afterState.notes = resolveNotes;
  }

  console.log(`[applyManualChainUnconfirmedDecision] Decision applied successfully: ${decision}`);

  return Response.json({
    success: true,
    reviewId,
    decision,
    beforeState,
    afterState,
    newReviewCreated,
  });
});