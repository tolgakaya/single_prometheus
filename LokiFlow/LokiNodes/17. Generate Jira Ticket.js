// ================ LOKI FLOW - JIRA TICKET GENERATOR ================
// Generates Jira ticket from LokiFlow multi-problem analysis results
// Supports multiple issues from different stages with full evidence
// Version: 1.0
// Created: 2025-12-20

const inputData = $input.first().json;

console.log("=== GENERATE JIRA TICKET FROM LOKI ANALYSIS ===");

// Extract data from Node 16 output
const metadata = inputData.metadata || {};
const timeContext = inputData.timeContext || {};
const stageResults = inputData.stageResults || {};
const evidenceCollection = inputData.evidenceCollection || {};
const incidentEvaluation = inputData.incidentEvaluation || {};
const consolidatedFindings = inputData.consolidatedFindings || {};
const actionableInsights = inputData.actionableInsights || {};
const outputFormats = inputData.outputFormats || {};
const performanceBenchmarks = inputData.performanceBenchmarks || {};

// Generate analysisId with timestamp-based fallback (same as Node 16)
const analysisId = metadata.analysisId ||
                   inputData.analysisId ||
                   `lokiflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Get identified issues array (multi-problem support)
const identifiedIssues = consolidatedFindings.identifiedIssues || [];
const affectedServices = consolidatedFindings.affectedServices || [];
const overallSeverity = incidentEvaluation.severity || 'NORMAL';
const isIncident = incidentEvaluation.isIncident || false;

console.log("Analysis ID:", analysisId);
console.log("Issues to report:", identifiedIssues.length);
console.log("Affected services:", affectedServices.length);
console.log("Is Incident:", isIncident);

// ============= HELPER FUNCTIONS =============

// Generate ticket title based on incident status and number of issues
function generateTicketTitle(issues, isIncident, affectedServices) {
  const prefix = isIncident ? "🚨 INCIDENT" : "📊 ANALYSIS";

  if (issues.length === 0) {
    return `${prefix}: No Issues Detected - System Healthy`;
  }

  if (issues.length === 1) {
    const service = issues[0].affectedServices[0] || 'Unknown Service';
    return `${prefix}: ${issues[0].type} (${service})`;
  }

  // Multiple issues
  const serviceList = affectedServices.slice(0, 2).join(', ');
  const moreServices = affectedServices.length > 2 ? ` +${affectedServices.length - 2} more` : '';
  return `${prefix}: ${issues.length} Issues Detected - ${serviceList}${moreServices}`;
}

// Generate severity icon and label
function getSeverityDisplay(severity) {
  const severityMap = {
    'CRITICAL': '🔴 CRITICAL',
    'HIGH': '🟠 HIGH',
    'WARNING': '🟡 WARNING',
    'MEDIUM': '🟡 MEDIUM',
    'NORMAL': '🟢 NORMAL',
    'LOW': '🔵 LOW'
  };
  return severityMap[severity] || '⚪ UNKNOWN';
}

// Generate priority for Jira
function getJiraPriority(severity, isIncident) {
  if (severity === 'CRITICAL' || (isIncident && severity === 'HIGH')) {
    return 'Critical';
  }
  if (severity === 'HIGH') {
    return 'High';
  }
  if (severity === 'MEDIUM' || severity === 'WARNING') {
    return 'Medium';
  }
  return 'Low';
}

// Generate labels for Jira ticket
function generateJiraLabels(issues, affectedServices, isIncident, severity) {
  const labels = [];

  // Status labels
  labels.push(isIncident ? 'Incident' : 'Log-Analysis');
  labels.push(`Severity-${severity}`);

  // Issue type labels
  issues.forEach(issue => {
    if (issue.type.toLowerCase().includes('dns')) labels.push('DNS-Issue');
    if (issue.type.toLowerCase().includes('connection')) labels.push('Connection-Issue');
    if (issue.type.toLowerCase().includes('memory')) labels.push('Memory-Issue');
    if (issue.type.toLowerCase().includes('cpu')) labels.push('CPU-Issue');
    if (issue.type.toLowerCase().includes('timeout')) labels.push('Timeout-Issue');
  });

  // Service labels (limit to top 3)
  affectedServices.slice(0, 3).forEach(service => {
    labels.push(`Service-${service.replace(/[^a-zA-Z0-9-]/g, '-')}`);
  });

  // Stage labels
  labels.push('Auto-Generated');
  labels.push('LokiFlow');

  return [...new Set(labels)]; // Remove duplicates
}

// Format evidence list for display
function formatEvidence(evidence) {
  if (!evidence || evidence.length === 0) {
    return '<li>No evidence available</li>';
  }
  return evidence.map(e => `<li>${e}</li>`).join('\n      ');
}

// Format remediation actions for display
function formatRemediationActions(actions) {
  if (!actions || actions.length === 0) {
    return '<li>No specific actions recommended</li>';
  }

  return actions.map(action => {
    if (typeof action === 'string') {
      return `<li>${action}</li>`;
    }
    if (action.action) {
      let actionHtml = `<li><strong>${action.action}</strong>`;
      if (action.command) {
        actionHtml += `<br><code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">${action.command}</code>`;
      }
      if (action.impact) {
        actionHtml += `<br><em>Impact: ${action.impact}</em>`;
      }
      if (action.risk) {
        actionHtml += ` <span style="color: ${action.risk === 'Low' ? '#4caf50' : action.risk === 'Medium' ? '#ff9800' : '#f44336'};">(Risk: ${action.risk})</span>`;
      }
      actionHtml += '</li>';
      return actionHtml;
    }
    return `<li>${JSON.stringify(action)}</li>`;
  }).join('\n      ');
}

