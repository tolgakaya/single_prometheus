// Process Results & Decision Node - LokiFlow Version
// Purpose:
// 1. Process LokiFlow analysis results (from Node 17)
// 2. Generate fingerprint for deduplication (multi-problem aware)
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

// Get LokiFlow analysis result (from Node 17 - Generate Jira Ticket)
const analysisResult = $input.item.json;

// Extract key information from LokiFlow output
// Node 17 adds jiraTicket field to Node 16's complete output
const jiraTicketFromNode17 = analysisResult.jiraTicket || {}; // CRITICAL: This is from Node 17
const metadata = analysisResult.metadata || {};
const timeContext = analysisResult.timeContext || {};
const incidentEvaluation = analysisResult.incidentEvaluation || {};
const consolidatedFindings = analysisResult.consolidatedFindings || {};
const actionableInsights = analysisResult.actionableInsights || {};
const stageResults = analysisResult.stageResults || {};

// Extract critical data
const identifiedIssues = consolidatedFindings.identifiedIssues || [];
const affectedServices = consolidatedFindings.affectedServices || [];
const overallSeverity = incidentEvaluation.severity || 'NORMAL';
const isIncident = incidentEvaluation.isIncident || false;
const errorRate = parseFloat(incidentEvaluation.errorRate) || 0;
const errorCount = incidentEvaluation.errorCount || 0;

console.log("=== PROCESS LOKIFLOW RESULTS ===");
console.log("Analysis ID:", metadata.analysisId);
console.log("jiraTicketFromNode17:", JSON.stringify(jiraTicketFromNode17).substring(0, 200));
console.log("Issues Found:", identifiedIssues.length);
console.log("Severity:", overallSeverity);
console.log("Is Incident:", isIncident);
console.log("Error Rate:", errorRate);
console.log("Affected Services:", affectedServices.length);

// ============= FINGERPRINT GENERATION (STABLE DEDUPLICATION) =============
// Strategy: Use PRIMARY ISSUE + PRIMARY SERVICE only
// Why: Severity can escalate, services can spread, but core problem stays same
// This prevents duplicate tickets for the same underlying issue

// 1. Find PRIMARY ISSUE (highest count = dominant problem)
let primaryIssue = null;
if (identifiedIssues && identifiedIssues.length > 0) {
  // Sort by occurrenceCount (descending), then by severity if count is equal
  const sortedIssues = [...identifiedIssues].sort((a, b) => {
    const countA = a.occurrenceCount || a.count || 0;
    const countB = b.occurrenceCount || b.count || 0;
    const countDiff = countB - countA;
    if (countDiff !== 0) return countDiff;

    // If count is equal, prioritize by severity
    const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'UNKNOWN': 0 };
    return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
  });
  primaryIssue = sortedIssues[0];
}

// 2. Find PRIMARY SERVICE (from primary issue's affected services)
let primaryService = 'unknown-service';
if (primaryIssue && primaryIssue.affectedServices && primaryIssue.affectedServices.length > 0) {
  primaryService = primaryIssue.affectedServices[0];
} else if (affectedServices && affectedServices.length > 0) {
  primaryService = affectedServices[0];
}

// 3. Normalize PRIMARY ISSUE TYPE (consistent format)
const normalizedIssueType = (primaryIssue?.type || 'unknown-issue')
  .toLowerCase()
  .split(' ')
  .slice(0, 5)  // First 5 words only
  .join(' ')
  .replace(/[^a-z0-9\s]/g, '');  // Remove special chars

// 4. Create STABLE fingerprint (ignores severity, service list changes)
const fingerprintData = {
  issueType: normalizedIssueType,
  primaryService: primaryService
  // ❌ severity REMOVED (can escalate over time)
  // ❌ full service list REMOVED (can spread over time)
  // ❌ all issue types REMOVED (secondary issues can appear)
};

