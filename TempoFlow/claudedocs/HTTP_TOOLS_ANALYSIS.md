# HTTP Tools TraceQL Query Analysis

**Analysis Date**: 2025-12-22  
**Scope**: 12 HTTP tools in TempoFlow workflow  
**Reference**: User-provided example syntax

## User's Correct Example Syntax

```traceql
{resource.env-code="em-prod" && resource.service.namespace="em-prod" && resource.service.name="crm-customer-information" && status=error}
```

**Key patterns**:
1. ✅ `resource.env-code` (not deployment.environment)
2. ✅ `resource.service.namespace` (NEW attribute)
3. ✅ `resource.service.name` (full prefix, not `.service.name`)
4. ✅ `status=error` (intrinsic attribute for error detection)

---

## Critical Syntax Errors Found

### Issue 1: Wrong Environment Attribute ❌
**Found in**: Tools 2-11  
**Current**: `resource.deployment.environment="${env}"`  
**Correct**: `resource.env-code="${env}"` or `resource.env-code=~"ns1|ns2|..."`

**Impact**: TraceQL parse error - queries will fail completely

**Affected lines**:
- Tool 2: Lines 18, 21
- Tool 3: Lines 34, 37
- Tool 4: Lines 51, 54
- Tool 5: Lines 67, 70
- Tool 6: Lines 83, 86
- Tool 7: Lines 103, 106
- Tool 8: Lines 119, 122
- Tool 9: Lines 135, 138
- Tool 10: Lines 152, 155
- Tool 11: Lines 215, 219

---

### Issue 2: Wrong Service Name Prefix ❌
**Found in**: Tools 2-12  
**Current**: `.service.name="${s}"`  
**Correct**: `resource.service.name="${s}"`

**Impact**: TraceQL parse error or unexpected results

**Affected lines**:
- Tool 2: Line 17
- Tool 3: Line 33
- Tool 4: Line 50
- Tool 5: Line 66
- Tool 6: Line 82
- Tool 7: Line 102
- Tool 8: Line 118
- Tool 9: Line 134
- Tool 10: Line 151
- Tool 11: Lines 171-201 (multiple occurrences)
- Tool 12: Lines 242, 256 (multiple occurrences)

---

### Issue 3: Wrong Status Code Syntax ❌
**Found in**: Tools 3, 9, 11, 12  
**Current**: `.status.code>=400`, `.status="500"`  
**Correct**: `status=error` (for general errors) or `span.http.status_code>=400` (for HTTP)

**Impact**: TraceQL parse error

**Affected locations**:
- Tool 3 (Line 34): `.status.code>=400` → `span.http.status_code>=400` or `status=error`
- Tool 9 (Line 135): `.status.code>=400` → `span.http.status_code>=400` or `status=error`
- Tool 11 (Line 210): `.status="500"`, `.status="502"`, `.status="503"` → `span.http.status_code=500` etc.
- Tool 12 (Lines 231-236): `.status="400"` through `.status="599"` → `span.http.status_code=400` etc.

---

## Critical Data Completeness Issues

### Issue 4: Single Namespace Hardcoded ⚠️
**Found in**: Tools 2-11  
**Current**: `const env = "etiyamobile-production";` (hardcoded)  
**Correct**: Read from `$json.searchParams.namespaces` (12 namespaces)

**12 Production Namespaces** (from Node 1 and Node 4):
```javascript
[
  "bstp-cms-global-production",
  "bstp-cms-prod-v3",
  "em-global-prod-3pp",
  "em-global-prod-eom",
  "em-global-prod-flowe",
  "em-global-prod",
  "em-prod-3pp",
  "em-prod-eom",
  "em-prod-flowe",
  "em-prod",
  "etiyamobile-production",
  "etiyamobile-prod"
]
```

**Impact**: Tools only search 1/12 production namespaces, missing **91.7%** of production data!

**Why this is critical**:
- User reported multi-namespace support was the core requirement
- Node 1 and Node 4 prepare multi-namespace queries
- Tools 2-11 ignore this and revert to single namespace
- This explains the data inconsistencies in DATA_CONSISTENCY_ANALYSIS.md

---

### Issue 5: Ignoring Prepared customQuery ⚠️
**Found in**: Tools 2-12  
**Current**: Tools manually construct queries with hardcoded patterns  
**Correct**: Use `$json.searchParams.customQuery` from Node 4 (like Tool 1 does)

**Tool 1 (CORRECT pattern)**:
```javascript
{{ $json.searchParams?.customQuery || '{status=error && resource.env-code="em-prod"}' }}
```

**Tools 2-12 (WRONG pattern)**:
Manually construct queries instead of using prepared `customQuery` from upstream nodes.

**Impact**: 
- Upstream intelligence from Node 4 service-aware query building is wasted
- Each tool reimplements query logic with errors
- Inconsistent query patterns across tools

---

### Issue 6: Missing Environment Filter ❌
**Found in**: Tool 12 (Dependency Chain Tracer)  
**Current**: No environment filter - searches ALL Tempo data  
**Correct**: Add `resource.env-code=~"namespace_pattern"` filter

**Current query pattern**:
```javascript
{ (${serviceFilter}) && (${errorCodes}) }
```

**Should be**:
```javascript
{ resource.env-code=~"${namespacePattern}" && (${serviceFilter}) && (${errorCodes}) }
```

**Impact**: 
- Searches dev, test, staging environments too (performance issue)
- Returns irrelevant data from non-production environments
- Very slow queries due to lack of scoping

