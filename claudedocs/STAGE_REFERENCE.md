# Stage Reference Guide - OKR_AI

Complete reference for all 6 analysis stages in the Prometheus workflow.

## Overview

Each stage receives input from the previous stage via the `_context` object and produces structured output for the next stage. All stages must return valid JSON without markdown formatting.

## Stage Progression Flow

```
Alert → Stage 1 → Stage 2 → Stage 3 → Stage 4 → Stage 5 → Stage 6 → Knowledge Base
         ↓         ↓         ↓         ↓         ↓         ↓
      Triage   Deep      Alert     Root      Auto      Learning
               Analysis  Intel     Cause     Fix
```

## Stage 0: Alert Listener (Pre-Stage)

### Purpose
Multi-source alert ingestion and normalization

### Inputs
- Email alerts (IMAP)
- Prometheus Alertmanager webhooks
- Grafana alert webhooks

### Processing
1. Parse alert from source format
2. Extract metadata (timestamp, severity, source)
3. Identify affected components (namespace, pod, service)
4. Determine time range (startTime, endTime)
5. Classify priority (critical/high/medium/low)
6. Generate unique context ID

### Outputs
```json
{
  "source": "prometheus",
  "timestamp": "2025-12-13T10:00:00Z",
  "title": "KubePodNotReady",
  "body": "Pod has been in non-ready state for 15 minutes",
  "sender": "alertmanager",
  "priority": "critical",
  "context": {
    "contextId": "ctx-20251213-100000",
    "namespaces": ["em-prod"],
    "pods": ["app-pod-123"],
    "services": ["app-service"],
    "startTime": 1702461600,
    "endTime": 1702462500
  }
}
```

### Tool Calls
- AI Analyzer (LiteLLM): 1 call

---

## Stage 1: Initial Triage

### Purpose
Quick assessment to determine if deep analysis is needed

### Inputs (from Alert Listener)
```json
{
  "_context": {
    "contextId": "ctx-xxxxx",
    "priority": "critical",
    "initialParams": {
      "startTime": 1702461600,
      "endTime": 1702462500,
      "namespaces": ["em-prod"],
      "pods": ["app-pod-123"]
    },
    "alertContext": {
      "alertName": "KubePodNotReady",
      "severity": "critical",
      "source": "prometheus"
    }
  }
}
```

### Processing Steps
1. Query Prometheus for current alert count
2. Group alerts by severity (critical/warning/info)
3. Quick pod status check for affected namespace
4. Identify immediate issues
5. Determine if deep analysis is needed

### Prometheus Queries
```promql
# Alert count by severity
count by (severity) (ALERTS{alertstate="firing", namespace="em-prod"})

# Pod readiness
kube_pod_status_ready{namespace="em-prod", pod="app-pod-123"}
```

### Outputs
```json
{
  "stage": "initial_triage",
  "overall_status": "degraded",
  "alerts": {
    "critical": 2,
    "warning": 5,
    "info": 1,
    "total": 8
  },
  "quick_findings": [
    "Pod app-pod-123 in non-ready state",
    "2 critical alerts firing in namespace em-prod"
  ],
  "immediate_action_required": true,
  "proceed_to_stage2": true,
  "_context": {
    "contextId": "ctx-xxxxx",
    "priority": "critical",
    "initialParams": {...}
  }
}
```

### Decision Logic
```javascript
proceed_to_stage2 = (alerts.critical > 0) ||
                   (alerts.warning > 3) ||
                   (overall_status === "critical")
```

### Tool Calls
- Prometheus queries: 1-2 calls
- Total: 1-2 calls

---

## Stage 2: Deep Analysis

### Purpose
Multi-phase investigation: instant, trend, and anomaly analysis

### Inputs (from Stage 1)
```json
{
  "stage1Results": {
    "overall_status": "degraded",
    "alerts": {"critical": 2},
    "proceed_to_stage2": true
  },
  "_context": {...}
}
```

### Processing Phases

#### Phase 1: Instant Analysis
**Objective**: Current state snapshot