// Generate issues section HTML
function generateIssuesSection(issues) {
  if (issues.length === 0) {
    return `
    <div style="padding: 15px; background: #e8f5e9; border-left: 4px solid #4caf50; margin: 10px 0;">
      <h3 style="margin: 0 0 10px 0; color: #2e7d32;">✅ No Issues Detected</h3>
      <p style="margin: 0;">System is operating normally based on log analysis.</p>
    </div>`;
  }

  return issues.map((issue, index) => {
    const occurrenceText = issue.occurrenceCount !== null && issue.occurrenceCount !== undefined
      ? `<tr><td style="font-weight: bold; padding: 5px;">Occurrences:</td><td style="padding: 5px;">${issue.occurrenceCount}</td></tr>`
      : '';

    const affectedSystemsText = issue.affectedSystemDetails && issue.affectedSystemDetails.length > 0
      ? `
      <tr><td colspan="2" style="font-weight: bold; padding: 5px;">Affected Systems:</td></tr>
      ${issue.affectedSystemDetails.map(sys => `
        <tr><td colspan="2" style="padding: 5px; padding-left: 20px;">
          • ${sys.name}: ${sys.impact || 'Unknown impact'}<br>
          <em style="font-size: 12px;">${sys.functionality || ''}</em>
        </td></tr>
      `).join('')}
      `
      : '';

    return `
    <div style="border: 2px solid #ff9800; border-radius: 8px; margin: 15px 0; background: #fff3e0;">
      <div style="background: #ff9800; color: white; padding: 12px; font-weight: bold; border-radius: 6px 6px 0 0;">
        🔍 ISSUE ${index + 1} of ${issues.length}
      </div>
      <div style="padding: 15px; background: white; border-radius: 0 0 6px 6px;">
        <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
          <tr><td style="font-weight: bold; width: 150px; padding: 5px;">Issue Type:</td><td style="padding: 5px;">${issue.type}</td></tr>
          <tr><td style="font-weight: bold; padding: 5px;">Affected Services:</td><td style="padding: 5px;">${issue.affectedServices.join(', ') || 'Unknown'}</td></tr>
          ${occurrenceText}
          <tr><td style="font-weight: bold; padding: 5px;">Severity:</td><td style="padding: 5px;">${getSeverityDisplay(issue.severity)}</td></tr>
          <tr><td style="font-weight: bold; padding: 5px;">Detected By:</td><td style="padding: 5px;">${issue.stageDetected.replace(/_/g, ' ').toUpperCase()}</td></tr>
          ${affectedSystemsText}
        </table>

        <div style="margin-top: 15px;">
          <h4 style="margin: 0 0 10px 0; color: #f57c00;">📋 Evidence:</h4>
          <ul style="margin: 5px 0; padding-left: 20px;">
            ${formatEvidence(issue.evidence)}
          </ul>
        </div>

        ${issue.remediation && issue.remediation.length > 0 ? `
        <div style="margin-top: 15px; padding: 10px; background: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px;">
          <h4 style="margin: 0 0 10px 0; color: #1976d2;">🛠️ Immediate Actions:</h4>
          <ul style="margin: 5px 0; padding-left: 20px;">
            ${formatRemediationActions(issue.remediation)}
          </ul>
        </div>
        ` : ''}

        ${issue.shortTermFixes && issue.shortTermFixes.length > 0 ? `
        <div style="margin-top: 15px; padding: 10px; background: #fff3e0; border-left: 4px solid #ff9800; border-radius: 4px;">
          <h4 style="margin: 0 0 10px 0; color: #f57c00;">📅 Short-Term Fixes:</h4>
          <ul style="margin: 5px 0; padding-left: 20px;">
            ${issue.shortTermFixes.map(fix => `<li>${fix}</li>`).join('\n            ')}
          </ul>
        </div>
        ` : ''}

        ${issue.longTermSolutions && issue.longTermSolutions.length > 0 ? `
        <div style="margin-top: 15px; padding: 10px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px;">
          <h4 style="margin: 0 0 10px 0; color: #2e7d32;">🎯 Long-Term Solutions:</h4>
          <ul style="margin: 5px 0; padding-left: 20px;">
            ${issue.longTermSolutions.map(solution => `<li>${solution}</li>`).join('\n            ')}
          </ul>
        </div>
        ` : ''}
      </div>
    </div>`;
  }).join('\n');
}

