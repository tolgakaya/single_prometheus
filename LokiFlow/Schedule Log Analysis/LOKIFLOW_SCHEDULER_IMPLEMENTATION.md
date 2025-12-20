# LokiFlow Scheduler Implementation Guide

## Overview

This document explains the complete adaptation of the Scheduler flow from FreePrometheus (metrics-based) to LokiFlow (log-based analysis) with multi-problem fingerprinting support.

## Key Changes Summary

### 1. Workflow Target Change
- **Old**: Triggers FreePrometheus workflow (`ysMD5nc5K6RCPF0Q`)
- **New**: Triggers LokiFlow workflow (`ryE6NaIe6kvlIeRF`)

### 2. Data Structure Transformation

**Prometheus Output Structure**:
```javascript
{
  executiveSummary: {overallHealth, alertsActive, alertsCritical},
  findings: {rootCause, affectedServices, diagnosticEvidence},
  actions: {immediate, shortTerm, longTerm},
  contextTracking: {contextId}
}
```

**LokiFlow Output Structure**:
```javascript
{
  jiraTicket: {title, description, priority, labels, issues, actions},
  metadata: {analysisId, workflowExecutionId, stagesExecuted},
  timeContext: {requestedRange, source},
  incidentEvaluation: {isIncident, severity, errorRate, errorCount},
  consolidatedFindings: {identifiedIssues[], affectedServices[], severity},
  actionableInsights: {immediateActions, monitoringGaps, processImprovements}
}
```

## Fingerprint Strategy

### Prometheus Fingerprint (Single Problem)
```javascript
const fingerprintData = {
  component: findings.rootCause?.component,      // e.g., "pod-scheduler"
  issueType: findings.rootCause?.issue (first 3 words),  // e.g., "high memory usage"
  namespace: findings.affectedServices?.[0],     // e.g., "production"
  severity: executiveSummary.overallHealth       // e.g., "critical"
};
```

**Example**: `pod-scheduler | high memory usage | production | critical` → Hash: `a7b3c9d2e1f4a5b6`

### LokiFlow Fingerprint (Multi-Problem Aware)
```javascript
const fingerprintData = {
  // MULTIPLE issue types, normalized and sorted
  issueTypes: identifiedIssues
    .map(issue => normalize(issue.type, 5 words))
    .sort()
    .join('|'),

  // Top 3 services, sorted
  services: affectedServices
    .slice(0, 3)
    .sort()
    .join('|'),

  // Severity level
  severity: overallSeverity
};
```

**Example 1** (Single Issue):
```
dns resolution failure | bstp-id-service | HIGH
→ Hash: `1a2b3c4d5e6f7a8b`
```

**Example 2** (Multiple Issues):
```
connection to node 1 could not be established|dns resolution failure | b2b-object-storage|bstp-id-service | HIGH
→ Hash: `9f8e7d6c5b4a3d2e`
```

**Benefits**:
- Same combination of issues = same fingerprint (dedup works)
- Different combinations = different fingerprints (separate tickets)
- Resilient to issue order (sorted for consistency)
- Service-aware (same issue on different services = different fingerprint)

## Node-by-Node Changes

### Node 1: Prepare LokiFlow Input

**Purpose**: Convert empty scheduler trigger to LokiFlow input format

**Key Features**:
- 1-hour lookback window (last 3600 seconds)
- 12 production namespaces coverage
- Service pattern matching (rim, pcm, ntf, crm, eom, fstp, etc.)
- Error rate threshold: 0.5%
- Minimum error count: 10

**Output**:
```javascript
{
  startTime: unix_timestamp,
  endTime: unix_timestamp,
  context: {
    source: {type: 'scheduler', trigger: 'periodic_log_check'},
    namespaces: [...12 namespaces...],
    servicePatterns: ['rim', 'pcm', 'ntf', ...],
    cluster: 'production-cluster'
  },
  searchFilters: {
    logLevels: ['error', 'ERROR', 'warning', 'WARNING'],
    minErrorRate: 0.005,
    minErrorCount: 10
  }
}
```

### Node 2: Process Results & Decision

**Purpose**: Process LokiFlow output, generate fingerprint, decide Jira ticket creation

**Fingerprint Generation**:
```javascript
// 1. Normalize issue types
const issueTypes = identifiedIssues
  .map(issue => {
    // "Connection to node -1 could not be established"
    // → "connection to node 1 could not be"
    return issue.type
      .toLowerCase()
      .split(' ')
      .slice(0, 5)  // First 5 words
      .join(' ')
      .replace(/[^a-z0-9\s]/g, '');  // Remove special chars
  })
  .sort()  // Alphabetical
  .join('|');

// 2. Top 3 services, sorted
const services = affectedServices
  .slice(0, 3)
  .sort()
  .join('|');

// 3. Severity
const severity = overallSeverity;

// 4. Hash
const fingerprint = simpleHash(JSON.stringify({issueTypes, services, severity}));
```

