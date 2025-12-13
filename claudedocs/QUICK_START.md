# Quick Start Guide - OKR_AI

Get OKR_AI running in your environment in under 30 minutes.

## Prerequisites Checklist

- [ ] n8n platform installed (v1.0+)
- [ ] Access to Kubernetes cluster with kubectl configured
- [ ] Prometheus installed and accessible
- [ ] Grafana instance running
- [ ] LiteLLM API endpoint and key
- [ ] Alertmanager configured

## Step 1: Import Workflows (5 minutes)

### Via n8n UI

1. Open n8n web interface
2. Navigate to **Workflows**
3. Click **Import from File**
4. Import `Alert Listener n8n flow.json`
5. Import `Prometheus n8n flow.json`

### Via n8n CLI

```bash
cd /path/to/OKR_AI

# Import Alert Listener
n8n import:workflow --input="Alert Listener n8n flow.json"

# Import Prometheus Analysis
n8n import:workflow --input="Prometheus n8n flow.json"
```

## Step 2: Configure Credentials (10 minutes)

### LiteLLM API

1. In n8n, go to **Settings** → **Credentials**
2. Add new **HTTP Request** credential
3. Configure:
   - Name: `LiteLLM API`
   - Authentication: `Generic Credential Type`
   - Base URL: `https://etiya-buddy-littellm-genia-int.etiya.com/v1`
   - Auth Type: `Header Auth`
   - Header Name: `Authorization`
   - Header Value: `Bearer [YOUR_API_KEY]`

### Prometheus

1. Add new **HTTP Request** credential
2. Configure:
   - Name: `Prometheus`
   - Base URL: `https://prometheus.saas.etycloudbss.com`
   - Auth Type: `None` (or configure if auth enabled)

### Grafana

1. Add new **Grafana API** credential
2. Configure:
   - Name: `Grafana Production`
   - URL: `https://grafana.saas.etycloudbss.com`
   - API Key: `[YOUR_GRAFANA_API_KEY]`

**To generate Grafana API key**:
```bash
# In Grafana UI:
# Settings → API Keys → New API Key
# Name: n8n-integration
# Role: Viewer
```

### Kubernetes Access

1. Ensure kubectl is configured with cluster access:

```bash
# Test kubectl access
kubectl get pods --all-namespaces

# Verify service account (if using SA)
kubectl get serviceaccount n8n-automation -n n8n

# Check RBAC permissions
kubectl auth can-i get pods --all-namespaces
kubectl auth can-i delete pods --all-namespaces
```