---

## Uncertain Attributes (Need Verification)

### Dot-Prefixed Attributes
**Found in**: Tools 3, 7, 8, 9, 11

These attributes use dot-prefix shorthand which may not be reliable:
- `.error.type` → Should be `span.error.type`?
- `.exception` → Should be `span.exception`?
- `.exception.stacktrace` → Should be `span.exception.stacktrace`?
- `.network.peer.address` → Should be `span.network.peer.address`?
- `.server.address` → Should be `span.server.address`?
- `.http.url` → Should be `span.http.url`?

**Recommendation**: Use full `span.*` prefix for consistency with user's example pattern.

---

## Data Flow Analysis

### Expected Flow:
```
Node 1 (Entry Point)
  ↓ Prepares: searchParams.namespaces (12 namespaces)
  ↓           searchParams.customQuery (multi-namespace TraceQL)
  
Node 4 (Service-Aware Query Builder)
  ↓ Enhances: serviceAnalysis.detectedServices (filtered services)
  ↓           serviceAnalysis.enhancedQueries (service-specific queries)
  ↓           searchParams.customQuery (updated with service filters)

HTTP Tools
  ✅ Should use: $json.searchParams.customQuery (prepared query)
  ✅ Should use: $json.searchParams.namespaces (12 namespaces)
  ✅ Should use: $json.serviceAnalysis.detectedServices (filtered services)
```

### Current Reality:
```
HTTP Tools (2-12)
  ❌ Ignore customQuery
  ❌ Hardcode single namespace "etiyamobile-production"
  ❌ Manually reconstruct queries with syntax errors
```

---

## Fix Priority Matrix

### 🔴 CRITICAL (Will break immediately):
1. **Issue 1**: `deployment.environment` → `env-code` (Tools 2-11)
2. **Issue 2**: `.service.name` → `resource.service.name` (Tools 2-12)
3. **Issue 3**: `.status.code` → `span.http.status_code` or `status=error` (Tools 3, 9, 11, 12)

### 🟡 HIGH (Returns incomplete/wrong data):
4. **Issue 4**: Single namespace → Multi-namespace (Tools 2-11)
5. **Issue 6**: Missing env filter in Tool 12

### 🟢 MEDIUM (Best practice):
6. **Issue 5**: Use prepared `customQuery` instead of manual construction
7. **Uncertain attributes**: Verify and add `span.` prefix if needed

---

## Recommended Fix Strategy

### Option A: Use Prepared Queries (RECOMMENDED)
**Change all tools to use Tool 1 pattern**:
```javascript
{{ $json.searchParams?.customQuery || fallback_query }}
```

**Pros**:
- Leverages Node 4 service-aware query intelligence
- Single source of truth for query logic
- Automatic multi-namespace support
- Consistent syntax across all tools

**Cons**:
- Less flexibility for tool-specific query variations
- Need to ensure Node 4 prepares all query types

### Option B: Fix Individual Tool Queries
**Update each tool's IIFE pattern**:
```javascript
{{ (() => {
  const services = $json.serviceAnalysis?.detectedServices || [];
  const namespaces = $json.searchParams?.namespaces || ["em-prod"];
  const namespacePattern = namespaces.join('|');
  
  if (services.length > 0) {
    const serviceFilter = services.map(s => `resource.service.name="${s}"`).join(' || ');
    return `{ resource.env-code=~"${namespacePattern}" && (${serviceFilter}) && status=error }`;
  }
  
  return `{ resource.env-code=~"${namespacePattern}" && status=error }`;
})() }}
```

**Pros**:
- Each tool can customize queries for specific needs
- More explicit about what each tool does

**Cons**:
- More code duplication
- Higher maintenance burden
- Risk of inconsistent syntax across tools

---

## Tool-by-Tool Summary

| Tool | deployment.env | .service.name | status syntax | Multi-NS | Uses customQuery | Missing env filter |
|------|----------------|---------------|---------------|----------|------------------|-------------------|
| 1. Recent Errors | ❌ (fallback) | N/A | ✅ | ❌ (fallback) | ✅ | N/A |
| 2. Yesterday 3H | ❌ | ❌ | N/A | ❌ | ❌ | ❌ |
| 3. Exception Spans | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 4. Last Week 3H | ❌ | ❌ | N/A | ❌ | ❌ | ❌ |
| 5. High Latency | ❌ | ❌ | N/A | ❌ | ❌ | ❌ |
| 6. Last 24H Errors | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| 7. External Latency | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ |
| 8. 24H Spans All | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| 9. 1H With Errors | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 10. Recent 3H | ❌ | ❌ | N/A | ❌ | ❌ | ❌ |
| 11. Cascade Analyzer | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 12. Dependency Tracer | N/A | ❌ | ❌ | ❌ | ❌ | ✅ |

**Legend**:
- ✅ Correct
- ❌ Wrong/Missing
- ⚠️ Uncertain (uses `.error.type`)
- N/A: Not applicable to this tool

---

## Next Steps

1. **Decide on fix strategy**: Option A (use customQuery) vs Option B (fix individual queries)
2. **Fix critical syntax errors** (Issues 1-3) - these break queries immediately
3. **Fix multi-namespace support** (Issue 4) - currently missing 91.7% of production data
4. **Verify uncertain attributes** - confirm correct TraceQL syntax for error/exception attributes
5. **Test with real Tempo instance** - validate all query changes return expected results
6. **Update documentation** - reflect correct TraceQL syntax patterns
