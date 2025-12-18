// Pass Time Context to Stage 3 - Clean Production Version
const stage2Result = $input.first().json;
const prevData = $input.all()[0].json;

// Preserve all time context
const timeContext = {
  timeRange: prevData.timeRange || {},
  $vars: prevData.$vars || {},
  context: prevData.context || {},
  affectedServices: prevData.affectedServices || [],
  analysisId: prevData.analysisId || 'unknown',
  queryParams: prevData.queryParams || {}
};

// Extract anomaly context
const anomalyContext = stage2Result.anomaly_context || prevData.anomaly_scores || {};

return [{ 
  json: {
    ...stage2Result,
    ...timeContext,
    stage1_status: prevData.stage1_status,
    stage2_pattern: stage2Result.stage3_focus,
    anomaly_context: anomalyContext,
    proceed_to_stage3: stage2Result.proceed_to_stage3
  }
}];