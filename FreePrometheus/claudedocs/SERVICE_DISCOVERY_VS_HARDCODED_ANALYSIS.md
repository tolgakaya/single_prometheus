# Service Discovery vs Hardcoded List Analysis

## 🎯 Critical Finding: Flow Uses HARDCODED Service List, NOT Dynamic Discovery

## Summary

**Answer to your question**: The flow **DOES NOT use dynamically discovered services**. It uses a **HARDCODED service list** (`DEFAULT_SERVICES`) throughout the entire flow.

The Prometheus query for service discovery (`List Kubernetes Services` tool) **returns empty results**, but this **does NOT stop the flow** because:
1. The flow falls back to `DEFAULT_SERVICES` (47 hardcoded services)
2. The `active_services` field (dynamic discovery) is **IGNORED** in subsequent stages
3. Only `requested_services` (hardcoded list) is used for analysis

## Service Flow Lifecycle

```
Node 1 (Orchestrator) → DEFAULT_SERVICES (47 services)
         ↓
Node 2 (Unified Entry) → Uses DEFAULT_SERVICES
         ↓
Node 4 (Prepare Stage 1) → Passes DEFAULT_SERVICES to queryHelpers
         ↓
Node 5 (Stage 1 AI Agent) → Queries Kubernetes (returns EMPTY)
         ↓                      BUT also returns requested_services: DEFAULT_SERVICES
         ↓
Node 6-18 (All stages) → Use requested_services (hardcoded), NOT active_services (empty)
```

## Evidence

### 1. Initial Service Source: Hardcoded List

