import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const pipelineResults = [];
  const startedPipelineAt = Date.now();
  const startedPipelineAtISO = new Date().toISOString();

  async function runStep(step, functionName, payload) {
    const started = Date.now();
    const startedAt = new Date().toISOString();
    console.log(`[Pipeline] STEP ${step} START ${functionName}`, { payload, startedAt });

    try {
      const response = payload === undefined
        ? await base44.functions.invoke(functionName)
        : await base44.functions.invoke(functionName, payload);

      const finishedAt = new Date().toISOString();
      const durationMs = Date.now() - started;

      console.log(`[Pipeline] STEP ${step} SUCCESS ${functionName}`, {
        payload,
        startedAt,
        finishedAt,
        durationMs,
        response: response.data,
      });

      return {
        step,
        functionName,
        payload: payload ?? null,
        startedAt,
        finishedAt,
        durationMs,
        success: true,
        response: response.data,
        error: null,
      };
    } catch (error) {
      const finishedAt = new Date().toISOString();
      const durationMs = Date.now() - started;

      console.error(`[Pipeline] STEP ${step} FAILED ${functionName}`, {
        payload,
        startedAt,
        finishedAt,
        durationMs,
        error: {
          message: error?.message ?? 'Unknown error',
          stack: error?.stack ?? null,
        },
      });

      return {
        step,
        functionName,
        payload: payload ?? null,
        startedAt,
        finishedAt,
        durationMs,
        success: false,
        response: null,
        error: {
          message: error?.message ?? 'Unknown error',
          stack: error?.stack ?? null,
        },
      };
    }
  }

  pipelineResults.push(await runStep(1, 'geocodeStationsFromCoordinates', { batchSize: 80 }));
  pipelineResults.push(await runStep(2, 'autoFillLocationFromName'));
  pipelineResults.push(await runStep(3, 'deleteForeignStations', { dryRun: false }));
  pipelineResults.push(await runStep(4, 'autoApproveExactDuplicates'));
  pipelineResults.push(await runStep(5, 'identifyStationReviewProblems'));
  pipelineResults.push(await runStep(6, 'autoConfirmChainFromName'));
  pipelineResults.push(await runStep(7, 'classifyStationsRuleEngine'));
  pipelineResults.push(await runStep(8, 'verifyGenericNameStations', { dryRun: false }));

  const finishedPipelineAtISO = new Date().toISOString();
  const totalDurationMs = Date.now() - startedPipelineAt;

  const summary = {
    success: pipelineResults.every(res => res.success),
    startedAt: startedPipelineAtISO,
    finishedAt: finishedPipelineAtISO,
    totalDurationMs,
    stepsRun: pipelineResults.length,
    stepsSucceeded: pipelineResults.filter(res => res.success).length,
    stepsFailed: pipelineResults.filter(res => !res.success).length,
    results: pipelineResults,
  };

  console.log('[Pipeline] Full review pipeline finished:', {
    totalDurationMs,
    stepsRun: summary.stepsRun,
    stepsSucceeded: summary.stepsSucceeded,
    stepsFailed: summary.stepsFailed,
  });

  return Response.json(summary);
});