// Generate stage results summary
function generateStageResultsSummary(stageResults) {
  const stages = [];

  if (stageResults.stage1_healthSnapshot) {
    stages.push({
      name: 'Stage 1: Health Check',
      status: stageResults.stage1_healthSnapshot.status || 'Unknown',
      executed: true
    });
  }

  if (stageResults.stage1_5_anomalyDetection) {
    stages.push({
      name: 'Stage 1.5: Anomaly Detection',
      status: 'Completed',
      executed: true
    });
  }

  if (stageResults.stage2_patternAnalysis) {
    stages.push({
      name: 'Stage 2: Pattern Analysis',
      status: stageResults.stage2_patternAnalysis.proceed_decision ? 'Proceeded to Stage 3' : 'Analysis Complete',
      executed: true
    });
  }

  if (stageResults.stage3_rootCauseAnalysis) {
    stages.push({
      name: 'Stage 3: Root Cause Analysis',
      status: 'Completed',
      executed: true
    });
  }

  return stages.map(stage => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${stage.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">
        <span style="color: #4caf50; font-weight: bold;">✓</span> ${stage.status}
      </td>
    </tr>
  `).join('');
}

// ============= GENERATE JIRA TICKET HTML =============

const ticketTitle = generateTicketTitle(identifiedIssues, isIncident, affectedServices);
const jiraPriority = getJiraPriority(overallSeverity, isIncident);
const jiraLabels = generateJiraLabels(identifiedIssues, affectedServices, isIncident, overallSeverity);

const jiraTicketHtml = `
<div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto;">

  <!-- INCIDENT SUMMARY -->
  <div style="border: 2px solid ${isIncident ? '#d32f2f' : '#2196f3'}; border-radius: 8px; margin: 10px 0; background: ${isIncident ? '#ffebee' : '#e3f2fd'};">
    <div style="background: ${isIncident ? '#d32f2f' : '#2196f3'}; color: white; padding: 12px; font-weight: bold; border-radius: 6px 6px 0 0;">
      ${isIncident ? '🚨 INCIDENT SUMMARY' : '📊 LOG ANALYSIS SUMMARY'}
    </div>
    <div style="padding: 15px; background: white; border-radius: 0 0 6px 6px;">
      <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
        <tr><td style="font-weight: bold; width: 150px; padding: 5px;">Analysis ID:</td><td style="padding: 5px;">${analysisId}</td></tr>
        <tr><td style="font-weight: bold; padding: 5px;">Type:</td><td style="padding: 5px;">${isIncident ? 'Incident' : 'Log Analysis'}</td></tr>
        <tr><td style="font-weight: bold; padding: 5px;">Overall Severity:</td><td style="padding: 5px;">${getSeverityDisplay(overallSeverity)}</td></tr>
        <tr><td style="font-weight: bold; padding: 5px;">Issues Detected:</td><td style="padding: 5px;"><strong>${identifiedIssues.length}</strong></td></tr>
        <tr><td style="font-weight: bold; padding: 5px;">Affected Services:</td><td style="padding: 5px;">${affectedServices.join(', ') || 'None'}</td></tr>
        <tr><td style="font-weight: bold; padding: 5px;">Time Range:</td><td style="padding: 5px;">${timeContext.requestedRange?.start || 'N/A'} to ${timeContext.requestedRange?.end || 'N/A'}</td></tr>
        <tr><td style="font-weight: bold; padding: 5px;">Duration:</td><td style="padding: 5px;">${timeContext.requestedRange?.duration || 'N/A'}</td></tr>
        <tr><td style="font-weight: bold; padding: 5px;">Error Rate:</td><td style="padding: 5px;">${incidentEvaluation.errorRate || 'N/A'}</td></tr>
        <tr><td style="font-weight: bold; padding: 5px;">Error Count:</td><td style="padding: 5px;">${incidentEvaluation.errorCount || 0}</td></tr>
      </table>
    </div>
  </div>

  <!-- EXECUTIVE SUMMARY -->
  <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-left: 4px solid #607d8b; border-radius: 4px;">
    <h3 style="margin: 0 0 10px 0; color: #455a64;">📝 Executive Summary</h3>
    <p style="margin: 0; line-height: 1.6;">${outputFormats.executiveSummary || 'No summary available'}</p>
  </div>

  <!-- IDENTIFIED ISSUES -->
  <div style="margin: 20px 0;">
    <h2 style="color: #f57c00; border-bottom: 2px solid #ff9800; padding-bottom: 10px;">
      🔍 Identified Issues (${identifiedIssues.length})
    </h2>
    ${generateIssuesSection(identifiedIssues)}
  </div>

  <!-- ACTIONABLE INSIGHTS -->
  ${actionableInsights.immediateActions && actionableInsights.immediateActions.length > 0 ? `
  <div style="border: 2px solid #2196f3; border-radius: 8px; margin: 20px 0; background: #e3f2fd;">
    <div style="background: #2196f3; color: white; padding: 12px; font-weight: bold; border-radius: 6px 6px 0 0;">
      🛠️ IMMEDIATE ACTIONS REQUIRED
    </div>
    <div style="padding: 15px; background: white; border-radius: 0 0 6px 6px;">
      <ul style="margin: 0; padding-left: 20px;">
        ${formatRemediationActions(actionableInsights.immediateActions)}
      </ul>
    </div>
  </div>
  ` : ''}

  <!-- MONITORING GAPS & PROCESS IMPROVEMENTS -->
  ${(actionableInsights.monitoringGaps && actionableInsights.monitoringGaps.length > 0) ||
    (actionableInsights.processImprovements && actionableInsights.processImprovements.length > 0) ? `
  <div style="margin: 20px 0;">
    <h3 style="color: #9c27b0; border-bottom: 2px solid #9c27b0; padding-bottom: 10px;">
      🔮 Prevention & Improvements
    </h3>

    ${actionableInsights.monitoringGaps && actionableInsights.monitoringGaps.length > 0 ? `
    <div style="margin: 15px 0; padding: 10px; background: #f3e5f5; border-left: 4px solid #9c27b0; border-radius: 4px;">
      <h4 style="margin: 0 0 10px 0; color: #7b1fa2;">📊 Monitoring Gaps:</h4>
      <ul style="margin: 5px 0; padding-left: 20px;">
        ${actionableInsights.monitoringGaps.map(gap => `<li>${gap}</li>`).join('\n        ')}
      </ul>
    </div>
    ` : ''}

    ${actionableInsights.processImprovements && actionableInsights.processImprovements.length > 0 ? `
    <div style="margin: 15px 0; padding: 10px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px;">
      <h4 style="margin: 0 0 10px 0; color: #2e7d32;">🔧 Process Improvements:</h4>
      <ul style="margin: 5px 0; padding-left: 20px;">
        ${actionableInsights.processImprovements.map(imp => `<li>${imp}</li>`).join('\n        ')}
      </ul>
    </div>
    ` : ''}
  </div>
  ` : ''}

  <!-- ANALYSIS DETAILS -->
  <div style="margin: 20px 0;">
    <h3 style="color: #607d8b; border-bottom: 2px solid #607d8b; padding-bottom: 10px;">
      📈 Analysis Details
    </h3>

    <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
      <tr style="background: #f5f5f5;">
        <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Stage</th>
        <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Status</th>
      </tr>
      ${generateStageResultsSummary(stageResults)}
    </table>

    <div style="margin: 15px 0; padding: 10px; background: #fafafa; border-radius: 4px;">
      <h4 style="margin: 0 0 10px 0;">⏱️ Performance Metrics:</h4>
      <ul style="margin: 0; padding-left: 20px;">
        <li><strong>Total Analysis Time:</strong> ${performanceBenchmarks.analysisSpeed?.totalTime || 'N/A'}</li>
        <li><strong>Logs Processed:</strong> ${performanceBenchmarks.dataVolume?.logsProcessed?.toLocaleString() || 0}</li>
        <li><strong>Errors Parsed:</strong> ${performanceBenchmarks.dataVolume?.errorsParsed?.toLocaleString() || 0}</li>
        <li><strong>Services Analyzed:</strong> ${performanceBenchmarks.dataVolume?.servicesAnalyzed || 0}</li>
        <li><strong>Confidence Score:</strong> ${(performanceBenchmarks.accuracy?.confidenceScore * 100).toFixed(1) || 'N/A'}%</li>
      </ul>
    </div>
  </div>

  <!-- INCIDENT EVALUATION JUSTIFICATION -->
  <div style="margin: 20px 0; padding: 15px; background: ${isIncident ? '#ffebee' : '#e8f5e9'}; border-left: 4px solid ${isIncident ? '#d32f2f' : '#4caf50'}; border-radius: 4px;">
    <h4 style="margin: 0 0 10px 0; color: ${isIncident ? '#c62828' : '#2e7d32'};">
      ${isIncident ? '🚨 Incident Evaluation' : '✅ Normal Operations Assessment'}
    </h4>
    <p style="margin: 0;"><strong>Justification:</strong> ${incidentEvaluation.justification || 'No justification provided'}</p>

    <div style="margin-top: 10px;">
      <strong>Thresholds:</strong>
      <ul style="margin: 5px 0; padding-left: 20px;">
        <li>Warning: ${incidentEvaluation.thresholds?.errorRateWarning || 'N/A'} error rate</li>
        <li>Incident: ${incidentEvaluation.thresholds?.errorRateIncident || 'N/A'} error rate</li>
        <li>Critical: ${incidentEvaluation.thresholds?.errorRateCritical || 'N/A'} error rate</li>
      </ul>
    </div>

    ${incidentEvaluation.factors ? `
    <div style="margin-top: 10px;">
      <strong>Factors:</strong>
      <ul style="margin: 5px 0; padding-left: 20px;">
        <li>Anomaly Detected: ${incidentEvaluation.factors.anomalyDetected ? '✓ Yes' : '✗ No'}</li>
        <li>Cascade Detected: ${incidentEvaluation.factors.cascadeDetected ? '✓ Yes' : '✗ No'}</li>
        <li>Critical Services Affected: ${incidentEvaluation.factors.criticalServicesAffected?.length || 0}</li>
      </ul>
    </div>
    ` : ''}
  </div>

  <!-- FOOTER -->
  <div style="text-align: center; margin-top: 30px; padding: 15px; background: #f5f5f5; border-radius: 6px; font-size: 12px; color: #666;">
    <div style="margin-bottom: 5px;"><strong>Auto-Generated by LokiFlow</strong></div>
    <div>Analysis Timestamp: ${new Date().toLocaleString('en-US')}</div>
    <div>Workflow Execution ID: ${metadata.workflowExecutionId || 'unknown'}</div>
    <div>Stages Completed: ${metadata.stagesExecuted || 0} | Tools Used: ${metadata.toolsUsed?.length || 0}</div>
  </div>
</div>
`;

// ============= GENERATE JIRA TICKET OBJECT =============

const jiraTicket = {
  // Ticket identification
  title: ticketTitle,
  description: jiraTicketHtml,

  // Jira fields
  priority: jiraPriority,
  labels: jiraLabels,
  components: affectedServices.slice(0, 5), // Limit to 5 components
  issueType: isIncident ? "Incident" : "Task",

  // Custom fields
  customFields: {
    analysisId: analysisId,
    workflowExecutionId: metadata.workflowExecutionId,
    isIncident: isIncident,
    severity: overallSeverity,
    errorRate: incidentEvaluation.errorRate,
    errorCount: incidentEvaluation.errorCount,
    issuesDetected: identifiedIssues.length,
    affectedServicesCount: affectedServices.length,
    stagesExecuted: metadata.stagesExecuted,
    analysisDepth: metadata.analysisDepth || 'unknown',
    timeRangeStart: timeContext.requestedRange?.start,
    timeRangeEnd: timeContext.requestedRange?.end,
    timeRangeDuration: timeContext.requestedRange?.duration,
    confidenceScore: performanceBenchmarks.accuracy?.confidenceScore,
    logsProcessed: performanceBenchmarks.dataVolume?.logsProcessed,
    toolsUsed: metadata.toolsUsed?.join(', ')
  },

  // Issue details
  issues: identifiedIssues.map(issue => ({
    type: issue.type,
    services: issue.affectedServices,
    occurrences: issue.occurrenceCount,
    severity: issue.severity,
    stage: issue.stageDetected,
    evidenceCount: issue.evidence?.length || 0,
    hasRemediation: issue.remediation && issue.remediation.length > 0
  })),

  // Actions summary
  actions: {
    immediate: actionableInsights.immediateActions || [],
    monitoringGaps: actionableInsights.monitoringGaps || [],
    processImprovements: actionableInsights.processImprovements || []
  },

  // Metadata
  metadata: {
    generatedAt: new Date().toISOString(),
    generatedBy: 'LokiFlow-v1.0',
    analysisTimestamp: inputData.timestamp,
    executionTime: performanceBenchmarks.analysisSpeed?.totalTime
  }
};

console.log("=== JIRA TICKET GENERATED ===");
console.log("Title:", ticketTitle);
console.log("Priority:", jiraPriority);
console.log("Labels:", jiraLabels.length);
console.log("Issues included:", identifiedIssues.length);

// Pass through ALL data from Node 16 (inputData) + add jiraTicket field
return {
  json: {
    ...inputData,  // Pass through complete Node 16 output
    jiraTicket: jiraTicket,
    htmlContent: jiraTicketHtml,
    summary: {
      title: ticketTitle,
      priority: jiraPriority,
      issueType: jiraTicket.issueType,
      labelsCount: jiraLabels.length,
      issuesCount: identifiedIssues.length,
      affectedServicesCount: affectedServices.length
    }
  }
};
