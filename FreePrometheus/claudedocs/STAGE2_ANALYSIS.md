# Stage 2: Deep Analysis - Validation Report

## 📋 Stage 2 Scope (from General_flow_infos.md)

**Purpose**: "Stage 1'de bulunan problem ve anomaliler sebebiyle daha derinlemesine analiz yapmak"

**Flow**: `If Node → Force Deep Analysis Override → Stage 2: Deep Analysis (Agent + 12 HTTP tools) → Fix Stage2 Json`

**Expected Duration**: 30 seconds
**Analysis Phases**: Instant (0-10s) → Trend (10-20s) → Anomaly (20-30s)

---

## ✅ Node Structure Validation

### 1. Force Deep Analysis Override (8. Force Deep Analysis Override.js)
**Status**: ✅ CORRECT
- Receives Stage 1 results
- Checks `forceDeepAnalysis` flag
- Overrides `proceed_to_stage2` if needed
- Prepares namespace/service filtering
- Creates `queryHelpers` with ready-to-use Prometheus queries
- Passes `stage1Data` to Stage 2
- Context preservation working

### 2. Stage 2: Deep Analysis Agent (9. Stage 2 Deep Analysis.txt)
**Status**: ⚠️ NEEDS REVIEW
- Has comprehensive prompt structure
- Context preservation instructions present
- Tool execution instructions present
- **ISSUE**: Prompt complexity vs actual AI usage

### 3. Fix Stage 2 Context (11. Fix Stage 2 Context.js)
**Status**: ✅ CORRECT
- Circular reference handling
- Context validation and fixing
- Stage 1 + Stage 2 data aggregation
- Decision tracking for Stage 3

---

## 🔧 HTTP Tools Validation

### Documentation Requirements (12 tools):
1. ✅ **Node Resource Status** - Memory/CPU/Disk usage
2. ✅ **Node Conditions** - Ready/MemoryPressure/DiskPressure/PIDPressure
3. ✅ **Pod Status Check** - Restarts/Waiting/Phase
4. ✅ **Node Network Health** - Network errors/drops
5. ✅ **Container Restarts** - Restart counts and termination reasons
6. ✅ **Application Metrics** - Container network metrics
7. ✅ **HTTP Error Rates** - Pod failures as proxy
8. ✅ **Pod Resource Usage** - Memory/CPU per pod
9. ✅ **Resource Exhaustion Prediction** - predict_linear for future issues
10. ❌ **Historical Comparison 24h** - **MISSING IN FLOW**
11. ✅ **Kubernetes PVC Status** - PVC usage/phase
12. ✅ **Kubernetes HPA Status** - HPA replica status

**CRITICAL FINDING**: "Historical Comparison 24h" tool is specified in documentation but NOT present in FreePrometheusFlow.json!

---

## 🚨 Critical Issues Found

### Issue 1: Missing Tool - Historical Comparison 24h
**Severity**: HIGH
**Location**: FreePrometheusFlow.json
**Description**:
- Documentation line 163-178 specifies "Historical Comparison 24h" tool
- This tool is critical for trend analysis phase (Phase 2: 10-20s)
- Flow currently has 11 tools instead of documented 12 tools
- Stage 2 prompt references this tool in Phase 2 analysis

**Query from Documentation**:
```javascript
{{
(() => {
  let metricQuery = $json.metric_query || 'up{job="kubernetes-nodes"}';
  const svc = $json.service || '';

  if (svc && metricQuery === 'up{job="kubernetes-nodes"}') {
    metricQuery = `kube_pod_container_status_restarts_total{pod=~".*${svc}.*"}`;
  }

  return metricQuery;
})()
}}
```

**Impact**:
- AI Agent cannot perform historical trend analysis
- Phase 2 (Trend) of 3-phase analysis incomplete
- Missing "memory_growth", "restart_pattern", "peak_times" findings

**Solution**: Add HTTP tool to flow (requires manual n8n flow editing)

---

### Issue 2: Namespace Filtering in Tools
**Severity**: MEDIUM
**Location**: Multiple HTTP tools in flow
**Description**:
- Documentation shows dynamic namespace filtering: `const ns = $json.namespace || 'etiyamobile-production'`
- Some tools use single namespace default instead of multi-namespace regex
- Inconsistent with Stage 1 fix where we used full namespace list

**Tools Affected**:
- Pod Status Check
- Node Network Health
- Container Restarts
- Application Metrics
- HTTP Error Rates
- Pod Resource Usage
- Resource Exhaustion Prediction
- Kubernetes PVC Status
- Kubernetes HPA Status

**Current Pattern**:
```javascript
const ns = $json.namespace || 'etiyamobile-production';  // ❌ Single namespace
```

