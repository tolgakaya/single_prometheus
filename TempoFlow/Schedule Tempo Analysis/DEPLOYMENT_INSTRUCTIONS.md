# TempoFlow Scheduler Deployment Instructions

## Overview

The **Schedule Tempo Analysis** workflow implements a scheduled distributed tracing analysis system that:
- Triggers TempoFlow workflow every 30 minutes
- Analyzes trace data for cascade failures and dependency issues
- Uses Redis for deduplication based on root cause fingerprinting
- Creates or updates Jira tickets for actionable issues
- Sends notifications for critical incidents

## Architecture

```
Schedule Trigger (30min)
  ↓
Node 1: Prepare TempoFlow Input
  ↓
Execute TempoFlow Workflow (Node 10)
  ↓
Node 2: Process Results & Decision
  ↓
Redis GET (check fingerprint)
  ↓
Node 3: Redis State Check
  ↓
Node 4: Prepare Redis Data
  ↓
Branch: New vs Existing Alert
  ├─ NEW: Create Jira Incident
  └─ EXISTING: Node 5 Update Jira Comment
  ↓
Node 6: Prepare Notification
  ↓
Send Notification (Slack/Teams/Email)
```

## Deployment Steps

### Step 1: Deploy TempoFlow Nodes (1, 2, 5, 6)

Deploy these 4 files to your n8n **Schedule Tempo Analysis** workflow:

#### Node 1: Prepare TempoFlow Input
**File**: `TempoFlow/Schedule Tempo Analysis/SchedulerNodes/1. Prepare TempoFlow Input.js`

**Purpose**: Converts scheduler trigger to TempoFlow input format

**Configuration**:
- **Position**: Between "Schedule Trigger" and "Execute TempoFlow Analysis"
- **Node Type**: Code (JavaScript)
- **Name**: "Prepare TempoFlow Input"

**Key Settings**:
```javascript
// Customize these based on your environment:
namespaces: [
  'bstp-cms-global-production',
  'bstp-cms-prod-v3',
  'em-global-prod-3pp',
  // ... add your namespaces
],
servicePatterns: ['rim', 'pcm', 'ntf', 'crm', 'eom', 'fstp'],
searchFilters: {
  minErrorCount: 5,
  minStatusCode: 400
}
```

#### Node 2: Process Results & Decision (CRITICAL)
**File**: `TempoFlow/Schedule Tempo Analysis/SchedulerNodes/2. Process Results and Decision NEW.js`

**Purpose**: Processes TempoFlow Node 10 output, generates fingerprints, decides Jira ticket creation

**Configuration**:
- **Position**: After "Execute TempoFlow Analysis" node
- **Node Type**: Code (JavaScript)
- **Name**: "Process Results & Decision"

**CRITICAL**: This node MUST extract jiraTicket from Node 10:
```javascript
const jiraTicketFromNode10 = analysisResult.jiraTicket || {}; // Line 24
```

**Health Check Validation**:
The node will NOT create tickets when system is healthy:
```javascript
if (healthCheck && healthCheck.status === 'healthy') return false;
```

**Fingerprint Strategy**:
- Priority 1: Root cause + origin service (most stable)
- Priority 2: Cascade failure origin
- Priority 3: Dependency chain failure point
- Priority 4: Service with most errors

#### Node 5: Update Jira Comment
**File**: `TempoFlow/Schedule Tempo Analysis/SchedulerNodes/5. Update Jira Comment NEW.js`

**Purpose**: Generates recurrence comments for existing Jira tickets

**Configuration**:
- **Position**: After Redis State Check (on EXISTING alert branch)
- **Node Type**: Code (JavaScript)
- **Name**: "Update Jira Comment"

**Comment Format**:
- Root cause analysis
- Cascade failure visualization
- Failed dependency chains
- Recommended actions
- Trace metrics

#### Node 6: Prepare Notification
**File**: `TempoFlow/Schedule Tempo Analysis/SchedulerNodes/6. Prepare Notification NEW.js`

**Purpose**: Prepares formatted notifications for Slack/Teams/Email

**Configuration**:
- **Position**: After Jira ticket creation/update
- **Node Type**: Code (JavaScript)
- **Name**: "Prepare Notification"

**Notification Formats**:
- Slack: Blocks with cascade failures, critical path warnings
- Chat Summary: Markdown with root cause and dependencies
- Summary: Concise text with distributed tracing metrics

### Step 2: Verify Redis Nodes (3, 4)

These nodes have been adapted for TempoFlow:

#### Node 3: Redis State Check
**File**: `TempoFlow/Schedule Tempo Analysis/SchedulerNodes/3. Redis State Check.js`

**Changes**: None required (generic deduplication logic)

