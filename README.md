# OKR_AI - Intelligent Alert Management System

> AI-powered multi-stage alert analysis and automated remediation for Kubernetes infrastructure

## Overview

OKR_AI transforms reactive alert handling into proactive incident management through intelligent automation. Built on n8n workflows with AI-powered analysis, the system provides automated alert triage, root cause identification, and smart remediation for Kubernetes environments monitored by Prometheus and Grafana.

## Features

- **Multi-Source Alert Ingestion**: Email, Prometheus Alertmanager, Grafana webhooks
- **AI-Powered Analysis**: LiteLLM integration for intelligent alert classification and root cause identification
- **6-Stage Analysis Pipeline**: From initial triage to automated learning and prevention
- **SLO Tracking**: Real-time availability monitoring with error budget management
- **Automated Remediation**: Safe, confidence-based automated fixes with rollback capability
- **Knowledge Base Integration**: Continuous learning from incident patterns
- **Alert Correlation**: Intelligent grouping and storm detection
- **Blast Radius Assessment**: Impact analysis before remediation

## Quick Start

### Prerequisites

- n8n platform (v1.0+)
- Access to Kubernetes cluster
- Prometheus installation
- Grafana instance
- LiteLLM API access

### Installation

1. **Import Workflows**

```bash
# Import Alert Listener workflow
n8n import:workflow --input="Alert Listener n8n flow.json"

# Import Prometheus Analysis workflow
n8n import:workflow --input="Prometheus n8n flow.json"
```

2. **Configure Credentials**

Add the following credentials in n8n:

- **LiteLLM API**
  - Base URL: `https://etiya-buddy-littellm-genia-int.etiya.com/v1`
  - API Key: [Your API key]

- **Prometheus**
  - URL: `https://prometheus.saas.etycloudbss.com`

- **Grafana**
  - URL: `https://grafana.saas.etycloudbss.com`
  - Username: `admin`
  - Password: [Your password]

- **Kubernetes**
  - Cluster context: Configure kubectl access
  - Service account: Ensure proper RBAC permissions

3. **Configure Alertmanager**

Add webhook receiver to Alertmanager configuration:

```yaml
receivers:
  - name: 'n8n-webhook'
    webhook_configs:
      - url: 'http://[n8n-host]:5678/webhook/prometheus-alerts'
        send_resolved: true
```

4. **Activate Workflows**

- Enable "Alert Listener" workflow
- Enable "Prometheus Analysis" workflow
- Verify webhook endpoints are accessible

## Architecture

### System Components

```
Alert Sources → Alert Listener → AI Analysis → 6-Stage Pipeline → Remediation → Learning
                                      ↓
                              Prometheus/Grafana/Loki
                                      ↓
                              Kubernetes Cluster
```

### 6-Stage Analysis Pipeline

1. **Stage 1: Initial Triage**
   - Quick status assessment
   - Alert correlation
   - Priority determination

2. **Stage 2: Deep Analysis**
   - Pod/container investigation
   - 24-hour trend analysis
   - Anomaly detection

3. **Stage 3: Alert Intelligence**
   - SLO impact assessment
   - Alert grouping and correlation
   - Knowledge base matching

4. **Stage 4: Automated Diagnosis**
   - Root cause identification
   - Evidence gathering
   - Confidence scoring

5. **Stage 5: Smart Remediation**
   - Risk assessment
   - Automated fix execution
   - Validation and rollback

6. **Stage 6: Prevention & Learning**
   - Pattern extraction
   - Knowledge base update
   - Preventive recommendations

## Usage

### Alert Format

Alerts are automatically normalized from multiple sources:

**Prometheus Alert Example**:
```json
{
  "status": "firing",
  "labels": {
    "alertname": "KubePodNotReady",
    "severity": "critical",
    "namespace": "em-prod",
    "pod": "app-pod-123"
  },
  "annotations": {
    "description": "Pod has been in non-ready state for 15 minutes",
    "summary": "Pod not ready"
  }
}
```

**Normalized Format**:
```json
{
  "source": "prometheus",
  "timestamp": "2025-12-13T10:00:00Z",
  "title": "Pod not ready",
  "body": "Pod has been in non-ready state for 15 minutes",
  "priority": "critical",
  "context": {
    "namespaces": ["em-prod"],
    "pods": ["app-pod-123"],
    "startTime": 1702461600,
    "endTime": 1702462500
  }
}
```

### Workflow Execution