**Should Be (matching Stage 1 approach)**:
```promql
namespace=~"bstp-cms-global-production|bstp-cms-prod-v3|..."  // ✅ All namespaces
```

**Solution**: Document tool query fixes for manual application

---

### Issue 3: Stage 2 Prompt Optimization
**Severity**: LOW
**Location**: 9. Stage 2 Deep Analysis.txt
**Description**:
- Prompt is comprehensive but may benefit from Stage 1-style improvements:
  - ✅ Has context preservation
  - ✅ Has time parameter instructions
  - ✅ Has namespace filtering instructions
  - ❌ Missing decision logic (when to set `proceed_to_stage3`)
  - ❌ Missing confidence scoring logic
  - ❌ Missing tool selection strategy based on Stage 1 findings

**Comparison with Stage 1 Improvements**:
- Stage 1: Added explicit decision logic (proceed_to_stage2 = true/false conditions)
- Stage 1: Added explicit scoring logic (how to convert tool data to scores 1-5)
- Stage 2: Has phases but no explicit logic for `proceed_to_stage3` decision
- Stage 2: Has confidence field but no guidance on how to calculate it

**Should Add**:
1. **Decision Logic**:
   ```markdown
   ## 🎯 STAGE 3 DECISION LOGIC:

   Set proceed_to_stage3 = true IF:
   - root_cause.identified = false (need alert correlation)
   - alert_correlation_needed = true
   - Alerts > 0 AND no clear root cause from metrics

   Set proceed_to_stage3 = false IF:
   - root_cause.identified = true with confidence > 0.7
   - No active alerts AND metrics show clear issue
   ```

2. **Confidence Scoring Logic**:
   ```markdown
   ## 📊 CONFIDENCE CALCULATION:

   Root cause confidence = Sum of:
   - Multiple tools show same issue: +0.3
   - Evidence from 3+ different metrics: +0.2
   - Correlation with alerts: +0.2
   - Historical pattern match: +0.2
   - Blast radius clearly identified: +0.1

   Total confidence range: 0.0 - 1.0
   ```

---

## 📊 Stage 2 Prompt Quality Assessment

### Strengths:
- ✅ Clear 3-phase structure (Instant/Trend/Anomaly)
- ✅ Context preservation instructions
- ✅ Time parameter handling
- ✅ Namespace/service filtering guidance
- ✅ Tool execution examples
- ✅ JSON format validation rules
- ✅ Output structure template

### Weaknesses:
- ⚠️ No explicit decision logic for `proceed_to_stage3`
- ⚠️ No confidence calculation guidance
- ⚠️ Tool selection strategy not clearly defined
- ⚠️ Phase execution may be too rigid (10s/10s/10s)

---

## 🔍 Comparison: Stage 1 vs Stage 2

| Aspect | Stage 1 | Stage 2 |
|--------|---------|---------|
| **Decision Logic** | ✅ Explicit (lines 63-78) | ❌ Missing |
| **Scoring Logic** | ✅ Explicit (lines 80-111) | ❌ Implicit only |
| **Context Preservation** | ✅ Yes | ✅ Yes |
| **Time Parameters** | ✅ Yes | ✅ Yes |
| **Namespace Filtering** | ✅ Yes | ✅ Yes |
| **Tool Count** | 2/2 ✅ | 11/12 ❌ |
| **Output Format** | ✅ Validated | ✅ Validated |

---

## 📝 Recommended Fixes Priority

### 1. HIGH PRIORITY - Add Missing Tool
**Action**: Add "Historical Comparison 24h" HTTP tool
**File**: FreePrometheusFlow.json (manual n8n editing)
**Impact**: Enables complete trend analysis

### 2. MEDIUM PRIORITY - Fix Tool Namespace Filtering
**Action**: Update all Stage 2 tools to use full namespace list
**File**: TOOL_FIXES_REQUIRED.md (documentation)
**Impact**: Ensures tools query all production namespaces

### 3. LOW PRIORITY - Enhance Stage 2 Prompt
**Action**: Add decision logic and confidence scoring
**File**: 9. Stage 2 Deep Analysis.txt
**Impact**: Improves AI decision quality and consistency

---

## 🎯 Next Steps

1. ✅ Document missing "Historical Comparison 24h" tool
2. ✅ Document namespace filter fixes for all 12 tools
3. ⏳ Enhance Stage 2 prompt with decision/confidence logic
4. ⏳ Validate fixes with test execution
5. ⏳ Move to Stage 3 analysis

---

## 📌 Notes

- Stage 2 node structure (Force Override → Agent → Fix Context) is correct
- Context preservation working correctly
- Main issues are in tool configuration and prompt clarity
- Following Rule 8: All fixes documented, no direct flow.json editing
- Following Rule 11: Tool queries match documentation specifications