**Queries**:
```promql
# Pod status
kube_pod_status_phase{namespace="em-prod", pod="app-pod-123"}

# Container restarts (last 1h)
increase(kube_pod_container_status_restarts_total{
  namespace="em-prod",
  pod="app-pod-123"
}[1h])

# Current resource usage
container_memory_usage_bytes{namespace="em-prod", pod="app-pod-123"}
container_cpu_usage_seconds_total{namespace="em-prod", pod="app-pod-123"}
```

**Findings**:
- Critical pods list
- Restart counts
- Current resource pressure

#### Phase 2: Trend Analysis
**Objective**: 24-hour comparison

**Queries**:
```promql
# Memory trend (24h)
container_memory_usage_bytes{namespace="em-prod", pod="app-pod-123"}[24h]

# Restart pattern (24h)
increase(kube_pod_container_status_restarts_total{
  namespace="em-prod",
  pod="app-pod-123"
}[24h])
```

**Findings**:
- Memory growth percentage
- Restart frequency pattern
- Historical comparison

#### Phase 3: Anomaly Detection
**Objective**: Predict future issues

**Analysis**:
- Resource exhaustion prediction
- Pattern deviations
- Anomaly identification

**Findings**:
- Time to resource exhaustion
- Unusual patterns detected

### Outputs
```json
{
  "stage": "deep_analysis",
  "investigation_id": "ctx-xxxxx-s2",
  "execution_phases": {
    "instant": {
      "tools_used": ["Pod Status", "Container Restarts"],
      "findings": {
        "critical_pods": ["app-pod-123"],
        "resource_pressure": ["memory"]
      }
    },
    "trend": {
      "tools_used": ["Memory Trend 24h"],
      "findings": {
        "memory_growth": "15% increase over 24h",
        "restart_pattern": "Every 2 hours"
      }
    },
    "anomaly": {
      "tools_used": ["Anomaly Detector"],
      "findings": {
        "predictions": ["OOM in 3 hours"],
        "anomalies": ["Unusual memory spike at 08:00"]
      }
    }
  },
  "correlation_matrix": {
    "primary_chain": "pod → container → memory",
    "affected_services": ["app-service"],
    "blast_radius": "single_pod",
    "kubernetes_impact": {
      "evicted_pods": 0,
      "pending_pods": 0
    }
  },
  "root_cause": {
    "identified": true,
    "component": "container",
    "issue": "memory_leak_suspected",
    "evidence": [
      "Memory growth 15% over 24h",
      "Regular restarts every 2h",
      "OOM prediction in 3h"
    ],
    "confidence": 0.75
  },
  "proceed_to_stage3": true,
  "_context": {...}
}
```

### Tool Calls
- Prometheus queries: 3-6 calls
- Loki log queries: 0-2 calls (optional)
- Total: 3-8 calls

---

## Stage 3: Alert Intelligence

### Purpose
SLO impact assessment and alert correlation

### Inputs (from Stage 2)
```json
{
  "stage2Data": {
    "root_cause": {
      "issue": "memory_leak_suspected",
      "confidence": 0.75
    },
    "correlation_matrix": {
      "affected_services": ["app-service"]
    }
  },
  "_context": {...}
}
```

### Processing Strategy (OPTIMIZED)

**Critical Rule**: Maximum 7 tool calls total

#### Phase 1: Alert Discovery (2 tools)
```promql
# 1. Active Alerts (SINGLE CALL)
ALERTS{
  alertstate="firing",
  alertname=~"Kube.*|Container.*|Pod.*|Node.*"
}

# 2. Alert History 24h (SINGLE CALL - returns ALL alerts)
count by (alertname, severity) (ALERTS{alertstate="firing"})[24h:1h]
```

#### Phase 2: SLO Assessment (Max 5 tools - CONDITIONAL)

