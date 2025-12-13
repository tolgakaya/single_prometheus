# OKR_AI System Architecture

## Architecture Overview

OKR_AI implements a **multi-stage event-driven architecture** for intelligent alert management, combining workflow automation (n8n), AI analysis (LiteLLM), and observability platforms (Prometheus, Grafana, Loki).

## System Components

### 1. Alert Ingestion Layer

#### Alert Listener Workflow
**Purpose**: Multi-source alert collection and normalization

**Components**:
- Email receiver (IMAP/webhook)
- Prometheus Alertmanager webhook
- Grafana webhook integration
- Alert deduplication logic
- Priority classifier

**Data Flow**:
```
External Sources → Alert Receiver → Normalization → AI Analyzer → Context Builder → Stage 1
```

**Normalization Process**:
1. Extract common fields (title, body, timestamp, severity)
2. Parse alert metadata (namespace, pod, service)
3. Determine time range (start/end timestamps)
4. Classify priority (critical/high/medium/low)
5. Generate context ID for tracking

### 2. AI Analysis Layer

#### LiteLLM Integration
**Endpoint**: `https://etiya-buddy-littellm-genia-int.etiya.com/v1`

**Responsibilities**:
- Alert classification and triage
- Natural language processing of alert descriptions
- Pattern recognition from historical data
- Root cause hypothesis generation
- Remediation recommendation
- Post-incident analysis

**Analysis Stages**:
- **Initial Triage**: Quick classification (Stage 0)
- **Deep Analysis**: Multi-phase investigation (Stage 2)
- **Intelligence**: Correlation and SLO impact (Stage 3)
- **Diagnosis**: Root cause identification (Stage 4)
- **Learning**: Pattern extraction (Stage 6)

### 3. Observability Platform Layer

#### Prometheus Metrics
**Endpoint**: `prometheus.saas.etycloudbss.com`

**Queries Used**:
- Active alerts: `ALERTS{alertstate="firing"}`
- Alert history: `count by (alertname, severity) (ALERTS{alertstate="firing"})`
- Pod status: `kube_pod_status_phase`
- Container restarts: `kube_pod_container_status_restarts_total`
- Resource usage: `container_memory_usage_bytes`, `container_cpu_usage_seconds_total`
- Node status: `kube_node_status_condition`

**SLO Metrics**:
- Pod Ready: `kube_pod_status_ready`
- Container Running: `kube_pod_container_status_running`
- Node Ready: `kube_node_status_condition{condition="Ready"}`
- Pod Restart Rate: `rate(kube_pod_container_status_restarts_total[5m])`
- Deployment Health: `kube_deployment_status_replicas_available / kube_deployment_spec_replicas`

#### Grafana Dashboards
**Endpoint**: `https://grafana.saas.etycloudbss.com`

**Integration**:
- Dashboard links in alert annotations
- Visual context for incident investigation
- SLO dashboard tracking
- Multi-cluster overview

#### Loki Logs
**Endpoint**: `grafana-loki.saas.etycloudbss.com`

**Usage**:
- Pod log retrieval during investigation
- Error pattern matching
- Timeline reconstruction
- Correlation with metrics

#### Tempo Traces
**Endpoint**: `grafana-tempo.saas.etycloudbss.com`

**Usage**:
- Distributed tracing for service issues
- Request flow analysis
- Latency bottleneck identification

### 4. Workflow Orchestration Layer

#### n8n Workflows

##### Alert Listener Flow
**Trigger**: Email/Webhook
**Nodes**:
1. Email Trigger / Webhook Trigger
2. Alert Parser
3. Deduplication Check
4. AI Alert Analyzer (LiteLLM)
5. Context Builder
6. Priority Router
7. Stage 1 Trigger

