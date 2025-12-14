# NODE 12: Stage 2 Deep Analysis - COMPLETE ANALYSIS

**Dosya**: PrometheusNodes/12. Stage 2 Deep Analysis.txt (83 lines)
**Fonksiyon**: AI Agent prompt for deep 3-phase analysis (instant/trend/anomaly)

## ÖZET

### Ana Fonksiyon:
1. **AI Prompt Template**: n8n template syntax ({{ $json.field }}) for dynamic AI prompt
2. **3-Phase Analysis Instructions**: instant → trend → anomaly (Pod-focused)
3. **Expected JSON Output Schema**: Structured response format for AI
4. **Context Injection**: Passes contextId + priority to AI

### NODE TYPE

**⚠️ SPECIAL NODE TYPE**: `.txt` file = AI Agent prompt template (not JavaScript!)

This is an **AI Chat Message Template** that gets sent to an AI Agent node (like OpenAI, Anthropic, etc.)

**n8n Workflow Pattern**:
```
Node 11 (JS) → Node 12 (AI Prompt) → AI Agent (external API) → Node 13 (JS - Fix JSON)
```

### PROMPT STRUCTURE

✅ **Dynamic Template Variables** (n8n syntax):
```
{{ $json._context.initialParams.startTime }}
{{ $json._context.initialParams.endTime }}
{{ $json._context.contextId }}
{{ $json._context.alertContext.alertName }}
{{ $json._context.kubernetesFilters.pod }}
{{ $json._context.initialParams.namespaces.join(', ') }}
{{ $json._context.initialParams.namespaces.length }}
{{ $json._context.priority }}
{{ $json.stage1Results.overall_status }}
{{ $json.stage1Results.alerts.critical }}
{{ $json.stage1Results.quick_findings[0] }}
```

✅ **Analysis Phases** (HARDCODED, NOT FROM NODE 11!):
```
Phase 1 (Pod Analysis):
- Pod Status Check
- Container Restarts  
- Pod Resource Usage

Phase 2 (Trends):
- Historical Comparison 24h

Phase 3 (Anomaly):
- Resource Exhaustion Prediction
- Anomaly Patterns
```

⚠️ **PROBLEM**: These phases are **HARDCODED** and **POD-FOCUSED**!
- Node 11 generated `deepAnalysisHints` with category-specific phases
- Node 12 prompt IGNORES Node 11 hints completely
- Uses generic pod analysis instead of API-specific analysis

✅ **Expected JSON Schema**:
```json
{
  "stage": "deep_analysis",
  "investigation_id": "{{ $json._context.contextId }}-s2",
  "execution_phases": {
    "instant": {
      "tools_used": [],
      "findings": { "critical_pods": [], "resource_pressure": [] }
    },
    "trend": {
      "tools_used": [],
      "findings": { "memory_growth": "", "restart_pattern": "" }
    },
    "anomaly": {
      "tools_used": [],
      "findings": { "predictions": [], "anomalies": [] }
    }
  },
  "correlation_matrix": {
    "primary_chain": "",
    "affected_services": [],
    "blast_radius": "",
    "kubernetes_impact": { "evicted_pods": 0, "pending_pods": 0 }
  },
  "root_cause": {
    "identified": false,
    "component": "",
    "issue": "",
    "evidence": [],
    "confidence": 0.0
  },
  "proceed_to_stage3": false,
  "_context": {
    "contextId": "{{ $json._context.contextId }}",
    "priority": "{{ $json._context.priority }}"
  }
}
```

### VERİ AKIŞI

**INPUT (Node 11)**:
- All context preserved
- deepAnalysisHints: { category: "UNKNOWN", phases: { instant: {...}, trend: {...}, anomaly: {...} } }
- knowledgeBase: { alertCategory: "API", urgencyLevel: "BLOCKER" }

**PROMPT (.txt file)**:
- Uses {{ $json }} template syntax to inject input data
- IGNORES deepAnalysisHints from Node 11 ❌
- IGNORES knowledgeBase category ❌
- Uses HARDCODED pod-focused phases
- Expects structured JSON response

**OUTPUT (AI Agent Response)**:
- Single string with JSON content
- Schema matches expected format
- Minimal data (empty arrays, false values)
- Only contextId + priority preserved

### 🎯 KRİTİK BULGU

**PROBLEM 1: Node 11 Hints IGNORED**