#### Node 4: Prepare Redis Data
**File**: `TempoFlow/Schedule Tempo Analysis/SchedulerNodes/4. Prepare Redis Data.js`

**TempoFlow-Specific Changes**:
```javascript
source: 'tempo-traces',
component: alert.traceAnalysis?.rootCauseAnalysis?.serviceRoot,
impact_score: (alert.traceAnalysis?.metrics?.impactScore || 0),
critical_path_affected: alert.alertSummary?.criticalPathAffected,
cascade_failures: (alert.alertSummary?.cascadeFailures || 0),
failed_chains: (alert.alertSummary?.failedChains || 0),
root_cause: alert.traceAnalysis?.rootCauseAnalysis?.primaryCause
```

### Step 3: Configure Schedule Trigger

**Trigger Configuration**:
```json
{
  "rule": {
    "interval": [
      {
        "field": "minutes",
        "minutesInterval": 30
      }
    ]
  }
}
```

**Recommended Schedule**: Every 30 minutes (aligns with 1-hour lookback window)

### Step 4: Configure Redis Connection

**Redis Node Configuration**:
- **Operation**: GET
- **Key**: `alert:{{$node["Process Results & Decision"].json.fingerprint}}`
- **Database Index**: 0 (or your preferred DB)

**Redis SET Configuration** (after Prepare Redis Data):
- **Operation**: SET
- **Key**: `{{$json.key}}`
- **Value**: `{{$json.value}}`
- **TTL**: `{{$json.ttl}}`

### Step 5: Configure Jira Nodes

#### Create Jira Incident Node
**Input Data**:
```javascript
{
  "fields": {
    "project": { "key": "YOUR_PROJECT_KEY" },
    "summary": "{{$node['Process Results & Decision'].json.jiraTicketData.title}}",
    "description": "{{$node['Process Results & Decision'].json.jiraTicketData.description}}",
    "priority": { "name": "{{$node['Process Results & Decision'].json.jiraTicketData.priority}}" },
    "issuetype": { "name": "Incident" }
  }
}
```

#### Update Jira Comment Node
**Input Data**:
```javascript
{
  "issueKey": "{{$node['Redis State Check'].json.existingTicket.key}}",
  "comment": "{{$node['Update Jira Comment'].json.updateComment}}"
}
```

## Verification Steps

### Test 1: Healthy System (No Ticket)
**Input**: TempoFlow analysis with `healthCheck.status = "healthy"`

**Expected**:
- `needsJiraTicket: false`
- No Jira ticket created
- No Redis entry created
- Console log: "System is healthy - skipping Jira ticket creation"

### Test 2: Cascade Failure (New Ticket)
**Input**: TempoFlow analysis with cascade failures detected

**Expected**:
- `needsJiraTicket: true`
- `fingerprint: "cascade-{pattern}|{origin-service}"`
- New Jira ticket created with:
  - Root cause section
  - Cascade failure visualization
  - Failed chains
  - Recommended actions
- Redis entry created

### Test 3: Recurring Issue (Update Comment)
**Input**: Same cascade failure detected again (same fingerprint)

**Expected**:
- Redis finds existing fingerprint
- No new ticket created
- Comment added to existing ticket:
  - "🔄 Distributed Trace Analysis Recurrence Update"
  - "Occurrence #{count}"
  - Updated metrics
  - Current cascade failures
- Redis entry updated

### Test 4: Critical Path Affected
**Input**: TempoFlow analysis with `criticalPathAffected: true`

**Expected**:
- `needsJiraTicket: true` (even with low error count)
- Jira ticket priority: High
- Notification shows "⚠️ Critical Path Affected"
- Slack notification with critical path warning block

## Data Flow Verification

### Check Node 2 Output
```javascript
{
  "fingerprint": "16-char-hex",
  "fingerprintData": {
    "issueType": "normalized-root-cause",
    "originService": "service-name"
  },
  "needsJiraTicket": true,
  "alertSummary": {
    "severity": "HIGH",
    "errorCount": 75,
    "cascadeFailures": 2,
    "failedChains": 3,
    "criticalPathAffected": true
  },
  "traceAnalysis": {
    "rootCauseAnalysis": {
      "primaryCause": "Database connection timeout",
      "serviceRoot": "bss-mc-rim-service"
    },
    "dependencyAnalysis": {
      "cascadeFailures": [...],
      "failedChains": [...]
    }
  },
  "jiraTicketData": {
    "title": "...",
    "description": "...",
    "priority": "High"
  }
}
```

### Check Redis Entry
```json
{
  "alert_fingerprint": "abc123def456...",
  "source": "tempo-traces",
  "component": "bss-mc-rim-service",
  "severity": "HIGH",
  "impact_score": "85",
  "critical_path_affected": "true",
  "cascade_failures": "2",
  "failed_chains": "3",
  "root_cause": "Database connection timeout",
  "jira_ticket_key": "INCIDENT-123",
  "occurrence_count": "1",
  "first_seen": "1734901200000",
  "last_seen": "1734901200000"
}
```

