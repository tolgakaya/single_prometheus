# OKR_AI - Intelligent Alert Management & Monitoring System

## Project Summary

OKR_AI is an intelligent alert management and automated remediation system built on n8n workflows. The system provides multi-stage alert analysis, root cause identification, and automated remediation for Kubernetes infrastructure monitoring using Prometheus, Grafana, and AI-powered analysis.

## Purpose

Transform reactive alert handling into proactive incident management through:
- Automated alert ingestion from multiple sources (email, Prometheus, Grafana)
- AI-powered multi-stage analysis (6 stages from initial triage to learning)
- Intelligent correlation and pattern recognition
- Automated remediation with safety controls
- SLO tracking and error budget management
- Knowledge base integration for continuous improvement

## Technology Stack

### Core Platform
- **n8n**: Workflow automation and orchestration engine
- **LiteLLM**: AI model integration for alert analysis
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and monitoring dashboards
- **Loki**: Log aggregation
- **Tempo**: Distributed tracing

### Infrastructure
- **Kubernetes (EKS)**: Container orchestration platform
- **AWS**: Cloud infrastructure (ELB, RDS)
- **Kafka**: Event streaming for alert distribution
- **Redis**: Caching and session management
- **Elasticsearch**: Log storage and search

### Monitoring Components
- **Kube-Prometheus-Stack**: Kubernetes monitoring suite
- **Blackbox Exporter**: External service monitoring
- **Elasticsearch Exporter**: Elasticsearch metrics
- **Postgres Exporter**: Database metrics
- **Redis Exporter**: Redis metrics
- **PHP-FPM Exporter**: Application metrics

## Project Structure

```
OKR_AI/
├── Alert Listener n8n flow.json      # Email/webhook alert ingestion workflow
├── Prometheus n8n flow.json          # 6-stage intelligent analysis workflow
├── AlertListenerNodes/               # Alert processing node configurations
│   └── 4. AI Alert Analyzer.txt      # AI analysis prompt for initial triage
├── PrometheusNodes/                  # Multi-stage analysis node configurations
│   ├── 12. Stage 2 Deep Analysis.txt       # Pod/trend/anomaly investigation
│   ├── Stage 3 Alert Intelligence.txt      # SLO impact & correlation analysis
│   ├── 18. Stage 4 Automated Diagnosis.txt # Root cause identification
│   ├── 21. Stage 5 Smart Remediation.txt   # Automated fix execution
│   └── 23. Stage 6 Prevention & Learning.txt # Post-incident learning
├── alert_example.json                # Sample alert payload structure
├── services.txt                      # Kubernetes service inventory
└── notes.md                          # Credentials and configuration notes
```

## Key Features

### Alert Listener Workflow
- Multi-source alert ingestion (Email, Webhook, Prometheus)
- Alert normalization and deduplication
- Priority classification and routing
- AI-powered initial analysis
- Context extraction (time range, services, severity)

### Prometheus Analysis Workflow (6 Stages)

**Stage 1: Initial Triage**
- Quick status assessment
- Alert correlation
- Priority determination
- Immediate action identification

**Stage 2: Deep Analysis**
- Pod status investigation
- Resource usage trends (24h comparison)
- Anomaly detection
- Restart pattern analysis
- Correlation matrix building

**Stage 3: Alert Intelligence**
- Active alert enumeration
- 24-hour alert history analysis
- SLO impact assessment (Pod Ready, Node Ready, Restart Rate, Deployment Health)
- Alert grouping and correlation
- Knowledge base matching
- Alert storm detection

**Stage 4: Automated Diagnosis**
- Root cause identification
- Multi-tool evidence gathering
- Confidence scoring
- Diagnostic command execution
- Blast radius assessment

**Stage 5: Smart Remediation**
- Risk assessment
- Automated fix selection
- Safety gate validation
- Remediation execution
- Rollback capability

**Stage 6: Prevention & Learning**
- Incident retrospective
- Pattern extraction
- Knowledge base update
- Preventive measure recommendations
- Documentation generation

## Data Flow

```
Alert Source (Email/Prometheus/Grafana)
  ↓
Alert Listener (Normalization)
  ↓
AI Analyzer (Initial Classification)
  ↓
Stage 1: Triage → Quick findings
  ↓
Stage 2: Deep Analysis → Pod/trend/anomaly data
  ↓
Stage 3: Intelligence → SLO impact + correlation
  ↓
Stage 4: Diagnosis → Root cause identification
  ↓
Stage 5: Remediation → Automated fix (if approved)
  ↓
Stage 6: Learning → Knowledge base update
```

## Alert Processing Schema