##### Prometheus Analysis Flow
**Trigger**: Alert Listener → Stage 1
**Pipeline**:
```
Stage 1: Triage
    ↓
Stage 2: Deep Analysis
    ↓ (if proceed_to_stage3 = true)
Stage 3: Alert Intelligence
    ↓ (if proceed_to_stage4 = true)
Stage 4: Automated Diagnosis
    ↓ (if remediation recommended)
Stage 5: Smart Remediation
    ↓ (always)
Stage 6: Prevention & Learning
```

**Stage Dependencies**:
- Each stage receives output from previous stage via `_context` object
- Context preservation ensures data continuity
- Stage sequence tracked in `_debug.stageSequence`

### 5. Data Management Layer

#### Context Object Structure
Passed through all stages to maintain state:

```json
{
  "_context": {
    "contextId": "unique_id",
    "priority": "critical|high|medium|low",
    "initialParams": {
      "startTime": "unix_timestamp",
      "endTime": "unix_timestamp",
      "namespaces": ["namespace1"],
      "pods": ["pod1"],
      "services": ["service1"]
    },
    "alertContext": {
      "alertName": "KubePodNotReady",
      "severity": "critical",
      "source": "prometheus"
    },
    "kubernetesFilters": {
      "namespace": "em-prod",
      "pod": "pod-name",
      "container": "container-name"
    }
  }
}
```

#### Knowledge Base
**Storage**: n8n internal database / external KB
**Schema**:
```json
{
  "alert_pattern": "KubePodCrashLooping",
  "root_causes": [
    "OOMKilled",
    "Application crash",
    "Liveness probe failure"
  ],
  "diagnostic_commands": [
    "kubectl describe pod",
    "kubectl logs",
    "kubectl get events"
  ],
  "immediate_actions": [
    "Check resource limits",
    "Review application logs",
    "Verify liveness/readiness probes"
  ],
  "long_term_solutions": [
    "Increase memory limits",
    "Fix application bugs",
    "Adjust probe thresholds"
  ],
  "success_rate": 0.85,
  "last_updated": "timestamp"
}
```

## Stage Architecture Details

### Stage 1: Initial Triage
**Purpose**: Quick assessment and routing

**Inputs**:
- Normalized alert data
- Alert metadata
- Context ID

**Processing**:
1. Alert count aggregation
2. Critical alert identification
3. Quick status check (Prometheus)
4. Initial findings summary
5. Proceed/stop decision

**Outputs**:
- `overall_status`: healthy|degraded|critical
- `alerts`: {critical, warning, info counts}
- `quick_findings`: ["finding1", "finding2"]
- `proceed_to_stage2`: boolean

**Tool Calls**: 1-2 (Prometheus queries)

### Stage 2: Deep Analysis
**Purpose**: Multi-phase investigation

**Phases**:

**Phase 1: Instant Analysis**
- Pod status check
- Container restart count
- Current resource usage
- Immediate resource pressure indicators

**Phase 2: Trend Analysis**
- 24-hour comparison
- Memory growth patterns
- Restart frequency trends
- Historical context

**Phase 3: Anomaly Detection**
- Resource exhaustion prediction
- Pattern anomalies
- Deviation from baseline

**Outputs**:
```json
{
  "execution_phases": {
    "instant": {
      "tools_used": ["Pod Status", "Container Restarts"],
      "findings": {
        "critical_pods": ["pod1"],
        "resource_pressure": ["memory"]
      }
    },
    "trend": {
      "tools_used": ["24h Memory Trend"],
      "findings": {
        "memory_growth": "15% increase",
        "restart_pattern": "Every 2 hours"
      }
    },
    "anomaly": {
      "tools_used": ["Anomaly Detector"],
      "findings": {
        "predictions": ["OOM in 3 hours"],
        "anomalies": ["Unusual memory spike"]
      }
    }
  },
  "correlation_matrix": {
    "primary_chain": "pod → container → node",
    "affected_services": ["service1"],
    "blast_radius": "namespace",
    "kubernetes_impact": {
      "evicted_pods": 2,
      "pending_pods": 1
    }
  },
  "root_cause": {
    "identified": true,
    "component": "container",
    "issue": "memory leak",
    "evidence": ["memory trend", "restart pattern"],
    "confidence": 0.85
  },
  "proceed_to_stage3": true
}
```

