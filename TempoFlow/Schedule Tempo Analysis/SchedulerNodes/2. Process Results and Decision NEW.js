// Process Results & Decision Node - TempoFlow Version
// Purpose:
// 1. Process TempoFlow analysis results (from Node 10 - Generate Jira Ticket)
// 2. Generate fingerprint for deduplication (cascade/dependency aware)
// 3. Prepare Jira ticket data
// 4. Decide if Jira ticket should be created

// Simple hash function for n8n compatibility (no crypto module needed)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(16, '0').substring(0, 16);
}

// Get TempoFlow analysis result (from Node 10 - Generate Jira Ticket)
const analysisResult = $input.item.json;

// Extract key information from TempoFlow output
// Node 10 adds jiraTicket field to Node 9's complete output
const jiraTicketFromNode10 = analysisResult.jiraTicket || {}; // CRITICAL: This is from Node 10
const healthCheck = analysisResult.healthCheck || {};
const serviceAnalysis = analysisResult.serviceAnalysis || {};
const deepAnalysis = analysisResult.deepAnalysis || {};
const executiveSummary = analysisResult.executiveSummary || {};

// Extract critical data
const errorCount = healthCheck.errorCount || healthCheck.errorReconciliation?.totalAfterDeepAnalysis || 0;
const affectedServices = serviceAnalysis.servicesAnalyzed || [];
const cascadeFailures = deepAnalysis.findings?.service_dependencies?.cascade_failures || [];
const failedChains = deepAnalysis.findings?.service_dependencies?.failed_chains || [];
const rootCause = deepAnalysis.rootCause || {};
const recommendations = deepAnalysis.recommendations || {};
const impactScore = serviceAnalysis.impactScore || 0;
const criticalPathAffected = serviceAnalysis.criticalPathAffected || false;

console.log("=== PROCESS TEMPOFLOW RESULTS ===");
console.log("Workflow Execution ID:", analysisResult.workflowExecutionId);
console.log("jiraTicketFromNode10:", JSON.stringify(jiraTicketFromNode10).substring(0, 200));
console.log("Error Count:", errorCount);
console.log("Affected Services:", affectedServices.length);
console.log("Cascade Failures:", cascadeFailures.length);
console.log("Failed Chains:", failedChains.length);
console.log("Critical Path Affected:", criticalPathAffected);

// ============= FINGERPRINT GENERATION (STABLE DEDUPLICATION) =============
// TempoFlow Strategy: Use ROOT CAUSE + ORIGIN SERVICE
// Why: Root cause is the most stable identifier for tracing issues
// Cascade failures and dependency chains change, but root cause stays consistent

// 1. Determine PRIMARY ISSUE TYPE from root cause or cascade failures
let primaryIssueType = 'unknown-issue';
let originService = 'unknown-service';

// Priority 1: Root cause analysis (most reliable)
if (rootCause && rootCause.primary_cause) {
  primaryIssueType = rootCause.primary_cause;
  originService = rootCause.service_root || 'unknown-service';
}
// Priority 2: Cascade failure origin (clear starting point)
else if (cascadeFailures && cascadeFailures.length > 0) {
  const primaryCascade = cascadeFailures[0]; // First cascade failure
  primaryIssueType = `cascade-${primaryCascade.pattern || 'failure'}`;
  originService = primaryCascade.origin || 'unknown-service';
}
// Priority 3: Failed dependency chain (failure point)
else if (failedChains && failedChains.length > 0) {
  const primaryChain = failedChains[0]; // First failed chain
  primaryIssueType = `chain-${primaryChain.error_type || 'failure'}`;
  originService = primaryChain.failure_point || 'unknown-service';
}
// Priority 4: Service with most errors
else if (serviceAnalysis.errorsByService) {
  const services = Object.entries(serviceAnalysis.errorsByService)
    .sort(([, a], [, b]) => (b.errorCount || 0) - (a.errorCount || 0));
  if (services.length > 0) {
    originService = services[0][0];
    primaryIssueType = `error-spike`;
  }
}

// 2. Normalize PRIMARY ISSUE TYPE (consistent format)
const normalizedIssueType = primaryIssueType
  .toLowerCase()
  .split(' ')
  .slice(0, 5)  // First 5 words only
  .join(' ')
  .replace(/[^a-z0-9\s-]/g, '');  // Remove special chars, keep hyphens

// 3. Create STABLE fingerprint (ignores severity changes and service spread)
const fingerprintData = {
  issueType: normalizedIssueType,
  originService: originService
  // ❌ error count REMOVED (fluctuates)
  // ❌ severity REMOVED (can escalate)
  // ❌ affected services list REMOVED (can spread)
  // ❌ cascade count REMOVED (can grow)
};

// Generate fingerprint using simple hash
const fingerprint = simpleHash(JSON.stringify(fingerprintData));

console.log("=== FINGERPRINT GENERATION ===");
console.log("Primary Issue Type:", primaryIssueType);
console.log("Origin Service:", originService);
console.log("Normalized:", normalizedIssueType);
console.log("Fingerprint Data:", fingerprintData);
console.log("Fingerprint:", fingerprint);

// ============= ALERT SUMMARY =============
// Determine severity from analysis
let overallSeverity = 'MEDIUM';
let isIncident = false;