**Decision Tree**:
```javascript
if (no_active_alerts) {
  skip_all_slo_checks();
  return { slo_status: "green", current: "100%" };
}

// Conditional SLO checks based on alert types
if (pod_alerts_detected) → Pod Ready SLO (1 call)
if (node_alerts_detected) → Node Ready SLO (1 call)
if (restart_alerts_detected) → Pod Restart Rate SLO (1 call)
if (deployment_alerts_detected) → Deployment Health SLO (1 call)

// Skip Container Running SLO if Pod Ready is healthy
if (pod_ready_slo >= 99.9) → Skip Container Running SLO
```

### SLO Calculations

#### Pod Ready SLO (30% weight)
```promql
avg(kube_pod_status_ready{
  namespace="em-prod",
  condition="true"
}) * 100
```

#### Container Running SLO (20% weight)
```promql
avg(kube_pod_container_status_running{
  namespace="em-prod"
}) * 100
```

#### Node Ready SLO (25% weight)
```promql
avg(kube_node_status_condition{
  condition="Ready",
  status="true"
}) * 100
```

#### Pod Restart Rate SLO (15% weight)
```promql
100 - (
  rate(kube_pod_container_status_restarts_total{
    namespace="em-prod"
  }[5m]) * 100
)
```

#### Deployment Health SLO (10% weight)
```promql
avg(
  kube_deployment_status_replicas_available /
  kube_deployment_spec_replicas
) * 100
```

#### Composite SLO
```javascript
composite = (podReady * 0.3) +
            (containerRunning * 0.2) +
            (nodeReady * 0.25) +
            (restartRate * 0.15) +
            (deploymentHealth * 0.1)

status = composite >= 99.9 ? "green" :
         composite >= 99.0 ? "yellow" : "red"

error_budget_used = ((100 - composite) / (100 - 99.9)) * 100
```

### Alert Correlation

**Correlation Score Calculation**:
```javascript
function calculateCorrelation(alert1, alert2) {
  let score = 0;

  // Same namespace
  if (alert1.namespace === alert2.namespace) score += 0.3;

  // Same pod
  if (alert1.pod === alert2.pod) score += 0.4;

  // Same service
  if (alert1.service === alert2.service) score += 0.2;

  // Temporal proximity (within 5 minutes)
  if (Math.abs(alert1.timestamp - alert2.timestamp) < 300) score += 0.1;

  return score;
}
```

### Alert Storm Detection
```javascript
storm_detected = (alert_count > 10) && (time_window < 300) // 10 alerts in 5 min

if (storm_detected) {
  // Find common root
  likely_root = findMostFrequentLabel(alerts, ['pod', 'node', 'deployment']);
}
```

### Outputs
```json
{
  "stage": "alert_intelligence",
  "active_alerts": [
    {
      "name": "KubePodNotReady",
      "severity": "critical",
      "count": 1,
      "duration": "15m",
      "labels": {
        "namespace": "em-prod",
        "pod": "app-pod-123"
      },
      "annotations": {
        "description": "Pod has been in non-ready state for 15 minutes"
      }
    }
  ],
  "alert_groups": [
    {
      "root_alert": "KubePodNotReady",
      "related_alerts": ["KubeContainerWaiting"],
      "correlation_score": 0.9,
      "shared_labels": {
        "namespace": "em-prod",
        "pod": "app-pod-123"
      }
    }
  ],
  "knowledge_base_matches": [
    {
      "alert": "KubePodNotReady",
      "kb_entry": {
        "root_causes": [
          "Container crash loop",
          "Resource exhaustion",
          "Image pull failure"
        ],
        "diagnostic_commands": [
          "kubectl describe pod",
          "kubectl logs",
          "kubectl get events"
        ],
        "immediate_actions": [
          "Check pod status",
          "Review container logs",
          "Verify resource limits"
        ],
        "long_term_solutions": [
          "Increase resource limits",
          "Fix application code",
          "Update liveness probes"
        ]
      },
      "applicability_score": 0.85
    }
  ],
  "alert_patterns": {
    "recurring": ["KubePodNotReady"],
    "storm_detection": {
      "detected": false,
      "alert_count": 1,
      "time_window": "5m",
      "likely_root": null
    }
  },
  "slo_impact": {
    "availability_slo": {
      "target": "99.9%",
      "current": "98.5%",
      "error_budget_used": "60%",
      "time_remaining": "10d",
      "components": {
        "pod_ready": "97%",
        "container_running": "99%",
        "node_ready": "100%",
        "restart_rate": "98%",
        "deployment_health": "99%"
      },
      "status": "red"
    },
    "affected_slis": ["pod_ready"]
  },
  "recommended_alert_actions": [
    {
      "alert": "KubePodNotReady",
      "action": "restart_pod",
      "confidence": 0.8,
      "risk": "low",
      "command": "kubectl delete pod app-pod-123 -n em-prod"
    }
  ],
  "proceed_to_stage4": true,
  "auto_remediation_approved": false,
  "_context": {...},
  "_debug": {
    "toolCallCount": 3,
    "alertHistoryCallCount": 1,
    "sloToolErrors": []
  }
}
```

