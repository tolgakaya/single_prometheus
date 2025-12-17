# Stage 2 Decision Flow Analysis

## Problem Statement
Flow doesn't proceed to Stage 2 even though it should. Both scheduled and manual triggers show same behavior.

## Node-by-Node Data Flow Analysis

### Node 1: Orchestrator Input Handler
**Input:** Trigger data (scheduled or manual)
**Process:**
- If **scheduled**: `source.type = 'schedule'`, no user message
- If **manual**: `source.type = 'orchestrator'` or `'chat'`, may have user message
- Sets `DEFAULT_NAMESPACES` (12 namespaces)
- Sets `DEFAULT_SERVICES` (52 services)
- Creates time range (default 1h lookback)

**Output:**
```javascript
{
  source: { type: 'schedule|orchestrator|chat', ... },
  searchParams: {
    namespaces: [12 namespaces],
    services: [52 services],
    timeRange: { start, end }
  },
  processedInput: { ... }
}
```

**Potential Issues:**
- ❓ Does scheduled trigger have proper `startTime`/`endTime`?
- ❓ Are namespaces correctly set for scheduled triggers?

---

### Node 2: Unified Entry Point
**Input:** Output from Node 1
**Process:**
- Detects source type
- Creates `analysisParams` with:
  - `startTime`, `endTime` (Unix timestamps)
  - `namespaces` (from input or DEFAULT)
  - `services` (from input or DEFAULT)
- Creates `_context` object with unique `contextId`
- Sets `stageConfig` (maxStages: 6)

**Output:**
```javascript
{
  source: { type, priority },
  analysisParams: {
    startTime: <unix_timestamp>,
    endTime: <unix_timestamp>,
    namespaces: [12 namespaces],
    services: [52 services]
  },
  _context: {
    contextId: "ctx-uuid",
    initialParams: { ... },
    stageConfig: { maxStages: 6, ... }
  },
  forceDeepAnalysis: false,
  priority: 'normal|critical'
}
```

**Potential Issues:**
- ❓ Is `forceDeepAnalysis` always false for scheduled triggers?
- ❓ Is `priority` always 'normal' for scheduled triggers?

---

### Node 4: Prepare Stage 1 Input
**Input:** Output from Node 2
**Process:**
- Extracts namespaces and services from `_context.initialParams`
- Generates `namespaceRegex` = namespaces.join('|')
- Generates `serviceRegex` = services.join('|')
- Creates `queryHelpers` with ready-to-use Prometheus query strings

**Output:**
```javascript
{
  ...<all from Node 2>,
  queryHelpers: {
    namespaceFilter: `namespace=~"ns1|ns2|...|ns12"`,
    serviceFilter: `service=~"svc1|svc2|...|svc52"`,
    combinedFilter: `namespace=~"...",service=~"..."`,
    exampleQueries: {
      podCount: "count by (namespace, service, pod) (up{namespace=~\"...\"})",
      serviceList: "group by (namespace, service) (up{namespace=~\"...\"})",
      alertCount: "ALERTS{namespace=~\"...\"}"
    }
  },
  namespaceRegex: "ns1|ns2|...|ns12",
  serviceRegex: "svc1|svc2|...|svc52"
}
```

**Potential Issues:**
- ✅ Query helpers look correct
- ✅ Namespace regex properly formatted

---

### Node 5: Stage 1 Health Snapshot (AI Agent)
**Input:** Output from Node 4
**Process:**
- AI Agent executes 2 tools:
  1. `Quick Cluster Health`
  2. `Active Alerts Count`
- Should return JSON with `proceed_to_stage2: true|false`

**Expected Output:**
```javascript
{
  stage: "health_snapshot",
  overall_status: "healthy|degraded|critical",
  alerts: {
    total: <number>,
    critical: <number>,
    warning: <number>
  },
  scores: { ... },
  services_analyzed: [52 services],
  services_count: 52,
  namespaces_analyzed: [12 namespaces],
  proceed_to_stage2: <true|false>,
  urgency: "normal|high|critical",
  reason: "<reason>",
  forceDeepAnalysis: false,
  overridden: false,
  _context: <copy from input>,
  _debug: { ... }
}
```

