# Free Prometheus Namespace Fix

## Problem

Screenshot'ta görülen issue: Stage 1 AI agent'ın Prometheus tool call'unda **hardcoded namespace** kullanılıyordu:

```promql
count by (namespace, service, pod) (up{namespace="etiyamobile-production", service!="", pod!=""})
```

Bu sorgu sadece **1 namespace**'i kapsar, oysa flow **12 namespace** için çalışmalı:
- bstp-cms-global-production
- bstp-cms-prod-v3
- em-global-prod-3pp
- em-global-prod-eom
- em-global-prod-flowe
- em-global-prod
- em-prod-3pp
- em-prod-eom
- em-prod-flowe
- em-prod
- etiyamobile-production
- etiyamobile-prod

## Root Cause

**Issue #5**: n8n'de AI Agent prompt text field'larında `{{ $json.field }}` template'leri **evaluate edilmiyor**.

AI agent şunu görüyor:
```
Use namespace: {{ $json._context.initialParams.namespaces.join('|') }}
```

Ama bu **string olarak** geliyor, AI agent evaluate edemiyor.

## Solution

**Pre-computed query helpers** yaklaşımı:

### 1. Query Helpers Generator (Node 4 & 8)

JavaScript node'larında namespace/service listelerini **ready-to-use Prometheus query strings**'e dönüştürüyoruz:

```javascript
// Node 4: Prepare Stage 1 Input
const namespaces = unifiedOutput._context?.initialParams?.namespaces || [];
const services = unifiedOutput._context?.initialParams?.services || [];

const namespaceRegex = namespaces.join('|');
const serviceRegex = services.length > 0 ? services.join('|') : '.*';

const queryHelpers = {
  namespaceFilter: `namespace=~"${namespaceRegex}"`,
  serviceFilter: services.length > 0 ? `service=~"${serviceRegex}"` : 'service!=""',
  combinedFilter: `namespace=~"${namespaceRegex}",service!=""`,

  exampleQueries: {
    podCount: `count by (namespace, service, pod) (up{namespace=~"${namespaceRegex}", service!="", pod!=""})`,
    serviceList: `group by (namespace, service) (up{namespace=~"${namespaceRegex}", service!=""})`,
    alertCount: `ALERTS{namespace=~"${namespaceRegex}"}`
  }
};

stage1Input.queryHelpers = queryHelpers;
stage1Input.namespaceRegex = namespaceRegex;
stage1Input.serviceRegex = serviceRegex;
```

### 2. AI Prompt Updates

AI agent'a **copy-paste ready** query'ler veriyoruz:

```markdown
## 🎯 NAMESPACE & SERVICE FILTERING:

**CRITICAL: Use these READY-TO-USE query filters:**

Namespace regex pattern: {{ $json.namespaceRegex }}

**COPY THESE EXACT FILTERS INTO YOUR PROMETHEUS QUERIES:**
- Namespace filter: {{ $json.queryHelpers?.namespaceFilter }}
- Combined filter: {{ $json.queryHelpers?.combinedFilter }}

**READY-TO-USE EXAMPLE QUERIES (COPY EXACTLY):**
- Pod count: {{ $json.queryHelpers?.exampleQueries?.podCount }}
- Service list: {{ $json.queryHelpers?.exampleQueries?.serviceList }}
- Alert count: {{ $json.queryHelpers?.exampleQueries?.alertCount }}

**CRITICAL RULES:**
- NEVER use hardcoded namespaces like "etiyamobile-production"
- COPY the ready-to-use queries shown above
```

## Files Modified

### Stage 1 (Health Snapshot)
1. **Node 4: Prepare Stage 1 Input.js**
   - Added `queryHelpers` generation
   - Added `namespaceRegex`, `serviceRegex` fields
   - Pre-computed example queries

2. **Node 5: Stage 1 Health Snapshot.txt**
   - Updated namespace filtering section
   - Added ready-to-use query examples
   - Clear instructions to copy exact queries

### Stage 2 (Deep Analysis)
3. **Node 8: Force Deep Analysis Override.js**
   - Added `queryHelpers` generation for Stage 2
   - Added CPU/Memory usage example queries
   - Added `stage2Instructions` with scope message

4. **Node 9: Stage 2 Deep Analysis.txt**
   - Updated tool execution section
   - Added ready-to-use query examples
   - Clear copy-paste instructions

## Expected Result

### Before Fix (Hardcoded):
```promql
count by (namespace, service, pod) (up{namespace="etiyamobile-production", service!="", pod!=""})
```
**Covers:** 1 namespace only ❌

### After Fix (Dynamic):
```promql
count by (namespace, service, pod) (up{namespace=~"bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod", service!="", pod!=""})
```
**Covers:** All 12 namespaces ✅

## Benefits

1. **Complete Coverage**: All namespaces analyzed, not just one
2. **No Template Evaluation Issues**: Query strings pre-computed in JS
3. **Clear Instructions**: AI gets copy-paste ready queries
4. **Backward Compatible**: Old `namespace` field still exists (deprecated)
5. **Maintainable**: One place to add new example queries (query helpers)

## Testing Checklist

- [ ] Test with default 12 namespaces
- [ ] Test with subset of namespaces
- [ ] Test with empty namespace list (should use DEFAULT_NAMESPACES)
- [ ] Verify AI copies exact queries
- [ ] Check Stage 1 output has real data (not "unknown")
- [ ] Verify Stage 2 receives queryHelpers
- [ ] Confirm all 12 namespaces appear in Prometheus results

## Related Issues Fixed

This fix addresses:
- **Issue #5**: Template evaluation in AI prompt text fields
- **Partial fix for Issue #1-2**: Better namespace/service handling
- **Root cause of test failure**: Why Stage 1 returned "unknown" status

## Next Steps

1. Test the flow with real Prometheus API
2. Verify AI agent actually uses the ready-to-use queries
3. If AI still ignores queries, consider:
   - Adding more explicit examples
   - Simplifying prompt structure
   - Using system message instead of prompt text
4. Apply same pattern to Stage 3, 4, 5, 6 prompts
