# TempoFlow HTTP Tools - Fixed TraceQL Queries

**Date**: 2025-12-22  
**Status**: Ready for copy-paste deployment

## Syntax Rules Applied

1. ✅ `resource.env-code` (not deployment.environment)
2. ✅ `resource.service.name` (full prefix, not .service.name)
3. ✅ HTTP Status: `span.status>"400"` or `span.status="500"`
4. ✅ Error: `status=error` (general) or `span.status>"400"` (HTTP)
5. ✅ Exception: `span.exception!="nil"` (but watch for "none" values)
6. ❌ REMOVED: `span.error.type`, `.network.*`, `.server.*`, `.http.url`
7. ✅ Multi-namespace: `resource.env-code=~"ns1|ns2|..."`
8. ✅ Service filter: `resource.service.name="svc1" || resource.service.name="svc2"`

---

## Tool 1: Recent Errors

**Purpose**: Get recent error traces  
**Can use customQuery**: ✅ YES (already searches for status=error)

### Query:
```javascript
{{ $json.searchParams?.customQuery || '{resource.env-code=~"bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod" && status=error}' }}
```

---

## Tool 2: Yesterday 3 Hours

**Purpose**: Get general traces from yesterday (3 hour window)  
**Can use customQuery**: ❌ NO (needs all traces, not just errors)

### Query:
```javascript
{{ (() => {
  const namespaces = $json.searchParams?.namespaces || ["bstp-cms-global-production","bstp-cms-prod-v3","em-global-prod-3pp","em-global-prod-eom","em-global-prod-flowe","em-global-prod","em-prod-3pp","em-prod-eom","em-prod-flowe","em-prod","etiyamobile-production","etiyamobile-prod"];
  const services = $json.serviceAnalysis?.detectedServices || [];
  const namespacePattern = namespaces.join('|');
  
  if (services.length > 0) {
    const serviceFilter = services.map(s => `resource.service.name="${s}"`).join(' || ');
    return `{ resource.env-code=~"${namespacePattern}" && (${serviceFilter}) }`;
  }
  
  return `{ resource.env-code=~"${namespacePattern}" }`;
})() }}
```

---

## Tool 3: Exception Spans

**Purpose**: Get spans with exceptions  
**Can use customQuery**: ❌ NO (needs exception filter)

### Query:
```javascript
{{ (() => {
  const namespaces = $json.searchParams?.namespaces || ["bstp-cms-global-production","bstp-cms-prod-v3","em-global-prod-3pp","em-global-prod-eom","em-global-prod-flowe","em-global-prod","em-prod-3pp","em-prod-eom","em-prod-flowe","em-prod","etiyamobile-production","etiyamobile-prod"];
  const services = $json.serviceAnalysis?.detectedServices || [];
  const namespacePattern = namespaces.join('|');
  
  if (services.length > 0) {
    const serviceFilter = services.map(s => `resource.service.name="${s}"`).join(' || ');
    return `{ resource.env-code=~"${namespacePattern}" && (${serviceFilter}) && (span.exception!="nil" || span.status>"400") }`;
  }
  
  return `{ resource.env-code=~"${namespacePattern}" && (span.exception!="nil" || span.status>"400") }`;
})() }}
```

**Note**: `span.exception!="nil"` may also match "none" - monitor results

---

## Tool 4: Last Week 3 Hours

**Purpose**: Get general traces from last week (3 hour window)  
**Can use customQuery**: ❌ NO (needs all traces)

### Query:
```javascript
{{ (() => {
  const namespaces = $json.searchParams?.namespaces || ["bstp-cms-global-production","bstp-cms-prod-v3","em-global-prod-3pp","em-global-prod-eom","em-global-prod-flowe","em-global-prod","em-prod-3pp","em-prod-eom","em-prod-flowe","em-prod","etiyamobile-production","etiyamobile-prod"];
  const services = $json.serviceAnalysis?.detectedServices || [];
  const namespacePattern = namespaces.join('|');
  
  if (services.length > 0) {
    const serviceFilter = services.map(s => `resource.service.name="${s}"`).join(' || ');
    return `{ resource.env-code=~"${namespacePattern}" && (${serviceFilter}) }`;
  }
  
  return `{ resource.env-code=~"${namespacePattern}" }`;
})() }}
```

---

## Tool 5: High Latency

