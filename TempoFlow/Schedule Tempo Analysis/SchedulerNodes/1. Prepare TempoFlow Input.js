// Prepare TempoFlow Input Node
// Purpose: Converts Schedule Trigger empty input to TempoFlow required format
// Position: Between "Schedule Trigger" and "Execute TempoFlow Analysis"

const now = Math.floor(Date.now() / 1000);
const oneHourAgo = now - 3600; // 1 hour lookback for scheduled checks

// Generate unique request ID
const requestId = `tempoflow-scheduled-${now}-${Math.random().toString(36).substring(7)}`;

// Prepare input for TempoFlow
const tempoFlowInput = {
  // Time range (Unix timestamps in seconds)
  startTime: oneHourAgo,
  endTime: now,

  // Context for TempoFlow
  context: {
    source: {
      type: 'scheduler',
      trigger: 'periodic_trace_check',
      interval: '30m' // Matches scheduler trigger interval
    },

    // Default namespaces to check (customize based on your setup)
    namespaces: [
      'bstp-cms-global-production',
      'bstp-cms-prod-v3',
      'em-global-prod-3pp',
      'em-global-prod-eom',
      'em-global-prod-flowe',
      'em-global-prod',
      'em-prod-3pp',
      'em-prod-eom',
      'em-prod-flowe',
      'em-prod',
      'etiyamobile-production',
      'etiyamobile-prod'
    ],

    // Service patterns to monitor (from production_services.txt)
    servicePatterns: [
      'rim', 'pcm', 'ntf', 'crm', 'eom', 'fstp',
      'api', 'gateway', 'auth', 'payment', 'subscription'
    ],

    // Cluster info
    cluster: process.env.CLUSTER_NAME || 'production-cluster',
    checkType: 'scheduled' // Indicates this is a scheduled check
  },

  // Metadata
  metadata: {
    requestId: requestId,
    source: 'Scheduler Tempo Analysis Flow',
    automated: true,
    schedulerVersion: '2.0-tempo',
    nextRun: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // Next 30 min
    runNumber: Math.floor(now / (30 * 60)) // Approximate run counter
  },

  // Priority for scheduled checks
  priority: 'normal',

  // Don't force deep analysis for routine checks (only if errors found)
  forceDeepAnalysis: false,

  // Search filters (can be customized)
  searchFilters: {
    // Minimum error threshold for Stage 2 trigger
    minErrorCount: 5,

    // Error status code threshold
    minStatusCode: 400, // HTTP 4xx and 5xx errors

    // Service criticality threshold
    minServiceCriticality: 'medium'
  },

  // Trace analysis settings
  traceSettings: {
    // Look for errors with status.code >= 400
    errorStatusThreshold: 400,

    // Minimum span duration for performance issues (ms)
    slowSpanThreshold: 1000,

    // Service dependency depth
    maxDependencyDepth: 5
  }
};

console.log("=== PREPARE TEMPOFLOW INPUT ===");
console.log("Request ID:", requestId);
console.log("Time Range:", new Date(oneHourAgo * 1000).toISOString(), "to", new Date(now * 1000).toISOString());
console.log("Namespaces:", tempoFlowInput.context.namespaces.length);
console.log("Priority:", tempoFlowInput.priority);
console.log("==============================");

return {
  json: tempoFlowInput
};
