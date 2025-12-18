// Process Results & Decision Node - UPDATED VERSION
// Purpose: 
// 1. Process FreePrometheus analysis results
// 2. Generate fingerprint for deduplication
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

// Get FreePrometheus analysis result
const analysisResult = $input.item.json;

// Extract key information from FreePrometheus output
const executiveSummary = analysisResult.executiveSummary || {};
const findings = analysisResult.findings || {};
const stage1Results = analysisResult.stage1Results || {};
const actions = analysisResult.actions || {};
const metrics = analysisResult.metrics || {};
const contextTracking = analysisResult.contextTracking || {};

// ============= FINGERPRINT GENERATION =============
// Create unique fingerprint for deduplication based on root cause
const fingerprintData = {
  // Primary: Root cause component and issue type
  component: findings.rootCause?.component || 'unknown',
  issueType: (findings.rootCause?.issue || 'unknown').split(' ').slice(0, 3).join(' '), // First 3 words
  
  // Secondary: Context
  namespace: findings.affectedServices?.[0] || 'unknown',
  severity: executiveSummary.overallHealth || 'unknown'
};

// Generate fingerprint using simple hash (n8n compatible)
const fingerprint = simpleHash(JSON.stringify(fingerprintData));

// ============= ALERT SUMMARY =============
const alertSummary = {
  alertId: contextTracking.contextId || `alert-${Date.now()}`,
  source: analysisResult.cluster || 'kubernetes',
  title: findings.rootCause?.issue || 'Cluster Health Issue Detected',
  detectedAt: new Date().toISOString(),
  severity: executiveSummary.overallHealth || 'unknown',
  businessImpact: findings.rootCause?.impact || 'Service degradation detected',
  identifiedIssue: findings.rootCause?.issue || 'Issue under investigation'
};

// ============= KUBERNETES ANALYSIS =============
const kubernetesAnalysis = {
  contextId: contextTracking.contextId,
  confidence: findings.rootCause?.confidence || 0.5,
  deployment: findings.rootCause?.component || 'unknown',
  namespace: findings.affectedServices?.[0] || 'unknown',
  pod: findings.diagnosticEvidence?.[0]?.namespace || 'unknown',
  timeline: [],
  metrics: {
    alertsActive: executiveSummary.alertsActive || 0,
    alertsCritical: executiveSummary.alertsCritical || 0,
    issuesFound: executiveSummary.issuesFound || 0,
    stagesExecuted: executiveSummary.stagesExecuted || 0,
    overallConfidence: analysisResult.confidenceProgression?.overall_confidence || 0
  },
  evidence: findings.diagnosticEvidence || [],
  actions: actions.immediate || []
};

// ============= DETERMINE IF JIRA TICKET NEEDED =============
function shouldCreateJiraTicket(result, summary) {
  const severity = summary.overallHealth;
  const confidence = findings.rootCause?.confidence || 0;
  const alertsCritical = summary.alertsCritical || 0;
  const issuesFound = summary.issuesFound || 0;
  
  return (
    severity === 'critical' ||
    severity === 'degraded' ||
    alertsCritical > 0 ||
    issuesFound > 0 ||
    confidence >= 0.7 ||
    (actions.immediate && actions.immediate.length > 0)
  );
}

const needsJiraTicket = shouldCreateJiraTicket(analysisResult, executiveSummary);

// ============= PREPARE JIRA TICKET DATA =============
function prepareJiraTicketData(result) {
  // ÖNCE: Yeni Final Report format'ını kontrol et (jiraTicket field)
  if (result.jiraTicket) {
    // ✅ YENİ FORMAT VAR - Direkt kullan!
    console.log('✅ Using new Final Report jiraTicket format');

    return {
      project: 'INCIDENT',
      issueType: result.jiraTicket.issueType || 'Incident',
      summary: result.jiraTicket.title, // Pre-formatted with HTML styling
      description: result.jiraTicket.description, // HTML/CSS formatted!
      priority: mapJiraPriorityNameToId(result.jiraTicket.priority), // "Critical" -> Jira ID
      labels: buildLabelsWithKBInsights(result),
      components: findings.affectedServices || [],
      customFields: buildCustomFieldsWithOncall(result),
      duedate: calculateDueDateFromPriority(result.jiraTicket.priority),
      environment: determineEnvironment(findings.affectedServices?.[0])
    };
  }

  // FALLBACK: Eski format (backwards compatibility)
  console.log('⚠️ Using legacy Jira ticket format (new format not found)');

  const title = `[${stage1Results.alerts?.top_alerts?.[0] || 'Health Check'}] ${findings.rootCause?.component || 'Cluster'} - ${findings.rootCause?.issue || 'Investigation Required'}`;

  // Build description from analysis summary
  const description = buildJiraDescription(result);

  // Map severity to Jira priority
  const priority = mapSeverityToJiraPriority(executiveSummary.overallHealth);

  // Build labels
  const labels = [
    'kubernetes',
    'auto-generated',
    'scheduler',
    `severity-${executiveSummary.overallHealth}`,
    `confidence-${Math.round((findings.rootCause?.confidence || 0.5) * 100)}`,
    contextTracking.contextId ? `context-${contextTracking.contextId}` : null
  ].filter(Boolean);

  // Components
  const components = findings.affectedServices || [];

  return {
    project: 'INCIDENT',
    issueType: 'Incident',
    summary: title,
    description: description,
    priority: priority,
    labels: labels,
    components: components,
    customFields: {
      'customfield_10001': contextTracking.contextId,
      'customfield_10002': findings.rootCause?.confidence || 0,
      'customfield_10003': findings.affectedServices?.[0] || 'unknown',
      'customfield_10004': findings.diagnosticEvidence?.[0]?.namespace || 'unknown',
      'customfield_10005': findings.rootCause?.issue || 'Under investigation',
      'customfield_10006': actions.immediate?.[0]?.command || '',
      'customfield_10007': executiveSummary.stagesExecuted || 0,
      'customfield_10008': new Date().toISOString()
    },
    duedate: calculateDueDate(executiveSummary.overallHealth),
    environment: determineEnvironment(findings.affectedServices?.[0])
  };
}