**Location**: [1. Orchestrator Input Handler.js:21-33](FreePrometheus/PrometheusNodes/1.%20Orchestrator%20Input%20Handler.js#L21-L33)

```javascript
const DEFAULT_SERVICES = [
  'bss-mc-crm-search-integrator', 'bss-mc-crm-customer-information', 'bss-mc-crm-customer-search',
  'bss-mc-crm-mash-up', 'bss-mc-crm-ntf-integrator', 'bss-mc-activity', 'bss-mc-asset-management',
  // ... total 47 services
];

// Logic at line 226-233:
if (extractedServices.length > 0) {
  processedInput.searchParams.services = extractedServices; // From user message
} else {
  processedInput.searchParams.services = DEFAULT_SERVICES; // ⚠️ FALLBACK TO HARDCODED
  console.log(`No services in message, using DEFAULT_SERVICES: ${DEFAULT_SERVICES.length} services`);
}
```

**Result**: If user message doesn't mention specific services, **all 47 DEFAULT_SERVICES** are used.

### 2. Stage 1 Tries Discovery (But Fails)

**Location**: [5. Stage 1 Health Snapshot.txt:103-104](FreePrometheus/PrometheusNodes/5.%20Stage%201%20Health%20Snapshot.txt#L103-L104)

```json
{
  "active_services": [<if List Kubernetes Services called, list discovered services, else empty array>],
  "requested_services": {{ JSON.stringify($json.analysisParams?.services || $json.initialParams?.services || []) }}
}
```

**AI Agent should**:
1. Call `List Kubernetes Services` tool → Discover active services
2. Return them in `active_services` field

**What actually happens** (from test data):
```json
{
  "active_services": [],              // ❌ Empty - Prometheus query failed
  "requested_services": [              // ✅ 47 DEFAULT_SERVICES from initial input
    "bss-mc-crm-search-integrator",
    "bss-mc-crm-customer-information",
    // ... 47 services total
  ]
}
```

### 3. Subsequent Stages Use `requested_services` Only

**Location**: [11. Fix Stage 2 Context.js:190-191](FreePrometheus/PrometheusNodes/11.%20Fix%20Stage%202%20Context.js#L190-L191)

```javascript
stage1Data: {
  overall_status: previousData.stage1Data.overall_status,
  alerts: previousData.stage1Data.alerts,
  scores: previousData.stage1Data.scores,
  quick_findings: previousData.stage1Data.quick_findings || [],
  active_services: previousData.stage1Data.active_services || [],      // ⚠️ Passed but NOT used
  requested_services: previousData.stage1Data.requested_services || [], // ✅ Actually used
  proceed_to_stage2: previousData.stage1Data.proceed_to_stage2
}
```

**All context-carrying nodes** (Fix Stage 2 Context, Fix Stage 3 Context, etc.) copy both fields, but:
- `active_services`: Carried along but **never referenced** in analysis
- `requested_services`: **Used in all subsequent Prometheus queries**

### 4. Query Helpers Use Hardcoded Services

**Location**: [4. Prepare Stage 1 Input.js:8-30](FreePrometheus/PrometheusNodes/4.%20Prepare%20Stage%201%20Input.js#L8-L30)

```javascript
const namespaces = unifiedOutput._context?.initialParams?.namespaces || [];
const services = unifiedOutput._context?.initialParams?.services || []; // ⚠️ DEFAULT_SERVICES

const namespaceRegex = namespaces.join('|');
const serviceRegex = services.length > 0 ? services.join('|') : '.*';

const queryHelpers = {
  namespaceFilter: `namespace=~"${namespaceRegex}"`,
  serviceFilter: services.length > 0 ? `service=~"${serviceRegex}"` : 'service!=""',
  combinedFilter: services.length > 0
    ? `namespace=~"${namespaceRegex}",service=~"${serviceRegex}"`
    : `namespace=~"${namespaceRegex}",service!=""`,

  exampleQueries: {
    podCount: `count by (namespace, service, pod) (up{namespace=~"${namespaceRegex}", service!="", pod!=""})`,
    serviceList: `group by (namespace, service) (up{namespace=~"${namespaceRegex}", service!=""})`,
    alertCount: `ALERTS{namespace=~"${namespaceRegex}"}}`
  }
};
```

**Problem**: `services` comes from `initialParams.services` which is `DEFAULT_SERVICES`, NOT from discovered services.

## Why Discovery Fails

### Root Cause: Wrong Prometheus Metric

**Current Query**: [5. Stage 1 Health Snapshot.txt:44](FreePrometheus/PrometheusNodes/5.%20Stage%201%20Health%20Snapshot.txt#L44)

```promql
count by (namespace, service, pod) (
  up{
    namespace=~"bstp-cms-global-production|bstp-cms-prod-v3|...",
    service!="",
    pod!=""
  }
)
```

**Problem**: The `up` metric **DOES NOT have** `namespace`, `service`, `pod` labels.

**Prometheus Metric Label Hierarchy**:
```
up metric:
├─ job: "kubernetes-pods"           ✅ Has
├─ instance: "10.0.1.23:8080"       ✅ Has
├─ namespace: ???                   ❌ Does NOT have
├─ service: ???                     ❌ Does NOT have
└─ pod: ???                         ❌ Does NOT have

kube_service_info (kube-state-metrics):
├─ namespace: "em-prod"             ✅ Has
└─ service: "api-service"           ✅ Has

container_cpu_usage_seconds_total (cAdvisor):
├─ namespace: "em-prod"             ✅ Has
├─ pod: "api-pod-123"               ✅ Has
└─ container: "api-container"       ✅ Has
```

**Result**: Query evaluates correctly but returns `[]` (empty vector) because `up` metric doesn't have the requested labels.

## Impact Analysis

### What This Means

1. **Service Discovery is Broken**:
   - AI agent calls `List Kubernetes Services` tool
   - Tool query returns empty results
   - `active_services` remains `[]`

2. **Flow Continues Normally**:
   - Because `requested_services` contains DEFAULT_SERVICES
   - All subsequent analysis uses hardcoded service list
   - Flow doesn't realize discovery failed

3. **No Dynamic Adaptation**:
   - If a new service is deployed → Flow doesn't detect it
   - If a service is removed → Flow still monitors it
   - Service list is **frozen in code**, not **live from cluster**

### Actual vs Expected Behavior

**Expected Flow**:
```
Stage 1 → Query Kubernetes → Get live service list → Use discovered services in analysis
```

**Actual Flow**:
```
Stage 1 → Query Kubernetes (fails) → Ignore failure → Use DEFAULT_SERVICES hardcoded list
```

## Fix Strategy

### Option 1: Fix Prometheus Query (Recommended)

Update the service discovery query to use correct metrics:

**Location**: n8n HTTP Request tool: `List Kubernetes Services`

**Current (Broken)**:
```javascript
const nsRegex = $json.namespaceRegex || '...';
query: `count by (namespace, service, pod) (up{namespace=~"${nsRegex}", service!="", pod!=""})`
```

**Fixed (Multi-Fallback)**:
```javascript
const nsRegex = $json.namespaceRegex || '...';

// Strategy 1: Try kube_service_info (if kube-state-metrics exists)
const query1 = `count by (namespace, service) (kube_service_info{namespace=~"${nsRegex}"})`;

// Strategy 2: Try kube_pod_labels with app label
const query2 = `count by (namespace, pod, label_app) (kube_pod_labels{namespace=~"${nsRegex}", label_app!=""})`;

// Strategy 3: Try container metrics (cAdvisor - always available)
const query3 = `count by (namespace, pod) (container_cpu_usage_seconds_total{namespace=~"${nsRegex}", pod!="", container!=""})`;

// Return combined query with OR operator
query: `${query1} or ${query2} or ${query3}`
```

**Benefits**:
- Discovers actual running services
- Adapts to cluster changes automatically
- No code updates needed when services change

### Option 2: Hybrid Approach

Keep DEFAULT_SERVICES as fallback, but use discovered services when available:

**Location**: [4. Prepare Stage 1 Input.js](FreePrometheus/PrometheusNodes/4.%20Prepare%20Stage%201%20Input.js)

```javascript
// After Stage 1 completes, check if discovery succeeded
const discoveredServices = stage1Output.active_services || [];
const requestedServices = unifiedOutput._context?.initialParams?.services || [];

// Use discovered services if available, otherwise fallback to requested
const services = discoveredServices.length > 0 ? discoveredServices : requestedServices;

const serviceRegex = services.join('|');
```

**Benefits**:
- Graceful degradation if discovery fails
- Still uses live data when available
- Backwards compatible

### Option 3: Remove Discovery, Fully Embrace Hardcoded List

If dynamic discovery is not needed:

1. Remove `List Kubernetes Services` tool call from Stage 1 prompt
2. Remove `active_services` field from JSON output
3. Only use `requested_services` (make it explicit)

**Benefits**:
- Clear intention: "We analyze these specific services"
- No confusion about discovery vs hardcoded
- Faster (no failed Prometheus queries)

**Drawbacks**:
- Requires code updates when services change
- May analyze non-existent services
- May miss new critical services

## Recommendations

### Immediate Actions

1. **Test Prometheus Metrics Availability**:
   ```promql
   # In Prometheus UI, test:
   kube_service_info{namespace=~"em-prod"}
   kube_pod_info{namespace=~"em-prod"}
   container_cpu_usage_seconds_total{namespace=~"em-prod"}
   ```

2. **Update Service Discovery Query**:
   - If `kube_service_info` exists → Use Option 1 (recommended)
   - If NOT available → Use Option 3 (remove discovery, embrace hardcoded)

3. **Clarify Design Intent**:
   - **If goal is "monitor ALL cluster services"** → Fix discovery (Option 1)
   - **If goal is "monitor specific critical services"** → Keep hardcoded (Option 3)

### Long-term Improvements

1. **Add Discovery Validation**:
   ```javascript
   if (active_services.length === 0) {
     console.warn("⚠️ Service discovery failed, using hardcoded list");
   } else {
     console.log(`✅ Discovered ${active_services.length} services dynamically`);
   }
   ```

2. **Expose Discovery Status in Reports**:
   ```json
   {
     "discovery_status": "failed",
     "discovery_method": "hardcoded_fallback",
     "services_analyzed": 47,
     "services_source": "DEFAULT_SERVICES constant"
   }
   ```

3. **Monitor Discovery Success Rate**:
   - Track how often `active_services` is empty
   - Alert if discovery fails consistently
   - Consider this a data quality issue

## Conclusion

**To answer your question directly**:

> "Does the agent query kubernetes services and use the returned list, or does it use a hardcoded service list throughout the flow?"

**Answer**: The agent **queries Kubernetes** (calls the tool), but the query **returns empty results** due to incorrect metric usage. The flow then **silently falls back to the hardcoded DEFAULT_SERVICES list** (47 services) for all subsequent analysis. The discovery attempt is made, but its results are ignored because they're empty.

**The fix**: Update the Prometheus query to use `kube_service_info`, `kube_pod_labels`, or `container_cpu_usage_seconds_total` instead of the `up` metric, which doesn't have the necessary Kubernetes labels.
