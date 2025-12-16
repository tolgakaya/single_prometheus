# Scheduled Flow Version - Alert Context Dependency Analysis

## Executive Summary

**Current Flow Type**: Alert-driven (requires webhook trigger with alert payload)
**Target Flow Type**: Scheduled (periodic execution without alert context)
**Analysis Date**: 2025-12-15

This document identifies all locations where the current n8n Prometheus flow requires alert context and cannot start without alert information. These are the critical points that need modification to support a scheduled version.

---

## Critical Alert Dependencies

### 🔴 BLOCKER 1: Node 1 - Prometheus Input Handler
**File**: `PrometheusNodes/1. Prometheus Input Handler.js`
**Lines**: 9, 14-15, 36-49

**Alert Dependency**:
```javascript
const alertContext = input.alertContext || {};

console.log('=== ALERT CONTEXT ===');
console.log('Alert Name:', alertContext.alertName || 'NONE');
console.log('Alert Priority:', alertContext.priority || input.priority);

// Alert context for query building
context: {
  alertName: alertContext.alertName,
  alertId: alertContext.alertId,
  alertPriority: alertContext.priority,
  source: alertContext.source,

  affectedServices: alertContext.affectedServices || [],
  errorPatterns: alertContext.errorPatterns || [],

  alerts: alertContext.normalizedAlert ? [{
    alertname: alertContext.normalizedAlert.alertname,
    severity: alertContext.normalizedAlert.priority
  }] : []
}
```

**Impact**:
- Node expects `input.alertContext` from webhook trigger
- Builds context object with alert metadata
- **NOT BLOCKING** - Uses fallback `|| {}` and `|| []`
- Can work without alert but context will be empty

**Modification Needed**:
- In scheduled version, replace alert context with:
  - `alertName: 'SCHEDULED_HEALTH_CHECK'`
  - `alertId: 'scheduled-' + timestamp`
  - `alertPriority: 'monitoring'`

---

### 🔴 BLOCKER 2: Node 2 - Prometheus Query Builder
**File**: `PrometheusNodes/2. Prometheus Query Builder.js`
**Lines**: 9-11

**Alert Dependency**:
```javascript
// Alert bilgilerini DOĞRU yerden al
const alertName = inputData.context?.alertName ||
                  inputData.alertContext?.alertName ||
                  'unknown';
```

**Impact**:
- Uses alertName for query description
- **NOT BLOCKING** - Has fallback to `'unknown'`
- Queries are built based on namespace and kubernetes filters, NOT alert

**Modification Needed**:
- Minimal - alertName only used in query descriptions
- Can use 'SCHEDULED_SCAN' as default

---

### 🔴 BLOCKER 3: Node 4 - Alert Categories Mapper
**File**: `PrometheusNodes/4. Alert Categories Mapper.js`
**Lines**: 12-15

**Alert Dependency**:
```javascript
const alertContext = output.analysisParams?.context || output.alertContext || {};
const alertName = alertContext.alertName ||
                  output.metadata?.alertName ||
                  'unknown';
```

**Impact**:
- Categorizes alert type (RESOURCE_LIMIT, NETWORKING, STORAGE, etc.)
- Uses hardcoded knowledge base with 41+ alert definitions
- **NOT BLOCKING** - Has fallback to `'unknown'` → category 'UNKNOWN'

**Modification Needed**:
- For scheduled version, skip categorization OR
- Use category 'HEALTH_CHECK' for general monitoring

---

### 🔴 BLOCKER 4: Node 6 - Prepare Stage 1 Input ⚠️ **CRITICAL BLOCKER**
**File**: `PrometheusNodes/6. Prepare Stage 1 Input.js`
**Lines**: 18, 24-29

**Alert Dependency**:
```javascript
// Alert context'i al - ZORUNLU
const alertContext = inputData.analysisParams?.context || {};

// Alert yoksa hata
if (!alertContext.alertName) {
  return [{
    hasError: true,
    errorMessage: 'No alert found for Stage 1 analysis',
    errorType: 'MISSING_ALERT'
  }];
}
```

**Impact**:
- **HARD STOP** - Flow terminates if no alert name
- This is the FIRST true blocker in the pipeline
- System prompt built entirely around specific alert: lines 36, 83

**System Prompt Dependencies**:
```javascript
'Alert: ' + alertContext.alertName + '\n' +
'Priority: ' + (alertContext.alertPriority || priority) + '\n' +
'Alert ID: ' + alertContext.alertId + '\n\n'

const userMessage = 'Analyze the ' + alertContext.alertName + ' alert affecting ' +
  (kubernetesFilters.pod || kubernetesFilters.node || 'the system') +
  ' in namespace ' + kubernetesFilters.namespace + '.';
```

**Modification Needed**:
```javascript
// FOR SCHEDULED VERSION:
if (!alertContext.alertName) {
  // Instead of error, provide default scheduled context
  alertContext.alertName = 'SCHEDULED_HEALTH_CHECK';
  alertContext.alertId = 'scheduled-' + Date.now();
  alertContext.alertPriority = 'monitoring';
}

// Update system prompt to:
'Analysis Type: Scheduled Health Monitoring\n' +
'Scope: ' + (kubernetesFilters.namespace || 'all namespaces') + '\n' +
'Execution ID: ' + alertContext.alertId + '\n\n'
```