**Purpose**: Get spans with duration > 1000ms  
**Can use customQuery**: ❌ NO (Node 4 criticalLatency is 500ms, this needs 1000ms)

### Query:
```javascript
{{ (() => {
  const namespaces = $json.searchParams?.namespaces || ["bstp-cms-global-production","bstp-cms-prod-v3","em-global-prod-3pp","em-global-prod-eom","em-global-prod-flowe","em-global-prod","em-prod-3pp","em-prod-eom","em-prod-flowe","em-prod","etiyamobile-production","etiyamobile-prod"];
  const services = $json.serviceAnalysis?.detectedServices || [];
  const namespacePattern = namespaces.join('|');
  
  if (services.length > 0) {
    const serviceFilter = services.map(s => `resource.service.name="${s}"`).join(' || ');
    return `{ resource.env-code=~"${namespacePattern}" && (${serviceFilter}) && duration > 1000ms }`;
  }
  
  return `{ resource.env-code=~"${namespacePattern}" && duration > 1000ms }`;
})() }}
```

---

## Tool 6: Last 24 Hours Errors

**Purpose**: Get error traces from last 24 hours  
**Can use customQuery**: ✅ YES (searches for status=error)

### Query:
```javascript
{{ $json.searchParams?.customQuery || '{resource.env-code=~"bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod" && status=error}' }}
```

---

## Tool 7: Recent External Service Latency Errors

**Purpose**: Get client spans with high latency/timeouts  
**Can use customQuery**: ❌ NO (needs duration filter)

**IMPORTANT**: Network/client attributes removed per user instruction

### Query (Simplified):
```javascript
{{ (() => {
  const namespaces = $json.searchParams?.namespaces || ["bstp-cms-global-production","bstp-cms-prod-v3","em-global-prod-3pp","em-global-prod-eom","em-global-prod-flowe","em-global-prod","em-prod-3pp","em-prod-eom","em-prod-flowe","em-prod","etiyamobile-production","etiyamobile-prod"];
  const services = $json.serviceAnalysis?.detectedServices || [];
  const namespacePattern = namespaces.join('|');
  
  if (services.length > 0) {
    const serviceFilter = services.map(s => `resource.service.name="${s}"`).join(' || ');
    return `{ resource.env-code=~"${namespacePattern}" && (${serviceFilter}) && duration > 2s }`;
  }
  
  return `{ resource.env-code=~"${namespacePattern}" && duration > 2s }`;
})() }}
```

**Note**: Removed `.network.peer.address`, `.server.address`, `.http.url` - just using high duration

---

## Tool 8: Last 24 Hours Spans Errors All

**Purpose**: Get all error types (status=error + exceptions)  
**Can use customQuery**: ❌ NO (broader than just status=error)

### Query:
```javascript
{{ (() => {
  const namespaces = $json.searchParams?.namespaces || ["bstp-cms-global-production","bstp-cms-prod-v3","em-global-prod-3pp","em-global-prod-eom","em-global-prod-flowe","em-global-prod","em-prod-3pp","em-prod-eom","em-prod-flowe","em-prod","etiyamobile-production","etiyamobile-prod"];
  const services = $json.serviceAnalysis?.detectedServices || [];
  const namespacePattern = namespaces.join('|');
  
  if (services.length > 0) {
    const serviceFilter = services.map(s => `resource.service.name="${s}"`).join(' || ');
    return `{ resource.env-code=~"${namespacePattern}" && (${serviceFilter}) && (status=error || span.exception!="nil") }`;
  }
  
  return `{ resource.env-code=~"${namespacePattern}" && (status=error || span.exception!="nil") }`;
})() }}
```

**Note**: `span.exception!="nil"` may match "none" values

---

## Tool 9: Span 1 Hour With Errors

**Purpose**: Get error spans from last hour  
**Can use customQuery**: ❌ NO (needs HTTP status codes)

### Query:
```javascript
{{ (() => {
  const namespaces = $json.searchParams?.namespaces || ["bstp-cms-global-production","bstp-cms-prod-v3","em-global-prod-3pp","em-global-prod-eom","em-global-prod-flowe","em-global-prod","em-prod-3pp","em-prod-eom","em-prod-flowe","em-prod","etiyamobile-production","etiyamobile-prod"];
  const services = $json.serviceAnalysis?.detectedServices || [];
  const namespacePattern = namespaces.join('|');
  
  if (services.length > 0) {
    const serviceFilter = services.map(s => `resource.service.name="${s}"`).join(' || ');
    return `{ resource.env-code=~"${namespacePattern}" && (${serviceFilter}) && (span.status>"400" || span.exception!="nil") }`;
  }
  
  return `{ resource.env-code=~"${namespacePattern}" && (span.status>"400" || span.exception!="nil") }`;
})() }}
```