### Tool Calls
- Alert queries: 2 calls (active + history)
- SLO checks: 0-5 calls (conditional)
- **Total: 2-7 calls (strictly enforced)**

---

## Stage 4: Automated Diagnosis

### Purpose
Root cause identification with evidence gathering

### Inputs (from Stage 3)
```json
{
  "stage3Data": {
    "slo_impact": {
      "status": "red",
      "current": "98.5%"
    },
    "recommended_alert_actions": [...]
  },
  "_context": {...}
}
```

### Processing Steps

#### 1. Evidence Collection
```bash
# Pod events (last 1 hour)
kubectl get events --namespace=em-prod \
  --field-selector involvedObject.name=app-pod-123 \
  --sort-by='.lastTimestamp'

# Container logs (last 100 lines)
kubectl logs app-pod-123 -n em-prod --tail=100

# Pod description
kubectl describe pod app-pod-123 -n em-prod
```

#### 2. Metric Analysis
```promql
# Memory usage trend
container_memory_usage_bytes{
  namespace="em-prod",
  pod="app-pod-123"
}[1h]

# CPU throttling
rate(container_cpu_cfs_throttled_seconds_total{
  namespace="em-prod",
  pod="app-pod-123"
}[5m])
```

#### 3. Root Cause Scoring
```javascript
function scoreRootCause(evidence) {
  let scores = {
    memory_leak: 0,
    cpu_exhaustion: 0,
    crash_loop: 0,
    image_pull_failure: 0,
    network_issue: 0
  };

  // Score based on evidence
  if (evidence.logs.includes("OutOfMemoryError")) scores.memory_leak += 0.4;
  if (evidence.events.includes("OOMKilled")) scores.memory_leak += 0.4;
  if (evidence.metrics.memory_growth > 0.1) scores.memory_leak += 0.2;

  if (evidence.events.includes("CrashLoopBackOff")) scores.crash_loop += 0.5;
  if (evidence.metrics.restart_count > 5) scores.crash_loop += 0.3;

  // ... more scoring logic

  return scores;
}

// Select highest confidence root cause
root_cause = Object.keys(scores).reduce((a, b) =>
  scores[a] > scores[b] ? a : b
);
confidence = scores[root_cause];
```