### Input Alert Structure
```json
{
  "version": "4",
  "status": "firing",
  "receiver": "{{receiver_name}}",
  "groupLabels": {"alertname": "..."},
  "commonLabels": {
    "alertname": "...",
    "severity": "critical|warning|info",
    "namespace": "...",
    "pod": "...",
    "container": "..."
  },
  "commonAnnotations": {
    "description": "...",
    "summary": "...",
    "runbook_url": "..."
  },
  "alerts": [...]
}
```

### Normalized Alert Format
```json
{
  "source": "prometheus|email|grafana",
  "timestamp": "ISO8601",
  "title": "Alert summary",
  "body": "Alert details",
  "sender": "alertmanager",
  "priority": "critical|high|medium|low",
  "context": {
    "namespaces": ["..."],
    "pods": ["..."],
    "startTime": "unix_timestamp",
    "endTime": "unix_timestamp"
  }
}
```

## Monitored Environments

### Production Clusters
- **em-global-prod**: Global production environment
- **em-prod**: Standard production environment
- **em-control-plane-prod**: Control plane services
- **bss-prod-eks-monitoring**: Monitoring infrastructure

### Key Namespaces
- Monitoring: `bss-prod-eks-monitoring`
- Applications: `em-global-prod`, `em-prod`
- Third-party: `em-global-prod-3pp`, `em-prod-3pp`
- EOM Services: `em-global-prod-eom`, `em-prod-eom`
- FlowE Services: `em-global-prod-flowe`, `em-prod-flowe`

## SLO Tracking

### Availability SLOs
- **Target**: 99.9%
- **Pod Ready SLO** (30% weight)
- **Container Running SLO** (20% weight)
- **Node Ready SLO** (25% weight)
- **Pod Restart Rate SLO** (15% weight)
- **Deployment Health** (10% weight)

### Composite Score Interpretation
- ≥ 99.9%: Green (SLO Met)
- 99.0-99.9%: Yellow (SLO Warning)
- < 99.0%: Red (SLO Violation)

## AI Integration

### LiteLLM Configuration
- **Base URL**: `https://etiya-buddy-littellm-genia-int.etiya.com/v1`
- **Model**: Configurable AI models for analysis
- **Use Cases**:
  - Alert classification and prioritization
  - Root cause analysis
  - Remediation recommendation
  - Pattern recognition
  - Natural language report generation

### Analysis Prompts
Each stage has structured prompts requiring JSON output:
- Time range extraction
- Service/component identification
- Severity assessment
- Technical indicator analysis
- Recommendation generation

## Configuration

### Grafana Production Cluster
- **URL**: `https://grafana.saas.etycloudbss.com`
- **Components**:
  - Loki: `grafana-loki.saas.etycloudbss.com`
  - Tempo: `grafana-tempo.saas.etycloudbss.com`
  - Prometheus: `prometheus.saas.etycloudbss.com`

### n8n Platform
- **URL**: `http://172.22.199.71:5678/projects/u3SJdYxW3j5zuSy1/workflows`
- **Projects**: Workflow management and orchestration

## Efficiency Rules

### Stage 3 Optimization
- **Alert History**: Single call for all alerts (max 1 call)
- **Active Alerts**: Single aggregated call
- **SLO Tools**: Maximum 1 call per SLO type
- **Total Tool Limit**: ≤ 7 tool calls per stage
- **Conditional Execution**: Skip tools if no alerts detected

### Tool Call Strategy
1. Active Alerts Details (1 call - ALL alerts)
2. Alert History 24h (1 call - ALL historical data)
3. Conditional SLO checks based on alert types:
   - Pod-related → Pod Ready SLO
   - Node issues → Node Ready SLO
   - Restart alerts → Pod Restart Rate SLO
   - Deployment issues → Deployment Replica Health

## Known Alert Types

### Critical Alerts
- **KubePodCrashLooping**: Pod restarting >5 times in 10 minutes
- **KubeNodeNotReady**: Node unready >5 minutes
- **KubePodNotReady**: Pod non-ready >5 minutes

### Warning Alerts
- **KubeDeploymentReplicasMismatch**: Replica count mismatch
- **KubeContainerWaiting**: Container waiting >1 hour
- **KubeHpaMaxedOut**: HPA at max replicas >15 minutes

## Success Metrics

- Alert response time reduction
- Automated remediation success rate
- SLO compliance percentage
- Mean time to resolution (MTTR)
- Alert correlation accuracy
- Knowledge base growth rate

## Future Enhancements

- Machine learning for pattern prediction
- Multi-cluster federation
- Advanced blast radius visualization
- Automated capacity planning
- Cost optimization recommendations
- Custom playbook integration
