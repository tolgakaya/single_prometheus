// Enhanced Normalize Alerts - Supports all AlertManager webhook formats
const input = $input.item.json;
let normalizedAlert = {};

// === Priority Extractors ===
function extractPriorityFromEmail(email) {
  const subject = (email.subject || '').toLowerCase();
  const body = (email.textContent || '').toLowerCase();

  if (subject.includes('[critical]') || subject.includes('[p1]') || body.includes('critical')) {
    return 'critical';
  } else if (subject.includes('[high]') || subject.includes('[p2]') || body.includes('high priority')) {
    return 'high';
  } else if (subject.includes('[low]') || subject.includes('[p4]')) {
    return 'low';
  }
  return 'medium';
}

function extractPriorityFromTeams(message) {
  const content = (message.body?.content || '').toLowerCase();

  if (content.includes('critical') || content.includes('urgent')) {
    return 'critical';
  } else if (content.includes('warning')) {
    return 'high';
  }
  return 'medium';
}

// === Title Extractor ===
function extractTitleFromTeams(message) {
  const content = message.body?.content || '';
  const firstLine = content.split('\n')[0];
  return firstLine.substring(0, 100) || 'Teams Alert';
}

// === AlertManager Priority Mapper ===
function mapAlertManagerSeverity(severity) {
  const severityLower = (severity || '').toLowerCase();
  
  // Map different severity formats
  if (severityLower.includes('blocker') || severityLower.includes('critical')) {
    return 'critical';
  } else if (severityLower.includes('major') || severityLower.includes('high')) {
    return 'high';
  } else if (severityLower.includes('warning') || severityLower.includes('minor')) {
    return 'medium';
  } else if (severityLower.includes('info') || severityLower.includes('low')) {
    return 'low';
  }
  
  return 'medium'; // default
}

// === Service Extractor ===
function extractServiceFromPod(podName) {
  if (!podName) return null;
  
  // Remove common suffixes: -<hash>-<pod-id>
  // Example: bss-ntf-batch-t3-645d68cbc8-4h88r -> bss-ntf-batch-t3
  const parts = podName.split('-');
  
  // If it looks like a deployment pod (has hash pattern)
  if (parts.length >= 3) {
    // Check if last two parts look like hash and pod-id
    const lastPart = parts[parts.length - 1];
    const secondLastPart = parts[parts.length - 2];
    
    // If secondLastPart looks like a hash (8+ alphanumeric chars)
    if (secondLastPart && /^[a-z0-9]{8,}$/i.test(secondLastPart)) {
      return parts.slice(0, -2).join('-');
    }
  }
  
  // Fallback: return first part as service name
  return parts[0];
}

// === Parse AlertManager Format ===
function parseAlertManagerData(data) {
  let alert = null;
  let labels = {};
  let annotations = {};
  
  // Handle different AlertManager formats
  if (data.alerts && Array.isArray(data.alerts) && data.alerts.length > 0) {
    // Standard AlertManager webhook format
    alert = data.alerts[0];
    labels = alert.labels || {};
    annotations = alert.annotations || {};
  } else if (data.commonLabels) {
    // AlertManager format with commonLabels
    labels = data.commonLabels || {};
    annotations = data.commonAnnotations || {};
    alert = {
      status: data.status || 'firing',
      startsAt: data.alerts?.[0]?.startsAt,
      endsAt: data.alerts?.[0]?.endsAt,
      generatorURL: data.alerts?.[0]?.generatorURL,
      fingerprint: data.alerts?.[0]?.fingerprint
    };
  } else if (data.labels) {
    // Direct alert object
    alert = data;
    labels = data.labels || {};
    annotations = data.annotations || {};
  }
  
  return { alert, labels, annotations };
}

// === Input Parsing ===

// 1. Check for AlertManager webhook body format
if (input.body && (input.body.alerts || input.body.commonLabels || input.body.version)) {
  const { alert, labels, annotations } = parseAlertManagerData(input.body);
  
  console.log('=== ALERTMANAGER WEBHOOK FORMAT DETECTED ===');
  console.log('AlertName:', labels.alertname || 'UNKNOWN');
  console.log('Container:', labels.container || 'NONE');
  console.log('Pod:', labels.pod || 'NONE');
  console.log('Namespace:', labels.namespace || 'NONE');
  
  // Extract service from pod name if service not provided
  const service = labels.service || extractServiceFromPod(labels.pod);
  
  normalizedAlert = {
    source: 'alertmanager',
    sourceId: 'alertmanager-' + Date.now(),
    timestamp: alert?.startsAt || new Date().toISOString(),
    title: labels.alertname || 'AlertManager Alert',
    body: annotations.description || annotations.summary || JSON.stringify(input.body),
    sender: 'AlertManager',
    priority: mapAlertManagerSeverity(labels.severity),

    // Kubernetes fields
    // NOTE: Infrastructure alerts (KubeAPIDown) don't have namespace labels - this is NORMAL
    // We keep namespace as null here, and Node 5 will handle multi-namespace queries
    container: labels.container || null,
    pod: labels.pod || null,
    namespace: labels.namespace || null,
    service: service,
    deployment: labels.deployment || null,
    
    // Additional fields from various alert types
    instance: labels.instance || null,
    job: labels.job || null,
    node: labels.node || null,
    persistentvolumeclaim: labels.persistentvolumeclaim || null,
    volumename: labels.volumename || null,
    cluster: labels.cluster || null,
    
    // Alert metadata
    alertname: labels.alertname || null,
    status: alert?.status || input.body.status || 'firing',
    reason: labels.reason || null,
    uid: labels.uid || null,
    fingerprint: alert?.fingerprint || null,
    generatorURL: alert?.generatorURL || null,
    runbook_url: annotations.runbook_url || null,
    
    // Store original for debugging
    raw: input
  };
}

