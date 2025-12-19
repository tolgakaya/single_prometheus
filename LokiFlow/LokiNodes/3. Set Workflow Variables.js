// Set Workflow Variables - Standardized Structure Version
const timeData = $input.first().json;

// Read from standardized structure (with legacy fallback)
const metadata = timeData.metadata || {};
const context = timeData.context || timeData;
const timeRange = context.timeRange || timeData.timeRange;

// Anomaly Detection: Focus on recent 15 minutes (not ±1 hour)
// This reduces token usage by ~80% while keeping relevant anomaly detection
const anomalyStart = timeRange.end - 900;  // Last 15 minutes (was: timeRange.start - 3600)
const anomalyEnd = timeRange.end;          // Current end (was: timeRange.end + 3600)

// Extract forceDeepAnalysis flag from standardized metadata
const forceDeepAnalysis =
  metadata.forceDeepAnalysis ||
  timeData.forceDeepAnalysis ||  // Legacy fallback
  metadata.priority === 'critical' ||
  false;

console.log("=== SET WORKFLOW VARIABLES (Standardized) ===");
console.log("metadata.forceDeepAnalysis:", metadata.forceDeepAnalysis);
console.log("metadata.priority:", metadata.priority);
console.log("Final forceDeepAnalysis:", forceDeepAnalysis);
console.log("=============================================");

const vars = {
  START_TIME: timeRange.start,
  END_TIME: timeRange.end,
  START_ISO: timeRange.startISO,
  END_ISO: timeRange.endISO,
  STEP: context.queryParams?.step || timeData.queryParams?.step || 300,  // Default 300s (5min) for token efficiency
  DURATION_MINUTES: timeRange.durationMinutes,
  ANALYSIS_ID: metadata.analysisId || timeData.analysisId,  // Legacy fallback
  AFFECTED_SERVICES: context.affectedServices || timeData.affectedServices,
  SEVERITY: timeData.context?.severity || 'unknown',  // Not in standardized structure yet
  SOURCE: metadata.source || timeData.context?.source,
  FORCE_DEEP_ANALYSIS: forceDeepAnalysis,
  PRIORITY: metadata.priority || timeData.priority || 'normal',
  IS_ORCHESTRATOR_REQUEST: metadata.orchestratorId ? true : false
};

console.log("WORKFLOW VARIABLES SET:");
console.log("Force Deep Analysis:", vars.FORCE_DEEP_ANALYSIS);
console.log("Priority:", vars.PRIORITY);
console.log("Orchestrator Request:", vars.IS_ORCHESTRATOR_REQUEST);

// Pass all data forward (preserve standardized structure)
return {
  json: {
    ...timeData,  // Preserve entire standardized structure
    $vars: vars,
    anomalyStart: anomalyStart,
    anomalyEnd: anomalyEnd,

    // Update metadata with confirmed values
    metadata: {
      ...metadata,
      forceDeepAnalysis: forceDeepAnalysis,
      priority: metadata.priority || timeData.priority || 'normal'
    },

    // Legacy compatibility
    forceDeepAnalysis: forceDeepAnalysis,
    priority: metadata.priority || timeData.priority || 'normal'
  }
};