2. For n8n, create ClusterRole and ServiceAccount:

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: n8n-automation
  namespace: n8n
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: n8n-remediation
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log", "events"]
    verbs: ["get", "list", "delete"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "patch", "update"]
  - apiGroups: [""]
    resources: ["services", "configmaps"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: n8n-remediation-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: n8n-remediation
subjects:
  - kind: ServiceAccount
    name: n8n-automation
    namespace: n8n
EOF
```

## Step 3: Configure Alertmanager (10 minutes)

### Add Webhook Receiver

Edit Alertmanager configuration:

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'n8n-webhook'
  routes:
    - match:
        severity: critical
      receiver: 'n8n-webhook'
      continue: true

receivers:
  - name: 'n8n-webhook'
    webhook_configs:
      - url: 'http://[N8N_HOST]:5678/webhook/prometheus-alerts'
        send_resolved: true
        http_config:
          follow_redirects: true
```

### Apply Configuration

```bash
# If using ConfigMap
kubectl -n monitoring edit configmap alertmanager-config

# Reload Alertmanager
kubectl -n monitoring delete pod -l app=alertmanager
```

### Test Webhook

```bash
# Send test alert
curl -X POST http://[N8N_HOST]:5678/webhook/prometheus-alerts \
  -H "Content-Type: application/json" \
  -d @alert_example.json

# Expected response:
# {"status":"accepted","contextId":"ctx-xxxxx"}
```

## Step 4: Configure Workflow Nodes (5 minutes)

### Alert Listener Workflow

1. Open "Alert Listener" workflow
2. Update **Webhook** node:
   - Path: `/prometheus-alerts` (or custom)
   - HTTP Method: `POST`
   - Response Mode: `On Received`

3. Update **AI Alert Analyzer** node:
   - Select LiteLLM credential
   - Verify prompt template

4. **Save** workflow

### Prometheus Analysis Workflow

1. Open "Prometheus Analysis" workflow
2. For each Prometheus query node:
   - Select Prometheus credential
   - Verify query syntax
   - Test execution

3. For each kubectl node:
   - Verify cluster context
   - Test with safe command (`kubectl get pods`)

4. **Save** workflow

## Step 5: Test End-to-End (5 minutes)

### Test Alert Processing

1. **Trigger Test Alert**:

```bash
# Create temporary failing pod for test
kubectl run test-crash --image=busybox --restart=Never -- sh -c "exit 1"

# Wait for alert to fire (~1-2 minutes)
# Check Prometheus alerts
curl -s "http://prometheus.saas.etycloudbss.com/api/v1/query?query=ALERTS{alertstate=\"firing\"}" | jq .
```

2. **Monitor n8n Execution**:

```bash
# Via n8n UI: Go to Executions tab
# Watch for Alert Listener execution
# Then Prometheus Analysis workflow execution

# Via CLI:
n8n executions:list --workflow="Alert Listener"
n8n executions:list --workflow="Prometheus Analysis"
```

3. **Verify Stage Execution**:

Check execution output for each stage:
- Stage 1: Initial triage completed
- Stage 2: Deep analysis with pod data
- Stage 3: SLO impact assessed
- Stage 4: Root cause identified
- Stage 5: Remediation executed (if approved)
- Stage 6: Learning completed

4. **Cleanup Test**:

```bash
kubectl delete pod test-crash
```

### Validate Configuration

```bash
# Check all prerequisites
cat > validate.sh <<'EOF'
#!/bin/bash

echo "=== OKR_AI Validation ==="

# Check n8n
echo -n "n8n API: "
curl -s http://localhost:5678/healthz && echo "OK" || echo "FAIL"

# Check Prometheus
echo -n "Prometheus: "
curl -s https://prometheus.saas.etycloudbss.com/api/v1/status/config >/dev/null && echo "OK" || echo "FAIL"

# Check Grafana
echo -n "Grafana: "
curl -s https://grafana.saas.etycloudbss.com/api/health && echo "OK" || echo "FAIL"

# Check LiteLLM
echo -n "LiteLLM: "
curl -s https://etiya-buddy-littellm-genia-int.etiya.com/v1/models >/dev/null && echo "OK" || echo "FAIL"

# Check kubectl
echo -n "Kubernetes: "
kubectl cluster-info >/dev/null 2>&1 && echo "OK" || echo "FAIL"

echo "=== Validation Complete ==="
EOF

chmod +x validate.sh
./validate.sh
```

## Common Issues & Solutions

### Issue: Webhook Not Receiving Alerts

**Check**:
```bash
# Verify n8n webhook is listening
curl http://[N8N_HOST]:5678/webhook/prometheus-alerts

# Check Alertmanager logs
kubectl -n monitoring logs -l app=alertmanager --tail=50

# Verify network connectivity
kubectl -n monitoring exec -it [alertmanager-pod] -- wget -O- http://[N8N_HOST]:5678/webhook/prometheus-alerts
```

**Solution**:
- Ensure webhook URL is accessible from Alertmanager pod
- Check firewall rules
- Verify n8n workflow is activated

### Issue: AI Analysis Failing

**Check**:
```bash
# Test LiteLLM API
curl https://etiya-buddy-littellm-genia-int.etiya.com/v1/models \
  -H "Authorization: Bearer [YOUR_API_KEY]"
```

**Solution**:
- Verify API key validity
- Check rate limits
- Review prompt format in AI nodes

### Issue: Prometheus Queries Failing

**Check**:
```bash
# Test Prometheus query
curl "https://prometheus.saas.etycloudbss.com/api/v1/query?query=up"

# Check time range format
# Ensure timestamps are valid Unix epoch
```

**Solution**:
- Verify Prometheus credential in n8n
- Check query syntax
- Validate time parameters (startTime, endTime)

### Issue: Kubectl Commands Failing

**Check**:
```bash
# Test kubectl access
kubectl get pods -n em-prod

# Check service account permissions
kubectl auth can-i delete pods --as=system:serviceaccount:n8n:n8n-automation
```

**Solution**:
- Verify kubeconfig is accessible to n8n
- Check RBAC permissions
- Ensure cluster context is correct

## Next Steps

Now that OKR_AI is running:

1. **Monitor Initial Runs**
   - Watch first few alert processing cycles
   - Review stage outputs for accuracy
   - Validate remediation decisions

2. **Tune Thresholds**
   - Adjust confidence thresholds for auto-remediation
   - Customize SLO targets
   - Refine priority classification

3. **Customize Workflows**
   - Add custom remediation actions
   - Integrate notification channels (Slack, Teams)
   - Create custom dashboards

4. **Enable Learning**
   - Review knowledge base entries
   - Validate pattern recognition
   - Refine diagnostic commands

5. **Scale to Production**
   - Add more alert sources
   - Expand to additional namespaces
   - Implement multi-cluster support

## Quick Reference Commands

```bash
# Start n8n
n8n start

# List workflows
n8n workflow:list

# View executions
n8n executions:list --limit=10

# Test webhook
curl -X POST http://localhost:5678/webhook/prometheus-alerts \
  -H "Content-Type: application/json" \
  -d '{"status":"firing","alerts":[...]}'

# Check Prometheus alerts
curl "https://prometheus.saas.etycloudbss.com/api/v1/query?query=ALERTS{alertstate=\"firing\"}"

# Test kubectl
kubectl get pods --all-namespaces

# View Grafana dashboards
open https://grafana.saas.etycloudbss.com
```

## Health Checks

Create a monitoring script:

```bash
cat > healthcheck.sh <<'EOF'
#!/bin/bash

# Check n8n workflows
n8n workflow:list | grep -E "Alert Listener|Prometheus Analysis"

# Check recent executions
echo "Recent executions:"
n8n executions:list --limit=5

# Check Prometheus connectivity
curl -s "https://prometheus.saas.etycloudbss.com/-/healthy"

# Check active alerts
curl -s "https://prometheus.saas.etycloudbss.com/api/v1/query?query=ALERTS{alertstate=\"firing\"}" \
  | jq '.data.result | length' \
  | xargs -I {} echo "Active alerts: {}"
EOF

chmod +x healthcheck.sh
./healthcheck.sh
```

## Documentation Links

- [README](../README.md) - Main documentation
- [Architecture](ARCHITECTURE.md) - System architecture
- [Project Overview](PROJECT_OVERVIEW.md) - Detailed overview
- [Troubleshooting](#common-issues--solutions) - Common issues

## Support Checklist

Before requesting support:

- [ ] Validated all credentials
- [ ] Tested webhook connectivity
- [ ] Verified Prometheus queries work
- [ ] Checked n8n execution logs
- [ ] Reviewed error messages
- [ ] Tested kubectl commands
- [ ] Confirmed all prerequisites met

## Success Criteria

Your OKR_AI installation is successful when:

- ✅ Alerts trigger Alert Listener workflow
- ✅ AI analysis completes successfully
- ✅ Prometheus queries return data
- ✅ 6-stage pipeline executes end-to-end
- ✅ SLO metrics are calculated correctly
- ✅ Remediation actions execute (if approved)
- ✅ Knowledge base is updated after incidents

**Congratulations! OKR_AI is now operational.**
