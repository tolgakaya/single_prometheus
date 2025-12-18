# Comprehensive Stage Prompt Analysis - Mock Data and Inconsistencies

## Executive Summary

Systematic review of all 6 stage prompts reveals **Stage 3 has the most severe hardcoded/mock data issues**. Stages 1, 2, 4, 5, and 6 have been fixed or have minimal issues, but Stage 3 contains template knowledge base entries that AI is copying verbatim.

**Critical Finding**: Stage 3 knowledge_base_matches section contains hardcoded generic responses that appear in actual output (lines 56-90 of output file).

---

## Stage 1: Health Snapshot - ✅ CLEAN

**File**: `FreePrometheus/PrometheusNodes/5. Stage 1 Health Snapshot.txt`

### Analysis Results

✅ **NO MOCK DATA FOUND**
- Line 145: Uses `"cluster": "etiyamobile-production"` but this appears to be a valid cluster name from context
- All timestamps use template expressions: `{{ $json._context.initialParams.startTime }}`
- Scoring logic is algorithmic (lines 80-111), not hardcoded
- Output format uses actual tool responses, not placeholders

✅ **NO INCONSISTENCIES**
- Instructions match output format
- Clear decision logic for proceed_to_stage2 (lines 65-78)
- Proper context preservation rules

✅ **GOOD PRACTICES**
- Lines 23-24: Explicit warning against hardcoded dates and mock data
- Line 186: "USE ACTUAL TOOL RESPONSE DATA - NO MOCK DATA"
- Line 50: "NEVER use hardcoded namespaces"

### Verdict: **NO CHANGES NEEDED**

---

## Stage 2: Deep Analysis - ✅ MOSTLY CLEAN

**File**: `FreePrometheus/PrometheusNodes/9. Stage 2 Deep Analysis.txt`

### Analysis Results

✅ **MINIMAL MOCK DATA**
- All template expressions properly use `{{ $json.* }}`
- Timestamps correctly reference context
- Namespace filters use dynamic regex

⚠️ **MINOR ISSUE FOUND - Line 24**
```markdown
1. Namespace filter: {{ $json.queryHelpers?.namespaceFilter }}
```

**Issue**: This line shows the template expression itself as an example, which is correct. However, it could be clearer that this is a ready-to-use value.

**Status**: This is actually fine - it's showing how to reference the pre-built filter.

✅ **NO INCONSISTENCIES**
- Decision logic is clear (lines 62-84)
- Confidence calculation is algorithmic (lines 86-119)
- Output format uses placeholders like `<actual component from findings>` which AI should replace

### Verdict: **NO CHANGES NEEDED**

---

## Stage 3: Alert Intelligence - ❌ SEVERE MOCK DATA ISSUES

**File**: `FreePrometheus/PrometheusNodes/12. Stage 3 Alert Intelligence.txt`

### Critical Issues Found

❌ **HARDCODED KNOWLEDGE BASE TEMPLATE (Lines 237-247)**

```json
"knowledge_base_matches": [
  {
    "alert": "<alert name or 'none'>",
    "kb_entry": {
      "root_causes": ["Based on alert type and previous incidents"],
      "diagnostic_commands": ["kubectl describe", "kubectl logs"],
      "immediate_actions": ["Check pod status", "Review recent changes"],
      "long_term_solutions": ["Update resource limits", "Fix application code"]
    },
    "applicability_score": <0.0-1.0 based on match or 0>
  }
]
```

**Evidence of AI Copying This Template**:

Output file lines 51-93 show EXACT COPY of this template:
```json
"knowledge_base_matches": [
  {
    "alert": "KubeHpaMaxedOut",
    "kb_entry": {
      "root_causes": ["Based on alert type and previous incidents"],  ← VERBATIM COPY
      "diagnostic_commands": ["kubectl describe", "kubectl logs"],     ← GENERIC
      "immediate_actions": ["Check pod status", "Review recent changes"], ← GENERIC
      "long_term_solutions": ["Update resource limits", "Fix application code"] ← GENERIC
    },
    "applicability_score": 0.3
  }
]
```

**Impact**: AI is NOT analyzing actual alerts and generating specific KB responses. It's copying the template.

❌ **HARDCODED ALERT DESCRIPTIONS (Lines 102-133)**

The prompt includes a JavaScript object with alert descriptions:
```javascript
const alertDescriptions = {
  "KubePodCrashLooping": {
    summary: "Pod is crash looping",
    description: "Pod has restarted more than 5 times in the last 10 minutes",
    severity: "critical"
  },
  // ... more entries
}
```