**Manual Trigger**:
```bash
# Via n8n API
curl -X POST http://[n8n-host]:5678/webhook/manual-alert \
  -H "Content-Type: application/json" \
  -d @alert_example.json
```

**Automatic Trigger**:
- Alerts sent to Alertmanager webhook automatically trigger analysis
- Email alerts to configured inbox trigger processing
- Grafana alerts via webhook integration

### Monitoring Workflow Health

Check workflow execution status:
```bash
# View recent executions
n8n executions:list --workflow="Prometheus Analysis"

# Check specific execution
n8n execution:show [execution-id]
```

## Configuration

### Alert Listener Configuration

Edit workflow nodes to customize:

- **Email Receiver**: Configure IMAP settings
- **Webhook**: Adjust endpoint path
- **Deduplication Window**: Default 5 minutes
- **Priority Thresholds**: Customize classification rules

### Analysis Pipeline Configuration

Customize stage behavior:

- **Tool Call Limits**: Default 7 for Stage 3
- **Confidence Thresholds**: Default 0.8 for auto-remediation
- **SLO Targets**: Default 99.9% availability
- **Time Windows**: Default 24h for trend analysis

### AI Model Configuration

Configure LiteLLM models:

```javascript
// In AI Analyzer nodes
{
  "model": "gpt-4",
  "temperature": 0.3,
  "max_tokens": 2000,
  "response_format": { "type": "json_object" }
}
```

## SLO Tracking

### Availability SLO Configuration

Default SLO composition:
- **Pod Ready**: 30% weight
- **Container Running**: 20% weight
- **Node Ready**: 25% weight
- **Pod Restart Rate**: 15% weight
- **Deployment Health**: 10% weight

**Target**: 99.9% availability

**Status Interpretation**:
- ≥ 99.9%: Green (SLO Met)
- 99.0-99.9%: Yellow (SLO Warning)
- < 99.0%: Red (SLO Violation)

### Error Budget Calculation

```
Error Budget = (1 - SLO Target) * Total Time
Burn Rate = (1 - Current SLO) / (1 - SLO Target)
```

## Remediation Actions

### Supported Actions

| Action | Risk Level | Auto-Approve | Description |
|--------|-----------|--------------|-------------|
| Restart Pod | Low | Yes (0.8 confidence) | Restart failing pod |
| Scale Deployment | Medium | Yes (0.9 confidence) | Adjust replica count |
| Delete PVC | High | No | Remove persistent volume claim |
| Node Drain | Critical | No | Drain node for maintenance |
| Update Config | Medium | No | Modify ConfigMap/Secret |
| Rollback Deployment | Medium | Yes (0.85 confidence) | Revert to previous version |

### Safety Gates

All automated remediation passes through:

1. **Risk Assessment**: Action classified by risk level
2. **Confidence Check**: Root cause confidence must meet threshold
3. **Blast Radius Validation**: Impact scope must be acceptable
4. **SLO Prediction**: Remediation must not violate SLOs
5. **Rollback Plan**: Must have tested rollback procedure

## Knowledge Base

### Pattern Recognition

The system learns from incidents:

```json
{
  "pattern": "KubePodCrashLooping + OOMKilled",
  "root_causes": ["Insufficient memory limits", "Application memory leak"],
  "success_rate": 0.9,
  "recommended_action": "restart_pod_and_increase_memory",
  "diagnostic_commands": [
    "kubectl describe pod",
    "kubectl logs --previous",
    "kubectl top pod"
  ]
}
```

### Continuous Learning

After each incident:
- Pattern extracted and stored
- Success rate updated
- Recommendations refined
- Runbooks generated/updated

## Troubleshooting

### Common Issues

**Workflow Not Triggering**
```bash
# Check webhook accessibility
curl http://[n8n-host]:5678/webhook/prometheus-alerts

# Verify Alertmanager configuration
kubectl -n monitoring get configmap alertmanager-config -o yaml

# Check n8n logs
n8n logs --workflow="Alert Listener"
```

**AI Analysis Failing**
```bash
# Verify LiteLLM API access
curl https://etiya-buddy-littellm-genia-int.etiya.com/v1/models

# Check API key validity
# Review AI node error messages in n8n execution logs
```

**Prometheus Queries Failing**
```bash
# Test Prometheus connectivity
curl https://prometheus.saas.etycloudbss.com/api/v1/query?query=up

# Verify RBAC permissions
kubectl auth can-i get pods --namespace=em-prod

# Check Prometheus service availability
kubectl -n monitoring get svc prometheus
```

