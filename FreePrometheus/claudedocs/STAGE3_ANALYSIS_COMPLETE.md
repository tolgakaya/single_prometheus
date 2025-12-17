# Stage 3: Alert Intelligence Analysis Complete

## 🎯 Stage 3 Overview

**Purpose**: Alert Intelligence & Correlation - Deep analysis of alerts based on Stage 1 & 2 findings

**Flow** (from stage3.png screenshot):
```
Fix Stage 2 Context → Stage 3: Alert Intelligence (AI Agent) → Fix Stage 3 Context1
```

**7 HTTP Tools**:
1. Alert History 24h (alert-level query)
2. Active Alerts Details (alert-level query)
3. Pod Ready SLO (namespace-level)
4. Node Ready SLO (cluster-level)
5. Container Running SLO (namespace-level)
6. Deployment Replica Health (namespace-level)
7. Pod Restart Rate SLO (namespace-level)

---

## 📊 Stage 3 Prompt Improvements - COMPLETED ✅

**Location**: `FreePrometheus/PrometheusNodes/12. Stage 3 Alert Intelligence.txt`

### Changes Made:

#### A. Added Decision Logic for `proceed_to_stage4`:

**Lines added before "TOOL PARAMETERS" section:**

```markdown
## 🎯 DECISION LOGIC - HOW TO SET proceed_to_stage4:

**Set proceed_to_stage4 = true IF ANY OF THESE CONDITIONS:**
1. Active alerts count > 0 (any firing alerts need automated diagnosis)
2. SLO violation detected (availability_slo.status = "red" OR current < 99.0%)
3. High-severity alerts present (Critical or Blocker severity from KB enrichment)
4. Alert storm detected (alert_patterns.storm_detection.detected = true)
5. Stage 2 identified issues but root_cause.confidence < 0.7
6. Multiple alert groups indicating complex cascading failures

**Set proceed_to_stage4 = false ONLY IF ALL CONDITIONS MET:**
1. No active alerts (active_alerts = [] OR all alerts resolved)
   AND
2. SLO status = "green" (availability_slo.current >= 99.9%)
   AND
3. No recurring alert patterns (alert_patterns.recurring = [])
   AND
4. auto_remediation_approved = true (all Low/Medium severity KB matches)
   AND
5. Stage 2 found no issues OR Stage 2 root_cause.confidence >= 0.8

**CRITICAL**: Default to true if uncertain. Better to run diagnosis than miss critical issues.
```

#### B. Added Alert Correlation Confidence Calculation:

```markdown
## 📊 ALERT CORRELATION CONFIDENCE CALCULATION:

Calculate overall alert correlation quality (0.0 - 1.0) as SUM of these factors:

**1. Alert-to-Stage2 Correlation (+0.3):**
- Alert labels match Stage 2 root_cause.component (e.g., same pod/namespace) = +0.3
- Alerts in same namespace as Stage 2 affected_services = +0.2
- Alerts related to Stage 2 findings but different component = +0.1
- No correlation with Stage 2 findings = 0.0

**2. Knowledge Base Coverage (+0.3):**
- All active alerts have KB matches (100% coverage) = +0.3
- 75%-99% alerts have KB matches = +0.2
- 50%-74% alerts have KB matches = +0.1
- <50% KB coverage = +0.05
- No KB matches = 0.0

**3. Alert Group Quality (+0.2):**
- Clear root alert identified with 3+ related alerts (strong correlation) = +0.2
- Root alert with 1-2 related alerts (moderate correlation) = +0.1
- No alert grouping possible (isolated alerts) = 0.0

**4. SLO Impact Clarity (+0.2):**
- Composite SLO available with 4+ components = +0.2
- Composite SLO with 2-3 components = +0.1
- Single SLO component = +0.05
- No SLO data (all NaN/empty) = 0.0
```

#### C. Fixed Tool Parameter Documentation:

**BEFORE (YANLIŞ - Multiple Issues):**
```javascript
// Prompt told AI to pass these parameters:
{
  "namespace": "{{ $json._context.initialParams.namespaces[0] || 'etiyamobile-production' }}",
  "service": "{{ $json.output.correlation_matrix.affected_services && $json.output.correlation_matrix.affected_services[0] || '' }}"
}
```