**Tool Calls**: 3-6 (Prometheus + Loki queries)

### Stage 3: Alert Intelligence
**Purpose**: SLO impact and correlation analysis

**Efficiency Strategy**:
- **Alert History**: 1 call for ALL alerts
- **Active Alerts**: 1 aggregated call
- **SLO Checks**: Conditional based on alert types
- **Total Limit**: ≤ 7 tool calls

**Processing**:

**Alert Discovery**:
```javascript
// Single call for all active alerts
ALERTS{alertstate="firing",alertname=~"Kube.*|Container.*|Pod.*|Node.*"}

// Single call for 24h history (ALL alerts)
count by (alertname, severity) (ALERTS{alertstate="firing"})
```

**SLO Assessment**:
```javascript
// Conditional checks based on alert types
if (pod_alerts) → Pod Ready SLO
if (node_alerts) → Node Ready SLO
if (restart_alerts) → Pod Restart Rate SLO
if (deployment_alerts) → Deployment Health SLO
```

**Composite SLO Calculation**:
```javascript
composite = (podReady * 0.3) +
            (containerRunning * 0.2) +
            (nodeReady * 0.25) +
            (restartRate * 0.15) +
            (deploymentHealth * 0.1)

status = composite >= 99.9 ? "green" :
         composite >= 99.0 ? "yellow" : "red"
```

**Outputs**:
```json
{
  "active_alerts": [...],
  "alert_groups": [
    {
      "root_alert": "KubePodNotReady",
      "related_alerts": ["KubeContainerWaiting"],
      "correlation_score": 0.9,
      "shared_labels": {"namespace": "em-prod"}
    }
  ],
  "knowledge_base_matches": [...],
  "alert_patterns": {
    "recurring": ["KubePodCrashLooping"],
    "storm_detection": {
      "detected": true,
      "alert_count": 15,
      "time_window": "5m",
      "likely_root": "KubeNodeNotReady"
    }
  },
  "slo_impact": {
    "availability_slo": {
      "target": "99.9%",
      "current": "98.5%",
      "error_budget_used": "60%",
      "time_remaining": "10d",
      "components": {
        "deployment_health": "97%"
      },
      "status": "red"
    },
    "affected_slis": ["pod_ready", "deployment_health"]
  },
  "recommended_alert_actions": [...],
  "proceed_to_stage4": true,
  "auto_remediation_approved": false
}
```

**Tool Calls**: 2-7 (optimized)

### Stage 4: Automated Diagnosis
**Purpose**: Root cause identification with evidence

**Evidence Collection**:
1. Pod events (kubectl get events)
2. Container logs (last 100 lines)
3. Resource metrics (current + historical)
4. Network connectivity tests
5. Dependency health checks

**Root Cause Analysis**:
```javascript
// Scoring system
evidence_sources = {
  pod_events: 0.3,
  container_logs: 0.3,
  resource_metrics: 0.2,
  network_tests: 0.1,
  dependency_health: 0.1
}

// Confidence calculation
confidence = Σ(evidence_weight * match_strength)

// Threshold for automated remediation
auto_remediate = confidence >= 0.8 && risk <= "medium"
```

**Outputs**:
```json
{
  "root_cause": {
    "identified": true,
    "category": "resource_exhaustion",
    "specific_issue": "memory_leak",
    "affected_component": "container:app",
    "evidence": [
      {
        "source": "container_logs",
        "finding": "OutOfMemoryError",
        "confidence": 0.9
      }
    ],
    "confidence_score": 0.85
  },
  "diagnostic_data": {
    "pod_events": [...],
    "logs": [...],
    "metrics": [...]
  },
  "recommended_actions": [
    {
      "action": "restart_pod",
      "risk": "low",
      "confidence": 0.9
    }
  ],
  "blast_radius_assessment": {
    "scope": "single_pod",
    "affected_users": "< 1%",
    "affected_services": ["service1"]
  },
  "proceed_to_remediation": true
}
```