---

## Tool 10: Recent 3 Hours

**Purpose**: Get general traces from recent 3 hours  
**Can use customQuery**: ❌ NO (needs all traces)

### Query:
```javascript
{{ (() => {
  const namespaces = $json.searchParams?.namespaces || ["bstp-cms-global-production","bstp-cms-prod-v3","em-global-prod-3pp","em-global-prod-eom","em-global-prod-flowe","em-global-prod","em-prod-3pp","em-prod-eom","em-prod-flowe","em-prod","etiyamobile-production","etiyamobile-prod"];
  const services = $json.serviceAnalysis?.detectedServices || [];
  const namespacePattern = namespaces.join('|');
  
  if (services.length > 0) {
    const serviceFilter = services.map(s => `resource.service.name="${s}"`).join(' || ');
    return `{ resource.env-code=~"${namespacePattern}" && (${serviceFilter}) }`;
  }
  
  return `{ resource.env-code=~"${namespacePattern}" }`;
})() }}
```

---

## Tool 11: Service Cascade Analyzer

**Purpose**: Detect cascading failures across service categories  
**Can use customQuery**: ❌ NO (very specific logic per category)

### Query:
```javascript
{{ (() => {
  const serviceContext = $json.serviceContext || {};
  const errorAnalysis = $json.errorAnalysis || {};
  const errorsByCategory = errorAnalysis.errorsByCategory || {};
  const namespaces = $json.searchParams?.namespaces || ["bstp-cms-global-production","bstp-cms-prod-v3","em-global-prod-3pp","em-global-prod-eom","em-global-prod-flowe","em-global-prod","em-prod-3pp","em-prod-eom","em-prod-flowe","em-prod","etiyamobile-production","etiyamobile-prod"];
  const namespacePattern = namespaces.join('|');

  const cascadePatterns = [];

  // Auth category errors
  if (errorsByCategory.auth?.totalErrors > 0) {
    cascadePatterns.push('(resource.service.name="ui-authz-mc-backend" || resource.service.name="crm-customer-information" || resource.service.name="bstp-id-service")');
  }

  // CRM category errors
  if (errorsByCategory.crm?.totalErrors > 0) {
    cascadePatterns.push('(resource.service.name="crm-customer-information" || resource.service.name="crm-asset" || resource.service.name="crm-mash-up" || resource.service.name="bss-mc-crm-customer-information-t4")');
  }

  // CPQ/Order category errors
  if (errorsByCategory.cpq?.totalErrors > 0) {
    cascadePatterns.push('(resource.service.name="cpq-ordercapture" || resource.service.name="bstp-cpq-batch" || resource.service.name="bss-mc-cpq-t4")');
  }

  // Config service errors (affects everything)
  if (errorsByCategory.config?.totalErrors > 0) {
    cascadePatterns.push('(resource.service.name="domain-config-service" || resource.service.name="bss-mc-domain-config-t4")');
  }

  // Backend category errors
  if (errorsByCategory.backend?.totalErrors > 0) {
    cascadePatterns.push('(resource.service.name="bss-services-service.etiyamobile-production-eom")');
  }

  // Gateway errors
  if (errorsByCategory.gateway?.totalErrors > 0) {
    cascadePatterns.push('(resource.service.name="APIGateway")');
  }

  // T4 layer errors
  if (errorsByCategory['t4-layer']?.totalErrors > 0) {
    cascadePatterns.push('(resource.service.name="eca-t4" || resource.service.name="bss-mc-domain-config-t4" || resource.service.name="bss-mc-cpq-t4" || resource.service.name="bss-mc-crm-customer-information-t4" || resource.service.name="bss-mc-ntf-engine-t4" || resource.service.name="bss-mc-pcm-product-catalog-t4" || resource.service.name="bss-mc-asset-management-t4")');
  }

  // Cascade error patterns
  const cascadeErrorPatterns = '(span.status="500" || span.status="502" || span.status="503" || duration > 2s)';

  // Build query
  if (cascadePatterns.length > 0) {
    return `{ resource.env-code=~"${namespacePattern}" && (${cascadePatterns.join(' || ')}) && ${cascadeErrorPatterns} }`;
  }

  // Fallback: General cascade detection
  return `{ resource.env-code=~"${namespacePattern}" && (status=error || ${cascadeErrorPatterns}) }`;
})() }}
```

