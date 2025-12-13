// Process Kubernetes Analysis Results - Jira Integration
const analysisResult = $input.item.json;
const alertData = $node["Prepare Prometheus Input"].json;
const dedupInfo = $node["Redis State Check"].json;

// Analysis result'tan Jira ticket bilgilerini al
//const jiraTicketInfo = analysisResult.jiraTicket || {};
const jiraTicketInfo = analysisResult.oncallTicket || {};
const executiveSummary = analysisResult.executiveSummary || {};

// Extract analysis report - yeni yapıda markdownReport kullanıyoruz
let analysisReport = null;
if (analysisResult.markdownReport) {
 analysisReport = analysisResult.markdownReport;
} else if (analysisResult.chatResponse) {
 analysisReport = analysisResult.chatResponse;
} else if (analysisResult.summary) {
 analysisReport = analysisResult.summary;
} else {
 analysisReport = 'Analysis completed - no detailed report available';
}

// Extract severity - yeni yapıda direkt severity field'ı var
const severity = analysisResult.severity || 
               executiveSummary.severity ||
               alertData.priority || 
               'medium';

// Extract alert info from new structure
const alertName = analysisResult.alert || 
                alertData.alertContext?.alertName || 
                'Unknown Alert';

const deployment = jiraTicketInfo.components?.[0] || 
                 analysisResult.deployment || 
                 'unknown';

const namespace = jiraTicketInfo.labels?.find(l => l.includes('production') || l.includes('staging')) || 
                analysisResult.namespace || 
                'unknown';

// Determine if we need to create a Jira ticket
const needsJiraTicket = shouldCreateJiraTicket(analysisResult, alertData, dedupInfo);

// Prepare the output
const output = {
 needsJiraTicket: needsJiraTicket && dedupInfo.dedupStatus === 'new',
 alertSummary: {
   alertId: alertData.alertContext?.alertId || analysisResult.contextId,
   source: alertData.source || 'kubernetes',
   title: alertName,
   detectedAt: new Date().toISOString(),
   severity: severity,
   businessImpact: analysisResult.impact || 'Service degradation detected',
   identifiedIssue: analysisResult.identifiedIssue || 'Issue under investigation'
 },
 kubernetesAnalysis: {
   contextId: analysisResult.contextId || executiveSummary.contextId,
   confidence: analysisResult.confidence || 0.5,
   deployment: deployment,
   namespace: namespace,
   pod: analysisResult.pod || 'unknown',
   timeline: analysisResult.timeline || [],
   metrics: analysisResult.metrics || {},
   evidence: analysisResult.evidence || {},
   actions: analysisResult.actions || []
 },
 report: analysisReport,
 jiraTicketData: needsJiraTicket && dedupInfo.dedupStatus === 'new' ? 
   prepareJiraTicketData(analysisResult, alertData, jiraTicketInfo) : null
};

// Existing ticket update case
if (dedupInfo.dedupStatus === 'existing' && dedupInfo.existingTicket?.key) {
 output.jiraTicketData = {
   ...output.jiraTicketData,
   existingKey: dedupInfo.existingTicket.key,
   isUpdate: true,
   updateComment: createUpdateComment(analysisResult)
 };
}

// Helper functions
function shouldCreateJiraTicket(result, alertData, dedupInfo) {
 const severity = result.severity;
 const confidence = result.confidence || 0;
 
 return (
   severity === 'critical' ||
   severity === 'high' ||
   confidence >= 0.75 ||
   result.identifiedIssue !== 'Issue Under Investigation' ||
   alertData.priority === 'critical' ||
   (result.metrics && Object.keys(result.metrics).length > 0)
 );
}

function prepareJiraTicketData(result, alertData, jiraTicketInfo) {
 // Use the pre-formatted title and description from analysis
 const title = jiraTicketInfo.title || 
              `[${result.alert || alertData.alertContext?.alertName}] ${result.deployment || 'Service'} - ${result.identifiedIssue || 'Investigation Required'}`;
 
 const description = jiraTicketInfo.description || 
                    result.markdownReport || 
                    createBasicDescription(result, alertData);
 
 // Combine labels from analysis and alert data
 const labels = [
   ...(jiraTicketInfo.labels || []),
   `alert-${alertData.source || 'kubernetes'}`,
   `confidence-${Math.round((result.confidence || 0.5) * 100)}`,
   result.contextId ? `context-${result.contextId}` : null,
   'k8s-analysis',
   'auto-generated'
 ].filter(Boolean);
 
 // Map components
 const components = jiraTicketInfo.components || [];
 if (result.deployment && result.deployment !== 'unknown') {
   components.push(result.deployment);
 }
 
 return {
   project: 'INCIDENT',
   issueType: jiraTicketInfo.issueType || 'Incident',
   summary: title,
   description: description,
   priority: mapSeverityToJiraPriority(result.severity || alertData.priority),
   labels: [...new Set(labels)], // Remove duplicates
   components: [...new Set(components)], // Remove duplicates
   customFields: {
     // Add any custom field mappings your Jira instance needs
     ...(jiraTicketInfo.customFields || {}),
     'customfield_10001': result.contextId, // Context ID
     'customfield_10002': result.confidence, // Confidence level
     'customfield_10003': result.namespace, // Kubernetes namespace
     'customfield_10004': result.pod, // Pod name
     'customfield_10005': result.identifiedIssue, // Root cause
     'customfield_10006': result.actions?.[0]?.command || '', // Remediation command
     'customfield_10007': result.timeline?.length || 0, // Analysis stages
     'customfield_10008': new Date().toISOString(), // Analysis timestamp
   },
   // Additional fields for remediation tracking
   duedate: calculateDueDate(result.severity),
   environment: result.namespace?.includes('production') ? 'Production' : 
               result.namespace?.includes('staging') ? 'Staging' : 'Development',
   // Attachments - remediation commands as text file
   attachments: createAttachments(result)
 };
}

