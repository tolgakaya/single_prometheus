// Update Jira Comment Node
// Purpose: Prepare comment text for existing Jira tickets
// This node runs for EXISTING alerts (dedupStatus = 'existing')

const alert = $input.item.json;

// Validate we have existing ticket info
if (!alert.existingTicket || !alert.existingTicket.key) {
  throw new Error('No existing ticket found! This node should only run for existing alerts.');
}

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
const severityChanged = alert.existingTicket.previousSeverity !== alert.alertSummary.severity;

// Build comment
const updateComment = `
## 🔄 Alert Recurrence Update

**Occurrence #${occurrenceCount}**  
**Time Since Last Seen:** ${formatDuration(timeSinceLastSeen)}  
**Time Since First Seen:** ${formatDuration(timeSinceFirstSeen)}  
**Frequency:** ~${frequencyPerHour.toFixed(1)} per hour

### 📊 Current Status
- **Pattern**: Recurring (${occurrenceCount} times)
- **Severity**: ${alert.alertSummary.severity}${severityChanged ? ` (changed from ${alert.existingTicket.previousSeverity})` : ''}
- **Component**: ${alert.kubernetesAnalysis?.deployment || 'unknown'}
- **Namespace**: ${alert.kubernetesAnalysis?.namespace || 'unknown'}

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
Severity changed from **${alert.existingTicket.previousSeverity}** to **${alert.alertSummary.severity}**
` : ''}

### 🎯 Root Cause (Current Analysis)
**Component**: ${alert.kubernetesAnalysis?.deployment || 'Unknown'}  
**Issue**: ${alert.alertSummary.identifiedIssue}  
**Confidence**: ${Math.round((alert.kubernetesAnalysis?.confidence || 0) * 100)}%

### 🔧 Recommended Actions
${alert.kubernetesAnalysis?.actions?.length > 0 ? 
  alert.kubernetesAnalysis.actions.slice(0, 3).map((action, idx) => 
    `${idx + 1}. **${action.action}**\n   - Command: \`${action.command}\`\n   - Risk: ${action.risk}\n   - ETA: ${action.estimated_time || 'Unknown'}`
  ).join('\n\n') 
  : 'No automated actions available - manual investigation required'}

### 📈 Metrics
- **Active Alerts**: ${alert.kubernetesAnalysis?.metrics?.alertsActive || 0}
- **Critical Alerts**: ${alert.kubernetesAnalysis?.metrics?.alertsCritical || 0}
- **Overall Confidence**: ${Math.round((alert.kubernetesAnalysis?.metrics?.overallConfidence || 0) * 100)}%

### 🔍 Latest Evidence
${alert.kubernetesAnalysis?.evidence?.length > 0 ?
  alert.kubernetesAnalysis.evidence.slice(0, 3).map((ev, idx) =>
    `${idx + 1}. **${ev.issue || 'Issue'}** (${ev.severity})\n   ${ev.evidence?.slice(0, 2).map(e => `- ${e}`).join('\n   ') || ''}`
  ).join('\n\n')
  : 'No diagnostic evidence in current analysis'}

### 📋 Analysis Details
- **Context ID**: ${alert.kubernetesAnalysis?.contextId || 'N/A'}
- **Fingerprint**: ${alert.fingerprint}
- **Updated At**: ${new Date().toISOString()}

---
*🤖 Automated Update - Scheduler Cluster Health Flow*
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
      updatedAt: new Date().toISOString()
    }
  }
};
