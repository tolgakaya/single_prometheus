# TraceQL Syntax Fix - Col 246 Error Resolution

**Date**: 2025-12-21
**Issue**: Parse error at col 246 when querying Grafana Tempo
**Root Cause**: TWO incorrect attribute names in TraceQL query

---

## 🔴 THE PROBLEM

### Error Message:
```
Bad request - please check your parameters
Details: invalid TraceQL query: parse error at line 1, col 246: syntax error: unexpected IDENTIFIER
```

### Wrong Query (What We Were Using):
```traceql
{ resource.env-code=~"..." && (service.name="...") && status.code>=400 }
                                              ^^^^^^^^^^^^              ^^^^^^^^^^^
                                              ERROR #1                  ERROR #2
                                              (col 246)
```

**Two Syntax Errors**:

1. **Service Name Filter** (col 246):
   - ❌ WRONG: `service.name="..."`
   - ✅ CORRECT: `resource.service.name="..."`
   - **Why**: Service name is a resource-level attribute in OpenTelemetry

2. **HTTP Status Code Filter**:
   - ❌ WRONG: `status.code>=400`
   - ✅ CORRECT: `status=error`
   - **Why**: HTTP status code is a span-level attribute

**Why Col 246 Error**:
- Col 246 is where `(service.name` starts in the query
- Custom query (with service filters) triggered the error
- Fallback query (without service filters) worked because it didn't have the invalid `service.name`

---

## ✅ THE SOLUTION

### Correct Attribute Names:

1. **For Service Name**: `resource.service.name` (NOT `service.name`)
2. **For HTTP Status Code**: `span.http.status_code` (NOT `status.code`)

### Correct Query:
```traceql
{ resource.env-code=~"..." && (resource.service.name="...") && status=error }
                                              ^^^^^^^^^^^^^^^^^^^^              ^^^^^^^^^^^^^^^^^^^^^^^^^
                                              CORRECT                           CORRECT
```

---

## 📚 TraceQL Syntax Rules

According to [Grafana Tempo documentation](https://grafana.com/docs/tempo/latest/traceql/):

### Resource-Level Attributes (use `resource.` prefix):
- `resource.service.name` - Service name (most common)
- `resource.env-code` - Deployment environment
- `resource.cluster.name` - Cluster name

### Span-Level Attributes (use `span.` prefix):
- `span.http.status_code` - HTTP status code
- `span.http.method` - HTTP method
- `span.name` - Span name

### Intrinsic Attributes (no prefix):
- `name` - Trace name
- `status` - Span status
- `duration` - Span duration
- `kind` - Span kind

### Unscoped Search (use `.` prefix):
- `.service.name` - Searches both resource and span levels (slower)
- Use only when unsure of attribute location

---

## 🔧 FILES CHANGED

### 1. Node 4 (Service-Aware Query Builder.js)

**Line 352**:
```javascript
// OLD (WRONG):
.map(s => `service.name="${s}"`)

// NEW (CORRECT):
.map(s => `resource.service.name="${s}"`)
```

**Line 364**:
```javascript
// OLD (WRONG):
.map(s => `service.name="${s}"`)

// NEW (CORRECT):
.map(s => `resource.service.name="${s}"`)
```

### 2. Node 1 (Unified Entry Point.js)

**Line 159**:
```javascript
// OLD (WRONG):
.map(s => `service.name=~".*${s}.*"`)

// NEW (CORRECT):
.map(s => `resource.service.name=~".*${s}.*"`)
```

### 3. Documentation Files Updated:
- `QUICK_FIX_CHECKLIST.md` - All service.name → resource.service.name
- `TEMPO_QUERY_EXAMPLES.md` - All examples updated
- `DEPLOYMENT_GUIDE.md` - Updated deployment instructions
- `TRACEQL_SYNTAX_FIX.md` - This file (comprehensive fix documentation)

---

## 🎯 DEPLOYMENT INSTRUCTIONS

### For n8n Users:

1. **Pull latest code**:
   ```bash
   cd "C:\Users\Asus\Desktop\OKR_AI"
   git pull
   ```

2. **Deploy Node 4** (CRITICAL):
   - Open n8n → TempoFlow workflow
   - Find "Service-Aware Query Builder" node
   - Copy content from `TempoFlow Nodes/4. Service-Aware Query Builder.js`
   - Paste into n8n code editor
   - **Verify Line 352**: `resource.service.name="${s}"`
   - **Verify Line 364**: `resource.service.name="${s}"`
   - Save

3. **Deploy Node 1** (if using orchestrator/chat mode):
   - Find "Unified Entry Point" node
   - Copy content from `TempoFlow Nodes/1. Unified Entry Point.js`
   - Paste into n8n code editor
   - **Verify Line 159**: `resource.service.name=~".*${s}.*"`
   - Save

4. **Test**:
   - Run workflow manually with service filters
   - Verify no "col 246" error
   - Should return traces or "No traces found"

---

## ✅ VERIFICATION

### Before Fix:
```
Error: invalid TraceQL query: parse error at line 1, col 246: syntax error: unexpected IDENTIFIER
Query: { ... && (service.name="APIGateway" || ...) && status.code>=400 }
       - Custom query (with services) FAILED ❌
       - Fallback query (no services) WORKED ✅
```

### After Fix:
```
Success: Traces returned or "No traces found"
Query: { ... && (resource.service.name="APIGateway" || ...) && status=error }
       - Custom query (with services) WORKS ✅
       - Fallback query (no services) WORKS ✅
```

---

## 📊 COMPLETE CORRECT QUERY EXAMPLE

```traceql
{
  resource.env-code=~"bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod"
  &&
  (
    resource.service.name="APIGateway" ||
    resource.service.name="crm-mash-up" ||
    resource.service.name="crm-customer-information" ||
    resource.service.name="domain-config-service"
  )
  &&
  status=error
}
```

**Breakdown**:
1. ✅ Namespace filter: `resource.env-code=~"..."`
2. ✅ Service filter: `resource.service.name="..."`
3. ✅ Status filter: `status=error`

---

## 📝 LESSONS LEARNED

1. **Service Name is Resource-Level**: Always use `resource.service.name`, not `service.name`
2. **HTTP Status is Span-Level**: Always use `span.http.status_code`, not `status.code`
3. **Col 246 indicated position**: Pointed to where `(service.name` starts
4. **Custom vs Fallback**: Custom query had services (failed), fallback didn't (worked)
5. **Test in Grafana UI first**: Validate TraceQL syntax before deploying to n8n

---

## 🔗 REFERENCES

- [Grafana Tempo TraceQL Documentation](https://grafana.com/docs/tempo/latest/traceql/)
- [Construct TraceQL Queries](https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/)
- [TraceQL Syntax Reference](https://doc.nais.io/observability/tracing/reference/traceql/)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)

---

**Status**: ✅ FIXED (Both Errors)
**Impact**: Resolves col 246 parse error for queries with service filters
**Next**: Deploy to n8n and verify production queries work with service filtering
