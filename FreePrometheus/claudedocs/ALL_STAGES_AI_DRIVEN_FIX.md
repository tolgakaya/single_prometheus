# All Stages AI-Driven Fix Complete

## User Requirement

**User's explicit request**: "bunun dışında hardcoded bir şeyler varsa lütfen değiştir, AI'ın cevabını almamız lazım her bir durum için"

Translation: "If there are any other hardcoded things, please change them. We need to get AI's response for each situation."

---

## Investigation Results

### Stages Reviewed

✅ **Stage 1: Health Snapshot** ([5. Stage 1 Health Snapshot.txt](../PrometheusNodes/5.%20Stage%201%20Health%20Snapshot.txt))
- **Status**: ALREADY AI-DRIVEN
- **Finding**: Uses placeholder format with instructions
- **Example**: `"overall_status": "<one of: healthy|degraded|critical>"` (placeholder, not hardcoded)
- **No changes needed**

✅ **Stage 2: Deep Analysis** ([9. Stage 2 Deep Analysis.txt](../PrometheusNodes/9.%20Stage%202%20Deep%20Analysis.txt))
- **Status**: ALREADY AI-DRIVEN
- **Finding**: Provides scoring logic and instructions
- **Example**: `"confidence": 0.0` (starting value), `"findings": {<actual tool responses>}` (instructions)
- **No changes needed**

✅ **Stage 3: Alert Intelligence** ([12. Stage 3 Alert Intelligence.txt](../PrometheusNodes/12.%20Stage%203%20Alert%20Intelligence.txt))
- **Status**: ALREADY AI-DRIVEN
- **Finding**: Includes confidence calculation formulas and decision logic
- **Example**: `"alert_name": "<actual alert name from tool response or 'No alerts'>"` (conditional logic)
- **No changes needed**

✅ **Stage 4: Automated Diagnosis** ([14. Stage 4 Automated Diagnosis.txt](../PrometheusNodes/14.%20Stage%204%20Automated%20Diagnosis.txt))
- **Status**: ALREADY AI-DRIVEN
- **Finding**: Provides diagnostic instructions and confidence calculations
- **Example**: Lines 82-179 show detailed analysis instructions, not hardcoded outputs
- **No changes needed**

❌ **Stage 5: Smart Remediation** ([17. Stage 5 Smart Remediation.txt](../PrometheusNodes/17.%20Stage%205%20Smart%20Remediation.txt))
- **Status**: HAD HARDCODED TEMPLATE (FIXED)
- **Problem**: Lines 26-33 showed hardcoded rollback action as example
- **Fix**: Complete rewrite to AI analysis instructions (commit 564db87)
- **Result**: Now generates context-aware remediation based on Stage 4 diagnostics

❌ **Stage 6: Prevention & Learning** ([19. Stage 6 Prevention & Learning.txt](../PrometheusNodes/19.%20Stage%206%20Prevention%20Learning.txt))
- **Status**: HAD HARDCODED TEMPLATE (FIXED NOW)
- **Problem**: Lines 141-278 showed complete hardcoded JSON with specific values
- **Fix**: Rewrite to AI analysis instructions
- **Result**: Now generates context-aware prevention actions based on complete 6-stage journey

---

## Stage 6 Fix Details

### Problem Identified

Old prompt structure (lines 141-278):
```json
{
  "prevention_actions": [
    {
      "type": "monitoring",
      "action": "Add memory leak detection alert for {{ $json.namespaces?.[0] || 'production' }}",
      "implementation": {
        "alert_rule": "rate(container_memory_usage_bytes[5m]) > 0.1 ...",
        "threshold": "10% growth in 5 minutes",
        "severity": "warning"
      },
      "status": "{{ ($json._debug?.priority || 'normal') === 'critical' ? 'implemented' : 'planned' }}"
    },
```

**Issue**: This is a HARDCODED EXAMPLE that AI would copy regardless of actual root cause. Always suggests "memory leak detection" even if issue is not memory-related.

### Solution Implemented

New prompt structure provides **AI ANALYSIS INSTRUCTIONS**:

#### STEP 2: PREVENTION ACTIONS GENERATION (Lines 62-142)