**Kubernetes Commands Failing**
```bash
# Verify kubectl context
kubectl config current-context

# Check service account permissions
kubectl -n n8n get serviceaccount
kubectl describe clusterrolebinding n8n-remediation

# Test kubectl access
kubectl get pods --all-namespaces
```

### Debug Mode

Enable detailed logging:

1. Add debug output in each stage
2. Set `_debug.enabled = true` in context
3. Review `_debug.stageSequence` for pipeline flow
4. Check `_debug.toolCallCount` for optimization

### Performance Optimization

**Stage 3 Optimization** (Critical):
- Alert History: **1 call only** for all alerts
- Active Alerts: **1 call** aggregated
- SLO Checks: Conditional based on alert types
- **Total limit: ≤ 7 tool calls**

**General Best Practices**:
- Enable workflow caching
- Use parallel tool execution
- Implement conditional stage execution
- Monitor execution time metrics

## Monitoring Environments

### Production Clusters

**Primary Environments**:
- `em-global-prod`: Global production
- `em-prod`: Standard production
- `em-control-plane-prod`: Control plane services

**Monitoring Namespace**: `bss-prod-eks-monitoring`

**Key Services**:
- Prometheus: `prometheus.saas.etycloudbss.com`
- Grafana: `grafana.saas.etycloudbss.com`
- Loki: `grafana-loki.saas.etycloudbss.com`
- Tempo: `grafana-tempo.saas.etycloudbss.com`

## API Reference

### Alert Listener API

**Endpoint**: `POST /webhook/prometheus-alerts`

**Request Body**:
```json
{
  "version": "4",
  "status": "firing|resolved",
  "receiver": "webhook",
  "groupLabels": {...},
  "commonLabels": {...},
  "commonAnnotations": {...},
  "alerts": [...]
}
```

**Response**:
```json
{
  "status": "accepted",
  "contextId": "ctx-12345",
  "priority": "critical",
  "processingStage": "stage1"
}
```

### Context Object Schema

Passed through all stages:

```json
{
  "_context": {
    "contextId": "unique_id",
    "priority": "critical|high|medium|low",
    "initialParams": {
      "startTime": 1702461600,
      "endTime": 1702462500,
      "namespaces": ["em-prod"],
      "pods": ["pod-name"],
      "services": ["service-name"]
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

## Development

### Adding Custom Stages

1. Create new node in Prometheus workflow
2. Define input schema (must include `_context`)
3. Implement stage logic
4. Update `_debug.stageSequence`
5. Pass `_context` to next stage

### Extending Knowledge Base

1. Define new pattern schema
2. Implement pattern matching logic
3. Add to Stage 6 learning process
4. Update KB query logic in Stage 3

### Custom Remediation Actions

1. Define action in remediation library
2. Set risk level and confidence threshold
3. Implement execution logic
4. Add rollback procedure
5. Update safety gate validation

## Best Practices

### Alert Design
- Use descriptive alert names (e.g., `KubePodNotReady`)
- Include severity labels (`critical`, `warning`, `info`)
- Provide runbook URLs in annotations
- Include relevant context (namespace, pod, service)

### Workflow Maintenance
- Regular workflow backups
- Version control for workflow JSON
- Test changes in non-production environment
- Monitor workflow execution metrics

### SLO Management
- Review SLO targets quarterly
- Adjust error budgets based on business needs
- Track burn rate trends
- Correlate SLO violations with incidents

### Knowledge Base Hygiene
- Regular pattern review and consolidation
- Remove outdated or low-success patterns
- Validate diagnostic commands periodically
- Update runbooks with new learnings

## Contributing

Contributions welcome! Areas for improvement:

- Additional remediation actions
- New alert source integrations
- Enhanced ML-based pattern recognition
- Multi-cluster federation
- Custom dashboards and visualizations

## Documentation

- [Project Overview](claudedocs/PROJECT_OVERVIEW.md) - Comprehensive project documentation
- [Architecture](claudedocs/ARCHITECTURE.md) - Detailed system architecture
- [API Reference](claudedocs/API_REFERENCE.md) - Complete API documentation
- [Stage Guides](claudedocs/stages/) - Individual stage documentation

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review n8n execution logs
3. Verify configuration and credentials
4. Test individual workflow nodes

## License

Internal use only - Etiya Corporation

## Acknowledgments

- n8n workflow automation platform
- Prometheus monitoring ecosystem
- Kubernetes community
- OpenAI for LiteLLM integration