### Outputs
```json
{
  "stage": "automated_diagnosis",
  "investigation_id": "ctx-xxxxx-s4",
  "root_cause": {
    "identified": true,
    "category": "resource_exhaustion",
    "specific_issue": "memory_leak",
    "affected_component": "container:app-container",
    "evidence": [
      {
        "source": "container_logs",
        "finding": "OutOfMemoryError: Java heap space",
        "confidence": 0.9,
        "timestamp": "2025-12-13T10:15:00Z"
      },
      {
        "source": "pod_events",
        "finding": "OOMKilled",
        "confidence": 0.9,
        "timestamp": "2025-12-13T10:15:05Z"
      },
      {
        "source": "metrics",
        "finding": "Memory growth 15% over 24h",
        "confidence": 0.7,
        "trend_data": [...]
      }
    ],
    "confidence_score": 0.85
  },
  "diagnostic_data": {
    "pod_events": [...],
    "container_logs": [...],
    "metrics": {
      "memory_usage": [...],
      "cpu_usage": [...],
      "restart_count": 5
    }
  },
  "recommended_actions": [
    {
      "action": "restart_pod",
      "priority": 1,
      "risk": "low",
      "confidence": 0.9,
      "command": "kubectl delete pod app-pod-123 -n em-prod",
      "expected_outcome": "Pod restarts with fresh memory"
    },
    {
      "action": "increase_memory_limit",
      "priority": 2,
      "risk": "low",
      "confidence": 0.8,
      "command": "kubectl set resources deployment app -n em-prod --limits=memory=2Gi",
      "expected_outcome": "More memory available"
    }
  ],
  "blast_radius_assessment": {
    "scope": "single_pod",
    "affected_users": "< 1%",
    "affected_services": ["app-service"],
    "downtime_estimate": "< 30s",
    "slo_impact": "minimal"
  },
  "proceed_to_remediation": true,
  "_context": {...}
}
```

### Tool Calls
- kubectl commands: 2-4 calls
- Prometheus queries: 2-3 calls
- Loki queries: 1-2 calls
- **Total: 5-9 calls**

---

## Stage 5: Smart Remediation

### Purpose
Safe automated fix execution with validation

### Inputs (from Stage 4)
```json
{
  "stage4Data": {
    "root_cause": {
      "specific_issue": "memory_leak",
      "confidence_score": 0.85
    },
    "recommended_actions": [...],
    "blast_radius_assessment": {
      "scope": "single_pod",
      "risk": "low"
    }
  },
  "_context": {...}
}
```

### Risk Assessment Matrix

| Action | Risk | Auto-Approve Threshold | Manual Approval Required |
|--------|------|------------------------|--------------------------|
| Restart Pod | Low | Confidence >= 0.8 | No |
| Scale Deployment | Medium | Confidence >= 0.9 | If production |
| Update ConfigMap | Medium | Confidence >= 0.9 | If critical service |
| Delete PVC | High | N/A | Always |
| Node Drain | Critical | N/A | Always |
| Rollback Deployment | Medium | Confidence >= 0.85 | If production |

### Safety Gates

```javascript
function evaluateSafetyGates(action, context) {
  const gates = {
    risk_level: checkRiskLevel(action),
    confidence: checkConfidence(action),
    blast_radius: checkBlastRadius(context),
    slo_impact: checkSloImpact(action, context),
    rollback_available: checkRollbackPlan(action)
  };

  // All gates must pass for auto-approval
  const approved = Object.values(gates).every(gate => gate.passed);

  return { approved, gates };
}
```

### Execution Flow

```
1. Risk Assessment
    ↓
2. Safety Gate Validation
    ↓
3. Auto-Approve Decision
    ↓ (if not auto-approved)
4. Manual Approval Request
    ↓
5. Pre-Execution Validation
    ↓
6. Execute Remediation
    ↓
7. Monitor Execution
    ↓
8. Post-Execution Validation
    ↓ (if validation fails)
9. Automatic Rollback
```

### Remediation Execution

```bash
# Example: Restart Pod
kubectl delete pod app-pod-123 -n em-prod --wait=false

# Monitor pod restart
watch kubectl get pod -n em-prod -l app=app-label

# Validation
kubectl wait --for=condition=Ready pod/app-pod-123 -n em-prod --timeout=60s
```

### Post-Execution Validation

```javascript
function validateRemediation(action, context) {
  const checks = {
    pod_ready: checkPodReady(context.pod),
    service_healthy: checkServiceHealth(context.service),
    alerts_resolved: checkAlertsCleared(context.alertName),
    slo_recovered: checkSloRecovery(context),
    no_new_alerts: checkNoNewAlerts(context.namespace)
  };

  const success = Object.values(checks).every(check => check.passed);

  if (!success) {
    triggerRollback(action);
  }

  return { success, checks };
}
```

### Outputs

