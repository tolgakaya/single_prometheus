// Update Jira Comment Node - LokiFlow Version
// Purpose: Prepare comment text for existing Jira tickets (multi-problem aware)
// This node runs for EXISTING alerts (dedupStatus = 'existing')

const alert = $input.item.json;

// Validate we have existing ticket info
if (!alert.existingTicket || !alert.existingTicket.key) {
  throw new Error('No existing ticket found! This node should only run for existing alerts.');
}

// Extract data from LokiFlow analysis
const logAnalysis = alert.logAnalysis || {};
const alertSummary = alert.alertSummary || {};
const originalAnalysis = alert.originalAnalysis || {};

// Get multi-problem issues
const issues = logAnalysis.issues || [];
const affectedServices = originalAnalysis.consolidatedFindings?.affectedServices || [];

// ============= BUILD UPDATE COMMENT =============

const occurrenceCount = alert.metrics?.totalOccurrences || alert.existingTicket.occurrences || 1;
const timeSinceLastSeen = alert.metrics?.timeSinceLastSeen || 0;
const timeSinceFirstSeen = alert.metrics?.timeSinceFirstSeen || 0;
const frequencyPerHour = alert.metrics?.frequencyPerHour || 0;

// Format time durations
function formatDuration(seconds) {
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  return `${Math.round(seconds / 86400)} days`;
}

// Determine if escalation is needed
const needsEscalation = alert.actions?.escalate || false;
const severityChanged = alert.existingTicket.previousSeverity !== alertSummary.severity;

// Build multi-problem summary
function buildIssuesSummary(issues) {
  if (issues.length === 0) return 'No specific issues identified in this occurrence';

  if (issues.length === 1) {
    const issue = issues[0];
    return `
**Issue**: ${issue.type}
**Affected Services**: ${issue.services.join(', ') || 'unknown'}
**Stage Detected**: ${issue.stage}
**Evidence Count**: ${issue.evidenceCount}${issue.occurrences ? `  \n**Occurrences**: ${issue.occurrences}` : ''}
`;
  }

  // Multiple issues
  return issues.map((issue, idx) => `
### Issue ${idx + 1}: ${issue.type}
- **Affected Services**: ${issue.services.join(', ') || 'unknown'}
- **Severity**: ${issue.severity}
- **Stage Detected**: ${issue.stage}
- **Evidence Count**: ${issue.evidenceCount}${issue.occurrences ? `\n- **Occurrences**: ${issue.occurrences}` : ''}
`).join('\n');
}

// Build comment
const updateComment = `
## 🔄 Log Analysis Recurrence Update

**Occurrence #${occurrenceCount}**
**Time Since Last Seen:** ${formatDuration(timeSinceLastSeen)}
**Time Since First Seen:** ${formatDuration(timeSinceFirstSeen)}
**Frequency:** ~${frequencyPerHour.toFixed(1)} per hour

### 📊 Current Status
- **Pattern**: Recurring (${occurrenceCount} times)
- **Analysis Type**: ${alertSummary.isIncident ? 'Incident' : 'Log Analysis'}
- **Severity**: ${alertSummary.severity}${severityChanged ? ` (changed from ${alert.existingTicket.previousSeverity})` : ''}
- **Error Rate**: ${alertSummary.errorRate}%
- **Error Count**: ${alertSummary.errorCount}
- **Issues Identified**: ${issues.length}
- **Services Affected**: ${affectedServices.length}

${occurrenceCount > 5 ? `
⚠️ **HIGH RECURRENCE WARNING**
This alert has recurred ${occurrenceCount} times. Consider root cause analysis and permanent fix.
` : ''}

${needsEscalation ? `
🔺 **ESCALATION REQUIRED**
Alert frequency exceeds acceptable threshold. Increasing priority.
` : ''}

${severityChanged ? `
⚡ **SEVERITY CHANGE**
Severity changed from **${alert.existingTicket.previousSeverity}** to **${alertSummary.severity}**
` : ''}

### 🔍 Identified Issues (Current Analysis)

${buildIssuesSummary(issues)}

### 🔧 Recommended Actions

${logAnalysis.actions?.immediate?.length > 0 ?
  logAnalysis.actions.immediate.slice(0, 3).map((action, idx) => {
    if (typeof action === 'object') {
      return `${idx + 1}. **${action.action || 'Action'}**
   - Command: \`${action.command || 'N/A'}\`
   - Risk: ${action.risk || 'Unknown'}
   - Expected Impact: ${action.impact || action.expected_outcome || 'N/A'}`;
    }
    return `${idx + 1}. ${action}`;
  }).join('\n\n')
  : 'No automated actions available - manual investigation required'}

### 📈 Metrics (Current Analysis)

- **Total Logs Analyzed**: ${logAnalysis.metrics?.totalLogs || 0}
- **Error Rate**: ${logAnalysis.metrics?.errorRate || 0}%
- **Error Count**: ${logAnalysis.metrics?.errorCount || 0}
- **Stages Executed**: ${logAnalysis.metrics?.stagesExecuted || 0}

### 🎯 Affected Services

${affectedServices.length > 0 ?
  affectedServices.slice(0, 10).map((svc, idx) => `${idx + 1}. ${svc}`).join('\n')
  : 'No services specifically identified'}
${affectedServices.length > 10 ? `\n...and ${affectedServices.length - 10} more` : ''}

### 📋 Analysis Details

- **Analysis ID**: ${logAnalysis.analysisId || 'N/A'}
- **Workflow Execution ID**: ${logAnalysis.workflowExecutionId || 'N/A'}
- **Fingerprint**: ${alert.fingerprint}
- **Time Range**: ${logAnalysis.timeRange?.start || 'N/A'} to ${logAnalysis.timeRange?.end || 'N/A'}
- **Duration**: ${logAnalysis.timeRange?.duration || 'N/A'}
- **Updated At**: ${new Date().toISOString()}

---
*🤖 Automated Update - Scheduler Log Analysis Flow (LokiFlow)*
`;

// ============= PREPARE OUTPUT =============
return {
  json: {
    ticketKey: alert.existingTicket.key,
    comment: updateComment,
    escalate: needsEscalation,
    severityChanged: severityChanged,

    // Pass through alert data
    alert: alert,

    // Metadata
    updateInfo: {
      occurrenceCount: occurrenceCount,
      timeSinceLastSeen: timeSinceLastSeen,
      needsEscalation: needsEscalation,
      issuesInCurrentAnalysis: issues.length,
      updatedAt: new Date().toISOString()
    }
  }
};
