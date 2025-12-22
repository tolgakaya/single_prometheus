// Prepare Redis Data Node - UPDATED VERSION
// Purpose: Prepare data structure to be saved in Redis
// This node runs AFTER Redis State Check, so we know if alert is new or existing

const alert = $input.item.json;
const now = Date.now();

// Validate fingerprint exists
if (!alert.fingerprint) {
  throw new Error('Fingerprint is missing! Check Process Results & Decision node.');
}

// ============= DETERMINE TTL BASED ON SEVERITY =============
const ttlBySeverity = {
  'critical': 86400,     // 1 day (critical issues should be resolved quickly)
  'degraded': 259200,    // 3 days
  'warning': 604800,     // 7 days
  'healthy': 1209600,    // 14 days (shouldn't happen for alerts)
  'unknown': 604800      // 7 days (default)
};

const ttl = ttlBySeverity[alert.alertSummary?.severity] || 604800;

// ============= PREPARE REDIS DATA STRUCTURE =============

// Get Jira ticket info if it exists
// For NEW alerts: ticket will be created AFTER this node, so we won't have ticket info yet
// For EXISTING alerts: we already have ticket info from Redis State Check
let jiraTicketId = '';
let jiraTicketKey = '';

if (alert.dedupStatus === 'existing' && alert.existingTicket) {
  jiraTicketId = alert.existingTicket.id || '';
  jiraTicketKey = alert.existingTicket.key || '';
}

const redisData = {
  // Alert identification
  alert_fingerprint: alert.fingerprint,
  
  // Timestamps
  first_seen: alert.dedupStatus === 'new' 
    ? now.toString() 
    : (alert.existingTicket?.firstSeen || now).toString(),
  
  last_seen: now.toString(),
  
  // Occurrence tracking
  occurrence_count: alert.dedupStatus === 'new' 
    ? '1' 
    : (alert.metrics?.totalOccurrences || 1).toString(),
  
  // Status
  status: 'active',
  
  // Alert details
  severity: alert.alertSummary?.severity || 'unknown',
  title: alert.alertSummary?.title || 'Unknown Alert',
  source: alert.alertSummary?.source || 'kubernetes',
  component: alert.kubernetesAnalysis?.deployment || 'unknown',
  namespace: alert.kubernetesAnalysis?.namespace || 'unknown',
  
  // Jira ticket info (will be empty for new alerts initially)
  jira_ticket_id: jiraTicketId,
  jira_ticket_key: jiraTicketKey,
  
  // Call tracking (for future phone call feature)
  call_count: (alert.existingTicket?.callCount || 0).toString(),
  last_call_time: (alert.existingTicket?.lastCallTime || 0).toString(),
  
  // Metadata
  context_id: alert.kubernetesAnalysis?.contextId || '',
  confidence: (alert.kubernetesAnalysis?.confidence || 0).toString(),
  escalated: alert.actions?.escalate ? 'true' : 'false',
  
  // Timestamp
  updated_at: new Date().toISOString()
};

// ============= PREPARE OUTPUT =============
return {
  json: {
    // Redis key-value pair
    key: `alert:${alert.fingerprint}`,
    value: JSON.stringify(redisData),
    ttl: ttl,
    
    // Pass through alert data for next nodes
    alert: alert,
    fingerprint: alert.fingerprint,
    dedupStatus: alert.dedupStatus,
    
    // Debug info
    _debug: {
      redisOperation: alert.dedupStatus === 'new' ? 'CREATE' : 'UPDATE',
      ttlSeconds: ttl,
      ttlHours: Math.round(ttl / 3600),
      severity: alert.alertSummary?.severity,
      occurrenceCount: redisData.occurrence_count
    }
  }
};