```json
{
  "stage": "smart_remediation",
  "remediation": {
    "approved": true,
    "approval_method": "automatic",
    "action_taken": "restart_pod",
    "risk_level": "low",
    "confidence": 0.85,
    "safety_gates": {
      "risk_level": { "passed": true },
      "confidence": { "passed": true },
      "blast_radius": { "passed": true },
      "slo_impact": { "passed": true },
      "rollback_available": { "passed": true }
    },
    "execution_status": "success",
    "execution_time": "2.3s",
    "command_executed": "kubectl delete pod app-pod-123 -n em-prod",
    "validation_results": {
      "pod_ready": true,
      "service_healthy": true,
      "alerts_resolved": true,
      "slo_recovered": true,
      "no_new_alerts": true
    }
  },
  "rollback_plan": {
    "available": true,
    "triggered": false,
    "command": "kubectl rollout undo deployment/app -n em-prod"
  },
  "post_remediation_state": {
    "alerts_cleared": true,
    "slo_current": "99.8%",
    "slo_recovered": true,
    "downtime": "25s",
    "side_effects": []
  },
  "proceed_to_stage6": true,
  "_context": {...}
}
```

### Tool Calls
- kubectl execution: 1-2 calls
- Validation queries: 2-3 calls
- **Total: 3-5 calls**

---

## Stage 6: Prevention & Learning

### Purpose
Post-incident analysis and knowledge capture

### Inputs (from Stage 5)
```json
{
  "stage5Data": {
    "remediation": {
      "action_taken": "restart_pod",
      "execution_status": "success"
    }
  },
  "stage4Data": {
    "root_cause": {...}
  },
  "_context": {...}
}
```

### Processing Steps

#### 1. Incident Timeline Reconstruction
```javascript
function buildTimeline(context) {
  return {
    alert_fired: context.initialParams.startTime,
    triage_completed: stage1.timestamp,
    root_cause_identified: stage4.timestamp,
    remediation_executed: stage5.timestamp,
    incident_resolved: stage5.validation.timestamp,
    total_duration: calculateDuration(),
    mttr: calculateMTTR()
  };
}
```

#### 2. Pattern Extraction
```javascript
function extractPatterns(rootCause, evidence, remediation) {
  return {
    alert_signature: {
      alertname: context.alertName,
      indicators: evidence.map(e => e.finding),
      affected_components: context.pods
    },
    root_cause_pattern: {
      category: rootCause.category,
      specific_issue: rootCause.specific_issue,
      confidence: rootCause.confidence_score
    },
    remediation_pattern: {
      action: remediation.action_taken,
      success: remediation.execution_status === "success",
      execution_time: remediation.execution_time
    }
  };
}
```

#### 3. Knowledge Base Update
```javascript
function updateKnowledgeBase(pattern) {
  // Find existing pattern or create new
  const existing = findPattern(pattern.alert_signature);

  if (existing) {
    // Update success rate and evidence
    existing.success_rate = calculateNewSuccessRate(
      existing.success_rate,
      existing.occurrence_count,
      pattern.remediation_pattern.success
    );
    existing.occurrence_count++;
    existing.last_seen = new Date();
  } else {
    // Create new KB entry
    createKBEntry(pattern);
  }
}
```

#### 4. Preventive Measures
```javascript
function generatePreventiveMeasures(rootCause, context) {
  const measures = [];

  if (rootCause.specific_issue === "memory_leak") {
    measures.push({
      type: "resource_limit",
      action: "Increase memory limit to 2Gi",
      priority: "high",
      implementation: "kubectl set resources..."
    });

    measures.push({
      type: "monitoring",
      action: "Add memory growth alert",
      priority: "medium",
      implementation: "Create PrometheusRule for memory trend"
    });

    measures.push({
      type: "code_fix",
      action: "Investigate application memory leak",
      priority: "high",
      implementation: "Profile application in dev environment"
    });
  }

  return measures;
}
```

### Outputs