// Helper: Map priority name to Jira priority ID
function mapJiraPriorityNameToId(priorityName) {
  const mapping = {
    'Critical': 'Highest',
    'High': 'High',
    'Medium': 'Medium',
    'Low': 'Low'
  };
  return mapping[priorityName] || 'Medium';
}

// Helper: Build labels with KB insights
function buildLabelsWithKBInsights(result) {
  const labels = [
    'kubernetes',
    'auto-generated',
    'scheduler',
    `severity-${executiveSummary.overallHealth || 'unknown'}`
  ];

  // Add KB insights if available
  if (result.knowledgeBaseInsights) {
    labels.push(`category-${result.knowledgeBaseInsights.alertCategory}`);
    labels.push(`urgency-${result.knowledgeBaseInsights.urgencyLevel}`);
    labels.push(`cascade-risk-${result.knowledgeBaseInsights.cascadeRisk}`);
  }

  // Add confidence
  const confidence = findings.rootCause?.confidence || result.confidenceProgression?.overall_confidence || 0;
  labels.push(`confidence-${Math.round(confidence * 100)}`);

  // Add context ID
  if (contextTracking.contextId) {
    labels.push(`context-${contextTracking.contextId}`);
  }

  return labels.filter(Boolean);
}

// Helper: Build custom fields with oncall data
function buildCustomFieldsWithOncall(result) {
  // Önce oncallTicket custom fields'ını kontrol et
  if (result.oncallTicket?.customFields) {
    return {
      'customfield_10001': result.oncallTicket.customFields.contextId || contextTracking.contextId,
      'customfield_10002': result.confidenceProgression?.overall_confidence || findings.rootCause?.confidence || 0,
      'customfield_10003': findings.affectedServices?.[0] || 'unknown',
      'customfield_10004': result.oncallTicket.customFields.symptoms || executiveSummary.alertsActive || 0,
      'customfield_10005': result.oncallTicket.customFields.rootCause || findings.rootCause?.issue || 'Under investigation',
      'customfield_10006': result.executiveSummary?.quickActions?.rollback || actions.immediate?.[0]?.command || '',
      'customfield_10007': executiveSummary.stagesExecuted || 0,
      'customfield_10008': new Date().toISOString(),
      'customfield_10009': result.oncallTicket.customFields.oncallFriendly || false
    };
  }

  // Fallback: Legacy custom fields
  return {
    'customfield_10001': contextTracking.contextId,
    'customfield_10002': findings.rootCause?.confidence || 0,
    'customfield_10003': findings.affectedServices?.[0] || 'unknown',
    'customfield_10004': findings.diagnosticEvidence?.[0]?.namespace || 'unknown',
    'customfield_10005': findings.rootCause?.issue || 'Under investigation',
    'customfield_10006': actions.immediate?.[0]?.command || '',
    'customfield_10007': executiveSummary.stagesExecuted || 0,
    'customfield_10008': new Date().toISOString()
  };
}

// Helper: Calculate due date from priority name
function calculateDueDateFromPriority(priorityName) {
  const now = new Date();
  const hoursToAdd = {
    'Critical': 4,
    'High': 24,
    'Medium': 72,
    'Low': 168
  };

  now.setHours(now.getHours() + (hoursToAdd[priorityName] || 72));
  return now.toISOString().split('T')[0];
}

