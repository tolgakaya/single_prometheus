# Quick Fix Deployment Checklist

**Date**: 2025-12-22
**Status**: Ready for n8n Deployment

---

## ✅ Stage 2 Parser Fix (CURRENT - HIGH PRIORITY)

**Issue**: "Model output doesn't fit required format" error
**File**: `TempoFlow/Stage 2 Output Parser.json`

### Deploy to n8n:
1. [ ] Open n8n TempoFlow workflow
2. [ ] Find "Stage 2 Output Parser" node (Structured Output Parser)
3. [ ] Backup current JSON schema
4. [ ] Copy entire content from `TempoFlow/Stage 2 Output Parser.json`
5. [ ] Paste into n8n parser node
6. [ ] Save workflow
7. [ ] Test with real Stage 2 execution
8. [ ] Verify no validation errors

**Expected Result**: Stage 2 completes without parser errors, Agent 6 output validates successfully

**Documentation**: [STAGE2_PARSER_FIX.md](STAGE2_PARSER_FIX.md)

---

## ⏳ Fixed Service List Deployment (PENDING)

**Issue**: Dynamic service detection unreliable
**Files**:
- `TempoFlow/TempoFlow Nodes/4. Service-Aware Query Builder.js`
- 12 HTTP Tool queries from `HTTP_TOOLS_FIXED_QUERIES.md`

### Deploy Node 4 to n8n:
1. [ ] Open n8n TempoFlow workflow
2. [ ] Locate "Service-Aware Query Builder" node (Node 4)
3. [ ] Import updated Node 4 JSON
4. [ ] Test execution with sample input
5. [ ] Verify `detectedServices` contains all 109 services in output

### Deploy HTTP Tools:
1. [ ] Open `HTTP_TOOLS_FIXED_QUERIES.md`
2. [ ] For each of 12 HTTP tools:
   - Find the HTTP tool node in n8n workflow
   - Copy query from documentation
   - Paste into HTTP tool parameter field
   - Execute node to test
   - Verify results returned from multiple namespaces
3. [ ] Save workflow after all 12 tools updated

**Expected Result**:
- Node 4 always outputs 109 services in `detectedServices`
- HTTP tools query all 109 services consistently
- Multi-namespace data collection works

**Documentation**: [FIXED_SERVICE_LIST_SUMMARY.md](FIXED_SERVICE_LIST_SUMMARY.md)

---

## 🔧 TraceQL Syntax Fixes (INCLUDED IN NODE 4 + HTTP TOOLS)

**Issue**: TraceQL syntax errors (col 246, status=error)
**Files**:
- `TempoFlow/TempoFlow Nodes/1. Unified Entry Point Input.json`
- `TempoFlow/TempoFlow Nodes/4. Service-Aware Query Builder.js`

### Already Fixed In:
- ✅ Node 1: Corrected `resource.env-code`, `span.status`, `status=error`
- ✅ Node 4: Changed `status=error` to `status.code>=400`
- ✅ All HTTP Tools: Updated TraceQL syntax

**Deploy Notes**:
- These fixes are already included in Node 4 and HTTP Tools updates above
- No separate deployment needed
- Verify queries don't produce "parse error at col 246"

---

## Deployment Priority

### 1️⃣ **Deploy Stage 2 Parser Fix FIRST**
- **Why**: Current blocker, prevents Stage 2 from working
- **Impact**: Immediate resolution of validation errors
- **Risk**: Low - only relaxes schema, backward compatible

### 2️⃣ **Deploy Node 4 + HTTP Tools SECOND**
- **Why**: Improves service coverage and query accuracy
- **Impact**: Better error detection, consistent results
- **Risk**: Medium - changes query behavior, requires testing

### 3️⃣ **Validate End-to-End THIRD**
- **Why**: Ensure all fixes work together
- **Impact**: Complete workflow validation
- **Risk**: Low - all fixes are independent

---

## Validation Checkpoints

### After Stage 2 Parser Fix:
- [ ] Stage 2 executes without format errors
- [ ] Agent 6 output contains `root_cause_analysis.primary_cause`
- [ ] Downstream workflows receive valid JSON

### After Node 4 Fix:
- [ ] `detectedServices` always contains 109 services
- [ ] No dynamic service detection failures
- [ ] Consistent output across executions

### After HTTP Tools Fix:
- [ ] All 12 tools query successfully without TraceQL errors
- [ ] Multi-namespace results returned (check 12 namespaces)
- [ ] Service regex matches all 109 services

### End-to-End:
- [ ] Orchestrator triggers workflow successfully
- [ ] Stage 1 completes with service analysis
- [ ] Stage 2 completes with root cause analysis
- [ ] All HTTP tools execute without errors
- [ ] Final output contains actionable recommendations

---

## Rollback Commands

### Stage 2 Parser:
```bash
git checkout HEAD~1 "TempoFlow/Stage 2 Output Parser.json"
```

### Node 4:
```bash
git checkout HEAD~2 "TempoFlow/TempoFlow Nodes/4. Service-Aware Query Builder.js"
```

### Full Revert:
```bash
git revert HEAD
git push
```

---

## Success Criteria

**Stage 2 Parser Fix**:
- ✅ No "Model output doesn't fit required format" errors
- ✅ Agent 6 generates valid structured output
- ✅ All required fields populated

**Fixed Service List**:
- ✅ 100% service coverage (109 services)
- ✅ Consistent query behavior
- ✅ No dynamic detection failures

**TraceQL Syntax**:
- ✅ No parse errors
- ✅ Multi-namespace queries work
- ✅ Correct attribute syntax (`status.code`, `resource.service.name`)

**Overall**:
- ✅ End-to-end workflow completes successfully
- ✅ Actionable error analysis produced
- ✅ Service dependencies traced correctly
- ✅ Root cause analysis meaningful

---

**Last Updated**: 2025-12-22