**Issue**: This is reference information, which is fine, BUT the AI is using this as a crutch instead of analyzing actual alert data to generate specific KB entries.

❌ **MOCK DATA IN OUTPUT TEMPLATE (Lines 272-277)**

```json
"recommended_alert_actions": [
  {
    "alert": "<alert name or 'none'>",
    "action": "<specific remediation action or 'Monitor'>",
    "confidence": <0.0-1.0 or 0>,
    "risk": "<low|medium|high>",
    "command": "<kubectl or other command or null>"
  }
]
```

Output shows generic "Monitor" action instead of specific remediation:
```json
"recommended_alert_actions": [
  {
    "alert": "KubeHpaMaxedOut",
    "action": "Monitor",  ← GENERIC, NOT SPECIFIC
    "confidence": 0.5,
    "risk": "medium",
    "command": null
  }
]
```

### Inconsistencies Found

⚠️ **Line 68 Syntax Error**
```markdown
return sloValue;
📊 COMPOSITE SLO CALCULATION:
```

Missing closing triple backticks before the heading. This could confuse AI parsing.

### Required Fixes for Stage 3

**Fix 1: Remove hardcoded KB template, add instructions**

Replace lines 237-247 with:
```markdown
"knowledge_base_matches": [
  {
    "alert": "<actual alert name from tool response>",
    "kb_entry": {
      "root_causes": [
        "ANALYZE the alert labels and Stage 2 findings to identify SPECIFIC root causes",
        "MUST include actual pod/deployment/hpa/namespace names from alert.labels",
        "Example for KubeHpaMaxedOut: 'HPA {{horizontalpodautoscaler}} maxed at {{max_replicas}} replicas for >15min in namespace {{namespace}}'",
        "Example for OOMKilled: 'Pod {{pod}} memory usage {{memory_used}} exceeds limit {{memory_limit}} in {{namespace}}'",
        "DO NOT use generic text like 'Based on alert type and previous incidents'"
      ],
      "diagnostic_commands": [
        "GENERATE SPECIFIC commands using ACTUAL resource names from alert.labels object",
        "MUST reference alert.labels.pod, alert.labels.namespace, alert.labels.horizontalpodautoscaler, etc.",
        "Example: 'kubectl describe hpa {{alert.labels.horizontalpodautoscaler}} -n {{alert.labels.namespace}}'",
        "Example: 'kubectl top pod {{alert.labels.pod}} -n {{alert.labels.namespace}}'",
        "Example: 'kubectl get deployment {{deployment_name}} -n {{alert.labels.namespace}} -o yaml'",
        "DO NOT use generic 'kubectl describe' or 'kubectl logs' without actual resource names"
      ],
      "immediate_actions": [
        "ANALYZE alert context and labels to suggest SPECIFIC actions with ACTUAL values",
        "Example for HPA maxed: 'Increase HPA maxReplicas from {{current_max}} to {{new_max}} for {{hpa_name}}'",
        "Example for OOMKilled: 'Increase memory limit from {{current_limit}} to {{new_limit}} for {{pod_name}}'",
        "Example for Node NotReady: 'Drain node {{node_name}} and investigate kubelet logs'",
        "DO NOT use generic 'Check pod status', 'Review recent changes', or 'Monitor the situation'"
      ],
      "long_term_solutions": [
        "BASED ON root cause analysis and alert type, suggest SPECIFIC long-term fixes",
        "Example for HPA: 'Implement auto-scaling policies based on custom metrics for {{deployment}}'",
        "Example for memory: 'Profile application for memory leaks in {{code_component}} component'",
        "Example for CPU: 'Optimize {{service}} request processing to reduce CPU load'",
        "DO NOT use generic 'Update resource limits', 'Fix application code', or 'Monitor metrics'"
      ]
    },
    "applicability_score": <calculate based on alert-to-stage2 correlation, 0.0-1.0>
  }
]
```

**Fix 2: Add validation rules before output**