```json
{
  "stage": "prevention_and_learning",
  "incident_summary": {
    "context_id": "ctx-xxxxx",
    "alert_name": "KubePodNotReady",
    "root_cause": "memory_leak",
    "remediation": "restart_pod",
    "timeline": {
      "alert_fired": "2025-12-13T10:00:00Z",
      "triage_completed": "2025-12-13T10:01:30Z",
      "root_cause_identified": "2025-12-13T10:05:45Z",
      "remediation_executed": "2025-12-13T10:06:20Z",
      "incident_resolved": "2025-12-13T10:06:45Z",
      "total_duration": "6m 45s",
      "mttr": "6m 20s"
    },
    "affected_components": ["app-pod-123"],
    "user_impact": "minimal (<1% traffic)",
    "downtime": "25s"
  },
  "lessons_learned": [
    "Memory limits too low for current workload",
    "Application has memory leak in version 2.1.0",
    "Restart-based remediation effective for immediate recovery",
    "Need automated memory limit adjustment"
  ],
  "preventive_measures": [
    {
      "type": "resource_limit",
      "action": "Increase memory limit to 2Gi",
      "priority": "high",
      "timeline": "immediate",
      "owner": "platform_team",
      "implementation": "kubectl set resources deployment app -n em-prod --limits=memory=2Gi"
    },
    {
      "type": "monitoring",
      "action": "Add memory growth alert (>10% increase in 6h)",
      "priority": "medium",
      "timeline": "1 week",
      "owner": "sre_team",
      "implementation": "Create PrometheusRule for memory trend detection"
    },
    {
      "type": "code_fix",
      "action": "Investigate and fix memory leak in application",
      "priority": "high",
      "timeline": "2 weeks",
      "owner": "dev_team",
      "implementation": "Profile application, identify leak source, deploy fix"
    }
  ],
  "knowledge_base_update": {
    "pattern_id": "kb-memory-leak-001",
    "alert_signature": "KubePodNotReady + OOMKilled + memory_growth",
    "root_causes": ["Insufficient memory limits", "Application memory leak"],
    "success_rate": 0.92,
    "occurrence_count": 15,
    "recommended_action": "restart_pod_and_increase_memory",
    "diagnostic_commands": [
      "kubectl describe pod {pod} -n {namespace}",
      "kubectl logs {pod} -n {namespace} --previous --tail=100",
      "kubectl top pod {pod} -n {namespace}"
    ],
    "confidence": 0.85,
    "last_updated": "2025-12-13T10:07:00Z"
  },
  "documentation": {
    "runbook_created": true,
    "runbook_url": "https://wiki/runbooks/memory-leak-pod-recovery",
    "dashboard_updated": true,
    "dashboard_url": "https://grafana/d/memory-monitoring",
    "alert_tuned": true,
    "postmortem_required": false
  },
  "metrics": {
    "mttr": "6m 20s",
    "automation_success": true,
    "human_intervention_required": false,
    "cost_saved": "$15 (estimated manual effort)"
  },
  "_context": {...}
}
```

### Tool Calls
- Knowledge base write: 1 call
- Documentation update: 0-2 calls
- **Total: 1-3 calls**

---

## Context Object Reference

### Structure
```json
{
  "_context": {
    "contextId": "ctx-20251213-100000",
    "priority": "critical|high|medium|low",
    "initialParams": {
      "startTime": 1702461600,
      "endTime": 1702462500,
      "namespaces": ["em-prod"],
      "pods": ["app-pod-123"],
      "services": ["app-service"],
      "containers": ["app-container"]
    },
    "alertContext": {
      "alertName": "KubePodNotReady",
      "severity": "critical",
      "source": "prometheus",
      "description": "Pod has been in non-ready state for 15 minutes"
    },
    "kubernetesFilters": {
      "namespace": "em-prod",
      "pod": "app-pod-123",
      "container": "app-container",
      "deployment": "app"
    }
  },
  "_debug": {
    "nodeType": "Stage N",
    "processedAt": "2025-12-13T10:05:00Z",
    "contextId": "ctx-20251213-100000",
    "contextPreserved": true,
    "receivedFromStage": "Stage N-1",
    "stageSequence": ["Stage 1", "Stage 2", "Stage 3"],
    "toolCallCount": 5,
    "executionTime": "2.3s"
  }
}
```