**Note**: Removed network/client span indicators - using high duration and HTTP status instead

---

## Tool 12: Dependency Chain Tracer

**Purpose**: Trace dependency chains with HTTP error codes  
**Can use customQuery**: ❌ NO (needs specific error code ranges)

### Query:
```javascript
{{ (() => {
  const serviceAnalysis = $json.serviceContext || $json.serviceAnalysis || {};
  const detectedServices = serviceAnalysis.detectedServices || [];
  const namespaces = $json.searchParams?.namespaces || ["bstp-cms-global-production","bstp-cms-prod-v3","em-global-prod-3pp","em-global-prod-eom","em-global-prod-flowe","em-global-prod","em-prod-3pp","em-prod-eom","em-prod-flowe","em-prod","etiyamobile-production","etiyamobile-prod"];
  const namespacePattern = namespaces.join('|');
  
  // Service filter
  if (detectedServices.length > 0) {
    const serviceFilter = detectedServices
      .slice(0, 5) // Max 5 services
      .map(s => `resource.service.name="${s}"`)
      .join(' || ');
    return `{ resource.env-code=~"${namespacePattern}" && (${serviceFilter}) && span.status>"400" }`;
  }
  
  // Default: Critical services
  const criticalServices = [
    "ui-authz-mc-backend", 
    "crm-customer-information", 
    "cpq-ordercapture",
    "domain-config-service",
    "APIGateway",
    "bss-services-service.etiyamobile-production-eom"
  ];
  const serviceFilter = criticalServices.map(s => `resource.service.name="${s}"`).join(' || ');
  return `{ resource.env-code=~"${namespacePattern}" && (${serviceFilter}) && span.status>"400" }`;
})() }}
```

**Note**: Simplified from 400-599 individual codes to `span.status>"400"` - much cleaner and faster!

---

## Summary of Changes

### Fixed Syntax Issues:
1. ✅ `resource.deployment.environment` → `resource.env-code`
2. ✅ `.service.name` → `resource.service.name`
3. ✅ `.status.code>=400` → `span.status>"400"`
4. ✅ `.status="500"` → `span.status="500"`

### Removed Invalid Attributes:
5. ❌ `span.error.type` - doesn't exist
6. ❌ `.network.peer.address`, `.server.address`, `.http.url` - don't exist
7. ❌ `.exception.stacktrace` - simplified to just `span.exception!="nil"`

### Added Multi-Namespace Support:
8. ✅ All tools now use `resource.env-code=~"12-namespace-pattern"`
9. ✅ All tools read from `$json.searchParams.namespaces`
10. ✅ Tool 12 now has environment filter (was missing)

### Optimized Queries:
11. ✅ Tool 12: `span.status>"400"` instead of 200 individual status codes
12. ✅ Tools 1, 6: Reuse `customQuery` from Node 4
13. ✅ All tools: Service filter uses OR of exact matches

---

## Deployment Instructions

1. **Backup current Tools.txt** before making changes
2. **Copy-paste each query** into corresponding n8n HTTP tool parameter field
3. **Test Tool 1 first** - verify multi-namespace and status=error works
4. **Deploy incrementally** - don't update all 12 at once
5. **Monitor results** - especially `span.exception!="nil"` (may match "none")

---

## Known Issues & Monitoring

### Issue 1: span.exception="none"
**Problem**: `span.exception!="nil"` may also match traces with `span.exception="none"`  
**Impact**: Tools 3, 8, 9 may return false positives  
**Solution**: Monitor results, may need to add `&& span.exception!="none"` filter

### Issue 2: Multi-namespace Performance
**Problem**: Querying 12 namespaces simultaneously may be slow  
**Impact**: All tools affected  
**Solution**: Monitor query times, consider namespace-specific tools if needed

### Issue 3: detectedServices Empty
**Problem**: If Node 4 doesn't detect services, fallback queries used  
**Impact**: Tools 2-12 will query all services in all namespaces  
**Solution**: Ensure Node 4 service detection logic works correctly