**Tool Calls**: 4-8 (kubectl + Prometheus + Loki)

### Stage 5: Smart Remediation
**Purpose**: Automated fix execution with safety gates

**Risk Assessment Matrix**:
| Action | Risk | Auto-Approve Threshold |
|--------|------|------------------------|
| Restart Pod | Low | Confidence >= 0.8 |
| Scale Deployment | Medium | Confidence >= 0.9 |
| Delete PVC | High | Manual only |
| Node Drain | Critical | Manual only |

**Safety Gates**:
1. Risk level check
2. Confidence threshold
3. Blast radius validation
4. SLO impact prediction
5. Rollback plan verification

**Execution Flow**:
```
Risk Assessment
    ↓
Safety Gate Check
    ↓ (auto-approve OR manual approve)
Pre-execution Validation
    ↓
Execute Remediation
    ↓
Monitor Execution
    ↓
Post-execution Validation
    ↓ (if failed)
Rollback
```

**Outputs**:
```json
{
  "remediation": {
    "approved": true,
    "action_taken": "restart_pod",
    "execution_status": "success",
    "execution_time": "2.3s",
    "validation_results": {
      "pod_ready": true,
      "service_healthy": true,
      "alerts_resolved": true
    }
  },
  "rollback_plan": {
    "available": true,
    "command": "kubectl rollout undo deployment/app"
  },
  "post_remediation_state": {
    "alerts_cleared": true,
    "slo_recovered": true,
    "side_effects": []
  }
}
```

**Tool Calls**: 2-5 (kubectl execution + validation)

### Stage 6: Prevention & Learning
**Purpose**: Post-incident analysis and knowledge capture

**Analysis Components**:
1. Incident timeline reconstruction
2. Root cause validation
3. Remediation effectiveness
4. Pattern extraction
5. Knowledge base update
6. Preventive measure identification

**Outputs**:
```json
{
  "incident_summary": {
    "duration": "15m",
    "mttr": "3m",
    "affected_components": ["pod1"],
    "user_impact": "minimal"
  },
  "lessons_learned": [
    "Memory limits too low for workload",
    "Application has memory leak in version X"
  ],
  "preventive_measures": [
    "Increase memory limit to 2Gi",
    "Upgrade to version Y with leak fix",
    "Add memory usage alerts"
  ],
  "knowledge_base_update": {
    "pattern": "KubePodCrashLooping + OOMKilled",
    "success_rate": 0.9,
    "recommended_action": "restart + increase memory"
  },
  "documentation": {
    "runbook_created": true,
    "dashboard_updated": true,
    "alert_tuned": true
  }
}
```

**Tool Calls**: 1-3 (KB write + documentation)

## Infrastructure Architecture

### Kubernetes Cluster Topology
```
EKS Cluster: bss-prod-eks
├── Monitoring Namespace (bss-prod-eks-monitoring)
│   ├── Prometheus Stack
│   ├── Grafana
│   ├── Loki
│   ├── Tempo
│   ├── Alertmanager
│   └── Exporters
├── Application Namespaces
│   ├── em-global-prod
│   ├── em-prod
│   ├── em-control-plane-prod
│   └── [others]
├── Third-party Services
│   ├── em-global-prod-3pp (Kafka, Redis, Elasticsearch)
│   └── em-prod-3pp
└── DevOps Namespace (bss-devops)
    ├── ArgoCD
    └── Harbor Registry
```

### Network Architecture
```
External Alerts
    ↓
Internet → ALB/NLB
    ↓
Istio Ingress Gateway
    ↓
n8n Webhook Endpoint
    ↓
n8n Workflows
    ↓
    ├→ LiteLLM API (AI Analysis)
    ├→ Prometheus API (Metrics)
    ├→ Grafana API (Visualization)
    ├→ Loki API (Logs)
    ├→ Kubernetes API (kubectl)
    └→ Knowledge Base (Storage)
```

