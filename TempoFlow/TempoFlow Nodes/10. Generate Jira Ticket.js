// ================ TEMPO FLOW - JIRA TICKET GENERATOR ================
// Generates Jira ticket from TempoFlow distributed tracing analysis
// Supports service dependency chains, cascade failures, and root cause analysis
// Version: 1.0
// Created: 2025-12-22

const inputData = $input.first().json;

console.log("=== GENERATE JIRA TICKET FROM TEMPO ANALYSIS ===");

// Extract data from Node 9 (Format Final Output)
const healthCheck = inputData.healthCheck || {};
const analysisContext = inputData.analysisContext || {};
const serviceAnalysis = inputData.serviceAnalysis || {};
const deepAnalysis = inputData.deepAnalysis || {};
const executiveSummary = inputData.executiveSummary || {};
const timestamp = inputData.timestamp;
const workflowExecutionId = inputData.workflowExecutionId;

// Generate analysisId with timestamp-based fallback
const analysisId = analysisContext.requestId ||
                   `tempoflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Get key metrics
const totalErrors = healthCheck.errorCount || 0;
const affectedServices = Object.keys(serviceAnalysis.errorsByService || {});
const criticalServices = executiveSummary.criticalServices || [];
const overallStatus = executiveSummary.overallStatus || 'unknown';
const isIncident = overallStatus === 'critical' || (analysisContext.priority === 'critical');

console.log("Analysis ID:", analysisId);
console.log("Total errors:", totalErrors);
console.log("Affected services:", affectedServices.length);
console.log("Is Incident:", isIncident);

// ============= HELPER FUNCTIONS =============

// Generate ticket title based on incident status and findings
function generateTicketTitle(errorCount, affectedServices, isIncident, deepAnalysis) {
  const prefix = isIncident ? "🚨 INCIDENT" : "📊 TRACE ANALYSIS";

  if (errorCount === 0) {
    return `${prefix}: No Issues Detected - All Services Healthy`;
  }

  // Check for cascade failures
  const cascadeFailures = deepAnalysis?.findings?.service_dependencies?.cascade_failures || [];
  if (cascadeFailures.length > 0) {
    const origin = cascadeFailures[0].origin || 'Unknown';
    return `${prefix}: Service Cascade Failure from ${origin} - ${errorCount} Errors`;
  }

  // Check for dependency chain failures
  const failedChains = deepAnalysis?.findings?.service_dependencies?.failed_chains || [];
  if (failedChains.length > 0) {
    const failurePoint = failedChains[0].failure_point || 'Unknown';
    return `${prefix}: Dependency Chain Break at ${failurePoint}`;
  }

  // Single service issue
  if (affectedServices.length === 1) {
    return `${prefix}: ${affectedServices[0]} - ${errorCount} Errors`;
  }

  // Multiple services
  const serviceList = affectedServices.slice(0, 2).join(', ');
  const moreServices = affectedServices.length > 2 ? ` +${affectedServices.length - 2} more` : '';
  return `${prefix}: ${errorCount} Errors - ${serviceList}${moreServices}`;
}

// Generate severity icon and label
function getSeverityDisplay(severity) {
  const severityMap = {
    'critical': '🔴 CRITICAL',
    'high': '🟠 HIGH',
    'medium': '🟡 MEDIUM',
    'warning': '🟡 WARNING',
    'concerning': '🟠 CONCERNING',
    'degraded': '🔵 DEGRADED',
    'healthy': '🟢 HEALTHY',
    'low': '🔵 LOW'
  };
  return severityMap[severity?.toLowerCase()] || '⚪ UNKNOWN';
}

// Generate priority for Jira
function getJiraPriority(overallStatus, isIncident) {
  if (overallStatus === 'critical' || isIncident) {
    return 'Critical';
  }
  if (overallStatus === 'warning' || overallStatus === 'concerning') {
    return 'High';
  }
  if (overallStatus === 'degraded') {
    return 'Medium';
  }
  return 'Low';
}

// Generate labels for Jira ticket
function generateJiraLabels(affectedServices, deepAnalysis, isIncident, overallStatus) {
  const labels = [];

  // Status labels
  labels.push(isIncident ? 'Incident' : 'Trace-Analysis');
  labels.push(`Status-${overallStatus}`);

  // Issue type labels
  if (deepAnalysis?.findings?.service_dependencies?.cascade_failures?.length > 0) {
    labels.push('Cascade-Failure');
  }
  if (deepAnalysis?.findings?.service_dependencies?.failed_chains?.length > 0) {
    labels.push('Dependency-Chain-Failure');
  }
  if (deepAnalysis?.findings?.performance?.service_latencies) {
    const hasViolations = Object.values(deepAnalysis.findings.performance.service_latencies)
      .some(latency => latency.sla_violation);
    if (hasViolations) labels.push('SLA-Violation');
  }

  // Error type labels
  const errorTypes = new Set();
  Object.values(serviceAnalysis.errorsByService || {}).forEach(service => {
    (service.errorTypes || []).forEach(type => errorTypes.add(type));
  });

  errorTypes.forEach(type => {
    if (type.includes('401') || type.includes('403')) labels.push('Auth-Issue');
    if (type.includes('500') || type.includes('502') || type.includes('503')) labels.push('Backend-Issue');
    if (type.includes('timeout')) labels.push('Timeout-Issue');
    if (type.includes('connection')) labels.push('Connection-Issue');
  });

  // Service labels (limit to top 5)
  affectedServices.slice(0, 5).forEach(service => {
    labels.push(`Service-${service.replace(/[^a-zA-Z0-9-]/g, '-')}`);
  });

  // Framework labels
  labels.push('Auto-Generated');
  labels.push('TempoFlow');
  labels.push('Distributed-Tracing');

  return [...new Set(labels)]; // Remove duplicates
}

// Format service errors for display
function formatServiceErrors(errorsByService) {
  if (!errorsByService || Object.keys(errorsByService).length === 0) {
    return '<tr><td colspan="5" style="padding: 10px; text-align: center;">No service errors detected</td></tr>';
  }

  return Object.entries(errorsByService)
    .sort(([, a], [, b]) => b.errorCount - a.errorCount)
    .map(([service, data]) => `
      <tr style="border-bottom: 1px solid #e0e0e0;">
        <td style="padding: 8px; font-weight: bold;">${service}</td>
        <td style="padding: 8px; text-align: center;">${data.errorCount}</td>
        <td style="padding: 8px;">${(data.errorTypes || []).join(', ') || 'Unknown'}</td>
        <td style="padding: 8px; text-align: center;">
          <span style="padding: 4px 8px; border-radius: 3px; background: ${getCriticalityColor(data.criticality)}; color: white;">
            ${data.criticality || 'unknown'}
          </span>
        </td>
        <td style="padding: 8px; text-align: center;">
          ${data.slaViolation ? '⚠️ YES' : '✓ No'}
        </td>
      </tr>
    `).join('');
}

// Get color for criticality badge
function getCriticalityColor(criticality) {
  const colors = {
    'critical': '#d32f2f',
    'high': '#f57c00',
    'medium': '#ffa726',
    'low': '#66bb6a',
    'unknown': '#9e9e9e'
  };
  return colors[criticality?.toLowerCase()] || colors.unknown;
}

// Format dependency chain failures
function formatDependencyChainFailures(failedChains) {
  if (!failedChains || failedChains.length === 0) {
    return '<li>No dependency chain failures detected</li>';
  }

  return failedChains.map(chain => `
    <li>
      <strong>Chain:</strong> ${(chain.chain || []).join(' → ')}<br>
      <strong>Failure Point:</strong> ${chain.failure_point || 'Unknown'}<br>
      <strong>Error Type:</strong> ${chain.error_type || 'Unknown'}
    </li>
  `).join('\n      ');
}

// Format cascade failures
function formatCascadeFailures(cascadeFailures) {
  if (!cascadeFailures || cascadeFailures.length === 0) {
    return '<li>No cascade failures detected</li>';
  }

  return cascadeFailures.map(cascade => `
    <li>
      <strong>Origin:</strong> ${cascade.origin || 'Unknown'}<br>
      <strong>Affected Services:</strong> ${(cascade.affected || []).join(', ')}<br>
      <strong>Pattern:</strong> ${cascade.pattern || 'Unknown'}
    </li>
  `).join('\n      ');
}

// Format performance issues
function formatPerformanceIssues(serviceLatencies) {
  if (!serviceLatencies || Object.keys(serviceLatencies).length === 0) {
    return '<tr><td colspan="3" style="padding: 10px; text-align: center;">No performance issues detected</td></tr>';
  }

  return Object.entries(serviceLatencies)
    .filter(([, data]) => data.sla_violation)
    .map(([service, data]) => `
      <tr style="border-bottom: 1px solid #e0e0e0;">
        <td style="padding: 8px; font-weight: bold;">${service}</td>
        <td style="padding: 8px; text-align: center;">${data.p95 || 'N/A'}</td>
        <td style="padding: 8px; text-align: center;">
          <span style="color: #d32f2f; font-weight: bold;">⚠️ YES</span>
        </td>
      </tr>
    `).join('');
}

// Format recommendations with priority
function formatRecommendations(recommendations) {
  if (!recommendations) {
    return '<li>No specific recommendations available</li>';
  }

  const immediate = recommendations.immediate_actions || [];
  const shortTerm = recommendations.short_term || [];
  const longTerm = recommendations.long_term || [];

  let html = '';

  if (immediate.length > 0) {
    html += `
      <div style="margin: 10px 0; padding: 10px; background: #ffebee; border-left: 4px solid #d32f2f; border-radius: 4px;">
        <h4 style="margin: 0 0 10px 0; color: #c62828;">🚨 Immediate Actions:</h4>
        <ul style="margin: 5px 0; padding-left: 20px;">
          ${immediate.map(action => `<li>${action}</li>`).join('\n          ')}
        </ul>
      </div>
    `;
  }

  if (shortTerm.length > 0) {
    html += `
      <div style="margin: 10px 0; padding: 10px; background: #fff3e0; border-left: 4px solid #ff9800; border-radius: 4px;">
        <h4 style="margin: 0 0 10px 0; color: #f57c00;">📅 Short-Term Actions:</h4>
        <ul style="margin: 5px 0; padding-left: 20px;">
          ${shortTerm.map(action => `<li>${action}</li>`).join('\n          ')}
        </ul>
      </div>
    `;
  }

  if (longTerm.length > 0) {
    html += `
      <div style="margin: 10px 0; padding: 10px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px;">
        <h4 style="margin: 0 0 10px 0; color: #2e7d32;">🎯 Long-Term Solutions:</h4>
        <ul style="margin: 5px 0; padding-left: 20px;">
          ${longTerm.map(solution => `<li>${solution}</li>`).join('\n          ')}
        </ul>
      </div>
    `;
  }

  return html || '<li>Continue monitoring current state</li>';
}

// Format root cause analysis
function formatRootCause(rootCause) {
  if (!rootCause || !rootCause.primary_cause) {
    return '<div style="padding: 10px; text-align: center;">Root cause analysis not available</div>';
  }

  return `
    <div style="padding: 15px; background: #fff8e1; border-left: 4px solid #ffa726; border-radius: 4px;">
      <h4 style="margin: 0 0 10px 0; color: #f57c00;">🔍 Primary Cause:</h4>
      <p style="margin: 0 0 15px 0; font-size: 14px;"><strong>${rootCause.primary_cause}</strong></p>

      ${rootCause.service_root ? `
        <div style="margin: 10px 0;">
          <strong>Root Service:</strong> ${rootCause.service_root}
        </div>
      ` : ''}

      ${rootCause.affected_chains && rootCause.affected_chains.length > 0 ? `
        <div style="margin: 10px 0;">
          <strong>Affected Chains:</strong> ${rootCause.affected_chains.join(', ')}
        </div>
      ` : ''}

      ${rootCause.contributing_factors && rootCause.contributing_factors.length > 0 ? `
        <div style="margin: 10px 0;">
          <strong>Contributing Factors:</strong>
          <ul style="margin: 5px 0; padding-left: 20px;">
            ${rootCause.contributing_factors.map(factor => `<li>${factor}</li>`).join('\n            ')}
          </ul>
        </div>
      ` : ''}

      ${rootCause.evidence && rootCause.evidence.length > 0 ? `
        <div style="margin: 10px 0;">
          <strong>Evidence:</strong>
          <ul style="margin: 5px 0; padding-left: 20px;">
            ${rootCause.evidence.map(evidence => `<li>${evidence}</li>`).join('\n            ')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
}

// ============= GENERATE JIRA TICKET HTML =============

const ticketTitle = generateTicketTitle(totalErrors, affectedServices, isIncident, deepAnalysis);
const jiraPriority = getJiraPriority(overallStatus, isIncident);
const jiraLabels = generateJiraLabels(affectedServices, deepAnalysis, isIncident, overallStatus);

const jiraTicketHtml = `
<div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto;">

  <!-- INCIDENT SUMMARY -->
  <div style="border: 2px solid ${isIncident ? '#d32f2f' : '#2196f3'}; border-radius: 8px; margin: 10px 0; background: ${isIncident ? '#ffebee' : '#e3f2fd'};">
    <div style="background: ${isIncident ? '#d32f2f' : '#2196f3'}; color: white; padding: 12px; font-weight: bold; border-radius: 6px 6px 0 0;">
      ${isIncident ? '🚨 INCIDENT SUMMARY' : '📊 DISTRIBUTED TRACE ANALYSIS'}
    </div>
    <div style="padding: 15px; background: white; border-radius: 0 0 6px 6px;">
      <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
        <tr><td style="font-weight: bold; width: 180px; padding: 5px;">Analysis ID:</td><td style="padding: 5px;">${analysisId}</td></tr>
        <tr><td style="font-weight: bold; padding: 5px;">Type:</td><td style="padding: 5px;">${isIncident ? 'Incident' : 'Trace Analysis'}</td></tr>
        <tr><td style="font-weight: bold; padding: 5px;">Overall Status:</td><td style="padding: 5px;">${getSeverityDisplay(overallStatus)}</td></tr>
        <tr><td style="font-weight: bold; padding: 5px;">Total Errors:</td><td style="padding: 5px;"><strong style="color: #d32f2f;">${totalErrors}</strong></td></tr>
        <tr><td style="font-weight: bold; padding: 5px;">Affected Services:</td><td style="padding: 5px;">${affectedServices.length} services</td></tr>
        <tr><td style="font-weight: bold; padding: 5px;">Critical Services:</td><td style="padding: 5px;">${criticalServices.join(', ') || 'None'}</td></tr>
        <tr><td style="font-weight: bold; padding: 5px;">Impact Score:</td><td style="padding: 5px;">${serviceAnalysis.impactScore || 0}</td></tr>
        <tr><td style="font-weight: bold; padding: 5px;">Critical Path Affected:</td><td style="padding: 5px;">${serviceAnalysis.criticalPathAffected ? `⚠️ YES (${serviceAnalysis.affectedPath})` : '✓ No'}</td></tr>
        <tr><td style="font-weight: bold; padding: 5px;">Source:</td><td style="padding: 5px;">${analysisContext.source || 'Unknown'}</td></tr>
        <tr><td style="font-weight: bold; padding: 5px;">Priority:</td><td style="padding: 5px;">${analysisContext.priority || 'Normal'}</td></tr>
      </table>
    </div>
  </div>

  <!-- EXECUTIVE SUMMARY -->
  <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-left: 4px solid #607d8b; border-radius: 4px;">
    <h3 style="margin: 0 0 10px 0; color: #455a64;">📝 Executive Summary</h3>
    <p style="margin: 0; line-height: 1.6;">${healthCheck.summary || 'No summary available'}</p>

    ${executiveSummary.mainIssues && executiveSummary.mainIssues.length > 0 ? `
      <div style="margin-top: 10px;">
        <strong>Main Issues:</strong>
        <ul style="margin: 5px 0; padding-left: 20px;">
          ${executiveSummary.mainIssues.map(issue => `<li>${issue}</li>`).join('\n          ')}
        </ul>
      </div>
    ` : ''}
  </div>

  <!-- SERVICE ERROR BREAKDOWN -->
  <div style="margin: 20px 0;">
    <h2 style="color: #f57c00; border-bottom: 2px solid #ff9800; padding-bottom: 10px;">
      🔍 Service Error Analysis
    </h2>

    <table style="width: 100%; border-collapse: collapse; margin: 10px 0; border: 1px solid #e0e0e0;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e0e0e0;">Service</th>
          <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e0e0e0;">Error Count</th>
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e0e0e0;">Error Types</th>
          <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e0e0e0;">Criticality</th>
          <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e0e0e0;">SLA Violation</th>
        </tr>
      </thead>
      <tbody>
        ${formatServiceErrors(serviceAnalysis.errorsByService)}
      </tbody>
    </table>

    ${healthCheck.errorReconciliation ? `
      <div style="margin: 15px 0; padding: 10px; background: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px;">
        <h4 style="margin: 0 0 10px 0; color: #1976d2;">📊 Error Discovery:</h4>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Stage 1 (Health Check): ${healthCheck.errorReconciliation.stage1Errors} errors</li>
          <li>Stage 2 (Deep Analysis): +${healthCheck.errorReconciliation.stage2AdditionalErrors} additional errors</li>
          <li><strong>Total After Deep Analysis: ${healthCheck.errorReconciliation.totalAfterDeepAnalysis} errors</strong></li>
        </ul>
      </div>
    ` : ''}
  </div>

  <!-- ROOT CAUSE ANALYSIS -->
  ${deepAnalysis?.rootCause ? `
  <div style="margin: 20px 0;">
    <h2 style="color: #9c27b0; border-bottom: 2px solid #9c27b0; padding-bottom: 10px;">
      🎯 Root Cause Analysis
    </h2>
    ${formatRootCause(deepAnalysis.rootCause)}
  </div>
  ` : ''}

  <!-- DEPENDENCY CHAIN FAILURES -->
  ${deepAnalysis?.findings?.service_dependencies ? `
  <div style="margin: 20px 0;">
    <h2 style="color: #d32f2f; border-bottom: 2px solid #d32f2f; padding-bottom: 10px;">
      ⛓️ Dependency Chain Analysis
    </h2>

    ${deepAnalysis.findings.service_dependencies.failed_chains?.length > 0 ? `
      <div style="margin: 15px 0; padding: 15px; background: #ffebee; border-left: 4px solid #d32f2f; border-radius: 4px;">
        <h4 style="margin: 0 0 10px 0; color: #c62828;">🔴 Failed Dependency Chains:</h4>
        <ul style="margin: 5px 0; padding-left: 20px;">
          ${formatDependencyChainFailures(deepAnalysis.findings.service_dependencies.failed_chains)}
        </ul>
      </div>
    ` : ''}

    ${deepAnalysis.findings.service_dependencies.cascade_failures?.length > 0 ? `
      <div style="margin: 15px 0; padding: 15px; background: #fff3e0; border-left: 4px solid #ff9800; border-radius: 4px;">
        <h4 style="margin: 0 0 10px 0; color: #f57c00;">🌊 Cascade Failures:</h4>
        <ul style="margin: 5px 0; padding-left: 20px;">
          ${formatCascadeFailures(deepAnalysis.findings.service_dependencies.cascade_failures)}
        </ul>
      </div>
    ` : ''}
  </div>
  ` : ''}

  <!-- PERFORMANCE ISSUES -->
  ${deepAnalysis?.findings?.performance?.service_latencies ? `
  <div style="margin: 20px 0;">
    <h2 style="color: #ff5722; border-bottom: 2px solid #ff5722; padding-bottom: 10px;">
      ⚡ Performance Issues
    </h2>

    <table style="width: 100%; border-collapse: collapse; margin: 10px 0; border: 1px solid #e0e0e0;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e0e0e0;">Service</th>
          <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e0e0e0;">P95 Latency</th>
          <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e0e0e0;">SLA Violation</th>
        </tr>
      </thead>
      <tbody>
        ${formatPerformanceIssues(deepAnalysis.findings.performance.service_latencies)}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- RECOMMENDATIONS -->
  ${deepAnalysis?.recommendations ? `
  <div style="margin: 20px 0;">
    <h2 style="color: #2196f3; border-bottom: 2px solid #2196f3; padding-bottom: 10px;">
      💡 Recommendations
    </h2>
    ${formatRecommendations(deepAnalysis.recommendations)}
  </div>
  ` : ''}

  <!-- AFFECTED COMPONENTS -->
  ${deepAnalysis?.affectedComponents ? `
  <div style="margin: 20px 0; padding: 15px; background: #fafafa; border-radius: 4px;">
    <h3 style="margin: 0 0 10px 0; color: #607d8b;">🎯 Affected Components</h3>
    <ul style="margin: 0; padding-left: 20px;">
      ${deepAnalysis.affectedComponents.services?.length > 0 ? `
        <li><strong>Services:</strong> ${deepAnalysis.affectedComponents.services.join(', ')}</li>
      ` : ''}
      ${deepAnalysis.affectedComponents.endpoints?.length > 0 ? `
        <li><strong>Endpoints:</strong> ${deepAnalysis.affectedComponents.endpoints.join(', ')}</li>
      ` : ''}
      ${deepAnalysis.affectedComponents.databases?.length > 0 ? `
        <li><strong>Databases:</strong> ${deepAnalysis.affectedComponents.databases.join(', ')}</li>
      ` : ''}
      ${deepAnalysis.affectedComponents.estimated_users_impacted ? `
        <li><strong>Estimated Users Impacted:</strong> ${deepAnalysis.affectedComponents.estimated_users_impacted}</li>
      ` : ''}
    </ul>
  </div>
  ` : ''}

  <!-- TOOLS & EXECUTION -->
  ${deepAnalysis?.toolsExecuted?.length > 0 ? `
  <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-left: 4px solid #607d8b; border-radius: 4px;">
    <h4 style="margin: 0 0 10px 0; color: #455a64;">🔧 Analysis Tools Executed:</h4>
    <ul style="margin: 0; padding-left: 20px;">
      ${deepAnalysis.toolsExecuted.map(tool => `<li>${tool}</li>`).join('\n      ')}
    </ul>
  </div>
  ` : ''}

  <!-- FOOTER -->
  <div style="text-align: center; margin-top: 30px; padding: 15px; background: #f5f5f5; border-radius: 6px; font-size: 12px; color: #666;">
    <div style="margin-bottom: 5px;"><strong>Auto-Generated by TempoFlow</strong></div>
    <div>Analysis Timestamp: ${timestamp ? new Date(timestamp).toLocaleString('en-US') : new Date().toLocaleString('en-US')}</div>
    <div>Workflow Execution ID: ${workflowExecutionId || 'unknown'}</div>
    <div>Deep Analysis: ${inputData.deepAnalysisPerformed ? '✓ Performed' : '✗ Not Required'}</div>
    <div>Confidence Level: ${((executiveSummary.analysisQuality?.confidenceLevel || 0.5) * 100).toFixed(0)}%</div>
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
  components: affectedServices.slice(0, 10), // Limit to 10 components
  issueType: isIncident ? "Incident" : "Task",

  // Custom fields
  customFields: {
    analysisId: analysisId,
    workflowExecutionId: workflowExecutionId,
    isIncident: isIncident,
    overallStatus: overallStatus,
    totalErrors: totalErrors,
    affectedServicesCount: affectedServices.length,
    criticalServicesCount: criticalServices.length,
    impactScore: serviceAnalysis.impactScore,
    criticalPathAffected: serviceAnalysis.criticalPathAffected,
    deepAnalysisPerformed: inputData.deepAnalysisPerformed || false,
    confidenceLevel: executiveSummary.analysisQuality?.confidenceLevel,
    cascadeFailures: deepAnalysis?.findings?.service_dependencies?.cascade_failures?.length || 0,
    dependencyChainFailures: deepAnalysis?.findings?.service_dependencies?.failed_chains?.length || 0,
    slaViolations: Object.values(serviceAnalysis.errorsByService || {}).filter(s => s.slaViolation).length,
    source: analysisContext.source,
    priority: analysisContext.priority,
    orchestratorId: analysisContext.orchestratorId
  },

  // Service errors summary
  serviceErrors: Object.entries(serviceAnalysis.errorsByService || {}).map(([service, data]) => ({
    service: service,
    errorCount: data.errorCount,
    errorTypes: data.errorTypes,
    criticality: data.criticality,
    slaViolation: data.slaViolation,
    source: data.source
  })),

  // Root cause summary
  rootCause: deepAnalysis?.rootCause ? {
    primaryCause: deepAnalysis.rootCause.primary_cause,
    serviceRoot: deepAnalysis.rootCause.service_root,
    affectedChains: deepAnalysis.rootCause.affected_chains,
    evidenceCount: deepAnalysis.rootCause.evidence?.length || 0
  } : null,

  // Recommendations summary
  recommendations: {
    immediate: deepAnalysis?.recommendations?.immediate_actions || executiveSummary.immediateActions || [],
    shortTerm: deepAnalysis?.recommendations?.short_term || [],
    longTerm: deepAnalysis?.recommendations?.long_term || []
  },

  // Metadata
  metadata: {
    generatedAt: new Date().toISOString(),
    generatedBy: 'TempoFlow-v1.0',
    analysisTimestamp: timestamp,
    healthCheckStatus: healthCheck.status,
    errorReconciliation: healthCheck.errorReconciliation
  }
};

console.log("=== JIRA TICKET GENERATED ===");
console.log("Title:", ticketTitle);
console.log("Priority:", jiraPriority);
console.log("Labels:", jiraLabels.length);
console.log("Service errors included:", Object.keys(serviceAnalysis.errorsByService || {}).length);

// Pass through ALL data from Node 9 + add jiraTicket field
return {
  json: {
    ...inputData,  // Pass through complete Node 9 output
    jiraTicket: jiraTicket,
    htmlContent: jiraTicketHtml,
    summary: {
      title: ticketTitle,
      priority: jiraPriority,
      issueType: jiraTicket.issueType,
      labelsCount: jiraLabels.length,
      errorsCount: totalErrors,
      affectedServicesCount: affectedServices.length,
      criticalServicesCount: criticalServices.length
    }
  }
};