**🚨 CRITICAL QUESTIONS:**
1. **Does AI Agent actually call Prometheus tools?**
   - If tools timeout/fail → Data unavailable → `proceed_to_stage2: false`
2. **Is `overall_status` = "unknown"?**
   - If status unknown → AI might say `proceed_to_stage2: false`
3. **Are `alerts.total` = 0?**
   - If no alerts → Healthy cluster → `proceed_to_stage2: false`
4. **Does AI return proper JSON?**
   - If malformed JSON → n8n might fail to parse

**Known Issue from Previous Session:**
- You mentioned: *"Stage 1 AI returned `proceed_to_stage2: false` due to 'Cluster health data unavailable'"*
- **Root Cause**: Prometheus queries failed/timed out
- **Why**: Hardcoded namespace `"etiyamobile-production"` in queries (FIXED)

---

### Node 6: Fix Stage 1 Context
**Input:** Output from Node 5 (AI Agent)
**Process:**
- Checks if `_context` has template strings (`{{`, `$json`)
- Replaces with correct context from Node 2
- Stores Stage 1 results in `_context.stageResults.stage1`
- Creates `stage1Data` at root level

**Output:**
```javascript
{
  ...<all from Node 5>,
  _context: <fixed and validated>,
  stage1Data: {
    overall_status: "...",
    alerts: { ... },
    scores: { ... },
    quick_findings: [...],
    services_analyzed: [52 services],
    services_count: 52,
    namespaces_analyzed: [12 namespaces],
    proceed_to_stage2: <true|false>,
    urgency: "...",
    reason: "..."
  },
  _contextFixed: true,
  _fixedAt: "<timestamp>"
}
```

**Potential Issues:**
- ✅ Context fixing looks solid
- ✅ `stage1Data` properly extracted

---

### Node 7: Stage 2 Decision
**Input:** Output from Node 6
**Process:**
```javascript
// Extract proceed decision from Stage 1
stage1ProceedDecision = stage1ActualData.proceed_to_stage2;

// Check force deep analysis from config
forceDeepAnalysisFromConfig =
  unifiedConfig.forceDeepAnalysis === true ||
  unifiedConfig.priority === 'critical' ||
  unifiedConfig.stageConfig?.forceDeepAnalysis === true;

// Final decision (OR logic)
shouldProceed = stage1ProceedDecision || forceDeepAnalysisFromConfig;
```

**Decision Logic:**
- ✅ **If Stage 1 says TRUE** → Proceed
- ✅ **If Stage 1 says FALSE but forceDeepAnalysis=true** → Proceed
- ❌ **If Stage 1 says FALSE and forceDeepAnalysis=false** → **STOP**

**Output:**
```javascript
{
  ...<all Stage 1 data>,
  _decision: {
    shouldProceed: <true|false>,
    stage1Said: <true|false>,
    forcedDeep: <true|false>,
    forceSource: "none|explicit force flag|critical priority",
    reason: "..."
  },
  _context: <updated with stage2Decision>
}
```

**Flow Routing:**
- **If `shouldProceed = true`** → Goes to Node 8 (Force Deep Analysis Override)
- **If `shouldProceed = false`** → **STOPS** (no Stage 2)

---

## 🔍 Root Cause Analysis

### Why Flow Stops at Stage 2 Decision

Based on the code analysis, flow stops if **BOTH** conditions are false:

1. **Stage 1 Decision = false**
   - `proceed_to_stage2: false`
   - Reason: "Cluster health data unavailable" OR "Healthy cluster, no issues"

2. **No Force Deep Analysis**
   - `forceDeepAnalysis: false` (default for scheduled triggers)
   - `priority: 'normal'` (not 'critical')
   - `stageConfig.forceDeepAnalysis: false`

### Most Likely Causes

#### **Cause 1: Prometheus Tools Fail in Stage 1**
**Symptom:** Stage 1 AI returns `proceed_to_stage2: false` with reason "Cluster health data unavailable"

**Why:**
- `Quick Cluster Health` tool timeout
- `Active Alerts Count` tool timeout
- Queries fail due to wrong namespace/labels

**Evidence:**
- You mentioned this in previous session
- We fixed hardcoded namespace issue