---

### 🟡 DEPENDENCY 5: Node 9 - Stage 2 Decision
**File**: `PrometheusNodes/9. Stage 2 Decision.js`
**Lines**: 111, 135

**Alert Dependency**:
```javascript
alertInfo: {
  name: alertContext.alertName || 'Unknown',
  priority: priority,
  hasCascading: stage1Results.cascadingEffects?.hasCascadingFailures || false
}

console.log('Stage 2 Decision:', {
  alertName: alertContext.alertName,
  priority: priority,
  willProceed: requiresDeepAnalysis
});
```

**Impact**:
- Uses alert name for decision logging
- **NOT BLOCKING** - Has fallback to `'Unknown'`
- Decision based on metrics analysis, not alert name

**Modification Needed**:
- Minimal - logging only
- Can use 'SCHEDULED_SCAN' as name

---

### 🟡 DEPENDENCY 6: Node 12 - Stage 2 Deep Analysis (AI Prompt)
**File**: `PrometheusNodes/12. Stage 2 Deep Analysis.txt`
**Lines**: 9, 36

**Alert Dependency**:
```
Alert: {{ $json._context.alertContext.alertName }}
Pod: {{ $json._context.kubernetesFilters.pod }}

{{ $json.stage1Data?.kbFallbackUsed ? '⚠️ IMPORTANT: Prometheus queries failed (likely due to ' + $json._context.alertContext.alertName + '). Use KB troubleshooting above as primary guidance.' : '' }}
```

**Impact**:
- AI prompt template references alert name
- Used in prompt context, not logic
- **NOT BLOCKING** - Will just show undefined/null

**Modification Needed**:
- Update prompt template:
```
Analysis Type: {{ $json._context.analysisType || 'Scheduled Health Check' }}
Target: {{ $json._context.kubernetesFilters.namespace || 'All Namespaces' }}
```

---

### 🟡 DEPENDENCY 7: Node 26 - Generate Final Report
**File**: `PrometheusNodes/26. Generate Final Report.js`
**Line**: 1310 (debug logging only)

**Alert Dependency**:
```javascript
console.log("inputData._context.alertContext.alertName:", inputData?._context?.alertContext?.alertName);
```

**Impact**:
- Debug logging only
- **NOT BLOCKING**
- Alert name used for report title and context

**Modification Needed**:
- Update report title generation to handle scheduled mode
- Use `analysisType: 'scheduled'` instead of alert name

---

## Data Flow Structure

### Current Alert-Driven Flow:
```
Webhook Trigger (Alert Payload)
  ↓
Node 1: Prometheus Input Handler
  - Extracts alertContext from webhook
  - Creates context object with alert metadata
  ↓
Node 2: Prometheus Query Builder
  - Uses alertName for query descriptions
  - Builds queries based on kubernetes filters
  ↓
Node 4: Alert Categories Mapper
  - Maps alertName to category (RESOURCE_LIMIT, etc.)
  - Loads KB entry for specific alert
  ↓
Node 6: Prepare Stage 1 Input ⚠️ **HARD STOP IF NO ALERT**
  - VALIDATES alertContext.alertName exists
  - Builds AI prompt around specific alert
  - Returns error if missing
  ↓
[Stages 1-6 continue...]
  - All stages reference alertName in prompts/logging
  - But logic based on METRICS, not alert name
  ↓
Node 26: Generate Final Report
  - Uses alertName for report title
  - Organizes findings by alert context
```

### Proposed Scheduled Flow:
```
Cron/Schedule Trigger (No Payload)
  ↓
Node 1: Input Handler (Modified)
  - Creates synthetic alert context:
    - alertName: 'SCHEDULED_HEALTH_CHECK'
    - alertId: 'scheduled-' + timestamp
    - alertPriority: 'monitoring'
    - analysisType: 'scheduled'
  ↓
Node 2: Query Builder (Minimal Change)
  - Same queries, different description
  - Uses namespaces from config (not alert)
  ↓
Node 4: Categories Mapper (Skip or Generic)
  - Skip alert categorization OR
  - Use generic 'HEALTH_CHECK' category
  ↓
Node 6: Prepare Stage 1 (Modified)
  - REMOVE alert validation check
  - Update system prompt:
    - "Scheduled health monitoring"
    - Focus on metrics, not alert
  ↓
[Stages 1-6 continue with modified prompts]
  - Replace alert-specific prompts with:
    - "Analyze current system health"
    - "Identify any degradation patterns"
  ↓
Node 26: Final Report (Modified)
  - Report title: "Scheduled Health Report"
  - Organize by namespace/component, not alert
```

---

## Modification Strategy: Minimal Change Approach

### Option 1: Conditional Logic (Single Flow) ⚠️ More Complex
Add `analysisType` parameter to distinguish alert-driven vs scheduled:

```javascript
// Node 1 - Input Handler
const analysisType = input.analysisType || 'alert-driven'; // or 'scheduled'
const alertContext = input.alertContext || {
  alertName: analysisType === 'scheduled' ? 'SCHEDULED_HEALTH_CHECK' : null,
  alertId: analysisType === 'scheduled' ? 'scheduled-' + Date.now() : null,
  alertPriority: analysisType === 'scheduled' ? 'monitoring' : null
};

// Node 6 - Prepare Stage 1
if (!alertContext.alertName && analysisType !== 'scheduled') {
  return [{ hasError: true, errorMessage: 'No alert found' }];
}
```

**Changes Required**:
- Node 1: Add conditional alert context creation (5 lines)
- Node 6: Add conditional validation (1 line change)
- Node 12: Update AI prompt template (conditional text)
- Node 26: Add conditional report title (3 lines)

**Total**: ~4 nodes, ~15 lines of code

---

### Option 2: Separate Flows (Recommended) ✅ Cleaner
Create a **new flow** that duplicates nodes but with scheduled-specific logic:

**New Flow Name**: `Prometheus Scheduled Health Monitor`

**Nodes to Clone**:
1. Node 1: Replace webhook input with **Cron trigger** + synthetic alert context
2. Node 2: Same (no changes)
3. Node 4: Skip or use generic category
4. Node 6: Remove alert validation, update prompt
5. Nodes 7-26: Same logic, update prompts where alert-specific

**Benefits**:
- Original alert-driven flow untouched
- Cleaner separation of concerns
- No conditional complexity
- Easier to maintain

**Changes Required**:
- Clone 26 nodes
- Modify 4 nodes (1, 4, 6, 12)
- Update AI prompt templates (3 files)

**Total**: New flow with ~20 lines of actual logic changes

---

## Summary: Critical Points for Scheduled Version

### 🔴 MUST CHANGE (Blockers):
1. **Node 6: Prepare Stage 1 Input** (Line 24-29)
   - Remove hard error on missing alert
   - Provide synthetic alert context
   - Update AI system prompt

### 🟡 SHOULD CHANGE (Functionality):
2. **Node 1: Prometheus Input Handler** (Line 9)
   - Create synthetic alertContext for scheduled mode

3. **Node 12: Stage 2 Deep Analysis** (Prompt template)
   - Update from "Analyze alert X" to "Analyze system health"

4. **Node 26: Generate Final Report** (Title generation)
   - Change from "Alert: KubeAPIDown Report" to "Scheduled Health Report: 2025-12-15 14:30"

### 🟢 OPTIONAL CHANGE (Polish):
5. **Node 4: Alert Categories Mapper**
   - Skip categorization for scheduled scans

6. **All AI Prompts** (Nodes 12, 15, 18, 21, 23)
   - Replace alert-specific language with health-check language

---

## Recommended Implementation

**Approach**: Option 2 (Separate Flow)

**Steps**:
1. Duplicate entire flow in n8n
2. Replace webhook trigger with Schedule trigger (e.g., every 15 minutes)
3. Modify Node 1 to inject:
   ```json
   {
     "analysisType": "scheduled",
     "alertContext": {
       "alertName": "SCHEDULED_HEALTH_CHECK",
       "alertId": "scheduled-" + Date.now(),
       "alertPriority": "monitoring"
     },
     "kubernetesFilters": {
       "namespace": "default" // or multi-namespace
     }
   }
   ```
4. Modify Node 6 to skip alert validation:
   ```javascript
   // Comment out or remove:
   // if (!alertContext.alertName) { return error; }
   ```
5. Update AI prompt templates (Nodes 12, 15, 18, 21, 23, 26)
6. Test with single namespace first
7. Expand to multi-namespace monitoring

**Estimated Effort**: 2-3 hours (mostly prompt template updates)

---

## File Reference Summary

| File | Alert Dependency | Severity | Action Required |
|------|------------------|----------|-----------------|
| `1. Prometheus Input Handler.js` | Line 9, 36-49 | 🟡 Medium | Add synthetic context |
| `2. Prometheus Query Builder.js` | Line 9-11 | 🟢 Low | Minimal (description only) |
| `4. Alert Categories Mapper.js` | Line 13 | 🟡 Medium | Skip or use generic |
| `6. Prepare Stage 1 Input.js` | Line 24-29 | 🔴 **CRITICAL** | Remove validation |
| `9. Stage 2 Decision.js` | Line 111, 135 | 🟢 Low | Logging only |
| `12. Stage 2 Deep Analysis.txt` | Line 9, 36 | 🟡 Medium | Update prompt |
| `26. Generate Final Report.js` | Line 1310 | 🟡 Medium | Update title logic |

---

## Next Steps

**User Decision Required**:
1. Which approach? (Conditional logic vs Separate flow)
2. What schedule frequency? (Every 5min, 15min, hourly?)
3. Which namespaces to monitor in scheduled mode?
4. Should scheduled scans use KB fallback or only metrics?

**After Decision**:
- I can generate the exact code changes needed
- Provide modified node files
- Create migration guide for n8n import
