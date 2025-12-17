// Prepare Notification Node - UPDATED VERSION
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
const executiveSummary = originalAnalysis.executiveSummary || {};
const findings = originalAnalysis.findings || {};

// ============= PREPARE NOTIFICATION DATA =============

const notification = {
  timestamp: new Date().toISOString(),
  status: 'completed',
  
  // Alert information
  alert: {
    id: processedData?.alertSummary?.alertId || 'unknown',
    source: processedData?.alertSummary?.source || 'kubernetes',
    title: processedData?.alertSummary?.title || 'Unknown Alert',
    severity: processedData?.alertSummary?.severity || 'unknown',
    fingerprint: processedData?.fingerprint || 'unknown',
    dedupStatus: processedData?.dedupStatus || 'unknown'
  },
  
  // Incident report summary
  incidentReport: {
    contextId: originalAnalysis.contextTracking?.contextId || 'N/A',
    title: processedData?.alertSummary?.title || 'Cluster Health Issue',
    severity: processedData?.alertSummary?.severity || 'unknown',
    rootCause: findings.rootCause?.issue || 'Under investigation',
    rootCauseComponent: findings.rootCause?.component || 'Unknown',
    affectedServicesCount: findings.affectedServices?.length || 0,
    affectedServices: findings.affectedServices || [],
    hasImmediateActions: originalAnalysis.actions?.immediate?.length > 0,
    confidence: findings.rootCause?.confidence || 0,
    stagesExecuted: executiveSummary.stagesExecuted || 0,
    alertsActive: executiveSummary.alertsActive || 0,
    alertsCritical: executiveSummary.alertsCritical || 0
  },
  
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
  
  // Phone call information (placeholder for future feature)
  // phoneCall: {
  //   attempted: false,
  //   reason: 'Feature not yet implemented'
  // },
  
  // Formatted notifications for different channels
  formats: {
    // Slack notification format
    slack: generateSlackNotification(processedData, originalAnalysis, jiraTicket, jiraOperation),
    
    // Chat summary (for Teams, etc.)
    chatSummary: generateChatSummary(processedData, originalAnalysis, jiraTicket, jiraOperation),
    
    // Markdown report
    markdown: processedData?.report || originalAnalysis.summary || 'No report available'
  },
  
  // Summary text
  summary: generateSummary(processedData, originalAnalysis, jiraTicket, jiraOperation)
};

// ============= HELPER FUNCTIONS =============

function generateSlackNotification(processedData, originalAnalysis, jiraTicket, jiraOperation) {
  const severity = processedData?.alertSummary?.severity || 'unknown';
  const severityEmoji = {
    'critical': '🔴',
    'degraded': '🟠',
    'warning': '🟡',
    'healthy': '🟢',
    'unknown': '⚪'
  };
  
  const emoji = severityEmoji[severity] || '⚪';
  const findings = originalAnalysis.findings || {};
  const actions = originalAnalysis.actions || {};
  
  return {
    text: `${emoji} Kubernetes Health Alert: ${processedData?.alertSummary?.title}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} ${severity.toUpperCase()}: ${processedData?.alertSummary?.title}`,
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
            text: `*Component:*\n${findings.rootCause?.component || 'Unknown'}`
          },
          {
            type: 'mrkdwn',
            text: `*Confidence:*\n${Math.round((findings.rootCause?.confidence || 0) * 100)}%`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Root Cause:*\n${findings.rootCause?.issue || 'Under investigation'}`
        }
      },
      ...(jiraTicket ? [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Jira Ticket:* <https://your-jira.atlassian.net/browse/${jiraTicket.key}|${jiraTicket.key}> (${jiraOperation})`
        }
      }] : []),
      ...(actions.immediate && actions.immediate.length > 0 ? [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Immediate Action:*\n\`${actions.immediate[0].command}\``
        }
      }] : []),
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Context ID: ${originalAnalysis.contextTracking?.contextId || 'N/A'} | Fingerprint: ${processedData?.fingerprint?.substring(0, 8) || 'N/A'}`
          }
        ]
      }
    ]
  };
}

function generateChatSummary(processedData, originalAnalysis, jiraTicket, jiraOperation) {
  const severity = processedData?.alertSummary?.severity || 'unknown';
  const findings = originalAnalysis.findings || {};
  const actions = originalAnalysis.actions || {};
  
  return `
🚨 **Kubernetes Health Alert**

**Severity**: ${severity.toUpperCase()}  
**Title**: ${processedData?.alertSummary?.title || 'Unknown Alert'}  
**Component**: ${findings.rootCause?.component || 'Unknown'}

**Root Cause**: ${findings.rootCause?.issue || 'Under investigation'}  
**Confidence**: ${Math.round((findings.rootCause?.confidence || 0) * 100)}%

${jiraTicket ? `**Jira**: ${jiraTicket.key} (${jiraOperation})` : '**Jira**: No ticket created'}

${actions.immediate && actions.immediate.length > 0 ? 
  `**Immediate Action**: \`${actions.immediate[0].command}\`` : 
  '**Status**: Monitoring only'}

*Context ID: ${originalAnalysis.contextTracking?.contextId || 'N/A'}*
*Fingerprint: ${processedData?.fingerprint?.substring(0, 8) || 'N/A'}*
`.trim();
}

function generateSummary(processedData, originalAnalysis, jiraTicket, jiraOperation) {
  const alertId = processedData?.alertSummary?.alertId || 'unknown';
  const contextId = originalAnalysis.contextTracking?.contextId || 'N/A';
  const severity = processedData?.alertSummary?.severity || 'unknown';
  const findings = originalAnalysis.findings || {};
  const executiveSummary = originalAnalysis.executiveSummary || {};
  
  let summary = `Alert ${alertId} analyzed. `;
  summary += `Context ${contextId}. `;
  summary += `Severity: ${severity}. `;
  summary += `${findings.affectedServices?.length || 0} services affected. `;
  
  if (findings.rootCause?.identified) {
    summary += `Root cause identified: ${findings.rootCause.issue}. `;
  } else {
    summary += `Root cause under investigation. `;
  }
  
  if (jiraTicket) {
    summary += `Jira ticket ${jiraTicket.key} ${jiraOperation}. `;
  } else {
    summary += `No Jira ticket created. `;
  }
  
  summary += `Stages executed: ${executiveSummary.stagesExecuted || 0}.`;
  
  return summary;
}

// ============= RETURN OUTPUT =============
return { json: notification };
