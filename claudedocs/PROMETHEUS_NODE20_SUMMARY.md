# NODE 20: Fix Stage 4 Context - KB ENHANCED VERSION

**Dosya**: PrometheusNodes/20. Fix Stage 4 Context.js (1108 lines!)
**Fonksiyon**: Context recovery + KB enrichment + category-based diagnostic commands for 150+ alerts

## ÖZET

### Ana Fonksiyon:
1. KB Node Connections: Reads Alert Categories Mapper, Load Alert KB nodes (same as Node 17)
2. Context Recovery: Restores full context from Stage 3
3. Category-Based Diagnostics: 10 category-specific kubectl command sets
4. Diagnostic Execution: Priority-based command execution logic
5. Context Preservation: Maintains all stage1/stage2/stage3 data
6. KB Export: Prepares KB data for Final Report

### PATTERN SIMILARITY

**Identical to Node 17 (Fix Stage 3 Context1)**:
- Same KB node connection pattern (lines 8-30)
- Same KB value extraction (lines 41-57)
- Same deriveUrgencyLevel function
- Same KB export structure (alertKBStats)
- Same KB enhancement logging

**Different from Node 17**:
- Recovers from Stage 3 instead of Stage 2
- Adds category-based diagnostic commands (10 categories)
- Processes Stage 4 AI output (diagnostics_executed, enriched_context)
- Exports diagnostic command sets for Final Report

### KRİTİK PATTERN'LER

✅ KB Node Access (lines 14-30): Same as Node 17
✅ Context Recovery (lines 64-81): Gets full context from Fix Stage 3 Context1
✅ Category-Based Diagnostics (lines 112-300+): 10 categories with kubectl commands
✅ Diagnostic Priority: priority 1 (critical), 2 (important), 3 (optional)
✅ Command Generation: Dynamic filter-based command building
✅ Full Context Restoration: All stages (1-4) preserved

### CATEGORY DIAGNOSTICS (lines 112-300+)

**INFRASTRUCTURE** (5 commands):
- node_status: kubectl get node yaml
- node_describe: kubectl describe node
- node_metrics: kubectl top node
- node_pods: get all pods on node
- system_logs: kubelet logs

**POD** (5 commands):
- pod_describe: kubectl describe pod
- pod_logs: current logs (tail 100)
- pod_logs_previous: previous container logs
- pod_events: pod-specific events
- pod_metrics: kubectl top pod

**WORKLOAD** (commands for deployments, replicasets, HPA):
- deployment_status: kubectl get deployment yaml
- deployment_rollout: rollout status
- replica_sets: get rs for deployment
- ... (more commands)

**RESOURCE** (PV, quota, LimitRange):
**NETWORK** (endpoints, services, ingress):
**ETCD** (etcdctl member list, health):
**CERTIFICATE** (certs, CSRs):
**CLUSTER** (control plane components):
**MONITORING** (Prometheus, Alertmanager):
**APPLICATION** (app-specific checks):

### KB ENHANCEMENT

**Same as Node 17**:
```
kbAlertCategory = "API" (from Alert Categories Mapper)
kbUrgencyLevel = "BLOCKER" (derived from severityScore)
kbCascadeRisk = "CRITICAL" (from categoryHandlingHints)
kbAlertKnowledgeBase = full KB entry with troubleshooting steps
```

**Export to Final Report**:
```
alertKBStats:
  - alertCategory: "API"
  - urgencyLevel: "BLOCKER"
  - cascadeRisk: "CRITICAL"
  - kbAlertKnowledgeBase: {...}
  - kbEnhanced: true
  - kbEntriesLoaded: 9
```

### VERİ AKIŞI

**INPUT (from Node 19 - Fix Stage 4 Json)**:
```
{
  "output": {
    "stage": "automated_diagnosis",
    "diagnostics_executed": [],
    "enriched_context": {...},
    "diagnostic_summary": {...},
    "proceed_to_stage5": false,
    "_context": {}  // Empty from Node 19!
  }
}
```

**Context Recovery** (lines 64-81):
```
stage3Data = $node["Fix Stage 3 Context1"].json;
previousContext = stage3Data._context;

Got:
  - stage1Data (from stage3Data.stage1Data)
  - stage2Data (from stage3Data.stage2Data)
  - stage3Data (from stage3Data.stage3Data)
  - full context with all stageResults
```

**OUTPUT**:
```
{
  "output": {...Stage 4 output...},
  "_context": {
    "contextId": "ctx-1765629808596-j4tf5t",
    "stageResults": {
      "stage1": {...},
      "stage2": {...},
      "stage3": {...},
      "stage4": {
        "kbEnhanced": true,
        "alertCategory": "API",
        "urgencyLevel": "BLOCKER"
      }
    }
  },
  "stage1Data": {...},  // Preserved
  "stage2Data": {...},  // Preserved
  "stage3Data": {...},  // Preserved
  "stage4Data": {...},  // New
  "knowledgeBase": {
    "alertCategory": "API",
    "urgencyLevel": "BLOCKER",
    "cascadeRisk": "CRITICAL"
  },
  "alertKBStats": {
    "alertCategory": "API",
    "urgencyLevel": "BLOCKER",
    "cascadeRisk": "CRITICAL",
    "kbAlertKnowledgeBase": {...full KB entry...}
  }
}
```

### 🎯 KRİTİK BULGULAR

**WHAT WORKS**:
✅ Context Recovery: Successfully restores full context from Stage 3
✅ KB Enhancement: Correct category/urgency/cascade from KB nodes
✅ All Stages Preserved: stage1Data, stage2Data, stage3Data, stage4Data all present
✅ Category Diagnostics: 10 comprehensive kubectl command sets
✅ KB Export: alertKBStats ready for Final Report

**NO ISSUES FOUND**:
This node works perfectly like Node 17!
- Context recovered ✅
- KB enrichment applied ✅
- All previous stage data preserved ✅
- Category-specific diagnostics prepared ✅

### NEXT NODE

Likely Node 22 (Fix Stage 5 Context) or Node 26 (Generate Final Report)

---

**İlerleme**: 18/19 node (%95)