Add new section at line 212 (after "## 🔧 TOOL PARAMETERS:"):
```markdown
## 🎯 CRITICAL VALIDATION BEFORE OUTPUT:

**KNOWLEDGE BASE QUALITY CHECK:**
1. Does each kb_entry.root_causes contain SPECIFIC information from alert.labels?
   - Check: Does it reference actual pod/deployment/namespace names from alert?
   - Check: Does it include actual numeric values (replica counts, memory usage, etc.)?
   - ❌ WRONG: "Based on alert type and previous incidents"
   - ✅ CORRECT: "HPA bss-tenant-control-plane-batch maxed at 10 replicas in em-control-plane-prod"

2. Do diagnostic_commands use ACTUAL resource names from alert.labels?
   - Check: Each kubectl command MUST have real pod/deployment/hpa/node names
   - Check: Each command MUST include actual namespace from alert.labels.namespace
   - ❌ WRONG: "kubectl describe" or "kubectl logs"
   - ✅ CORRECT: "kubectl describe hpa bss-tenant-control-plane-batch -n em-control-plane-prod"

3. Are immediate_actions SPECIFIC to this exact alert instance?
   - Check: Do actions reference ACTUAL values from alert.labels?
   - Check: Are numeric values (replica counts, memory limits) included?
   - ❌ WRONG: "Check pod status" or "Review recent changes"
   - ✅ CORRECT: "Increase HPA maxReplicas from 10 to 15 for bss-tenant-control-plane-batch"

4. Are long_term_solutions more than generic advice?
   - Check: Do solutions reference actual service/deployment/component names?
   - ❌ WRONG: "Update resource limits" or "Fix application code"
   - ✅ CORRECT: "Profile bss-tenant-control-plane-batch for memory leaks and optimize batch processing"

5. Are recommended_alert_actions actionable (not just "Monitor")?
   - For HPA maxed: action = "Increase HPA maxReplicas", command = "kubectl patch hpa ..."
   - For OOMKilled: action = "Increase memory limits", command = "kubectl set resources ..."
   - For Node NotReady: action = "Drain and investigate node", command = "kubectl drain ..."
   - ❌ WRONG: Generic "Monitor" action with null command
   - ✅ CORRECT: Specific actionable remediation with kubectl command

**IF ANY VALIDATION FAILS:**
- Re-analyze the alert.labels object
- Extract actual resource names (pod, namespace, deployment, hpa, node, etc.)
- Regenerate that section using ACTUAL values from alert data
- NEVER output generic template text
```

**Fix 3: Fix syntax error at line 68**

Replace lines 67-68:
```markdown
return sloValue;
📊 COMPOSITE SLO CALCULATION:
```

With:
```markdown
return sloValue;
```

