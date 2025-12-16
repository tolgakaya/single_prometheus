# Service Discovery Removal - Design Decision

## Decision

**Removed dynamic service discovery from Stage 1**, embracing the hardcoded service list approach explicitly.

## Context

Previous implementation attempted to dynamically discover Kubernetes services using Prometheus queries, but:
1. Queries returned empty results (wrong metric: `up` doesn't have k8s labels)
2. Flow silently fell back to hardcoded `DEFAULT_SERVICES` (47 services)
3. `active_services` field was ignored, `requested_services` (hardcoded) was used
4. Discovery attempt added complexity without providing value

## Changes Made

### 1. Stage 1 Prompt Updated

**File**: [5. Stage 1 Health Snapshot.txt](FreePrometheus/PrometheusNodes/5.%20Stage%201%20Health%20Snapshot.txt)

**Removed**:
- `List Kubernetes Services` tool call from mission
- `active_services` field from JSON output
- `discovered_services` field from JSON output

**Added**:
- Clear note about pre-configured services
- `services_analyzed` - explicit list of services being monitored
- `services_count` - count for quick reference
- `namespaces_analyzed` - explicit list of namespaces

**Before**:
```
Execute ONLY these tools in sequence:
1. `Quick Cluster Health` - Overall cluster status
2. `Active Alerts Count` - Current firing alerts
3. `List Kubernetes Services` - Get active services

Output:
  "active_services": [<discovered services>],
  "requested_services": [<hardcoded services>],
  "discovered_services": "<list top 5 services>"
```

**After**:
```
Execute ONLY these tools in sequence:
1. `Quick Cluster Health` - Overall cluster status
2. `Active Alerts Count` - Current firing alerts

NOTE: You are analyzing 47 pre-configured services across 12 namespaces.

Output:
  "services_analyzed": [<explicit list from config>],
  "services_count": 47,
  "namespaces_analyzed": [<explicit list from config>]
```

### 2. Context Fix Nodes Updated

**Files**:
- [6. Fix Stage 1 Context.js](FreePrometheus/PrometheusNodes/6.%20Fix%20Stage%201%20Context.js)
- [11. Fix Stage 2 Context.js](FreePrometheus/PrometheusNodes/11.%20Fix%20Stage%202%20Context.js)

**Changed**:
```javascript
// OLD: Dual tracking (confusing)
stage1Data: {
  active_services: actualOutput.active_services || [],      // Discovery (always empty)
  requested_services: actualOutput.requested_services || [] // Hardcoded (actually used)
}

// NEW: Single source of truth
stage1Data: {
  services_analyzed: actualOutput.services_analyzed || [],  // Explicit list
  services_count: actualOutput.services_count || 0,         // Count
  namespaces_analyzed: actualOutput.namespaces_analyzed || [] // Namespaces
}
```

## Benefits

### 1. Clarity
- **Before**: "Are we using discovered or hardcoded services?" (ambiguous)
- **After**: "We analyze these 47 specific services" (explicit)

### 2. Reduced Complexity
- Removed failed Prometheus query attempt
- Removed unused `active_services` field propagation
- Removed confusion between discovery vs hardcoded

### 3. Performance
- Stage 1 completes faster (2 tools instead of 3)
- No failed HTTP requests to Prometheus
- Cleaner logs without empty discovery results

### 4. Maintainability
- Single source of truth: `DEFAULT_SERVICES` constant
- Clear intention: "Monitor these specific critical services"
- Easy to update: Change constant, not query logic

## Design Rationale

### Why Hardcoded List?

**Chosen because**:
1. **Critical Services Known**: The 47 services are well-defined critical services
2. **Stable List**: Service list doesn't change frequently
3. **Focused Analysis**: Better to deeply analyze known services than shallow analysis of all
4. **Predictable Behavior**: Flow behavior is deterministic, not dependent on discovery success

**NOT because**:
- We couldn't fix the Prometheus query (we could use `kube_service_info`)
- Discovery is impossible (it's definitely possible)

### When to Reconsider

Consider adding discovery back if:
1. **Service list becomes dynamic**: Frequent service additions/removals
2. **Multi-tenant environment**: Different service sets per request
3. **Automated service onboarding**: New services auto-discovered
4. **Coverage goal changes**: "Monitor ALL services" instead of "Monitor CRITICAL services"

## Implementation Details

### Service List Source

**Location**: [1. Orchestrator Input Handler.js:21-33](FreePrometheus/PrometheusNodes/1.%20Orchestrator%20Input%20Handler.js#L21-L33)

```javascript
const DEFAULT_SERVICES = [
  'bss-mc-crm-search-integrator', 'bss-mc-crm-customer-information', 'bss-mc-crm-customer-search',
  'bss-mc-crm-mash-up', 'bss-mc-crm-ntf-integrator', 'bss-mc-activity', 'bss-mc-asset-management',
  'bss-mc-cpq', 'bss-mc-cpq-batch', 'bss-mc-cpq-ntf-integrator', 'bss-mc-csr', 'bss-mc-domain-config',
  'bss-mc-esmgmtserviceint', 'bss-mc-masterdata', 'bss-mc-mpp', 'bss-mc-network-resource-pool',
  'bss-mc-party', 'bss-mc-party-interaction', 'bss-mc-profile-manager', 'bss-mc-resource-inventory',
  'bss-mc-service-catalog', 'bss-mc-service-inventory', 'bss-mc-service-orchestration',
  'bss-mc-service-quality', 'bss-mc-siebel-integrator', 'bss-mc-support-utilities', 'ocs-service',
  'eom-micro-flows', 'eom-operate', 'eom-scheduler', 'eom-ui', 'eom-activemqqueueoperations',
  'eom-postgresqldboperations', 'eom-zeebe', 'eom-castlemock', 'bss-services-service',
  'external-services-service', 'loyalty-services-service', 'om-services-service', 'fstp-bpmn-ms',
  'fstp-configuration-ms', 'fstp-dashboard-ms', 'fstp-frontend', 'fstp-orchestra-ms', 'fstp-scheduler-ms',
  'flowe-micro-flow', 'flowe-operate', 'flowe-scheduler'
];
```

### Service Propagation Flow

```
1. Orchestrator Input Handler
   └─> Extract services from user message OR use DEFAULT_SERVICES

2. Unified Entry Point
   └─> Place services in analysisParams.services

3. Prepare Stage 1 Input
   └─> Generate queryHelpers with serviceRegex

4. Stage 1 AI Agent
   └─> Return services_analyzed (copy of analysisParams.services)

5. Fix Stage 1 Context
   └─> Store in stage1Data.services_analyzed

6. All subsequent stages
   └─> Use stage1Data.services_analyzed
```

### Query Helpers Still Available

Services are still used in Prometheus queries via `serviceRegex`:

```javascript
// In Prepare Stage 1 Input (Node 4)
const services = unifiedOutput._context?.initialParams?.services || [];
const serviceRegex = services.length > 0 ? services.join('|') : '.*';

queryHelpers = {
  serviceFilter: services.length > 0 ? `service=~"${serviceRegex}"` : 'service!=""',
  combinedFilter: services.length > 0
    ? `namespace=~"${namespaceRegex}",service=~"${serviceRegex}"`
    : `namespace=~"${namespaceRegex}",service!=""`
};
```

**Note**: These filters still won't work with `up` metric (doesn't have service label), but they're ready for metrics that DO have service labels (e.g., application metrics).

## Migration Path

### For Existing Data

Old Stage 1 outputs with `active_services`/`requested_services` will still work due to fallback logic:

```javascript
// In Fix Stage 2 Context
services_analyzed: stage1Data.services_analyzed ||
                  stage1Data.requested_services ||  // OLD format
                  [],
```

### Updating Service List

To add/remove services:

1. Edit `DEFAULT_SERVICES` in [1. Orchestrator Input Handler.js:21](FreePrometheus/PrometheusNodes/1.%20Orchestrator%20Input%20Handler.js#L21)
2. Edit `DEFAULT_SERVICES` in [2. Unified Entry Point.js:20](FreePrometheus/PrometheusNodes/2.%20Unified%20Entry%20Point.js#L20)
3. No other changes needed - flow automatically uses updated list

## Testing Checklist

- [ ] Test with default 47 services
- [ ] Verify Stage 1 output has `services_analyzed` field
- [ ] Verify Stage 1 output has `services_count: 47`
- [ ] Verify Stage 1 output has `namespaces_analyzed` with 12 namespaces
- [ ] Confirm Stage 1 does NOT call `List Kubernetes Services` tool
- [ ] Verify Stage 2+ receive `services_analyzed` from context
- [ ] Confirm no `active_services` or `requested_services` fields exist
- [ ] Test with user message containing specific service names (override DEFAULT_SERVICES)
- [ ] Verify service list propagates through all 6 stages

## Related Documentation

- [SERVICE_DISCOVERY_VS_HARDCODED_ANALYSIS.md](SERVICE_DISCOVERY_VS_HARDCODED_ANALYSIS.md) - Analysis leading to this decision
- [FREE_PROMETHEUS_NAMESPACE_FIX.md](FREE_PROMETHEUS_NAMESPACE_FIX.md) - Namespace filtering implementation
- [PROMETHEUS_QUERY_DEBUG.md](PROMETHEUS_QUERY_DEBUG.md) - Prometheus metric label hierarchy

## Summary

**Before**: Flow tried to discover services but failed, silently used hardcoded list
**After**: Flow explicitly uses hardcoded list, no discovery attempt

**Impact**: Clearer intention, faster execution, easier maintenance
**Trade-off**: Must manually update service list when services change
