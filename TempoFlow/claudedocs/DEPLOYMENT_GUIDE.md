# TempoFlow Multi-Namespace Deployment Guide

**Version**: 2.0 (Multi-Namespace Support)
**Date**: 2025-12-21
**Purpose**: Deploy refactored TempoFlow with 12-namespace support to n8n

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### ✅ Code Verification
- [x] All Phase 2 changes committed to git
- [x] Service dependency store verified (37 critical services)
- [x] Multi-namespace configuration validated
- [x] Tempo query syntax verified (TraceQL)

### ✅ Files to Deploy (5 files)
1. `TempoFlow Nodes/1. Unified Entry Point.js`
2. `TempoFlow Nodes/4. Service-Aware Query Builder.js`
3. `TempoFlow Nodes/5. Stage 1 Quick Health Check.txt`
4. `TempoFlow Nodes/7. Stage 2 Deep Dive.txt`
5. `TempoFlow Nodes/8. Combine Results.js` ⚠️ **BUG FIX: Node reference correction**

### ✅ Nodes NOT Changed (Safe to Skip)
- Node 2: Service Dependency Store
- Node 3: Orchestrator Input Handler
- Node 6: Enhanced Error Categorization
- Node 9: Format Final Output

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Backup Current TempoFlow in n8n
1. Open n8n workflow: **TempoFlow**
2. Click **⋮ (three dots)** → **Download**
3. Save as: `TempoFlow_BACKUP_2025-12-21.json`
4. Store in safe location

### Step 2: Update Node 1 (Unified Entry Point)

**n8n Location**: Find node named "Unified Entry Point" or "1. Unified Entry Point"

**Changes to Make**:

**A) Orchestrator Mode - Lines 58-72**
Replace:
```javascript
searchParams: {
  environment: 'etiyamobile-production',
```

With:
```javascript
searchParams: {
  namespaces: [
    "bstp-cms-global-production",
    "bstp-cms-prod-v3",
    "em-global-prod-3pp",
    "em-global-prod-eom",
    "em-global-prod-flowe",
    "em-global-prod",
    "em-prod-3pp",
    "em-prod-eom",
    "em-prod-flowe",
    "em-prod",
    "etiyamobile-production",
    "etiyamobile-prod"
  ],
```

**B) Chat Mode - Lines 200-214**
Same replacement as above for chat mode's `searchParams`