function buildJiraDescription(result) {
  return `
# Kubernetes Cluster Health Report

## 📊 Executive Summary
- **Overall Health**: ${executiveSummary.overallHealth || 'unknown'}
- **Context ID**: ${contextTracking.contextId}
- **Analysis Duration**: ${analysisResult.duration || 'N/A'}
- **Stages Executed**: ${executiveSummary.stagesExecuted || 0}
- **Overall Confidence**: ${Math.round((analysisResult.confidenceProgression?.overall_confidence || 0) * 100)}%

## 🎯 Root Cause Analysis
${findings.rootCause?.identified ? '✅ **Root Cause Identified**' : '⚠️ **Root Cause Under Investigation**'}

**Component**: ${findings.rootCause?.component || 'Unknown'}
**Issue**: ${findings.rootCause?.issue || 'Under investigation'}
**Confidence**: ${Math.round((findings.rootCause?.confidence || 0) * 100)}%

### Evidence
${findings.rootCause?.evidence?.map((e, i) => `${i + 1}. ${e}`).join('\n') || 'No evidence available'}

## 🚨 Active Alerts
- **Total**: ${executiveSummary.alertsActive || 0}
- **Critical**: ${executiveSummary.alertsCritical || 0}
- **Top Alerts**: ${stage1Results.alerts?.top_alerts?.join(', ') || 'None'}

## 🔧 Affected Services
${findings.affectedServices?.map((s, i) => `${i + 1}. ${s}`).join('\n') || 'None identified'}

## 💡 Recommended Actions

### Immediate Actions
${actions.immediate?.map((action, idx) => 
  `${idx + 1}. **${action.action}**\n   - Command: \`${action.command}\`\n   - Risk: ${action.risk}\n   - ETA: ${action.estimated_time || 'Unknown'}\n   - Expected Outcome: ${action.expected_outcome || 'N/A'}`
).join('\n\n') || 'No immediate actions recommended'}

### Short-term Actions
${actions.shortTerm?.map((action, idx) => 
  `${idx + 1}. ${action.action} (${action.timeline})\n   ${action.details || ''}`
).join('\n') || 'None'}

### Long-term Solutions
${actions.longTerm?.map((action, idx) => 
  `${idx + 1}. ${action.action} (${action.timeline})\n   ${action.details || ''}`
).join('\n') || 'None'}

## 📈 SLO Impact
${findings.sloImpact?.availability_slo ? `
- **Target**: ${findings.sloImpact.availability_slo.target}
- **Current**: ${findings.sloImpact.availability_slo.current}
- **Error Budget Used**: ${findings.sloImpact.availability_slo.error_budget_used}
- **Status**: ${findings.sloImpact.availability_slo.status}
` : 'No SLO impact data available'}

## 🔍 Diagnostic Evidence
${findings.diagnosticEvidence?.map((diag, idx) => 
  `### Issue ${idx + 1}: ${diag.issue}\n` +
  `**Severity**: ${diag.severity}\n` +
  `**Impact**: ${diag.impact}\n` +
  `**Evidence**:\n${diag.evidence?.map(e => `- ${e}`).join('\n')}\n`
).join('\n') || 'No diagnostic evidence available'}

---
**Generated**: ${new Date().toISOString()}
**Source**: Scheduler Cluster Health Flow
**Context ID**: ${contextTracking.contextId}
**Fingerprint**: ${fingerprint}
`;
}

function mapSeverityToJiraPriority(severity) {
  const mapping = {
    'critical': 'Highest',
    'degraded': 'High',
    'warning': 'Medium',
    'healthy': 'Low',
    'unknown': 'Medium'
  };
  return mapping[severity] || 'Medium';
}

function calculateDueDate(severity) {
  const now = new Date();
  const hoursToAdd = {
    'critical': 4,
    'degraded': 24,
    'warning': 72,
    'healthy': 168
  };
  
  now.setHours(now.getHours() + (hoursToAdd[severity] || 72));
  return now.toISOString().split('T')[0];
}

function determineEnvironment(namespace) {
  if (!namespace) return 'Unknown';
  if (namespace.includes('production') || namespace.includes('prod')) return 'Production';
  if (namespace.includes('staging')) return 'Staging';
  if (namespace.includes('dev')) return 'Development';
  return 'Unknown';
}

// ============= PREPARE OUTPUT =============
const output = {
  fingerprint: fingerprint, // CRITICAL: For Redis deduplication
  fingerprintData: fingerprintData, // For debugging
  
  needsJiraTicket: needsJiraTicket,
  
  alertSummary: alertSummary,
  
  kubernetesAnalysis: kubernetesAnalysis,
  
  report: analysisResult.summary || buildJiraDescription(analysisResult),
  
  jiraTicketData: needsJiraTicket ? prepareJiraTicketData(analysisResult) : null,
  
  // Pass through original analysis for downstream nodes
  originalAnalysis: analysisResult
};

return { json: output };