```markdown
**CRITICAL**: Generate SPECIFIC prevention actions based on ACTUAL root cause, not generic templates.

**IF root cause is OOMKilled or memory-related**:
- Type: monitoring - Add memory leak detection alert
- Type: code_fix - Fix memory leak in actual component
- Type: configuration - Increase memory limits

**IF root cause is CrashLoopBackOff or configuration error**:
- Type: configuration - Fix configuration issue
- Type: monitoring - Add configuration validation alert

**IF root cause is node-related**:
- Type: monitoring - Add node health monitoring
- Type: process - Implement node auto-replacement
```

**Key difference**:
- ❌ Old: "Always suggest memory monitoring"
- ✅ New: "IF root cause is memory-related, suggest memory monitoring"

#### Context-Aware Decision Making

**Old approach** (Lines 196-234 in old file):
```json
"follow_up_schedule": [
  {
    "action": "Verify fix in {{ $json.namespaces?.[0] || 'production' }}",
    "when": "{{ ($json._debug?.priority || 'normal') === 'critical' ? 'After emergency deployment' : 'Next release cycle' }}",
```

**Issue**: Uses ternary operators in JSON template - AI just copies this.

**New approach** (Lines 194-210):
```markdown
### STEP 6: FOLLOW-UP SCHEDULE

**Priority-based scheduling**:

**IF priority = 'critical'**:
- Verify fix: "After emergency deployment"
- Review metrics: "Every hour for 24h"
- Post-mortem: "Within 24 hours"

**IF priority = 'high'**:
- Verify fix: "Next release cycle"
- Review metrics: "Every 4 hours for 48h"
- Post-mortem: "Within 2 days"

**IF priority = 'normal'**:
- Verify fix: "Next release cycle"
- Review metrics: "Daily for 1 week"
- Post-mortem: "Within 1 week"
```

**Key difference**: AI now makes decisions based on actual priority, not copying template.

---

## Comparison: Old vs New Approach

### Old Approach (Hardcoded Template)

```json
{
  "prevention_actions": [
    {
      "type": "monitoring",
      "action": "Add memory leak detection alert for production",
      "status": "planned"
    },
    {
      "type": "code_fix",
      "action": "Fix identified issue in affected component",
      "status": "in_progress"
    }
  ]
}
```

**Problem**: Same prevention actions for ALL scenarios:
- OOMKilled issue → "Add memory leak detection" ✅ Correct
- Configuration error → "Add memory leak detection" ❌ Wrong!
- Node failure → "Add memory leak detection" ❌ Wrong!

### New Approach (AI-Driven Instructions)

AI analyzes Stage 2-5 data and generates appropriate actions:

**Scenario 1: OOMKilled**
```json
{
  "prevention_actions": [
    {
      "type": "monitoring",
      "action": "Add memory leak detection alert for bstp-cms-global-production",
      "implementation": {
        "alert_rule": "rate(container_memory_usage_bytes[5m]) > 0.1 ...",
        "threshold": "10% growth in 5 minutes"
      }
    },
    {
      "type": "configuration",
      "action": "Increase memory limits for bss-mc-pcm-product-offer-detail",
      "implementation": {
        "yaml_patch": "memory: 6Gi (based on actual usage 4.5Gi)"
      }
    }
  ]
}
```

**Scenario 2: Configuration Error**
```json
{
  "prevention_actions": [
    {
      "type": "configuration",
      "action": "Fix configuration issue in api-gateway",
      "implementation": {
        "config_update": "Fix invalid timeout value from Stage 4 logs"
      }
    },
    {
      "type": "monitoring",
      "action": "Add configuration validation alert"
    }
  ]
}
```

**Scenario 3: Node Failure**
```json
{
  "prevention_actions": [
    {
      "type": "monitoring",
      "action": "Add node health monitoring for node-worker-05"
    },
    {
      "type": "process",
      "action": "Implement node auto-replacement for NodeNotReady"
    }
  ]
}
```

---

## Changes Summary

### Stage 5 (Previous Fix - Commit 564db87)

| Aspect | Before | After |
|--------|--------|-------|
| **Immediate Actions** | Always "Rollback deployment" | Context-aware (OOMKilled → Increase memory, Recent deployment → Rollback) |
| **Analysis Logic** | Hardcoded template | Conditional IF/THEN instructions |
| **Data Usage** | Template strings | Actual Stage 4 diagnostics |

### Stage 6 (Current Fix)

