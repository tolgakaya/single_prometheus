// Prepare Notification Node - LokiFlow Version
// Purpose: Prepare final notification data for Slack, Teams, Email, etc.
// This node runs AFTER Jira ticket creation/update

// Get data from previous nodes
const processedData = $node["Process Results & Decision"]?.json;

// Try to get Jira ticket info (may come from Create Jira Incident or Update Jira Comment)
let jiraTicket = null;
let jiraOperation = 'none';

try {
  // Check if we created a new ticket
  const createJiraNode = $node["Create Jira Incident"]?.json;
  if (createJiraNode && createJiraNode.key) {
    jiraTicket = createJiraNode;
    jiraOperation = 'created';
  }
} catch (e) {
  // Ticket not created
}

try {
  // Check if we updated an existing ticket
  const updateJiraNode = $node["Update Jira Comment"]?.json;
  if (updateJiraNode && updateJiraNode.ticketKey) {
    jiraTicket = {
      key: updateJiraNode.ticketKey,
      id: updateJiraNode.alert?.existingTicket?.id
    };
    jiraOperation = 'updated';
  }
} catch (e) {
  // Ticket not updated
}

// Get original analysis result from Process Results & Decision
const originalAnalysis = processedData?.originalAnalysis || {};
const logAnalysis = processedData?.logAnalysis || {};
const alertSummary = processedData?.alertSummary || {};
const consolidatedFindings = originalAnalysis.consolidatedFindings || {};
const incidentEvaluation = originalAnalysis.incidentEvaluation || {};

// Multi-problem data
const identifiedIssues = consolidatedFindings.identifiedIssues || [];
const affectedServices = consolidatedFindings.affectedServices || [];

// ============= PREPARE NOTIFICATION DATA =============

const notification = {
  timestamp: new Date().toISOString(),
  status: 'completed',

  // Alert information
  alert: {
    id: alertSummary.alertId || 'unknown',
    source: alertSummary.source || 'loki-logs',
    title: alertSummary.title || 'Unknown Alert',
    severity: alertSummary.severity || 'NORMAL',
    isIncident: alertSummary.isIncident || false,
    errorRate: alertSummary.errorRate || 0,
    errorCount: alertSummary.errorCount || 0,
    fingerprint: processedData?.fingerprint || 'unknown',
    dedupStatus: processedData?.dedupStatus || 'unknown'
  },

  // Log analysis report summary
  logAnalysisReport: {
    analysisId: logAnalysis.analysisId || 'N/A',
    workflowExecutionId: logAnalysis.workflowExecutionId || 'N/A',
    title: alertSummary.title || 'Log Analysis Alert',
    severity: alertSummary.severity || 'NORMAL',
    isIncident: alertSummary.isIncident || false,
    issuesIdentified: identifiedIssues.length,
    affectedServicesCount: affectedServices.length,
    affectedServices: affectedServices,
    errorRate: alertSummary.errorRate || 0,
    errorCount: alertSummary.errorCount || 0,
    hasImmediateActions: logAnalysis.actions?.immediate?.length > 0,
    stagesExecuted: logAnalysis.metrics?.stagesExecuted || 0,
    totalLogsAnalyzed: logAnalysis.metrics?.totalLogs || 0
  },

  // Multi-problem issues summary
  issues: identifiedIssues.map(issue => ({
    type: issue.type,
    services: issue.affectedServices || [],
    severity: issue.severity,
    stage: issue.stageDetected,
    evidenceCount: issue.evidence?.length || 0,
    occurrences: issue.occurrenceCount || null
  })),

  // Jira ticket information
  jiraTicket: jiraTicket ? {
    operation: jiraOperation, // 'created', 'updated', or 'none'
    key: jiraTicket.key,
    url: `https://your-jira.atlassian.net/browse/${jiraTicket.key}`,
    id: jiraTicket.id || null
  } : {
    operation: 'none',
    reason: processedData?.needsJiraTicket
      ? 'Failed to create/update ticket'
      : 'Severity threshold not met'
  },

  // Formatted notifications for different channels
  formats: {
    // Slack notification format
    slack: generateSlackNotification(processedData, originalAnalysis, identifiedIssues, affectedServices, jiraTicket, jiraOperation),

    // Chat summary (for Teams, etc.)
    chatSummary: generateChatSummary(processedData, originalAnalysis, identifiedIssues, affectedServices, jiraTicket, jiraOperation),

    // Markdown report (if available)
    markdown: originalAnalysis.htmlContent || 'No detailed report available'
  },

  // Summary text
  summary: generateSummary(processedData, originalAnalysis, identifiedIssues, jiraTicket, jiraOperation)
};