**Problems:**
1. ❌ Instructs AI to pass `namespace` parameter (but tools handle multi-namespace internally)
2. ❌ Uses `namespaces[0]` - only first namespace instead of all 12
3. ❌ Wrong context path: `$json.output.correlation_matrix` (doesn't exist)

**AFTER (DOĞRU):**
```markdown
**IMPORTANT**: SLO tools automatically use multi-namespace filtering via `$json.namespaceRegex`.
You do NOT need to pass namespace parameters when calling tools.

Tools will automatically query across ALL 12 production namespaces.

Service filtering (optional) comes from Stage 2 data:
- Service name: {{ $json.stage2Data?.correlation_matrix?.affected_services?.[0] || 'none detected' }}
```

**Why**: 
- Tools already use `namespaceRegex` internally (via n8n flow after fixes applied)
- AI doesn't need to pass namespace - it's automatic
- Stage 2 data is in `$json.stage2Data.correlation_matrix`, not `$json.output`

#### D. Added `correlation_confidence` to Output Schema:

Added new field to JSON output:
```json
"correlation_confidence": <calculate 0.0-1.0 using formula above>,
"proceed_to_stage4": <true if alerts need investigation, false otherwise>,
```

---

## 🔧 Stage 3 Multi-Namespace Fixes - REQUIRES n8n EDITS

### Problem Identified:

**Same as Stage 2**: All SLO tools use single namespace instead of multi-namespace regex.

**Impact**: SLO calculations only check 1 namespace (usually `etiyamobile-production` or first namespace from list) instead of all 12 production namespaces.

---

### Fix Pattern:

**YANLIŞ (Mevcut):**
```javascript
const ns = $json.namespace || $json._context?.initialParams?.namespaces?.[0] || 'etiyamobile-production';
// Query: namespace="${ns}"
```

**DOĞRU (Olması Gereken):**
```javascript
const namespaceRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
// Query: namespace=~"${namespaceRegex}"
```

---

### Tools Requiring Fixes:

#### 1. Pod Ready SLO - Multi-Namespace Fix ✅

**Mevcut (YANLIŞ):**
```javascript
{{
(() => {
  const ns = $json.namespace || $json._context?.initialParams?.namespaces?.[0] || 'etiyamobile-production';
  const svc = $json.service || $json.output?.correlation_matrix?.affected_services?.[0] || '';
  
  if (svc) {
    return `(sum(kube_pod_status_ready{namespace="${ns}", pod=~".*${svc}.*", condition="true"}) / count(kube_pod_info{namespace="${ns}", pod=~".*${svc}.*"})) * 100`;
  } else {
    return `(sum(kube_pod_status_ready{namespace="${ns}", condition="true"}) / count(kube_pod_info{namespace="${ns}"})) * 100`;
  }
})()
}}
```

**Düzeltilmiş (DOĞRU):**
```javascript
{{
(() => {
  const namespaceRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
  const svc = $json.service || $json.stage2Data?.correlation_matrix?.affected_services?.[0] || '';
  
  if (svc) {
    return `(sum(kube_pod_status_ready{namespace=~"${namespaceRegex}", pod=~".*${svc}.*", condition="true"}) / count(kube_pod_info{namespace=~"${namespaceRegex}", pod=~".*${svc}.*"})) * 100`;
  } else {
    return `(sum(kube_pod_status_ready{namespace=~"${namespaceRegex}", condition="true"}) / count(kube_pod_info{namespace=~"${namespaceRegex}"})) * 100`;
  }
})()
}}
```

**Two fixes**:
1. `namespace="${ns}"` → `namespace=~"${namespaceRegex}"`
2. `$json.output?.correlation_matrix` → `$json.stage2Data?.correlation_matrix`

---

#### 2. Container Running SLO - Multi-Namespace Fix ✅

**Mevcut (YANLIŞ):**
```javascript
{{
(() => {
  const ns = $json.namespace || $json._context?.initialParams?.namespaces?.[0] || 'etiyamobile-production';
  const svc = $json.service || $json.output?.correlation_matrix?.affected_services?.[0] || '';
  
  if (svc) {
    return `(sum(kube_pod_container_status_running{namespace="${ns}", pod=~".*${svc}.*"}) / count(kube_pod_container_info{namespace="${ns}", pod=~".*${svc}.*"})) * 100`;
  } else {
    return `(sum(kube_pod_container_status_running{namespace="${ns}"}) / count(kube_pod_container_info{namespace="${ns}"})) * 100`;
  }
})()
}}
```

**Düzeltilmiş (DOĞRU):**
```javascript
{{
(() => {
  const namespaceRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
  const svc = $json.service || $json.stage2Data?.correlation_matrix?.affected_services?.[0] || '';
  
  if (svc) {
    return `(sum(kube_pod_container_status_running{namespace=~"${namespaceRegex}", pod=~".*${svc}.*"}) / count(kube_pod_container_info{namespace=~"${namespaceRegex}", pod=~".*${svc}.*"})) * 100`;
  } else {
    return `(sum(kube_pod_container_status_running{namespace=~"${namespaceRegex}"}) / count(kube_pod_container_info{namespace=~"${namespaceRegex}"})) * 100`;
  }
})()
}}
```

---

#### 3. Pod Restart Rate SLO - Multi-Namespace Fix ✅

**Mevcut (YANLIŞ):**
```javascript
{{
(() => {
  const ns = $json.namespace || $json._context?.initialParams?.namespaces?.[0] || 'etiyamobile-production';
  const svc = $json.service || $json.output?.correlation_matrix?.affected_services?.[0] || '';
  
  if (svc) {
    return `100 - (avg(rate(kube_pod_container_status_restarts_total{namespace="${ns}", pod=~".*${svc}.*"}[5m])) * 100)`;
  } else {
    return `100 - (avg(rate(kube_pod_container_status_restarts_total{namespace="${ns}"}[5m])) * 100)`;
  }
})()
}}
```

**Düzeltilmiş (DOĞRU):**
```javascript
{{
(() => {
  const namespaceRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
  const svc = $json.service || $json.stage2Data?.correlation_matrix?.affected_services?.[0] || '';
  
  if (svc) {
    return `100 - (avg(rate(kube_pod_container_status_restarts_total{namespace=~"${namespaceRegex}", pod=~".*${svc}.*"}[5m])) * 100)`;
  } else {
    return `100 - (avg(rate(kube_pod_container_status_restarts_total{namespace=~"${namespaceRegex}"}[5m])) * 100)`;
  }
})()
}}
```

---

#### 4. Deployment Replica Health - Multi-Namespace Fix ✅

**Mevcut (YANLIŞ):**
```javascript
{{
(() => {
  const ns = $json.namespace || $json._context?.initialParams?.namespaces?.[0] || 'etiyamobile-production';
  const svc = $json.service || $json.output?.correlation_matrix?.affected_services?.[0] || '';
  
  if (svc) {
    return `(sum(kube_deployment_status_replicas_available{namespace="${ns}", deployment=~".*${svc}.*"}) / sum(kube_deployment_spec_replicas{namespace="${ns}", deployment=~".*${svc}.*"})) * 100`;
  } else {
    return `(sum(kube_deployment_status_replicas_available{namespace="${ns}"}) / sum(kube_deployment_spec_replicas{namespace="${ns}"})) * 100`;
  }
})()
}}
```

**Düzeltilmiş (DOĞRU):**
```javascript
{{
(() => {
  const namespaceRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
  const svc = $json.service || $json.stage2Data?.correlation_matrix?.affected_services?.[0] || '';
  
  if (svc) {
    return `(sum(kube_deployment_status_replicas_available{namespace=~"${namespaceRegex}", deployment=~".*${svc}.*"}) / sum(kube_deployment_spec_replicas{namespace=~"${namespaceRegex}", deployment=~".*${svc}.*"})) * 100`;
  } else {
    return `(sum(kube_deployment_status_replicas_available{namespace=~"${namespaceRegex}"}) / sum(kube_deployment_spec_replicas{namespace=~"${namespaceRegex}"})) * 100`;
  }
})()
}}
```

---

### Tools NOT Requiring Fixes:

#### Alert History 24h - No Fix Needed ✅

**Why**: Alert-level query, doesn't filter by namespace.

**Query (DOĞRU - değiştirme):**
```promql
count by (alertname, severity) (ALERTS{alertstate="firing"})
```

---

#### Active Alerts Details - No Fix Needed ✅

**Why**: Alert-level query with Kubernetes alert name filter only.

**Query (DOĞRU - değiştirme):**
```promql
ALERTS{alertstate="firing",alertname=~"Kube.*|Container.*|Pod.*|Node.*"}
```

---

#### Node Ready SLO - No Fix Needed ✅

**Why**: Cluster-level metric, doesn't use namespace filtering.

**Query (DOĞRU - değiştirme):**
```javascript
{{
(() => {
  return `(sum(kube_node_status_condition{condition="Ready",status="true"}) / count(kube_node_info)) * 100`;
})()
}}
```

---

## 📋 Stage 3 Tool Summary

| Tool Name | Type | Namespace Filter? | Multi-Namespace Fix? | Context Fix? |
|-----------|------|-------------------|---------------------|--------------|
| Alert History 24h | Alert-level | ❌ No | ❌ Not needed | ✅ N/A |
| Active Alerts Details | Alert-level | ❌ No | ❌ Not needed | ✅ N/A |
| Pod Ready SLO | Namespace-level | ✅ Yes | ✅ **Required** | ✅ **Required** |
| Node Ready SLO | Cluster-level | ❌ No | ❌ Not needed | ✅ N/A |
| Container Running SLO | Namespace-level | ✅ Yes | ✅ **Required** | ✅ **Required** |
| Pod Restart Rate SLO | Namespace-level | ✅ Yes | ✅ **Required** | ✅ **Required** |
| Deployment Replica Health | Namespace-level | ✅ Yes | ✅ **Required** | ✅ **Required** |

**4 tools need fixes** (multi-namespace + context reference)  
**3 tools are correct** (no namespace filtering needed)

---

## 🎯 Impact Assessment

### Before Fixes:
- ❌ Stage 3 SLO calculations only check 1 namespace (first in list or hardcoded fallback)
- ❌ Wrong context reference (`$json.output.correlation_matrix` doesn't exist)
- ❌ No explicit decision logic for `proceed_to_stage4` (AI guesses)
- ❌ No confidence scoring for alert correlation quality
- ❌ Incomplete cluster-wide SLO visibility

### After Fixes:
- ✅ Stage 3 SLO calculations cover ALL 12 production namespaces
- ✅ Correct context reference to Stage 2 findings (`$json.stage2Data.correlation_matrix`)
- ✅ Explicit decision logic with 6 conditions for `proceed_to_stage4`
- ✅ Quantifiable alert correlation confidence (0.0-1.0 formula)
- ✅ Complete cluster-wide availability SLO tracking
- ✅ AI makes consistent, objective decisions about proceeding to Stage 4

---

## ✅ Validation Checklist

After applying n8n flow edits, validate:

1. **SLO Tools Return Data**:
   - Pod Ready SLO should return percentage across all namespaces
   - Container Running SLO should aggregate all 12 namespaces
   - No more NaN from single namespace queries

2. **Context Reference Works**:
   - SLO tools can access `$json.stage2Data.correlation_matrix.affected_services`
   - Service filtering works when Stage 2 identified specific services

3. **Decision Logic Executes**:
   - Stage 3 sets `proceed_to_stage4 = true` when alerts present
   - Stage 3 calculates `correlation_confidence` field (0.0-1.0)
   - Output includes new `correlation_confidence` value

4. **Composite SLO Calculation**:
   - Fix Stage 3 Context1.js correctly processes SLO components
   - Weighted composite: Pod Ready (30%) + Container Running (20%) + Node Ready (25%) + Restart Rate (15%) + Deployment Health (10%)

---

## 🔗 Related Documents

- **Stage 2 Analysis**: `FreePrometheus/claudedocs/STAGE2_ANALYSIS_COMPLETE.md`
- **Tool Fixes Reference**: `FreePrometheus/claudedocs/TOOL_FIXES_REQUIRED.md`
- **General Flow Info**: `FreePrometheus/claudedocs/General_flow_infos.md`
- **Stage 3 Prompt**: `FreePrometheus/PrometheusNodes/12. Stage 3 Alert Intelligence.txt`
- **Stage 3 Context Fixer**: `FreePrometheus/PrometheusNodes/13. Fix Stage 3 Context1.js`

---

## 🚀 Next Steps

1. ✅ **Stage 3 Prompt Improvements** - COMPLETED
2. ✅ **TOOL_FIXES_REQUIRED.md Updated** - COMPLETED
3. ⏳ **Apply n8n Flow Edits** - Manual task for user
4. ⏳ **Test Stage 3 Execution** - After n8n edits
5. ⏳ **Continue to Stage 4 Analysis** - Next phase

---

**Analysis Complete**: 2024-12-17
**Status**: ✅ Stage 3 improvements committed and pushed
