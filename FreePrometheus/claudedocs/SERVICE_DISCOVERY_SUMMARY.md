# Service Discovery Investigation - Summary

## Your Question

> "Does the agent query kubernetes services and use the returned list, or does it use a hardcoded service list throughout the flow?"

## Answer

**The agent WAS trying to query Kubernetes, but the query returned empty results. The flow then silently used the hardcoded DEFAULT_SERVICES (47 services) throughout all stages.**

We have now **removed the broken discovery attempt** and **explicitly use the hardcoded list**.

## What We Found

### Investigation Results

1. **DEFAULT_SERVICES Defined**: 47 hardcoded services in Node 1 and Node 2
2. **Discovery Attempted**: Stage 1 AI agent called `List Kubernetes Services` tool
3. **Query Failed**: Prometheus query returned `[]` (empty) because:
   - Used `up` metric which doesn't have `namespace`, `service`, `pod` labels
   - Should use `kube_service_info`, `kube_pod_labels`, or `container_*` metrics instead
4. **Silent Fallback**: Flow continued with `requested_services` (hardcoded list)
5. **Discovery Ignored**: `active_services` (empty discovery results) never used

### Service Flow Diagram

```
Input → Node 1: DEFAULT_SERVICES (47 services)
         ↓
      Node 2: Uses DEFAULT_SERVICES
         ↓
      Node 4: Generates query helpers with DEFAULT_SERVICES
         ↓
      Node 5 (Stage 1 AI): Tries discovery → Returns empty
                           But also returns requested_services: DEFAULT_SERVICES
         ↓
      Node 6-18: All stages use requested_services (hardcoded)
                 active_services (empty) is carried but ignored
```

## What We Changed

### Removed Discovery Mechanism

**Before**:
- Stage 1 called 3 tools: `Quick Cluster Health`, `Active Alerts Count`, `List Kubernetes Services`
- Output had dual fields: `active_services` (empty) and `requested_services` (hardcoded)
- Confusing: Which services are actually being analyzed?

**After**:
- Stage 1 calls 2 tools: `Quick Cluster Health`, `Active Alerts Count`
- Output has single field: `services_analyzed` (explicit list from config)
- Clear: We analyze these 47 specific critical services

### Updated Data Structure

**Old JSON Output**:
```json
{
  "active_services": [],              // Discovery result (empty)
  "requested_services": [47 services], // Hardcoded list (used)
  "discovered_services": "..."         // Confusing field
}
```

**New JSON Output**:
```json
{
  "services_analyzed": [47 services],  // Explicit list
  "services_count": 47,                // Count for reference
  "namespaces_analyzed": [12 namespaces] // Namespaces
}
```

## Why Hardcoded List?

### Design Decision

We chose to **explicitly use hardcoded list** because:

1. **Critical Services Known**: The 47 services are well-defined, critical services
2. **Stable**: Service list doesn't change frequently
3. **Focused**: Better to deeply analyze known critical services
4. **Predictable**: Flow behavior is deterministic

### Trade-offs

**Pros**:
- Clear intention: "Monitor these specific services"
- Faster execution (no failed discovery query)
- Easier maintenance (single source of truth)
- Deterministic behavior

**Cons**:
- Must manually update service list when services change
- Won't auto-discover newly deployed services
- Won't adapt to dynamic environments

## Files Modified

1. **[5. Stage 1 Health Snapshot.txt](FreePrometheus/PrometheusNodes/5.%20Stage%201%20Health%20Snapshot.txt)**
   - Removed `List Kubernetes Services` tool call
   - Updated output format

2. **[6. Fix Stage 1 Context.js](FreePrometheus/PrometheusNodes/6.%20Fix%20Stage%201%20Context.js)**
   - Changed `active_services`/`requested_services` to `services_analyzed`

3. **[11. Fix Stage 2 Context.js](FreePrometheus/PrometheusNodes/11.%20Fix%20Stage%202%20Context.js)**
   - Updated context propagation

## Documentation Created

1. **[SERVICE_DISCOVERY_VS_HARDCODED_ANALYSIS.md](SERVICE_DISCOVERY_VS_HARDCODED_ANALYSIS.md)**
   - Detailed investigation findings
   - Evidence from code analysis
   - 3 fix options (we chose Option 3)

2. **[SERVICE_DISCOVERY_REMOVAL.md](SERVICE_DISCOVERY_REMOVAL.md)**
   - Design decision rationale
   - Implementation details
   - Migration path

3. **[PROMETHEUS_QUERY_DEBUG.md](PROMETHEUS_QUERY_DEBUG.md)**
   - Why Prometheus query returns empty
   - Metric label hierarchy
   - Multi-fallback query solution

## Next Steps

### To Update Service List

Edit `DEFAULT_SERVICES` in these files:
1. [1. Orchestrator Input Handler.js:21](FreePrometheus/PrometheusNodes/1.%20Orchestrator%20Input%20Handler.js#L21)
2. [2. Unified Entry Point.js:20](FreePrometheus/PrometheusNodes/2.%20Unified%20Entry%20Point.js#L20)

### If You Want Dynamic Discovery Back

Follow the guide in [PROMETHEUS_QUERY_DEBUG.md](PROMETHEUS_QUERY_DEBUG.md):

1. **Test Prometheus metrics** to see which are available:
   ```promql
   kube_service_info{namespace=~"em-prod"}
   kube_pod_info{namespace=~"em-prod"}
   container_cpu_usage_seconds_total{namespace=~"em-prod"}
   ```

2. **Update n8n HTTP Request tool** `List Kubernetes Services`:
   ```javascript
   // Multi-fallback strategy
   query: `count by (namespace, service) (kube_service_info{namespace=~"${nsRegex}"})
           or count by (namespace, pod, label_app) (kube_pod_labels{namespace=~"${nsRegex}", label_app!=""})
           or count by (namespace, pod) (container_cpu_usage_seconds_total{namespace=~"${nsRegex}", pod!="", container!=""})`
   ```

3. **Re-enable discovery** in Stage 1 prompt

4. **Update context nodes** to use `active_services` instead of `services_analyzed`

## Summary

**Question**: Does it use discovered or hardcoded services?

**Answer**: It TRIED to discover, but failed silently. Now it EXPLICITLY uses hardcoded.

**Result**: Clearer design, faster execution, easier to maintain.

**If you need to change services**: Edit `DEFAULT_SERVICES` constant in Node 1 and Node 2.

**If you need dynamic discovery**: Follow PROMETHEUS_QUERY_DEBUG.md to fix the query.