**Decision Criteria for Jira Ticket**:
1. `isIncident === true` (from incident evaluation)
2. Severity = HIGH or CRITICAL
3. Error rate ≥ 2%
4. Multiple issues (>1)
5. Critical services affected (api, gateway, auth, payment) AND issues exist
6. Has immediate actions

**Output**:
```javascript
{
  fingerprint: "a7b3c9d2e1f4a5b6",
  fingerprintData: {issueTypes, services, severity},
  needsJiraTicket: boolean,
  alertSummary: {...},
  logAnalysis: {
    analysisId,
    workflowExecutionId,
    timeRange,
    issues: [...multi-problem array...],
    metrics,
    actions
  },
  jiraTicketData: {...} or null
}
```

### Node 5: Update Jira Comment (for Existing Tickets)

**Purpose**: Add recurrence comment to existing tickets with multi-problem details

**Key Features**:
- Occurrence tracking (1st, 2nd, 3rd recurrence, etc.)
- Time metrics (time since last seen, frequency per hour)
- Severity change detection
- Escalation logic (>5 occurrences + high frequency)
- **Multi-problem display**: Shows ALL issues from current analysis

**Comment Structure**:
```markdown
## 🔄 Log Analysis Recurrence Update

**Occurrence #3**
**Time Since Last Seen:** 15 minutes
**Frequency:** ~4.0 per hour

### 📊 Current Status
- **Issues Identified**: 2
- **Error Rate**: 1.35%

### 🔍 Identified Issues (Current Analysis)

#### Issue 1: Connection to node -1 could not be established
- **Affected Services**: b2b-object-storage
- **Severity**: MEDIUM
- **Stage Detected**: stage2_pattern_analysis
- **Occurrences**: 50

#### Issue 2: DNS resolution failure
- **Affected Services**: bstp-id-service
- **Severity**: HIGH
- **Stage Detected**: stage3_root_cause_analysis
- **Evidence Count**: 1

### 🔧 Recommended Actions
1. **Check DNS configuration**
   - Command: `kubectl get svc -n saas-bss-monitoring`
   - Risk: Low

---
*🤖 Automated Update - Scheduler Log Analysis Flow (LokiFlow)*
```

### Node 6: Prepare Notification

**Purpose**: Format notifications for Slack, Teams, Email with multi-problem support

**Slack Notification**:
```javascript
{
  text: "🟠 Log Analysis Alert: 2 Issues Detected",
  blocks: [
    {
      type: 'header',
      text: '🟠 LOG ANALYSIS: HIGH'
    },
    {
      type: 'section',
      fields: [
        {text: '*Severity:*\nHIGH'},
        {text: '*Error Rate:*\n1.35%'},
        {text: '*Issues:*\n2'}
      ]
    },
    {
      type: 'section',
      text: `*Identified Issues:*
1. Connection to node -1... (b2b-object-storage)
2. DNS resolution failure (bstp-id-service)`
    },
    {
      type: 'section',
      text: '*Jira Ticket:* <link|EM-1234> (created)'
    }
  ]
}
```

## Flow Diagram

```
┌─────────────────────┐
│ Schedule Trigger    │
│ (Every 50 minutes)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Prepare LokiFlow    │
│ Input               │
│ (Node 1)            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Execute LokiFlow    │
│ Analysis            │
│ (Workflow Trigger)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Process Results &   │
│ Decision            │
│ (Node 2)            │
│ - Generate          │
│   Fingerprint       │
│ - Decide Ticket     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Redis Get           │
│ (Check fingerprint) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Redis State Check   │
│ - New or Existing?  │
│ - Calculate metrics │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Prepare Redis Data  │
│ - Store metadata    │
│ - Set TTL           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Redis Set           │
│ (Save/Update)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Decision Router     │
│ (New vs Existing)   │
└────┬────────────┬───┘
     │            │
     │ NEW        │ EXISTING
     ▼            ▼
┌─────────────┐ ┌─────────────────┐
│ Create Jira │ │ Update Jira     │
│ Incident    │ │ Comment         │
│             │ │ (Node 5)        │
└──────┬──────┘ └────────┬────────┘
       │                 │
       └────────┬────────┘
                ▼
      ┌──────────────────┐
      │ Prepare          │
      │ Notification     │
      │ (Node 6)         │
      └──────────────────┘
```

## Redis Data Structure

