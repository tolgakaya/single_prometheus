// Set Workflow Variables - Clean Production Version
const timeData = $input.first().json;

const anomalyStart = timeData.timeRange.start - 3600;
const anomalyEnd = timeData.timeRange.end + 3600;

// Extract forceDeepAnalysis flag from multiple sources
const forceDeepAnalysis = 
  timeData.forceDeepAnalysis || 
  timeData.context?.forceDeepAnalysis || 
  timeData.analysisConfig?.forceDeepAnalysis ||
  timeData.context?.priority === 'critical' ||
  timeData.priority === 'critical' ||
  false;

console.log("=== SET WORKFLOW VARIABLES ===");
console.log("timeData.forceDeepAnalysis:", timeData.forceDeepAnalysis);
console.log("timeData.analysisConfig?.forceDeepAnalysis:", timeData.analysisConfig?.forceDeepAnalysis);
console.log("timeData.priority:", timeData.priority);
console.log("Final forceDeepAnalysis:", forceDeepAnalysis);
console.log("==============================");

const vars = {
  START_TIME: timeData.timeRange.start,
  END_TIME: timeData.timeRange.end,
  START_ISO: timeData.timeRange.startISO,
  END_ISO: timeData.timeRange.endISO,
  STEP: timeData.queryParams.step,
  DURATION_MINUTES: timeData.timeRange.durationMinutes,
  ANALYSIS_ID: timeData.analysisId,
  AFFECTED_SERVICES: timeData.affectedServices,
  SEVERITY: timeData.context.severity || 'unknown',
  SOURCE: timeData.context.source,
  FORCE_DEEP_ANALYSIS: forceDeepAnalysis,
  PRIORITY: timeData.context?.priority || timeData.priority || 'normal',
  IS_ORCHESTRATOR_REQUEST: timeData.orchestratorId ? true : false
};

console.log("WORKFLOW VARIABLES SET:");
console.log("Force Deep Analysis:", vars.FORCE_DEEP_ANALYSIS);
console.log("Priority:", vars.PRIORITY);
console.log("Orchestrator Request:", vars.IS_ORCHESTRATOR_REQUEST);

// Pass all data forward
return [{
  json: {
    ...timeData,
    $vars: vars,
    anomalyStart: anomalyStart,
    anomalyEnd: anomalyEnd,
    forceDeepAnalysis: forceDeepAnalysis,
    priority: timeData.priority || timeData.context?.priority || 'normal'
  }
}];