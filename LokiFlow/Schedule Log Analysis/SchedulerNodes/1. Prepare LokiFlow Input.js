// Prepare LokiFlow Input Node
// Purpose: Converts Schedule Trigger empty input to LokiFlow required format
// Position: Between "Schedule Trigger" and "Execute LokiFlow Analysis"

const now = Math.floor(Date.now() / 1000);
const oneHourAgo = now - 3600; // 1 hour lookback for scheduled checks

// Generate unique request ID
const requestId = `lokiflow-scheduled-${now}-${Math.random().toString(36).substring(7)}`;

// Prepare input for LokiFlow
const lokiFlowInput = {
  // Time range (Unix timestamps in seconds)
  startTime: oneHourAgo,
  endTime: now,

  // Context for LokiFlow
  context: {
    source: {
      type: 'scheduler',
      trigger: 'periodic_log_check',
      interval: '50m' // Matches scheduler trigger interval
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
    source: 'Scheduler Log Analysis Flow',
    automated: true,
    schedulerVersion: '2.0-loki',
    nextRun: new Date(Date.now() + 50 * 60 * 1000).toISOString(), // Next 50 min
    runNumber: Math.floor(now / (50 * 60)) // Approximate run counter
  },

  // Priority for scheduled checks
  priority: 'normal',

  // Don't force deep analysis for routine checks (only if errors found)
  forceDeepAnalysis: false,

  // Search filters (can be customized)
  searchFilters: {
    // Look for errors and warnings
    logLevels: ['error', 'ERROR', 'warning', 'WARNING'],

    // Minimum error rate to trigger analysis (0.5% = 0.005)
    minErrorRate: 0.005,

    // Minimum error count to trigger deeper analysis
    minErrorCount: 10
  }
};

console.log("=== PREPARE LOKIFLOW INPUT ===");
console.log("Request ID:", requestId);
console.log("Time Range:", new Date(oneHourAgo * 1000).toISOString(), "to", new Date(now * 1000).toISOString());
console.log("Namespaces:", lokiFlowInput.context.namespaces.length);
console.log("Priority:", lokiFlowInput.priority);
console.log("==============================");

return {
  json: lokiFlowInput
};