if (criticalPathAffected || cascadeFailures.length > 0) {
  overallSeverity = 'HIGH';
  isIncident = true;
} else if (failedChains.length > 0 || errorCount > 20) {
  overallSeverity = 'MEDIUM';
  isIncident = errorCount > 50;
} else if (errorCount > 0) {
  overallSeverity = 'LOW';
}

const alertSummary = {
  alertId: analysisResult.workflowExecutionId || `tempo-${Date.now()}`,
  source: 'tempo-traces',
  title: jiraTicketFromNode10.title || 'Distributed Trace Analysis Alert',
  detectedAt: new Date().toISOString(),
  severity: overallSeverity,
  isIncident: isIncident,
  errorCount: errorCount,
  cascadeFailures: cascadeFailures.length,
  failedChains: failedChains.length,
  affectedServices: affectedServices.length,
  criticalPathAffected: criticalPathAffected,
  impactScore: impactScore
};

// ============= TRACE ANALYSIS DETAILS =============
const traceAnalysis = {
  analysisId: analysisResult.workflowExecutionId,
  workflowExecutionId: analysisResult.workflowExecutionId,
  timestamp: analysisResult.timestamp,

  serviceImpact: {
    totalServices: affectedServices.length,
    errorsByService: serviceAnalysis.errorsByService || {},
    criticalPathAffected: criticalPathAffected,
    affectedPath: serviceAnalysis.affectedPath || null
  },

  dependencyAnalysis: {
    cascadeFailures: cascadeFailures.map(cascade => ({
      origin: cascade.origin,
      affected: cascade.affected || [],
      pattern: cascade.pattern
    })),
    failedChains: failedChains.map(chain => ({
      chain: chain.chain || [],
      failurePoint: chain.failure_point,
      errorType: chain.error_type
    }))
  },

  rootCauseAnalysis: {
    primaryCause: rootCause.primary_cause || 'Unknown',
    serviceRoot: rootCause.service_root || 'Unknown',
    affectedChains: rootCause.affected_chains || [],
    contributingFactors: rootCause.contributing_factors || [],
    evidence: rootCause.evidence || []
  },

  metrics: {
    totalErrors: errorCount,
    impactScore: impactScore,
    confidenceLevel: executiveSummary.analysisQuality?.confidenceLevel || 0.5
  },

  actions: {
    immediate: recommendations.immediate_actions || [],
    shortTerm: recommendations.short_term || [],
    longTerm: recommendations.long_term || []
  }
};

// ============= DETERMINE IF JIRA TICKET NEEDED =============
function shouldCreateJiraTicket() {
  // Criteria for creating Jira ticket (TempoFlow-specific):

  // 0. Don't create ticket if system is healthy (user requirement)
  if (healthCheck && healthCheck.status === 'healthy') {
    console.log("System is healthy - skipping Jira ticket creation");
    return false;
  }

  // 1. Incident flag is set
  if (isIncident) return true;

  // 2. Critical path is affected
  if (criticalPathAffected) return true;

  // 3. Cascade failures detected (service propagation)
  if (cascadeFailures.length > 0) return true;

  // 4. Multiple dependency chain failures
  if (failedChains.length > 1) return true;

  // 5. High impact score
  if (impactScore >= 70) return true;

  // 6. Significant error count
  if (errorCount >= 50) return true;

  // 7. Critical services affected
  const criticalServices = ['api', 'gateway', 'auth', 'payment'];
  const hasCriticalService = affectedServices.some(service =>
    criticalServices.some(critical => service.toLowerCase().includes(critical))
  );
  if (hasCriticalService && errorCount > 0) return true;

  // 8. Has immediate actions (indicates actionable issue)
  if (recommendations.immediate_actions && recommendations.immediate_actions.length > 0) return true;

  // Otherwise, just monitor
  return false;
}

const needsJiraTicket = shouldCreateJiraTicket();

console.log("Needs Jira Ticket:", needsJiraTicket);

// ============= PREPARE OUTPUT =============
const output = {
  fingerprint: fingerprint, // CRITICAL: For Redis deduplication
  fingerprintData: fingerprintData, // For debugging

  needsJiraTicket: needsJiraTicket,

  alertSummary: alertSummary,

  traceAnalysis: traceAnalysis,

  // Direct access to jiraTicket (already formatted by Node 10)
  jiraTicketData: needsJiraTicket ? jiraTicketFromNode10 : null,

  // Pass through original analysis for downstream nodes
  originalAnalysis: analysisResult,

  // Debug info
  _debug: {
    fingerprintGenerated: fingerprint,
    issueType: fingerprintData.issueType,
    originService: fingerprintData.originService,
    decisionCriteria: {
      isIncident: isIncident,
      severity: overallSeverity,
      criticalPathAffected: criticalPathAffected,
      cascadeFailures: cascadeFailures.length,
      failedChains: failedChains.length,
      impactScore: impactScore,
      errorCount: errorCount,
      needsTicket: needsJiraTicket
    }
  }
};

console.log("=== OUTPUT PREPARED ===");
console.log("Decision: Create Ticket =", needsJiraTicket);
console.log("======================");

return { json: output };