### Context Preservation Rules

1. **Never modify** `_context` structure
2. **Always pass** `_context` to next stage
3. **Append** to `_debug.stageSequence` array
4. **Update** `_debug.processedAt` with current timestamp
5. **Track** `_debug.toolCallCount` for optimization

---

## Common Patterns

### Time Range Handling
```javascript
// Always use Unix timestamps from context
const startTime = _context.initialParams.startTime;
const endTime = _context.initialParams.endTime;

// Convert for Prometheus range query
const range = `[${endTime - startTime}s]`;

// Convert for display
const startDate = new Date(startTime * 1000).toISOString();
```

### Prometheus Query Construction
```javascript
// Use context filters
const namespace = _context.kubernetesFilters.namespace;
const pod = _context.kubernetesFilters.pod;

const query = `
  container_memory_usage_bytes{
    namespace="${namespace}",
    pod="${pod}"
  }[${range}]
`;
```

### Error Handling
```javascript
// Handle empty/NaN responses gracefully
function handleToolResponse(response) {
  if (!response || response === "NaN" || response.length === 0) {
    return { value: 100, assumed: true };
  }
  return { value: parseFloat(response), assumed: false };
}
```

### Stage Proceed Logic
```javascript
// Determine if next stage is needed
function shouldProceed(currentStage, findings) {
  if (currentStage === "stage1") {
    return findings.alerts.critical > 0 || findings.overall_status === "degraded";
  }
  if (currentStage === "stage2") {
    return findings.root_cause.identified === true;
  }
  if (currentStage === "stage3") {
    return findings.slo_impact.status === "red" || findings.slo_impact.status === "yellow";
  }
  if (currentStage === "stage4") {
    return findings.root_cause.confidence_score >= 0.7;
  }
  if (currentStage === "stage5") {
    return true; // Always proceed to learning
  }
  return false;
}
```

---

## Performance Guidelines

### Tool Call Optimization
- **Stage 1**: 1-2 calls
- **Stage 2**: 3-8 calls
- **Stage 3**: 2-7 calls (strictly enforced)
- **Stage 4**: 5-9 calls
- **Stage 5**: 3-5 calls
- **Stage 6**: 1-3 calls

### Execution Time Targets
- **Stage 1**: < 10s
- **Stage 2**: < 30s
- **Stage 3**: < 20s
- **Stage 4**: < 45s
- **Stage 5**: < 60s (includes remediation execution)
- **Stage 6**: < 15s

### Total Pipeline
- **Target**: < 3 minutes end-to-end
- **Maximum**: < 5 minutes

---

## Troubleshooting

### Stage Not Proceeding
```javascript
// Check proceed flag
if (!output.proceed_to_next_stage) {
  console.log("Stage determined no further analysis needed");
  console.log("Reason:", output.reason_for_stop);
}
```

### Context Lost
```javascript
// Verify context preservation
if (!nextStageInput._context) {
  console.error("Context not passed to next stage!");
  console.log("Check stage output structure");
}
```

### Tool Call Limit Exceeded
```javascript
// Track tool calls in _debug
if (_debug.toolCallCount > STAGE_LIMIT) {
  console.warn(`Exceeded tool call limit for stage: ${_debug.toolCallCount}/${STAGE_LIMIT}`);
}
```

---

## Quick Reference

| Stage | Purpose | Max Tools | Proceed Condition |
|-------|---------|-----------|-------------------|
| 0 | Alert Listener | 1 | Always |
| 1 | Initial Triage | 1-2 | Critical alerts > 0 |
| 2 | Deep Analysis | 3-8 | Root cause suspected |
| 3 | Alert Intelligence | 2-7 | SLO impact detected |
| 4 | Automated Diagnosis | 5-9 | Confidence >= 0.7 |
| 5 | Smart Remediation | 3-5 | Always (to learning) |
| 6 | Prevention & Learning | 1-3 | N/A (final stage) |
