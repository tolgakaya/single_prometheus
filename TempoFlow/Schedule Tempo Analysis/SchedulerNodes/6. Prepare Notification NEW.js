// Prepare Notification Node - TempoFlow Version
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
const traceAnalysis = processedData?.traceAnalysis || {};
const alertSummary = processedData?.alertSummary || {};

// TempoFlow-specific data (distributed tracing)
const serviceImpact = traceAnalysis.serviceImpact || {};
const dependencyAnalysis = traceAnalysis.dependencyAnalysis || {};
const rootCauseAnalysis = traceAnalysis.rootCauseAnalysis || {};
const cascadeFailures = dependencyAnalysis.cascadeFailures || [];
const failedChains = dependencyAnalysis.failedChains || [];
const affectedServices = Object.keys(serviceImpact.errorsByService || {});

// ============= PREPARE NOTIFICATION DATA =============

const notification = {
  timestamp: new Date().toISOString(),
  status: 'completed',

  // Alert information
  alert: {
    id: alertSummary.alertId || 'unknown',
    source: alertSummary.source || 'tempo-traces',
    title: alertSummary.title || 'Unknown Alert',
    severity: alertSummary.severity || 'MEDIUM',
    isIncident: alertSummary.isIncident || false,
    errorCount: alertSummary.errorCount || 0,
    cascadeFailures: alertSummary.cascadeFailures || 0,
    failedChains: alertSummary.failedChains || 0,
    criticalPathAffected: alertSummary.criticalPathAffected || false,
    fingerprint: processedData?.fingerprint || 'unknown',
    dedupStatus: processedData?.dedupStatus || 'unknown'
  },

  // Trace analysis report summary (TempoFlow-specific)
  traceAnalysisReport: {
    analysisId: traceAnalysis.analysisId || 'N/A',
    workflowExecutionId: traceAnalysis.workflowExecutionId || 'N/A',
    title: alertSummary.title || 'Distributed Trace Analysis Alert',
    severity: alertSummary.severity || 'MEDIUM',
    isIncident: alertSummary.isIncident || false,

    // Service impact
    totalServices: serviceImpact.totalServices || affectedServices.length,
    affectedServices: affectedServices,
    criticalPathAffected: serviceImpact.criticalPathAffected || false,
    affectedPath: serviceImpact.affectedPath || null,

    // Distributed tracing metrics
    totalErrors: traceAnalysis.metrics?.totalErrors || 0,
    impactScore: traceAnalysis.metrics?.impactScore || 0,
    confidenceLevel: traceAnalysis.metrics?.confidenceLevel || 0.5,

    // Cascade & dependency analysis
    cascadeFailuresCount: cascadeFailures.length,
    failedChainsCount: failedChains.length,

    // Root cause
    rootCause: rootCauseAnalysis.primaryCause || 'Unknown',
    rootService: rootCauseAnalysis.serviceRoot || 'Unknown',

    // Actions available
    hasImmediateActions: traceAnalysis.actions?.immediate?.length > 0
  },

  // Distributed tracing issues (TempoFlow-specific)
  tracingIssues: {
    cascadeFailures: cascadeFailures.map(cascade => ({
      origin: cascade.origin,
      affected: cascade.affected || [],
      pattern: cascade.pattern
    })),
    failedChains: failedChains.map(chain => ({
      chain: chain.chain || [],
      failurePoint: chain.failurePoint,
      errorType: chain.errorType
    })),
    rootCause: {
      primaryCause: rootCauseAnalysis.primaryCause || 'Unknown',
      serviceRoot: rootCauseAnalysis.serviceRoot || 'Unknown',
      affectedChains: rootCauseAnalysis.affectedChains || [],
      contributingFactors: rootCauseAnalysis.contributingFactors || []
    }
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

  // Formatted notifications for different channels
  formats: {
    // Slack notification format
    slack: generateSlackNotification(processedData, traceAnalysis, cascadeFailures, failedChains, affectedServices, jiraTicket, jiraOperation),

    // Chat summary (for Teams, etc.)
    chatSummary: generateChatSummary(processedData, traceAnalysis, cascadeFailures, failedChains, affectedServices, jiraTicket, jiraOperation),

    // Markdown report (if available)
    markdown: originalAnalysis.htmlContent || 'No detailed report available'
  },

  // Summary text
  summary: generateSummary(processedData, traceAnalysis, cascadeFailures, failedChains, jiraTicket, jiraOperation)
};

// ============= HELPER FUNCTIONS =============

function generateSlackNotification(processedData, traceAnalysis, cascadeFailures, failedChains, services, jiraTicket, jiraOperation) {
  const severity = processedData?.alertSummary?.severity || 'MEDIUM';
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
    text: `${emoji} Distributed Trace Analysis Alert: ${processedData?.alertSummary?.title}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} ${isIncident ? 'INCIDENT' : 'TRACE ANALYSIS'}: ${severity}`,
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
            text: `*Error Count:*\n${processedData?.alertSummary?.errorCount || 0}`
          },
          {
            type: 'mrkdwn',
            text: `*Impact Score:*\n${traceAnalysis.metrics?.impactScore || 0}/100`
          }
        ]
      },
      ...(cascadeFailures.length > 0 ? [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🌊 Cascade Failures:*\n${cascadeFailures.slice(0, 2).map((cascade, idx) =>
            `${idx + 1}. ${cascade.origin} → ${cascade.affected.slice(0, 2).join(', ')}`
          ).join('\n')}${cascadeFailures.length > 2 ? `\n...and ${cascadeFailures.length - 2} more` : ''}`
        }
      }] : []),
      ...(failedChains.length > 0 ? [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*⛓️ Failed Chains:*\n${failedChains.slice(0, 2).map((chain, idx) =>
            `${idx + 1}. ${chain.chain.join(' → ')} (${chain.failurePoint})`
          ).join('\n')}${failedChains.length > 2 ? `\n...and ${failedChains.length - 2} more` : ''}`
        }
      }] : []),
      ...(processedData?.alertSummary?.criticalPathAffected ? [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⚠️ *Critical Path Affected*`
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
            text: `Analysis ID: ${traceAnalysis?.analysisId || 'N/A'} | Services: ${services.length} | Root: ${traceAnalysis?.rootCauseAnalysis?.primaryCause || 'Unknown'}`
          }
        ]
      }
    ]
  };
}

function generateChatSummary(processedData, traceAnalysis, cascadeFailures, failedChains, services, jiraTicket, jiraOperation) {
  const severity = processedData?.alertSummary?.severity || 'MEDIUM';
  const isIncident = processedData?.alertSummary?.isIncident || false;
  const rootCause = traceAnalysis?.rootCauseAnalysis?.primaryCause || 'Unknown';

  return `
🚨 **${isIncident ? 'Incident' : 'Distributed Trace Analysis'} Alert**

**Severity**: ${severity}
**Title**: ${processedData?.alertSummary?.title || 'Unknown Alert'}
**Error Count**: ${processedData?.alertSummary?.errorCount || 0}
**Impact Score**: ${traceAnalysis?.metrics?.impactScore || 0}/100

**Root Cause**: ${rootCause}
${processedData?.alertSummary?.criticalPathAffected ? '⚠️ **Critical Path Affected**' : ''}

**🌊 Cascade Failures**: ${cascadeFailures.length}
${cascadeFailures.slice(0, 2).map((cascade, idx) =>
  `${idx + 1}. ${cascade.origin} → ${cascade.affected.join(', ')}`
).join('\n')}
${cascadeFailures.length > 2 ? `...and ${cascadeFailures.length - 2} more` : ''}

**⛓️ Failed Chains**: ${failedChains.length}
${failedChains.slice(0, 2).map((chain, idx) =>
  `${idx + 1}. ${chain.chain.join(' → ')} (fails at: ${chain.failurePoint})`
).join('\n')}
${failedChains.length > 2 ? `...and ${failedChains.length - 2} more` : ''}

**Affected Services**: ${services.length}
${services.slice(0, 5).join(', ')}${services.length > 5 ? ` (+${services.length - 5} more)` : ''}

${jiraTicket ? `**Jira**: ${jiraTicket.key} (${jiraOperation})` : '**Jira**: No ticket created'}

*Analysis ID: ${traceAnalysis?.analysisId || 'N/A'}*
`.trim();
}

function generateSummary(processedData, traceAnalysis, cascadeFailures, failedChains, jiraTicket, jiraOperation) {
  const alertId = processedData?.alertSummary?.alertId || 'unknown';
  const analysisId = traceAnalysis?.analysisId || 'N/A';
  const severity = processedData?.alertSummary?.severity || 'MEDIUM';
  const errorCount = processedData?.alertSummary?.errorCount || 0;
  const services = Object.keys(traceAnalysis?.serviceImpact?.errorsByService || {});

  let summary = `Alert ${alertId} analyzed. `;
  summary += `Analysis ${analysisId}. `;
  summary += `Severity: ${severity}. `;
  summary += `${errorCount} error(s). `;
  summary += `${services.length} service(s) affected. `;
  summary += `${cascadeFailures.length} cascade failure(s). `;
  summary += `${failedChains.length} failed chain(s). `;

  if (processedData?.alertSummary?.criticalPathAffected) {
    summary += `Critical path affected. `;
  }

  if (jiraTicket) {
    summary += `Jira ticket ${jiraTicket.key} ${jiraOperation}. `;
  } else {
    summary += `No Jira ticket created. `;
  }

  summary += `Root cause: ${traceAnalysis?.rootCauseAnalysis?.primaryCause || 'Unknown'}.`;

  return summary;
}

// ============= RETURN OUTPUT =============
return { json: notification };