// Generate fingerprint using simple hash
const fingerprint = simpleHash(JSON.stringify(fingerprintData));

console.log("=== FINGERPRINT GENERATION ===");
console.log("Primary Issue:", primaryIssue?.type, "(count:", primaryIssue?.occurrenceCount || primaryIssue?.count || 0, ")");
console.log("Primary Service:", primaryService);
console.log("Fingerprint Data:", fingerprintData);
console.log("Fingerprint:", fingerprint);

// ============= ALERT SUMMARY =============
const alertSummary = {
  alertId: metadata.analysisId || `loki-${Date.now()}`,
  source: 'loki-logs',
  title: jiraTicketFromNode17.title || 'Log Analysis Alert',
  detectedAt: new Date().toISOString(),
  severity: overallSeverity,
  isIncident: isIncident,
  errorRate: errorRate,
  errorCount: errorCount,
  identifiedIssues: identifiedIssues.length,
  affectedServices: affectedServices.length
};

// ============= LOG ANALYSIS DETAILS =============
const logAnalysis = {
  analysisId: metadata.analysisId,
  workflowExecutionId: metadata.workflowExecutionId,
  timeRange: {
    start: timeContext.requestedRange?.start || 'N/A',
    end: timeContext.requestedRange?.end || 'N/A',
    duration: timeContext.requestedRange?.duration || 'N/A'
  },
  issues: identifiedIssues.map(issue => ({
    type: issue.type,
    services: issue.affectedServices || [],
    occurrences: issue.occurrenceCount || null,
    severity: issue.severity,
    stage: issue.stageDetected,
    evidenceCount: issue.evidence?.length || 0
  })),
  metrics: {
    errorRate: errorRate,
    errorCount: errorCount,
    totalLogs: stageResults.stage1?.metrics?.total_logs || 0,
    stagesExecuted: metadata.stagesExecuted || 3
  },
  actions: {
    immediate: actionableInsights.immediateActions || [],
    monitoringGaps: actionableInsights.monitoringGaps || [],
    processImprovements: actionableInsights.processImprovements || []
  }
};

// ============= DETERMINE IF JIRA TICKET NEEDED =============
function shouldCreateJiraTicket() {
  // Criteria for creating Jira ticket:

  // 1. Incident evaluation says yes
  if (isIncident) return true;

  // 2. High or Critical severity
  if (overallSeverity === 'HIGH' || overallSeverity === 'CRITICAL') return true;

  // 3. Error rate exceeds 2%
  if (errorRate >= 2.0) return true;

  // 4. Multiple issues identified
  if (identifiedIssues.length > 1) return true;

  // 5. Critical services affected
  const criticalServices = ['api', 'gateway', 'auth', 'payment'];
  const hasCriticalService = affectedServices.some(service =>
    criticalServices.some(critical => service.toLowerCase().includes(critical))
  );
  if (hasCriticalService && identifiedIssues.length > 0) return true;

  // 6. Has immediate actions (indicates actionable issue)
  if (actionableInsights.immediateActions && actionableInsights.immediateActions.length > 0) return true;

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

  logAnalysis: logAnalysis,

  // Direct access to jiraTicket (already formatted by Node 17)
  jiraTicketData: needsJiraTicket ? jiraTicketFromNode17 : null,

  // Pass through original analysis for downstream nodes
  originalAnalysis: analysisResult,

  // Debug info
  _debug: {
    fingerprintGenerated: fingerprint,
    issueTypesForFingerprint: fingerprintData.issueTypes,
    servicesForFingerprint: fingerprintData.services,
    decisionCriteria: {
      isIncident: isIncident,
      severity: overallSeverity,
      errorRate: errorRate,
      issuesCount: identifiedIssues.length,
      needsTicket: needsJiraTicket
    }
  }
};

console.log("=== OUTPUT PREPARED ===");
console.log("Decision: Create Ticket =", needsJiraTicket);
console.log("======================");

return { json: output };