**Current Status:**
- ✅ **SHOULD BE FIXED** after namespace fix
- ❓ **Needs verification**: Do Prometheus tools actually work now?

**How to Verify:**
1. Check n8n execution logs for Node 5 (Stage 1 AI Agent)
2. Look for tool execution results
3. Check if `alerts.total` has actual number (not 0 or undefined)

---

#### **Cause 2: Healthy Cluster (No Alerts)**
**Symptom:** Stage 1 AI returns `proceed_to_stage2: false` with reason "Healthy cluster, no critical issues detected"

**Why:**
- `overall_status: "healthy"`
- `alerts.total: 0` or very few alerts
- AI logic: "No issues → No need for deep analysis"

**Is This Normal?**
- ✅ **YES** if cluster is actually healthy
- ❌ **NO** if you want analysis regardless of health

**Solution:**
- Set `forceDeepAnalysis: true` in trigger
- Or set `priority: 'critical'`

---

#### **Cause 3: Scheduled Trigger Has No Force Flag**
**Symptom:** Scheduled trigger never sets `forceDeepAnalysis`

**Code Check (Node 2):**
```javascript
else if (!input.orchestratorId && !input.chatInput) {
  // Scheduled trigger
  source = {
    type: 'schedule',
    priority: 'normal'  // ← Always normal, never critical
  };

  // ... no forceDeepAnalysis set
}
```

**Result:**
- Scheduled triggers: `forceDeepAnalysis = false`, `priority = 'normal'`
- No override mechanism
- **Relies 100% on Stage 1 decision**

**Is This a Bug?**
- ❓ **Depends on intent**: Should scheduled analysis ALWAYS run deep analysis?
- If YES → Need to set `forceDeepAnalysis: true` for scheduled triggers

---

## 🎯 Debugging Checklist

### Step 1: Check Stage 1 AI Output
**n8n UI → Execution → Node 5 (Stage 1 Health Snapshot)**

Look for:
- [ ] `overall_status`: "healthy" | "degraded" | "critical" | "unknown"
- [ ] `alerts.total`: 0 or > 0?
- [ ] `proceed_to_stage2`: true or false?
- [ ] `reason`: What reason did AI give?
- [ ] Tool executions: Did `Quick Cluster Health` and `Active Alerts Count` succeed?

**If `overall_status = "unknown"` or `alerts.total = undefined`:**
→ **Prometheus tools failed** → Check tool configuration

**If `overall_status = "healthy"` and `alerts.total = 0`:**
→ **Cluster is actually healthy** → Set `forceDeepAnalysis: true` if you want analysis anyway

---

### Step 2: Check Node 7 Decision Logs
**n8n UI → Execution → Node 7 (Stage 2 Decision)**

Look for console.log output:
```
=== DECISION SUMMARY ===
Stage 1 said proceed: <true|false>
Force deep analysis from config: <true|false>
Final decision - proceed to Stage 2? <true|false>
```

**If `Stage 1 said proceed: false` and `Force deep analysis: false`:**
→ **Expected behavior** → Flow stops

**If `Stage 1 said proceed: true` but flow still stops:**
→ **Bug in routing logic** → Check IF condition after Node 7

---

### Step 3: Check Unified Entry Point Config
**n8n UI → Execution → Node 2 (Unified Entry Point)**

Look for:
- [ ] `source.type`: "schedule" | "orchestrator" | "chat"
- [ ] `priority`: "normal" | "critical"
- [ ] `forceDeepAnalysis`: true | false
- [ ] `stageConfig.forceDeepAnalysis`: true | false

**For scheduled triggers:**
- `source.type` should be "schedule"
- `priority` should be "normal" (unless modified)
- `forceDeepAnalysis` should be **undefined or false** (not set)

---

## 💡 Recommended Fixes

### Fix 1: Always Force Deep Analysis for Scheduled Triggers
**File:** `2. Unified Entry Point.js`

**Change:**
```javascript
else if (!input.orchestratorId && !input.chatInput) {
  // Scheduled trigger
  source = {
    type: 'schedule',
    priority: 'high',  // ← Changed from 'normal'
    triggerTime: new Date().toISOString()
  };

  // ... (time range code)

  // ✅ ADD THIS:
  forceDeepAnalysis = true;  // Always run full 6-stage analysis for scheduled
}
```