// ============= HELPER FUNCTIONS =============

function generateSlackNotification(processedData, originalAnalysis, issues, services, jiraTicket, jiraOperation) {
  const severity = processedData?.alertSummary?.severity || 'NORMAL';
  const isIncident = processedData?.alertSummary?.isIncident || false;

  const severityEmoji = {
    'CRITICAL': '🔴',
    'HIGH': '🟠',
    'WARNING': '🟡',
    'MEDIUM': '🟡',
    'NORMAL': '🟢',
    'LOW': '🟢'
  };

  const emoji = severityEmoji[severity] || '⚪';

  return {
    text: `${emoji} Log Analysis Alert: ${processedData?.alertSummary?.title}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} ${isIncident ? 'INCIDENT' : 'LOG ANALYSIS'}: ${severity}`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Severity:*\n${severity}`
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n${jiraOperation === 'created' ? 'New Alert' : jiraOperation === 'updated' ? 'Recurring Alert' : 'Monitored'}`
          },
          {
            type: 'mrkdwn',
            text: `*Error Rate:*\n${processedData?.alertSummary?.errorRate || 0}%`
          },
          {
            type: 'mrkdwn',
            text: `*Issues:*\n${issues.length}`
          }
        ]
      },
      ...(issues.length > 0 ? [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Identified Issues:*\n${issues.slice(0, 3).map((issue, idx) =>
            `${idx + 1}. ${issue.type} (${issue.services.slice(0, 2).join(', ')})`
          ).join('\n')}${issues.length > 3 ? `\n...and ${issues.length - 3} more` : ''}`
        }
      }] : []),
      ...(jiraTicket ? [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Jira Ticket:* <https://your-jira.atlassian.net/browse/${jiraTicket.key}|${jiraTicket.key}> (${jiraOperation})`
        }
      }] : []),
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Analysis ID: ${processedData?.logAnalysis?.analysisId || 'N/A'} | Services: ${services.length} | Logs: ${processedData?.logAnalysis?.metrics?.totalLogs || 0}`
          }
        ]
      }
    ]
  };
}

function generateChatSummary(processedData, originalAnalysis, issues, services, jiraTicket, jiraOperation) {
  const severity = processedData?.alertSummary?.severity || 'NORMAL';
  const isIncident = processedData?.alertSummary?.isIncident || false;

  return `
🚨 **${isIncident ? 'Incident' : 'Log Analysis'} Alert**

**Severity**: ${severity}
**Title**: ${processedData?.alertSummary?.title || 'Unknown Alert'}
**Error Rate**: ${processedData?.alertSummary?.errorRate || 0}% (${processedData?.alertSummary?.errorCount || 0} errors)

**Issues Identified**: ${issues.length}
${issues.slice(0, 3).map((issue, idx) =>
  `${idx + 1}. ${issue.type} - ${issue.services.slice(0, 2).join(', ')}`
).join('\n')}
${issues.length > 3 ? `...and ${issues.length - 3} more` : ''}

**Affected Services**: ${services.length}
${services.slice(0, 5).join(', ')}${services.length > 5 ? ` (+${services.length - 5} more)` : ''}

${jiraTicket ? `**Jira**: ${jiraTicket.key} (${jiraOperation})` : '**Jira**: No ticket created'}

*Analysis ID: ${processedData?.logAnalysis?.analysisId || 'N/A'}*
`.trim();
}

function generateSummary(processedData, originalAnalysis, issues, jiraTicket, jiraOperation) {
  const alertId = processedData?.alertSummary?.alertId || 'unknown';
  const analysisId = processedData?.logAnalysis?.analysisId || 'N/A';
  const severity = processedData?.alertSummary?.severity || 'NORMAL';
  const services = originalAnalysis.consolidatedFindings?.affectedServices || [];

  let summary = `Alert ${alertId} analyzed. `;
  summary += `Analysis ${analysisId}. `;
  summary += `Severity: ${severity}. `;
  summary += `${issues.length} issue(s) identified. `;
  summary += `${services.length} service(s) affected. `;

  if (jiraTicket) {
    summary += `Jira ticket ${jiraTicket.key} ${jiraOperation}. `;
  } else {
    summary += `No Jira ticket created. `;
  }

  summary += `Stages executed: ${processedData?.logAnalysis?.metrics?.stagesExecuted || 0}.`;

  return summary;
}

// ============= RETURN OUTPUT =============
return { json: notification };
