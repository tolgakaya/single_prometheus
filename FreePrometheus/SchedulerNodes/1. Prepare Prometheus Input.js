// Prepare Prometheus Input Node
// Purpose: Converts Schedule Trigger empty input to FreePrometheus Flow required format
// Position: Between "Schedule Trigger" and "Execute Prometheus Analysis"

const now = Math.floor(Date.now() / 1000);
const oneHourAgo = now - 3600; // 1 hour lookback for scheduled checks

// Generate unique request ID
const requestId = `scheduled-${now}-${Math.random().toString(36).substring(7)}`;

// Prepare orchestrator input for FreePrometheus Flow
const orchestratorInput = {
  requestId: requestId,
  orchestratorId: `scheduler-health-check-${now}`,
  timestamp: new Date().toISOString(),
  requestType: 'scheduled_health_check',
  
  // Time range for analysis (last 1 hour)
  timeRange: {
    start: oneHourAgo,
    end: now,
    duration: '1h'
  },
  
  // Context for FreePrometheus Flow
  context: {
    source: {
      type: 'scheduler',
      trigger: 'periodic_check',
      interval: '15m'
    },
    // Default namespaces to check (can be customized)
    namespaces: [
      'bstp-cms-global-production',
      'em-control-plane-prod',
      'production'
    ],
    // Cluster info (can be customized based on your setup)
    cluster: process.env.CLUSTER_NAME || 'production-cluster',
    checkType: 'comprehensive' // or 'quick', 'critical-only'
  },
  
  // Metadata
  metadata: {
    scheduler: {
      version: '1.0',
      nextRun: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // Next 15 min
      runNumber: Math.floor(now / (15 * 60)), // Approximate run counter
    },
    source: 'Scheduler Cluster Health Flow',
    automated: true
  },
  
  // Priority (normal for scheduled checks, critical for manual triggers)
  priority: 'normal',
  
  // Force deep analysis for scheduled checks
  forceDeepAnalysis: false // Set true if you want full 6-stage analysis every time
};

return {
  json: {
    orchestratorInput: orchestratorInput,
    schedulerInfo: {
      triggeredAt: new Date().toISOString(),
      requestId: requestId,
      checkInterval: '15m'
    }
  }
};