**Result:** Scheduled triggers will **always** proceed to Stage 2, regardless of Stage 1 decision.

---

### Fix 2: Add Manual Override Parameter
**File:** `1. Orchestrator Input Handler.js`

**Add support for `forceDeepAnalysis` parameter in trigger:**
```javascript
processedInput.forceDeepAnalysis = input.forceDeepAnalysis || false;
```

**Usage:** In n8n schedule trigger, add JSON body:
```json
{
  "forceDeepAnalysis": true
}
```

---

### Fix 3: Make Stage 1 Less Conservative
**File:** `5. Stage 1 Health Snapshot.txt` (AI Prompt)

**Current behavior:** AI says `proceed_to_stage2: false` if cluster is healthy

**Change prompt to:**
```
## DECISION CRITERIA:
- proceed_to_stage2: true if ANY of:
  * alerts.total > 0
  * overall_status = "degraded" or "critical"
  * ANY score < 90
  * ANY pod restarts in last hour
  * You are uncertain about cluster health
```

---

## 📊 Expected vs Actual Behavior

### Expected (Scheduled Trigger)
```
Schedule → Node 1 → Node 2 (forceDeepAnalysis=true)
  → Node 4 → Node 5 (AI analysis) → Node 6 (context fix)
  → Node 7 (shouldProceed=true because force=true)
  → Node 8 → ... → Stage 2 AI
```

### Actual (Current Behavior)
```
Schedule → Node 1 → Node 2 (forceDeepAnalysis=false)
  → Node 4 → Node 5 (AI: proceed=false, healthy cluster)
  → Node 6 → Node 7 (shouldProceed=false, no force)
  → STOP ❌
```

---

## 🧪 Test Scenarios

### Scenario 1: Healthy Cluster, No Force
- Input: Scheduled trigger, cluster healthy, alerts=0
- Stage 1: `proceed_to_stage2: false`
- Config: `forceDeepAnalysis: false`
- **Expected**: Flow stops at Node 7 ✅
- **Actual**: Flow stops ✅

### Scenario 2: Degraded Cluster
- Input: Scheduled trigger, cluster degraded, alerts > 0
- Stage 1: `proceed_to_stage2: true`
- Config: `forceDeepAnalysis: false`
- **Expected**: Flow continues to Stage 2 ✅
- **Actual**: Should continue (needs verification)

### Scenario 3: Healthy Cluster, With Force
- Input: Scheduled trigger, cluster healthy, alerts=0
- Stage 1: `proceed_to_stage2: false`
- Config: `forceDeepAnalysis: true`
- **Expected**: Flow continues to Stage 2 (forced) ✅
- **Actual**: Should continue (needs verification)

### Scenario 4: Prometheus Tools Fail
- Input: Scheduled trigger
- Stage 1: Tools timeout → `overall_status: "unknown"`
- AI: `proceed_to_stage2: false` (no data)
- Config: `forceDeepAnalysis: false`
- **Expected**: Flow stops (can't analyze without data)
- **Actual**: Flow stops ✅

---

## ✅ Action Items

1. **Check n8n Execution Logs** for most recent run:
   - Node 5 output: What did Stage 1 AI actually return?
   - Node 7 logs: What was the final decision?

2. **Verify Prometheus Tools Work**:
   - Do `Quick Cluster Health` and `Active Alerts Count` return data?
   - Or do they timeout/fail?

3. **Decide on Scheduled Trigger Behavior**:
   - Should scheduled triggers ALWAYS run full analysis?
   - Or should they respect Stage 1 decision?

4. **Apply Fix** (if needed):
   - If want forced analysis: Apply Fix 1 or Fix 2
   - If Prometheus tools fail: Debug tool configuration
   - If Stage 1 too conservative: Apply Fix 3

---

## 🔗 Related Issues

- Issue #5: Template evaluation causing `proceed_to_stage2: false`
- Namespace fix: Hardcoded `etiyamobile-production` → Multi-namespace regex
- Service discovery removal: Switched to explicit hardcoded service list