## Common Issues & Solutions

### Issue 1: "jiraTicket is not defined"
**Cause**: Node 2 code is outdated or not deployed correctly

**Solution**:
1. Verify Node 2 contains line 24: `const jiraTicketFromNode10 = analysisResult.jiraTicket || {};`
2. Check TempoFlow Node 10 output contains `jiraTicket` field
3. Redeploy Node 2 from `2. Process Results and Decision NEW.js`

### Issue 2: Fingerprint Collision (Different Issues, Same Fingerprint)
**Cause**: Two different root causes normalizing to same string

**Solution**:
1. Check fingerprint data in output: `_debug.fingerprintData`
2. Verify root cause is being extracted correctly
3. If collision persists, add service-specific prefix to fingerprint

### Issue 3: All Issues Creating Tickets (Even Healthy)
**Cause**: Health check validation not working

**Solution**:
1. Verify Node 2 line 195: `if (healthCheck && healthCheck.status === 'healthy')`
2. Check TempoFlow Node 10 output contains `healthCheck.status`
3. Verify health check is first priority in `shouldCreateJiraTicket()`

### Issue 4: Redis Not Deduplicating
**Cause**: Fingerprint not being passed correctly

**Solution**:
1. Check Node 2 output has `fingerprint` field
2. Verify Redis GET key: `alert:{{fingerprint}}`
3. Check Redis connection and database index
4. Verify TTL is not expiring too quickly

## Monitoring

### Week 1: Initial Deployment
- Monitor every execution for errors
- Verify fingerprint uniqueness (no unexpected duplicates)
- Check Jira tickets are being created correctly
- Validate Redis deduplication is working

### Week 2-4: Stabilization
- Track false positive rate (tickets created for non-issues)
- Monitor recurrence comment quality
- Verify notification clarity
- Check TTL appropriateness

### Ongoing Metrics
- **Ticket Creation Rate**: Tickets/day (should stabilize after 2 weeks)
- **Deduplication Rate**: Recurring alerts vs new alerts (should be 60-70% recurring)
- **False Positive Rate**: Invalid tickets / total tickets (target <5%)
- **Response Time**: Time to ticket creation after issue detection (should be <2 minutes)

## Rollback Plan

If issues occur after deployment:

1. **Immediate**: Deactivate the "Schedule Tempo Analysis" workflow
2. **Restore**: Revert problematic nodes to previous version
   - Node 2 is most likely culprit
   - Check git history for previous working version
3. **Investigate**:
   - Check n8n execution logs
   - Review Node 2 console output
   - Verify TempoFlow Node 10 output format
4. **Report**: Document errors with execution IDs for developer review

## Files Reference

### Scheduler Nodes (Deploy to n8n):
1. `1. Prepare TempoFlow Input.js` - Schedule trigger to TempoFlow input
2. `2. Process Results and Decision NEW.js` - TempoFlow output processing
3. `3. Redis State Check.js` - Deduplication state management (generic)
4. `4. Prepare Redis Data.js` - TempoFlow-specific Redis data
5. `5. Update Jira Comment NEW.js` - Recurrence comment generation
6. `6. Prepare Notification NEW.js` - Multi-channel notification formatting

### Documentation:
- `TEMPOFLOW_SCHEDULER_IMPLEMENTATION.md` - Complete architecture guide
- `DEPLOYMENT_INSTRUCTIONS.md` - This file
- `../claudedocs/DEPLOYMENT_GUIDE.md` - TempoFlow workflow deployment

## Support

If you encounter errors after deployment:

1. **Check Node 2 console output**:
   ```
   === PROCESS TEMPOFLOW RESULTS ===
   Workflow Execution ID: tempo-1734901200306
   jiraTicketFromNode10: {"title":"..."}
   Error Count: 75
   Cascade Failures: 2
   Failed Chains: 3
   Critical Path Affected: true
   ```

2. **Verify TempoFlow Node 10 output**:
   ```json
   {
     "jiraTicket": {
       "title": "Distributed Trace Analysis: Database connection timeout",
       "description": "...",
       "priority": "High"
     },
     "healthCheck": {
       "status": "unhealthy"
     }
   }
   ```

3. **Check downstream data flow**:
   - Node 3 output should have `fingerprint` and `dedupStatus`
   - Node 4 output should have Redis `key`, `value`, `ttl`
   - Node 5/6 output should have access to `jiraTicketData`

---

**Last Updated**: 2025-12-22
**Version**: TempoFlow Scheduler v1.0
**Author**: Claude Code