```javascript
{
  alert_fingerprint: "a7b3c9d2e1f4a5b6",
  first_seen: "1734703200000",
  last_seen: "1734704000000",
  occurrence_count: "3",
  status: "active",
  severity: "HIGH",
  title: "2 Issues Detected - b2b-object-storage, bstp-id-service",
  source: "loki-logs",
  component: "multi-service",
  namespace: "em-prod",
  jira_ticket_id: "10123",
  jira_ticket_key: "EM-1234",
  call_count: "0",
  last_call_time: "0",
  context_id: "lokiflow-1734703200000-a7b3c9d2e",
  confidence: "0.9",
  escalated: "false",
  updated_at: "2025-12-20T12:00:00.000Z"
}
```

**TTL (Time To Live)**:
- CRITICAL: 1 day (86400s)
- HIGH: 3 days (259200s)
- WARNING/MEDIUM: 7 days (604800s)
- NORMAL/LOW: 14 days (1209600s)

## Implementation Steps

### 1. Update Scheduler Flow JSON
```json
{
  "workflowId": {
    "value": "ryE6NaIe6kvlIeRF"  // LokiFlow workflow ID
  }
}
```

### 2. Replace Node Code in n8n
- Copy content from `1. Prepare LokiFlow Input.js` → Node "Prepare Prometheus Input"
- Copy content from `2. Process Results and Decision NEW.js` → Node "Process Results & Decision"
- Copy content from `5. Update Jira Comment NEW.js` → Node "Update Jira Comment"
- Copy content from `6. Prepare Notification NEW.js` → Node "Prepare Notification"

### 3. Update Node Names (Optional but Recommended)
- "Prepare Prometheus Input" → "Prepare LokiFlow Input"
- "Execute Prometheus Analysis" → "Execute LokiFlow Analysis"

### 4. Test Scenarios

**Test 1: New Single-Issue Alert**
- Trigger: DNS resolution failure on bstp-id-service
- Expected: New Jira ticket created
- Fingerprint: `dns resolution failure | bstp-id-service | HIGH`

**Test 2: New Multi-Issue Alert**
- Trigger: DNS failure + Connection issue
- Expected: New Jira ticket with 2 issues listed
- Fingerprint: `connection to node...|dns resolution... | b2b-object-storage|bstp-id-service | HIGH`

**Test 3: Recurring Same Issue**
- Trigger: Same DNS failure again (same fingerprint)
- Expected: Comment added to existing ticket, occurrence count = 2

**Test 4: Different Combination**
- Trigger: DNS failure only (without connection issue)
- Expected: NEW ticket created (different fingerprint)

## Migration from Prometheus Scheduler

### What Stays the Same
- Redis deduplication logic (Nodes 3, 4, Redis Get/Set)
- Decision Router logic
- Jira ticket creation node
- Notification distribution

### What Changes
- **Input preparation**: Prometheus metrics → Loki logs
- **Fingerprint**: Single root cause → Multi-problem combination
- **Decision logic**: Metrics-based → Log-based
- **Comment format**: Alerts/metrics → Issues/logs
- **Notification format**: Prometheus context → LokiFlow context

## Troubleshooting

### Issue: Fingerprint collisions (different issues getting same fingerprint)
**Solution**: Check normalization logic - ensure issue types are sufficiently distinct after taking first 5 words

### Issue: Too many duplicate tickets (should be deduplicated)
**Solution**: Check if services are included in fingerprint - same issue on different services should have different fingerprints

### Issue: Not enough deduplication (same issue creating multiple tickets)
**Solution**: Verify Redis is working, check TTL settings, ensure fingerprint is consistent across runs

### Issue: Jira ticket not created despite errors
**Solution**: Check decision criteria in Node 2 - may need to adjust thresholds (error rate, severity levels)

## Best Practices

1. **Fingerprint Tuning**: Adjust the "first 5 words" limit based on your issue type patterns
2. **Service Limit**: The "top 3 services" limit prevents fingerprint explosion - adjust if needed
3. **TTL Management**: Set appropriate TTLs based on your incident response SLAs
4. **Escalation Thresholds**: Default is >5 occurrences - tune based on your environment
5. **Critical Services List**: Update the critical services list in Node 2 based on your architecture

## Future Enhancements

1. **Phone Call Integration**: Add Retell AI integration for critical alerts
2. **Machine Learning**: Learn fingerprint patterns over time
3. **Auto-Remediation**: Trigger automated fixes for known patterns
4. **Correlation Engine**: Cross-correlate Prometheus + Loki + Tempo data
5. **Anomaly Detection**: Use historical fingerprint data to detect unusual patterns