Node 11 Output (available):
```json
{
  "deepAnalysisHints": {
    "category": "UNKNOWN",  // Should be "API"
    "urgency": "MEDIUM",    // Should be "CRITICAL"
    "phases": {
      "instant": {
        "tools": ["Quick Cluster Health", "Active Alerts Details"],
        "focus": "General health assessment",
        "queries": ["up", "kube_pod_status_phase", "kube_node_status_condition"]
      }
    }
  }
}
```

Node 12 Prompt (hardcoded):
```
Phase 1 (Pod Analysis):  ❌ HARDCODED!
- Pod Status Check
- Container Restarts  
- Pod Resource Usage
```

**Should Use** (if Node 11 category was correct):
```
Phase 1 (API Analysis):  ✅ FROM deepAnalysisHints
- Quick Cluster Health
- Active Alerts Details
Focus: Check Kubernetes API server health and performance
```

**PROBLEM 2: Generic Pod Analysis for API Alert**

For **KubeAPIDown** (API server down):
- Prompt asks for "Pod Status Check" ❌ (generic)
- Should ask for "API server health check" ✅ (API-specific)
- Prompt asks for "Container Restarts" ❌ (application-level)
- Should ask for "API request metrics" ✅ (API-specific)

**ROOT CAUSE**:
1. Node 11 has wrong category ("UNKNOWN" instead of "API") → wrong hints
2. Node 12 ignores hints anyway → uses hardcoded pod analysis
3. Result: Generic pod analysis for critical API server failure!

**FIX NEEDED**:

Option 1 - Use Node 11 hints:
```
## EXECUTE ANALYSIS:

{{ #if $json.deepAnalysisHints }}
Phase 1 ({{ $json.deepAnalysisHints.category }} - {{ $json.deepAnalysisHints.phases.instant.focus }}):
{{ #each $json.deepAnalysisHints.phases.instant.tools }}
- {{ this }}
{{ /each }}

Phase 2 (Trends - {{ $json.deepAnalysisHints.phases.trend.focus }}):
{{ #each $json.deepAnalysisHints.phases.trend.tools }}
- {{ this }}
{{ /each }}

Phase 3 (Anomaly - {{ $json.deepAnalysisHints.phases.anomaly.focus }}):
{{ #each $json.deepAnalysisHints.phases.anomaly.tools }}
- {{ this }}
{{ /each }}
{{ else }}
[fallback to current hardcoded phases]
{{ /if }}
```

Option 2 - Fix Node 11 category detection first, then use hints

### OUTPUT ANALYSIS

AI Agent Response (actual output):
```json
{
  "stage": "deep_analysis",
  "investigation_id": "ctx-1765629808596-j4tf5t-s2",
  "execution_phases": {
    "instant": {
      "tools_used": ["Pod_Status_Check", "Container_Restarts", "Pod_Resource_Usage"],
      "findings": {
        "critical_pods": [],  // Empty!
        "resource_pressure": []
      }
    },
    "trend": {
      "tools_used": ["Historical_Comparison_24h"],
      "findings": {
        "memory_growth": "",  // Empty!
        "restart_pattern": ""
      }
    },
    "anomaly": {
      "tools_used": ["Resource_Exhaustion_Prediction", "Anomaly_Patterns"],
      "findings": {
        "predictions": [],  // Empty!
        "anomalies": []
      }
    }
  },
  "correlation_matrix": {
    "primary_chain": "",  // Empty!
    "affected_services": [],
    "blast_radius": "",
    "kubernetes_impact": { "evicted_pods": 0, "pending_pods": 0 }
  },
  "root_cause": {
    "identified": false,  // Not identified!
    "component": "",
    "issue": "",
    "evidence": [],
    "confidence": 0.0
  },
  "proceed_to_stage3": false,  // Won't proceed!
  "_context": {
    "contextId": "ctx-1765629808596-j4tf5t",
    "priority": "critical"
  }
}
```

**Analysis**:
- AI followed prompt instructions (pod analysis)
- Found no pod issues (correct, alert is about API server!)
- All findings empty
- Root cause NOT identified
- Won't proceed to Stage 3

**Impact**: Wrong analysis approach → no findings → no root cause → pipeline stops!

### SORUNLAR

1. **Node 11 Hints Ignored**: Hardcoded phases instead of dynamic category-based hints
2. **Wrong Analysis Focus**: Pod analysis for API server alert
3. **Category Mismatch Propagated**: "UNKNOWN" from Node 11 not used anyway
4. **Empty Results**: Wrong focus → no findings → no value
5. **No Stage 3 Progression**: proceed_to_stage3: false (analysis failed)

### NEXT NODE

AI response (JSON string) → Fix Stage2 Json (Node 13) - JSON parsing/validation

---

**İlerleme**: 12/19 node (%63)
