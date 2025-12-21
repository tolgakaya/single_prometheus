# TempoFlow n8n Quick Fix Checklist

**Problem**: TraceQL syntax error at col 246: `status=error` invalid

---

## ✅ Deployment Checklist

### Step 1: Verify Node 4 Code ✅

**File**: `TempoFlow Nodes/4. Service-Aware Query Builder.js`

**Check Line 356**:
```javascript
// CORRECT ✅
enhancedParams.serviceAnalysis.enhancedQueries.serviceErrors =
  `{ resource.deployment.environment=~"${namespacePattern}" && (${serviceFilter}) && span.http.status_code>=400 }`;
                                                                                        ^^^^^^^^^^^^^^^^^^^^^^^
                                                                                    Must be span.http.status_code>=400
```

**If you see `status.code>=400` or `status=error`** ❌ → File not updated, pull from git again

---

### Step 2: Deploy Node 4 to n8n ⚠️

1. **Open n8n** → TempoFlow workflow
2. **Find node**: "Service-Aware Query Builder" or "4. Service-Aware Query Builder"
3. **Click Edit** → Open code editor
4. **Find Line 356** (search for `enhancedQueries.serviceErrors`)
5. **Verify**:
   ```javascript
   && span.http.status_code>=400 }`;  // ✅ CORRECT
   ```
   **NOT**:
   ```javascript
   && status.code>=400 }`;  // ❌ WRONG (old syntax)
   && status=error }`;      // ❌ WRONG
   ```
6. **If wrong**: Copy entire file from `TempoFlow Nodes/4. Service-Aware Query Builder.js`
7. **Paste** into n8n code editor
8. **Save** → **Activate workflow**

---

### Step 3: Test Node 4 Output 🧪

1. **Manual trigger** TempoFlow
2. **Check Node 4 output** → `serviceAnalysis.enhancedQueries.serviceErrors`
3. **Expected**:
   ```json
   {
     "serviceAnalysis": {
       "enhancedQueries": {
         "serviceErrors": "{ resource.deployment.environment=~\"bstp-cms-global-production|...\" && (service.name=\"APIGateway\" || ...) && span.http.status_code>=400 }"
       }
     }
   }
   ```
4. **Search for**: `span.http.status_code>=400` ✅
5. **Should NOT contain**: `status.code>=400` or `status=error` ❌

---

### Step 4: Test Recent Errors Tool 🧪

1. **Continue workflow** → Let it reach "Recent Errors" HTTP node
2. **Check HTTP Request**:
   - **URL**: Should hit Tempo API
   - **Query param `q`**: Should use `$json.searchParams?.customQuery`
   - **Evaluated query**: Should contain `span.http.status_code>=400`
3. **Expected Result**: Traces returned or "No traces found"
4. **Should NOT see**: "parse error at col 246" ❌

---

### Step 5: Fix HTTP Tool Fallback (Optional) 🔧

**If Node 4 works but fallback fails**:

1. **Open "Recent Errors" HTTP node**
2. **Query Parameters** → Find `q` parameter
3. **Current value**:
   ```javascript
   {{ $json.searchParams?.customQuery || '{status=error && .deployment.environment="etiyamobile-production" }' }}
   ```
4. **Replace with**:
   ```javascript
   {{ $json.searchParams?.customQuery || '{resource.deployment.environment=~"bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod" && span.http.status_code>=400}' }}
   ```
5. **Save** → **Test**

---

## 🔍 Debugging Tips

### Check Git Status:

```bash
cd "C:\Users\Asus\Desktop\OKR_AI"
git log --oneline -5
```

**Expected commits**:
```
9e23d14 docs: Add n8n HTTP tool fallback query fix instructions
76799eb docs: Add comprehensive Tempo query examples and TraceQL syntax guide
ebb3639 fix: Critical bug fixes for TempoFlow deployment
```

### Verify Local File:

```bash
grep "span.http.status_code>=400" "TempoFlow/TempoFlow Nodes/4. Service-Aware Query Builder.js"
```

**Expected output**: Line 356 with `span.http.status_code>=400`

### Check n8n Workflow Version:

1. n8n → TempoFlow → **Settings** → **Version**
2. Check last modified date
3. **Should be**: After 2025-12-21 (today)
4. **If older**: Workflow not updated, redeploy files

---

## 🚨 Common Mistakes

### ❌ Mistake 1: Editing wrong file
- **Check**: You're editing `4. Service-Aware Query Builder.js`
- **Not**: `1. Unified Entry Point.js` (different file)

### ❌ Mistake 2: Not saving in n8n
- After pasting code, click **Save** button
- Green checkmark should appear

### ❌ Mistake 3: Workflow not active
- Toggle should be **green** (active)
- **Not grey** (inactive)

### ❌ Mistake 4: Old browser cache
- Hard refresh n8n: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Clear browser cache

---

## 📊 Expected vs Actual

### ✅ CORRECT Query (What You Should See):

```traceql
{
  resource.deployment.environment=~"bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod"
  &&
  (service.name="APIGateway" || service.name="crm-mash-up" || ...)
  &&
  span.http.status_code>=400
}
```

### ❌ WRONG Query (What Causes Error):

```traceql
{
  resource.deployment.environment=~"..."
  &&
  (service.name="...")
  &&
  status.code>=400     ← ❌ Wrong attribute (col 246 error)
}
```

```traceql
{
  resource.deployment.environment=~"..."
  &&
  (service.name="...")
  &&
  status=error     ← ❌ Invalid syntax
}
```

---

## 🎯 Final Checklist

Before closing this issue:

- [ ] **Line 356** in Node 4 has `span.http.status_code>=400` ✅
- [ ] Node 4 deployed to n8n ✅
- [ ] Workflow saved and active ✅
- [ ] Node 4 output shows `span.http.status_code>=400` in query ✅
- [ ] Recent Errors tool returns traces (or "not found") ✅
- [ ] No "parse error at col 246" ❌
- [ ] HTTP tool fallback updated (optional) ✅

---

**Last Updated**: 2025-12-21