## Data Flow Patterns

### Alert Processing Pipeline
```
1. Ingestion
   Email/Webhook → Parse → Normalize → Deduplicate

2. Classification
   Normalized Alert → AI Analysis → Priority Assignment

3. Context Building
   Alert + Metadata → Time Range Extraction → Service Identification

4. Multi-stage Analysis
   Stage 1 → Stage 2 → Stage 3 → Stage 4 → Stage 5 → Stage 6

5. Action Execution
   Remediation Plan → Safety Check → Execute → Validate

6. Knowledge Capture
   Results → Pattern Extraction → KB Update → Documentation
```

### Context Propagation
```json
// Context flows through all stages
Stage N → {
  "output": {...},
  "_context": {...},  // Preserved from Stage 1
  "_debug": {
    "stageSequence": ["Stage 1", "Stage 2", ..., "Stage N"]
  }
} → Stage N+1
```

## Scalability & Performance

### Workflow Optimization
- Parallel tool execution where possible
- Conditional stage execution (proceed flags)
- Tool call limits per stage (≤ 7 for Stage 3)
- Single-call aggregation (Alert History)
- Caching of frequent queries

### Rate Limiting
- Prometheus query rate: Managed by Prometheus
- LiteLLM API: Token-based rate limiting
- Kubernetes API: Client-side rate limiting
- n8n execution: Concurrent workflow limits

### Resource Management
- n8n worker scaling based on load
- Workflow timeout: Configurable per stage
- Retry logic: Exponential backoff
- Circuit breakers: For external APIs

## Security Architecture

### Authentication & Authorization
- n8n: User authentication + API keys
- LiteLLM: API key authentication
- Prometheus: Internal cluster access
- Grafana: OAuth + API tokens
- Kubernetes: RBAC for kubectl operations

### Data Security
- Alert data: In-transit encryption (TLS)
- Credentials: n8n credential store (encrypted)
- Knowledge base: Access control
- Logs: Retention policies + encryption

### Audit Trail
- Workflow execution logs
- Remediation actions logged
- API calls tracked
- Knowledge base changes versioned

## Reliability & Resilience

### Error Handling
- Tool failures: Graceful degradation
- Stage failures: Stop pipeline, alert operator
- Remediation failures: Automatic rollback
- API timeouts: Retry with backoff

### Monitoring & Alerting
- n8n workflow health monitoring
- Stage execution time tracking
- Tool call success rates
- SLO compliance tracking

### Disaster Recovery
- n8n workflow backups (version control)
- Knowledge base backups
- Configuration as code (GitOps ready)
- Rollback procedures documented

## Integration Points

### External Systems
- **Email**: IMAP/SMTP for alert reception
- **Slack/Teams**: Notification delivery
- **Ticketing**: JIRA/ServiceNow integration
- **PagerDuty**: Escalation integration
- **Git**: Documentation storage

### Internal Systems
- **Prometheus**: Metrics and alerts
- **Grafana**: Dashboards and visualization
- **Loki**: Log aggregation
- **Tempo**: Distributed tracing
- **Kubernetes**: Orchestration and execution

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Orchestration | n8n | Workflow automation |
| AI | LiteLLM | Natural language analysis |
| Metrics | Prometheus | Time-series metrics |
| Visualization | Grafana | Dashboards and alerts |
| Logs | Loki | Log aggregation |
| Tracing | Tempo | Distributed tracing |
| Container Platform | Kubernetes (EKS) | Orchestration |
| Cloud | AWS | Infrastructure |
| Messaging | Kafka | Event streaming |
| Caching | Redis | Session/data cache |
| Search | Elasticsearch | Log search |
| Database | PostgreSQL (RDS) | Relational data |