| Aspect | Before | After |
|--------|--------|-------|
| **Prevention Actions** | Generic memory monitoring | Root cause-specific (memory/config/node) |
| **Follow-up Schedule** | Ternary in JSON | Priority-based instructions |
| **KB Updates** | Always create entry | Conditional (only if new patterns) |
| **Team Recommendations** | Fixed list | Based on actual affected services |

---

## Implementation Details

### File Changes

**Stage 6 Prompt Rewrite**: [19. Stage 6 Prevention & Learning.txt](../PrometheusNodes/19.%20Stage%206%20Prevention%20&%20Learning.txt)

**Lines changed**: 361 lines (complete rewrite)

**Key sections added**:
1. **STEP 1**: Incident Summary Analysis (lines 35-60)
2. **STEP 2**: Prevention Actions Generation (lines 62-142)
3. **STEP 3**: Knowledge Base Update (lines 144-172)
4. **STEP 4**: Runbook Updates (lines 174-180)
5. **STEP 5**: Team Recommendations (lines 182-191)
6. **STEP 6**: Follow-up Schedule (lines 193-210)
7. **STEP 7**: Decision Logic (lines 212-228)
8. **STEP 8**: Prevention Quality Score (lines 230-256)

### Output Format

Changed from hardcoded JSON (lines 141-278) to placeholder-based format (lines 258-322):

```json
{
  "prevention_actions": [
    <Generate 3-4 specific actions based on actual root cause using patterns from STEP 2>
  ],
  "knowledge_base_update": {
    "new_entry": <Only if new pattern found, otherwise null>,
    "kb_updated": <true/false based on whether new patterns found>
  }
}
```

---

## Testing Expected Behavior

### Test Case 1: OOMKilled Scenario

**Stage 2 provides**: Root cause = "Pod restarts and memory pressure", Component = "bss-mc-pcm-product-offer-detail"
**Stage 4 provides**: last_termination.reason = "OOMKilled", memory_used > memory_limit

**Stage 6 should generate**:
```json
"prevention_actions": [
  {
    "type": "monitoring",
    "action": "Add memory leak detection alert for bstp-cms-global-production"
  },
  {
    "type": "code_fix",
    "action": "Fix memory leak in bss-mc-pcm-product-offer-detail"
  },
  {
    "type": "configuration",
    "action": "Increase memory limits for bss-mc-pcm-product-offer-detail"
  },
  {
    "type": "process",
    "action": "Add automated testing for memory issues"
  }
]
```

### Test Case 2: Configuration Error

**Stage 2 provides**: Root cause = "Invalid ConfigMap configuration", Component = "api-gateway"
**Stage 4 provides**: termination_reason = "CrashLoopBackOff", error_logs show "config parse error"

**Stage 6 should generate**:
```json
"prevention_actions": [
  {
    "type": "configuration",
    "action": "Fix configuration issue in api-gateway",
    "implementation": {
      "config_update": "Fix config parse error identified in logs"
    }
  },
  {
    "type": "monitoring",
    "action": "Add configuration validation alert"
  },
  {
    "type": "process",
    "action": "Add automated testing for configuration validation"
  }
]
```

---

## Summary

### Problems Fixed

1. **Stage 5**: Hardcoded "Rollback deployment" for all scenarios → Now context-aware based on termination reason
2. **Stage 6**: Hardcoded "Add memory leak detection" for all scenarios → Now root cause-specific prevention actions

### Approach

Both stages now follow the same pattern:
1. **Analyze context** (Stage 2-5 data)
2. **Conditional logic** (IF root cause is X, THEN do Y)
3. **Generate output** (Based on analysis, not templates)

### Result

- ✅ Stage 1: Already AI-driven
- ✅ Stage 2: Already AI-driven
- ✅ Stage 3: Already AI-driven
- ✅ Stage 4: Already AI-driven
- ✅ Stage 5: NOW AI-driven (fixed in commit 564db87)
- ✅ Stage 6: NOW AI-driven (fixed in this commit)

**All 6 stages are now 100% AI-driven with context-aware decision making.**

---

## Git Commits

```bash
564db87 - fix: Rewrite Stage 5 prompt for context-aware remediation
<pending> - fix: Rewrite Stage 6 prompt for context-aware prevention actions
```

**Ready for testing** 🚀