function mapSeverityToJiraPriority(severity) {
 const mapping = {
   'critical': 'Highest',
   'high': 'High',
   'medium': 'Medium',
   'low': 'Low',
   'warning': 'Low'
 };
 return mapping[severity] || 'Medium';
}

function calculateDueDate(severity) {
 const now = new Date();
 const hoursToAdd = {
   'critical': 4,
   'high': 24,
   'medium': 72,
   'low': 168 // 1 week
 };
 
 now.setHours(now.getHours() + (hoursToAdd[severity] || 72));
 return now.toISOString().split('T')[0]; // YYYY-MM-DD format
}

function createBasicDescription(result, alertData) {
 return `
# Kubernetes Incident Report

## Alert Information
- **Alert**: ${result.alert || alertData.alertContext?.alertName}
- **Severity**: ${result.severity}
- **Confidence**: ${(result.confidence * 100).toFixed(0)}%
- **Issue**: ${result.identifiedIssue || 'Under investigation'}

## Impact
${result.impact || 'Service degradation detected'}

## Evidence
${typeof result.evidence === 'string' ? result.evidence : JSON.stringify(result.evidence, null, 2)}

## Recommended Actions
${result.actions?.map((action, idx) => 
 `${idx + 1}. ${action.action}\n   Command: ${action.command}\n   Risk: ${action.risk}`
).join('\n\n') || 'No automated actions available'}

## Timeline
${result.timeline?.map(entry => 
 `- ${entry.time}: ${entry.stage} - ${entry.finding}`
).join('\n') || 'No timeline available'}

---
Generated: ${new Date().toISOString()}
Context ID: ${result.contextId || 'N/A'}
`;
}

function createUpdateComment(result) {
 return `
## 🔄 Incident Update

**Analysis Re-run at**: ${new Date().toISOString()}
**Context ID**: ${result.contextId}

### Current Status
- **Issue**: ${result.identifiedIssue}
- **Confidence**: ${(result.confidence * 100).toFixed(0)}%
- **Severity**: ${result.severity}

### Latest Metrics
${Object.entries(result.metrics || {}).slice(0, 5).map(([key, value]) => 
 `- ${key}: ${value}`
).join('\n')}

### Recommended Action
${result.actions?.[0] ? 
 `${result.actions[0].action}\nCommand: \`${result.actions[0].command}\`` : 
 'Continue monitoring'}
`;
}

function createAttachments(result) {
 const attachments = [];
 
 // Create remediation commands file
 if (result.actions && result.actions.length > 0) {
   const commandsContent = result.actions.map(action => 
     `# ${action.action}\n${action.command}\n\n# Expected outcome: ${action.expected_outcome || 'N/A'}\n# Risk: ${action.risk || 'Unknown'}\n# ETA: ${action.estimated_time || 'Unknown'}\n\n`
   ).join('---\n\n');
   
   attachments.push({
     filename: 'remediation-commands.sh',
     content: commandsContent,
     mimeType: 'text/plain'
   });
 }
 
 // Create monitoring commands file if quickActions exist
 if (result.executiveSummary?.quickActions) {
   const monitoringContent = Object.entries(result.executiveSummary.quickActions)
     .map(([action, command]) => `# ${action}\n${command}\n\n`)
     .join('');
   
   attachments.push({
     filename: 'monitoring-commands.sh',
     content: monitoringContent,
     mimeType: 'text/plain'
   });
 }
 
 // Create full analysis report
 if (result.markdownReport) {
   attachments.push({
     filename: 'full-analysis-report.md',
     content: result.markdownReport,
     mimeType: 'text/markdown'
   });
 }
 
 return attachments;
}

return { json: output };