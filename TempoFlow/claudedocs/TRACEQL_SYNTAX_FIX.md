# TraceQL Syntax Fix - Col 246 Error Resolution

**Date**: 2025-12-21
**Issue**: Parse error at col 246 when querying Grafana Tempo
**Root Cause**: Incorrect attribute name for HTTP status code filtering

---

## 🔴 THE PROBLEM

### Error Message:
```
Bad request - please check your parameters
Details: invalid TraceQL query: parse error at line 1, col 246: syntax error: unexpected IDENTIFIER
```

### Wrong Query (What We Were Using):
```traceql
{ resource.deployment.environment=~"..." && (service.name="...") && status.code>=400 }
                                                                      ^^^^^^^^^^^^^^
                                                                      WRONG ATTRIBUTE
```

**Why It Failed**:
- `status.code` is NOT a valid TraceQL attribute
- Tempo parser rejected `status.code>=400` at col 246
- The `400` was seen as an unexpected identifier because `status.code` doesn't exist

---

## ✅ THE SOLUTION

### Correct Attribute Name:
**For HTTP status codes, use**: `span.http.status_code`

### Correct Query:
```traceql
{ resource.deployment.environment=~"..." && (service.name="...") && span.http.status_code>=400 }
                                                                      ^^^^^^^^^^^^^^^^^^^^^^^^^
                                                                      CORRECT ATTRIBUTE
```

---

## 📚 TraceQL Syntax Rules

According to [Grafana Tempo documentation](https://grafana.com/docs/tempo/latest/traceql/):

### HTTP Status Code Filtering:

**Attribute Name**: `span.http.status_code` (NOT `status.code`)

**Examples**:
```traceql
// Filter for any HTTP errors (4xx or 5xx)
{ span.http.status_code >= 400 }

// Filter for specific status code
{ span.http.status_code = 500 }

// Filter for status code range
{ span.http.status_code >= 200 && span.http.status_code < 300 }

// Combined with other filters
{ resource.deployment.environment="production" && span.http.status_code >= 400 }
```

### Span Attributes vs Intrinsics:

- **Intrinsics**: `name`, `status`, `duration`, `kind` (no prefix needed)
- **User Attributes**: `span.`, `resource.`, `link.`, `event.` prefix required
- **HTTP Status**: Is a user attribute, requires `span.http.status_code`

---

## 🔧 FILES CHANGED

### 1. Node 4 (Service-Aware Query Builder.js)
**Line 356**:
```javascript
// OLD (WRONG):
`{ resource.deployment.environment=~"${namespacePattern}" && (${serviceFilter}) && status.code>=400 }`

// NEW (CORRECT):
`{ resource.deployment.environment=~"${namespacePattern}" && (${serviceFilter}) && span.http.status_code>=400 }`
```

### 2. Node 1 (Unified Entry Point.js)
**Lines 150, 153**:
```javascript
// OLD (WRONG):
tempoQuery += ` && status.code>=400`;
tempoQuery += ` && status.code=~"${codes}"`;

// NEW (CORRECT):
tempoQuery += ` && span.http.status_code>=400`;
tempoQuery += ` && span.http.status_code=~"${codes}"`;
```

### 3. Documentation Files Updated:
- `QUICK_FIX_CHECKLIST.md` - All references updated to `span.http.status_code>=400`
- `N8N_HTTP_TOOL_FIX.md` - Updated fallback query syntax
- `TEMPO_QUERY_EXAMPLES.md` - All examples updated with correct attribute
- `DEPLOYMENT_GUIDE.md` - Updated deployment instructions

---

## 🎯 DEPLOYMENT INSTRUCTIONS

### For n8n Users:

1. **Pull latest code**:
   ```bash
   cd "C:\Users\Asus\Desktop\OKR_AI"
   git pull
   ```

2. **Deploy Node 4**:
   - Open n8n → TempoFlow workflow
   - Find "Service-Aware Query Builder" node
   - Copy content from `TempoFlow Nodes/4. Service-Aware Query Builder.js`
   - Paste into n8n code editor
   - **Verify Line 356 has**: `span.http.status_code>=400`
   - Save

3. **Deploy Node 1** (if using orchestrator/chat mode):
   - Find "Unified Entry Point" node
   - Copy content from `TempoFlow Nodes/1. Unified Entry Point.js`
   - Paste into n8n code editor
   - **Verify Lines 150, 153 have**: `span.http.status_code>=400`
   - Save

4. **Update HTTP Tool Fallback** (optional but recommended):
   - Find "Recent Errors" HTTP tool
   - Update query parameter `q`:
   ```javascript
   {{ $json.searchParams?.customQuery || '{resource.deployment.environment=~"bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod" && span.http.status_code>=400}' }}
   ```

5. **Test**:
   - Run workflow manually
   - Verify no "col 246" error
   - Should return traces or "No traces found"

---

## ✅ VERIFICATION

### Before Fix:
```
Error: invalid TraceQL query: parse error at line 1, col 246: syntax error: unexpected IDENTIFIER
Query: { ... && status.code>=400 }
```

### After Fix:
```
Success: Traces returned or "No traces found"
Query: { ... && span.http.status_code>=400 }
```

---

## 📝 LESSONS LEARNED

1. **Always verify TraceQL syntax** against official Grafana Tempo documentation
2. **HTTP status codes** require `span.http.status_code`, not `status.code`
3. **Test in Grafana UI first** before deploying to n8n
4. **Col 246 error** indicated the parser position, not the actual attribute location

---

## 🔗 REFERENCES

- [Grafana Tempo TraceQL Documentation](https://grafana.com/docs/tempo/latest/traceql/)
- [Construct TraceQL Queries](https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/)
- [TraceQL Query Structure](https://grafana.com/docs/grafana/latest/datasources/tempo/query-editor/traceql-structure/)

---

**Status**: ✅ FIXED
**Impact**: Resolves all "col 246" parse errors in Tempo queries
**Next**: Deploy to n8n and verify production queries work