// 2. Check for simple AlertManager array format (backward compatibility)
else if (Array.isArray(input) && input[0]?.labels) {
  const alert = input[0];
  console.log('=== ALERTMANAGER ARRAY FORMAT DETECTED ===');
  
  const service = alert.labels?.service || extractServiceFromPod(alert.labels?.pod);
  
  normalizedAlert = {
    source: 'alertmanager',
    sourceId: 'alertmanager-' + Date.now(),
    timestamp: alert.startsAt || new Date().toISOString(),
    title: alert.labels?.alertname || alert.annotations?.summary || 'AlertManager Alert',
    body: alert.annotations?.description || JSON.stringify(alert),
    sender: 'AlertManager',
    priority: mapAlertManagerSeverity(alert.labels?.severity),
    container: alert.labels?.container || null,
    pod: alert.labels?.pod || null,
    namespace: alert.labels?.namespace || null,  // Keep null for infrastructure alerts
    service: service,
    deployment: alert.labels?.deployment || null,
    alertname: alert.labels?.alertname || null,
    status: alert.status || 'firing',
    raw: input
  };
}

// 3. Email format
else if (input.from && input.subject && input.textContent) {
  normalizedAlert = {
    source: 'email',
    sourceId: input.id,
    timestamp: input.date || new Date().toISOString(),
    title: input.subject,
    body: input.textContent || input.htmlContent || '',
    sender: input.from?.value?.[0]?.address || input.from,
    priority: extractPriorityFromEmail(input),
    container: null,
    pod: null,
    namespace: null,
    service: null,
    raw: input
  };
}

// 4. Teams format
else if (input.body?.content && input.channelIdentity) {
  normalizedAlert = {
    source: 'teams',
    sourceId: input.id,
    timestamp: input.createdDateTime || new Date().toISOString(),
    title: extractTitleFromTeams(input),
    body: input.body.content,
    sender: input.from?.user?.displayName || 'Teams Alert',
    priority: extractPriorityFromTeams(input),
    container: null,
    pod: null,
    namespace: null,
    service: null,
    raw: input
  };
}

// 5. Generic webhook format
else if (input.alertType || input.alert || input.webhook) {
  normalizedAlert = {
    source: 'webhook',
    sourceId: input.id || ('webhook-' + Date.now()),
    timestamp: input.timestamp || new Date().toISOString(),
    title: input.title || input.alertName || 'Webhook Alert',
    body: input.message || input.description || JSON.stringify(input),
    sender: input.source || 'Webhook',
    priority: input.priority || input.severity || 'medium',
    container: input.container || input.labels?.container || null,
    pod: input.pod || input.labels?.pod || null,
    namespace: input.namespace || input.labels?.namespace || null,
    service: input.service || input.labels?.service || null,
    raw: input
  };
}

// 6. Unknown format
else {
  normalizedAlert = {
    source: 'unknown',
    sourceId: 'unknown-' + Date.now(),
    timestamp: new Date().toISOString(),
    title: 'Unknown Alert',
    body: JSON.stringify(input),
    sender: 'Unknown',
    priority: 'medium',
    container: null,
    pod: null,
    namespace: null,
    service: null,
    raw: input
  };
}

// === Final Output ===
console.log('=== NORMALIZED ALERT OUTPUT ===');
console.log('Source:', normalizedAlert.source);
console.log('AlertName:', normalizedAlert.alertname || 'NONE');
console.log('Container:', normalizedAlert.container || 'NONE');
console.log('Pod:', normalizedAlert.pod || 'NONE');
console.log('Service:', normalizedAlert.service || 'NONE');
console.log('Namespace:', normalizedAlert.namespace || 'NONE');
console.log('Priority:', normalizedAlert.priority);

return { json: normalizedAlert };