📊 COMPOSITE SLO CALCULATION:
```

(Add closing triple backticks on line 68)

### Verdict for Stage 3: **REQUIRES IMMEDIATE FIX**

---

## Stage 4: Automated Diagnosis - ✅ FIXED

**File**: `FreePrometheus/PrometheusNodes/14. Stage 4 Automated Diagnosis.txt`

### Analysis Results

✅ **RECENTLY FIXED** (commit 3b443b4)
- Lines 29-110: Added explicit pod selection instructions
- Lines 85-88: Validation rules before output
- Lines 177, 210: Template placeholders clearly marked with `<MUST start with...>`

✅ **NO MOCK DATA**
- All placeholders use `<actual data from...>` format
- Template expressions properly reference Stage 2 data
- No hardcoded pod names or namespaces

### Verdict: **NO CHANGES NEEDED** (already fixed)

---

## Stage 5: Smart Remediation - ✅ FIXED

**File**: `FreePrometheus/PrometheusNodes/17. Stage 5 Smart Remediation.txt`

### Analysis Results

✅ **RECENTLY FIXED** (commits 564db87, 72bd9e5, f29ba2a, 828f99a)
- Lines 34-66: Conditional IF/THEN logic (not hardcoded templates)
- Lines 133-156: Explicit template syntax rules
- Lines 144-156: Example commands use placeholder format (DEPLOYMENT_NAME), not inline templates

✅ **NO MOCK DATA**
- All examples use placeholder format
- Clear instructions for AI to analyze Stage 4 data
- No hardcoded rollback templates

### Verdict: **NO CHANGES NEEDED** (already fixed)

---

## Stage 6: Prevention & Learning - ✅ FIXED

**File**: `FreePrometheus/PrometheusNodes/19. Stage 6 Prevention & Learning.txt`

### Analysis Results

✅ **RECENTLY FIXED** (commits 498ba20, 0bd8e98)
- Removed hardcoded JSON template (lines 141-278 deleted)
- Lines 66-100: Conditional instructions for different root causes
- 8-step prevention strategy (no templates)

✅ **NO MOCK DATA**
- Instructions-based approach
- No hardcoded prevention actions

### Verdict: **NO CHANGES NEEDED** (already fixed)

---

## Summary Table

| Stage | Status | Issues Found | Priority |
|-------|--------|--------------|----------|
| Stage 1: Health Snapshot | ✅ Clean | None | N/A |
| Stage 2: Deep Analysis | ✅ Clean | None | N/A |
| Stage 3: Alert Intelligence | ❌ Severe | Hardcoded KB template being copied verbatim | 🔴 Critical |
| Stage 4: Automated Diagnosis | ✅ Fixed | None (recently fixed) | N/A |
| Stage 5: Smart Remediation | ✅ Fixed | None (recently fixed) | N/A |
| Stage 6: Prevention & Learning | ✅ Fixed | None (recently fixed) | N/A |

---

## Evidence from Current Output

### Stage 3 Output Shows Mock Data Usage

**File**: `FreePrometheus/PrometheusNodes/12. Stage 3 Alert Intelligence Output.json`

**Lines 51-70** show verbatim copy of template:
```json
{
  "alert": "KubeHpaMaxedOut",
  "kb_entry": {
    "root_causes": ["Based on alert type and previous incidents"],  ← TEMPLATE TEXT
    "diagnostic_commands": ["kubectl describe", "kubectl logs"],     ← GENERIC
    "immediate_actions": ["Check pod status", "Review recent changes"], ← GENERIC
    "long_term_solutions": ["Update resource limits", "Fix application code"] ← GENERIC
  },
  "applicability_score": 0.3
}
```

**What it SHOULD be** (based on alert labels from lines 11-24):
```json
{
  "alert": "KubeHpaMaxedOut",
  "kb_entry": {
    "root_causes": [
      "HPA bss-tenant-control-plane-batch has been at max replicas for >15 minutes",
      "Namespace em-control-plane-prod experiencing sustained high load",
      "Pod kube-prometheus-stack-kube-state-metrics-84c7c44c96-ppvqf reported the alert"
    ],
    "diagnostic_commands": [
      "kubectl describe hpa bss-tenant-control-plane-batch -n em-control-plane-prod",
      "kubectl get hpa bss-tenant-control-plane-batch -n em-control-plane-prod -o yaml",
      "kubectl top pods -n em-control-plane-prod -l app=bss-tenant-control-plane-batch",
      "kubectl get deployment bss-tenant-control-plane-batch -n em-control-plane-prod -o yaml"
    ],
    "immediate_actions": [
      "Increase HPA maxReplicas from 10 to 15 for bss-tenant-control-plane-batch",
      "Monitor CPU/memory metrics to determine if 15 replicas will be sufficient",
      "Check if deployment bss-tenant-control-plane-batch has appropriate resource limits set"
    ],
    "long_term_solutions": [
      "Implement predictive auto-scaling based on historical load patterns for bss-tenant-control-plane-batch",
      "Review bss-tenant-control-plane-batch workload optimization opportunities (batch size, concurrency)",
      "Set up alerting for HPA scaling events to detect capacity issues earlier"
    ]
  },
  "applicability_score": 0.85
}
```

---

## Recommended Actions

### Immediate (Critical Priority)

1. **Fix Stage 3 prompt** with the 3 fixes detailed above:
   - Replace hardcoded KB template with instructions (lines 237-247)
   - Add validation rules section at line 212
   - Fix syntax error at line 68

### Testing

2. **Re-run workflow** with same input data and verify:
   - Stage 3 KB entries contain specific alert information
   - No "Based on alert type and previous incidents" generic text
   - Diagnostic commands include actual resource names from alert.labels
   - Immediate actions reference actual HPA/pod/deployment names from alert.labels
   - Recommended actions are actionable (not just "Monitor")

### Documentation

3. **Create STAGE3_MOCK_DATA_FIX.md** documenting:
   - Before/after comparison
   - Validation rules added
   - Testing evidence

---

## User Feedback Addressed

✅ **"tutarsızlık ve mock data istemiyourm"** (I don't want inconsistencies and mock data)
- Stage 3 has significant mock data in KB template
- Fix will eliminate generic responses

✅ **"defalarca düzeltme yaptın hala hata çıkıyor"** (you've made corrections many times but errors still keep coming out)
- Previous fixes targeted Stages 4, 5, 6
- Stage 3 was not reviewed until this systematic analysis
- This is the final remaining source of mock data

✅ **"Çözüm önerileri ve bulgular kesin ve doğru bilgiler olsun"** (Solution suggestions and findings should be definite and accurate information)
- New instructions force AI to use actual alert.labels data
- Validation rules check for specific values, not generic text

---

**Status**: Analysis complete, Stage 3 fix ready to implement

**Next Step**: Apply Stage 3 fixes and test