**C) Tempo Query Builder - Lines 142-165**
Replace:
```javascript
// Build Tempo query
let tempoQuery = `{.deployment.environment="${config.searchParams.environment}"`;

// For critical priority, search for all errors
if (config.analysisConfig.priority === 'critical' &&
    config.searchParams.errorTypes.includes('all_errors')) {
  tempoQuery += ` && .span.http.status_code>=400`;
} else if (config.searchParams.statusCodes.length > 0) {
  const codes = config.searchParams.statusCodes.join('|');
  tempoQuery += ` && .status=~"${codes}"`;
}

// Add service filter if specified
if (config.searchParams.services.length > 0) {
  const serviceFilter = config.searchParams.services
    .map(s => `.resource.service.name=~".*${s}.*"`)
    .join(' || ');
  tempoQuery += ` && (${serviceFilter})`;
}
```

With:
```javascript
// Build Tempo query - MULTI-NAMESPACE SUPPORT
// Create namespace regex pattern: namespace=~"ns1|ns2|ns3"
const namespacePattern = config.searchParams.namespaces.join('|');
let tempoQuery = `{resource.deployment.environment=~"${namespacePattern}"`;

// For critical priority, search for all errors
if (config.analysisConfig.priority === 'critical' &&
    config.searchParams.errorTypes.includes('all_errors')) {
  tempoQuery += ` && span.http.status_code>=400`;
} else if (config.searchParams.statusCodes.length > 0) {
  const codes = config.searchParams.statusCodes.join('|');
  tempoQuery += ` && status.code=~"${codes}"`;
}

// Add service filter if specified
if (config.searchParams.services.length > 0) {
  const serviceFilter = config.searchParams.services
    .map(s => `resource.service.name=~".*${s}.*"`)
    .join(' || ');
  tempoQuery += ` && (${serviceFilter})`;
}
```

### Step 3: Update Node 4 (Service-Aware Query Builder)

**n8n Location**: Find node named "Service-Aware Query Builder" or "4. Service-Aware Query Builder"

**⚠️ CRITICAL**: This fixes a TraceQL syntax error (`status=error` → `span.http.status_code>=400`)

**Changes to Make - Lines 332-367**:

Replace:
```javascript
// Build enhanced Tempo queries
const baseEnv = input.searchParams?.environment || "etiyamobile-production";

// Query 1: Service-specific errors
if (enhancedParams.serviceAnalysis.detectedServices.length > 0) {
  const serviceFilter = enhancedParams.serviceAnalysis.detectedServices
    .map(s => `.resource.service.name="${s}"`)
    .join(' || ');

  enhancedParams.serviceAnalysis.enhancedQueries.serviceErrors =
    `{ resource.deployment.environment="${baseEnv}" && (${serviceFilter}) && status=error }`;
}

// Query 2: High latency for critical services
const criticalServices = enhancedParams.serviceAnalysis.detectedServices
  .filter(s => enhancedParams.serviceAnalysis.serviceMetadata[s]?.criticality === 'critical');

if (criticalServices.length > 0) {
  const criticalFilter = criticalServices.map(s => `.resource.service.name="${s}"`).join(' || ');
  enhancedParams.serviceAnalysis.enhancedQueries.criticalLatency =
    `{ resource.deployment.environment="${baseEnv}" && (${criticalFilter}) && duration > 500ms }`;
}
```

With:
```javascript
// Build enhanced Tempo queries - MULTI-NAMESPACE SUPPORT
const namespaces = input.searchParams?.namespaces || [
  "bstp-cms-global-production",
  "bstp-cms-prod-v3",
  "em-global-prod-3pp",
  "em-global-prod-eom",
  "em-global-prod-flowe",
  "em-global-prod",
  "em-prod-3pp",
  "em-prod-eom",
  "em-prod-flowe",
  "em-prod",
  "etiyamobile-production",
  "etiyamobile-prod"
];
const namespacePattern = namespaces.join('|');

// Query 1: Service-specific errors across ALL namespaces
if (enhancedParams.serviceAnalysis.detectedServices.length > 0) {
  const serviceFilter = enhancedParams.serviceAnalysis.detectedServices
    .map(s => `resource.service.name="${s}"`)
    .join(' || ');

  enhancedParams.serviceAnalysis.enhancedQueries.serviceErrors =
    `{ resource.deployment.environment=~"${namespacePattern}" && (${serviceFilter}) && span.http.status_code>=400 }`;
}

// Query 2: High latency for critical services across ALL namespaces
const criticalServices = enhancedParams.serviceAnalysis.detectedServices
  .filter(s => enhancedParams.serviceAnalysis.serviceMetadata[s]?.criticality === 'critical');

if (criticalServices.length > 0) {
  const criticalFilter = criticalServices.map(s => `resource.service.name="${s}"`).join(' || ');
  enhancedParams.serviceAnalysis.enhancedQueries.criticalLatency =
    `{ resource.deployment.environment=~"${namespacePattern}" && (${criticalFilter}) && duration > 500ms }`;
}
```

### Step 4: Update Agent 5 (Stage 1 Quick Health Check)

**n8n Location**: Find AI Agent node named "Stage 1: Quick Health Check" or "5. Stage 1 Quick Health Check"

**Changes to Make**:

Add this section at the **END** of the prompt (after line 123):

```markdown
## 🌍 MULTI-NAMESPACE ANALYSIS:
This flow analyzes traces across 12 production namespaces simultaneously:
- bstp-cms-global-production, bstp-cms-prod-v3
- em-global-prod-3pp, em-global-prod-eom, em-global-prod-flowe, em-global-prod
- em-prod-3pp, em-prod-eom, em-prod-flowe, em-prod
- etiyamobile-production, etiyamobile-prod

The RecentErrors tool results will include traces from ALL these namespaces. Analyze namespace distribution in your findings.
```

**Remove** this line (Line 125):
```
Default environment: deployment.environment="etiyamobile-production"
```

### Step 5: Update Agent 7 (Stage 2 Deep Dive)

**n8n Location**: Find AI Agent node named "Stage 2: Deep Dive" or "7. Stage 2 Deep Dive"

**Changes to Make**:

Add this section at the **END** of the prompt (after the "RATE LIMIT PROTECTION" section):

```markdown
## 🌍 MULTI-NAMESPACE DEEP ANALYSIS:
You are analyzing traces from 12 production namespaces simultaneously:
- bstp-cms-global-production, bstp-cms-prod-v3
- em-global-prod-3pp, em-global-prod-eom, em-global-prod-flowe, em-global-prod
- em-prod-3pp, em-prod-eom, em-prod-flowe, em-prod
- etiyamobile-production, etiyamobile-prod

Tool results will include cross-namespace patterns. Identify:
1. **Namespace-specific issues**: Errors isolated to one namespace
2. **Cross-namespace cascade**: Issues affecting multiple namespaces
3. **Service replication**: Same service deployed in different namespaces
4. **Namespace correlation**: Are errors correlated with specific namespace groups?
```

### Step 6: Update Node 8 (Combine Results) ⚠️ BUG FIX

**n8n Location**: Find node named "Combine Results" or "8. Combine Results"

**⚠️ CRITICAL**: Fixes missing node reference error

**Changes to Make - Line 5**:

Replace:
```javascript
const stage1Data = $node["Check If Stage 2 Needed"].json;
```

With:
```javascript
const stage1Data = $node["Enhanced Error Categorization"].json;
```

### Step 7: Save and Activate

1. Click **Save** in n8n workflow editor
2. Verify workflow is **Active** (toggle should be green)
3. Note the workflow ID for testing

---

## 🧪 POST-DEPLOYMENT TESTING

### Test 1: Manual Trigger Test
**Purpose**: Verify basic multi-namespace query generation

1. Click **Execute Workflow** (manual trigger)
2. Check Node 1 output:
   - Verify `searchParams.namespaces` contains 12 namespaces
   - Verify `searchParams.customQuery` uses `resource.deployment.environment=~"..."`
3. Check Node 4 output:
   - Verify `enhancedQueries.serviceErrors` uses multi-namespace pattern
4. Expected Result: ✅ No errors, queries contain multi-namespace regex

### Test 2: Chat Input Test
**Purpose**: Verify service detection works with multi-namespace

1. Send chat message: "Are there any payment errors?"
2. Verify Node 1 output:
   - `source`: "chat"
   - `searchParams.namespaces`: 12 namespaces
3. Verify Node 4 output:
   - `detectedServices` includes payment-related services
4. Check Agent 5 response:
   - Should mention analyzing across 12 namespaces
   - Should show namespace distribution if errors found
5. Expected Result: ✅ Chat analysis works, mentions multi-namespace

### Test 3: Orchestrator Trigger Test
**Purpose**: Verify orchestrator integration still works

1. Trigger from orchestrator workflow (if available)
2. Verify Node 1 output:
   - `source`: "orchestrator"
   - `orchestratorId` present
   - `searchParams.namespaces`: 12 namespaces
3. Expected Result: ✅ Orchestrator flow works with multi-namespace

### Test 4: Agent Output Validation
**Purpose**: Verify agents understand multi-namespace data

1. Run workflow with known error condition
2. Check Agent 5 output (Stage 1):
   - Should analyze traces from multiple namespaces
   - Should mention namespace distribution
3. If Stage 2 runs, check Agent 7 output:
   - Should identify cross-namespace patterns
   - Should detect namespace-specific issues
4. Expected Result: ✅ Agents provide namespace-aware analysis

---

## 🔍 VERIFICATION CHECKLIST

### Code Changes
- [ ] Node 1: `searchParams.namespaces` array (12 namespaces) ✅
- [ ] Node 1: Tempo query uses `resource.deployment.environment=~"..."` ✅
- [ ] Node 1: Attribute paths without `.` prefix (`status.code` not `.status.code`) ✅
- [ ] Node 4: Multi-namespace `namespacePattern` variable ✅
- [ ] Node 4: Both queries use `resource.deployment.environment=~"..."` ✅
- [ ] Agent 5: Multi-namespace section added ✅
- [ ] Agent 7: Multi-namespace deep analysis section added ✅

### Functional Tests
- [ ] Manual trigger: Generates multi-namespace queries ✅
- [ ] Chat input: Service detection works ✅
- [ ] Chat input: Response mentions 12 namespaces ✅
- [ ] Orchestrator: Integration still works ✅
- [ ] Agent 5: Analyzes namespace distribution ✅
- [ ] Agent 7: Detects cross-namespace patterns ✅

### Data Flow
- [ ] Node 1 → Node 2: All data preserved ✅
- [ ] Node 2 → Node 3: Service dependencies passed ✅
- [ ] Node 3 → Node 4: Input data intact ✅
- [ ] Node 4 → Agent 5: Multi-namespace queries work ✅
- [ ] Agent 5 → Node 6: Error categorization works ✅
- [ ] Node 6 → Agent 7: Deep analysis trigger works ✅
- [ ] Agent 7 → Node 8: Results combined correctly ✅
- [ ] Node 8 → Node 9: Final output formatted ✅

---

## ⚠️ ROLLBACK PROCEDURE

If issues occur after deployment:

### Quick Rollback (Emergency)
1. Open n8n workflow editor
2. Click **⋮ (three dots)** → **Upload**
3. Select: `TempoFlow_BACKUP_2025-12-21.json`
4. Click **Save**
5. Verify workflow is **Active**

### Investigate Issues
1. Check n8n execution logs
2. Look for error patterns:
   - **Tempo query syntax errors**: Check `resource.deployment.environment` format
   - **Service matching failures**: Check pattern matching in Node 4
   - **Agent errors**: Verify multi-namespace instructions

### Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Invalid TraceQL syntax" | Attribute path has `.` prefix | Remove `.` from `status.code`, `service.name` |
| "No traces found" | Namespace regex incorrect | Verify 12 namespaces in `namespacePattern` |
| "Service not detected" | Pattern matching too strict | Check Node 4 pattern: `resource.service.name=~".*${s}.*"` |
| "Agent confused by data" | Missing multi-namespace instructions | Add multi-namespace sections to agent prompts |

---

## 📊 MONITORING POST-DEPLOYMENT

### Week 1: Active Monitoring
**Check Daily**:
- [ ] Execution success rate (should be >95%)
- [ ] Average execution time (should be <60 seconds)
- [ ] Namespace coverage (traces from all 12 namespaces?)
- [ ] Service detection accuracy (correct services identified?)
- [ ] Agent response quality (namespace-aware analysis?)

**Metrics to Track**:
1. **Execution Count**: How many times TempoFlow runs per day
2. **Success Rate**: % of successful completions
3. **Error Types**: Any new error patterns
4. **Namespace Distribution**: Which namespaces have most traces
5. **Service Coverage**: Which services detected most frequently

### Week 2-4: Stability Verification
**Check Weekly**:
- [ ] No degradation in success rate
- [ ] Namespace coverage remains comprehensive
- [ ] Agent analysis quality maintained
- [ ] No performance regression

---

## ✅ DEPLOYMENT COMPLETE

After completing all steps and verification:

1. Mark deployment as successful
2. Document any issues encountered
3. Share results with team
4. Schedule follow-up review in 2 weeks

**Deployment Date**: _________________
**Deployed By**: _________________
**Sign-off**: _________________

---

## 📚 REFERENCE LINKS

- [Refactoring Log](../TEMPOFLOW_REFACTOR_LOG.md)
- [Service Verification Analysis](SERVICE_VERIFICATION_ANALYSIS.md)
- [Tempo TraceQL Documentation](https://grafana.com/docs/tempo/latest/traceql/)
- [LokiFlow Agent Tools](../../LokiFlow/AgentTools.txt) (for multi-namespace Loki queries reference)

**Last Updated**: 2025-12-21
