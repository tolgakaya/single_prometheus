# LokiFlow Scheduler Deployment Instructions

## Problem Identified

The **Scheduler Log Analysis.json** workflow is still using the **OLD FreePrometheus version** of Node 2 ("Process Results & Decision"). This is why you're getting "jiraTicket is not defined" errors.

The deployed version:
- Expects FreePrometheus format (`executiveSummary`, `findings`, `actions`)
- Does NOT extract `jiraTicket` from LokiFlow Node 17
- Uses old variable naming

## Solution: Deploy the NEW LokiFlow Node 2 Code

You need to **replace** the code in Node 2 ("Process Results & Decision") with the NEW LokiFlow version.

### Step 1: Open n8n Workflow

1. Open your n8n instance
2. Go to "Scheduler Log Analysis" workflow
3. Find node "Process Results & Decision"

### Step 2: Replace the JavaScript Code

**COMPLETELY REPLACE** the existing JavaScript code with the content from:
```
LokiFlow/Schedule Log Analysis/SchedulerNodes/2. Process Results and Decision NEW.js
```

### Step 3: Verify Key Changes

After replacement, verify these key differences:

#### OLD Code (FreePrometheus - WRONG):
```javascript
// Extract key information from FreePrometheus output
const executiveSummary = analysisResult.executiveSummary || {};
const findings = analysisResult.findings || {};
const actions = analysisResult.actions || {};
```

#### NEW Code (LokiFlow - CORRECT):
```javascript
// Extract key information from LokiFlow output
// Node 17 adds jiraTicket field to Node 16's complete output
const jiraTicketFromNode17 = analysisResult.jiraTicket || {};
const metadata = analysisResult.metadata || {};
const incidentEvaluation = analysisResult.incidentEvaluation || {};
const consolidatedFindings = analysisResult.consolidatedFindings || {};
const actionableInsights = analysisResult.actionableInsights || {};
```

### Step 4: Save and Activate

1. Save the node
2. Activate the workflow
3. Test with real LokiFlow data

## What This Fix Does

### 1. Extracts jiraTicket from Node 17
```javascript
const jiraTicketFromNode17 = analysisResult.jiraTicket || {}; // Line 24
```

### 2. Uses jiraTicket in Output
```javascript
jiraTicketData: needsJiraTicket ? jiraTicketFromNode17 : null, // Line 173
```

### 3. Multi-Problem Fingerprinting
```javascript
issueTypes: identifiedIssues
  .map(issue => normalize(issue.type, 5 words))
  .sort()
  .join('|'),
```

### 4. LokiFlow Data Structure
- Reads `consolidatedFindings.identifiedIssues[]` (multiple issues)
- Reads `incidentEvaluation.severity`
- Reads `actionableInsights.immediateActions[]`

## Verification Steps

After deployment, verify:

1. **No "jiraTicket is not defined" error**
   - Check n8n execution logs
   - Should see: "✅ jiraTicketFromNode17: {...}"

2. **jiraTicketData is populated**
   - Output should contain complete jiraTicket object
   - NOT empty `{}`

3. **Fingerprint is multi-problem aware**
   - Multiple issues = combined fingerprint
   - Same combination = same fingerprint (dedup works)

4. **Data flows to downstream nodes**
   - Node 3 (Redis State Check): Receives jiraTicketData
   - Node 4 (Prepare Redis Data): Preserves jiraTicketData
   - Node 5 (Update Jira Comment): Can access jiraTicketData
   - Node 6 (Prepare Notification): Can access jiraTicketData

## Testing

### Test 1: Single Issue Alert
**Input**: LokiFlow output with 1 issue (e.g., DNS resolution failure)

**Expected**:
- `needsJiraTicket: true` (if severity HIGH or error rate >2%)
- `jiraTicketData: { title, description, priority, ... }`
- `fingerprint: "dns resolution failure | bstp-id-service | HIGH"`

### Test 2: Multi-Issue Alert
**Input**: LokiFlow output with 2+ issues

**Expected**:
- `jiraTicketData.issues[]` contains all issues
- `fingerprint: "issue1|issue2 | service1|service2|service3 | HIGH"`
- Jira ticket shows all issues in description

### Test 3: Recurring Alert
**Input**: Same issue detected again (same fingerprint)

**Expected**:
- Redis finds existing fingerprint
- No new ticket created
- Comment added to existing ticket
- Occurrence count incremented

## Rollback Plan

If issues occur after deployment:

1. **Immediate**: Deactivate the workflow
2. **Restore**: Revert Node 2 code to FreePrometheus version (backup in workflow JSON)
3. **Investigate**: Check execution logs for specific errors
4. **Report**: Contact developer with error details

## Files Changed

### Core Files:
1. **Node 17 (LokiFlow)**: [17. Generate Jira Ticket.js](../LokiNodes/17. Generate Jira Ticket.js)
   - Simplified to use `...inputData` spread operator
   - Adds `jiraTicket` field to Node 16 output

2. **Node 2 (Scheduler)**: [2. Process Results and Decision NEW.js](./SchedulerNodes/2. Process Results and Decision NEW.js)
   - Extracts `jiraTicket` from Node 17
   - Multi-problem fingerprinting
   - LokiFlow data structure awareness

### Documentation:
3. [LOKIFLOW_SCHEDULER_IMPLEMENTATION.md](./LOKIFLOW_SCHEDULER_IMPLEMENTATION.md)
   - Complete architecture documentation
   - Data flow diagrams
   - Testing scenarios

## Support

If you encounter errors after deployment:

1. **Check Node 2 console output** for debug logs:
   ```
   === PROCESS LOKIFLOW RESULTS ===
   Analysis ID: analysis-1766243540306
   jiraTicketFromNode17: {"title":"..."}
   Issues Found: 2
   Severity: HIGH
   ```

2. **Verify LokiFlow Node 17 output** contains jiraTicket:
   ```json
   {
     "jiraTicket": {
       "title": "...",
       "description": "...",
       "priority": "High"
     }
   }
   ```

3. **Check downstream nodes** receive jiraTicketData:
   - Node 3 output should have `jiraTicketData`
   - Node 4 output should preserve `jiraTicketData`

---

**Last Updated**: 2025-12-20
**Version**: LokiFlow Scheduler v2.0
**Author**: Claude Code
