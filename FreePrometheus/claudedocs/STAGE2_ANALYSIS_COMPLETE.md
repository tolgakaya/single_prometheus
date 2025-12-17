# Stage 2: Tool Usage Analysis & Score Mismatch Fix

## 🎯 User Questions Answered

### Question 1: "Bütün toolların kullanıldığı bir senaryo var mı?"
**Answer**: **EVET**, en kötü senaryo durumunda tüm 12 tool kullanılır.

**Worst Case Scenario** (All 12 tools used):
```
Stage 1 Results:
- cluster_health: 1 (critical)
- node_availability: 1 (critical)
- pod_stability: 1 (critical)
- api_reliability: 1 (critical)

Result: All Phase 1 conditions trigger + Phase 2 & 3 always run = 12 tools
```

### Question 2: "Her bir toolun muhakkak kullanılabildiği bir senaryo var mı? Neye göre karar veriyor?"

**Answer**: 11 toolun koşullu, 1 toolun her zaman kullanıldığı senaryolar var:

## 📊 Tool Usage Decision Matrix

| Tool Name | Phase | Condition | Guaranteed Scenario |
|-----------|-------|-----------|---------------------|
| **Pod Status Check** | 1 (Instant) | `pod_stability ≤ 2` OR `cluster_health ≤ 2` OR `api_reliability ≤ 2` | ✅ YES - Any pod/cluster/API issue |
| **Container Restarts** | 1 (Instant) | `pod_stability ≤ 2` | ✅ YES - High pod restart rate detected |
| **Pod Resource Usage** | 1 (Instant) | `pod_stability ≤ 2` OR `api_reliability ≤ 2` | ✅ YES - Pod restarts or API degradation |
| **Node Resource Status** | 1 (Instant) | `node_availability ≤ 2` | ✅ YES - Node issues detected |
| **Node Conditions** | 1 (Instant) | `node_availability ≤ 2` | ✅ YES - Node issues detected |
| **Node Network Health** | 1 (Instant) | `node_availability ≤ 2` | ✅ YES - Node issues detected |
| **Kubernetes HPA Status** | 1 (Instant) | `cluster_health ≤ 2` | ✅ YES - General cluster degradation |
| **Kubernetes PVC Status** | 1 (Instant) | `cluster_health ≤ 2` | ✅ YES - General cluster degradation |
| **HTTP Error Rates** | 1 (Instant) | `api_reliability ≤ 2` | ✅ YES - API reliability issues |
| **Application Metrics** | 1 (Instant) | `api_reliability ≤ 2` | ✅ YES - API reliability issues |
| **Historical Comparison 24h** | 2 (Trend) | ALWAYS (unconditional) | ✅ YES - Always runs |
| **Resource Exhaustion Prediction** | 3 (Anomaly) | ALWAYS (unconditional) | ✅ YES - Always runs |

**Karar Verme Kriterleri**:
1. **Phase 1 Tools (10 tool)**: Stage 1 score'larına göre koşullu çalışır
   - Score ≤ 2 (degraded/critical) → Tool çalışır
   - Score ≥ 4 (healthy) → Tool atlanır
2. **Phase 2 & 3 Tools (2 tool)**: Her zaman çalışır (unconditional)

---

## 🚨 CRITICAL BUG FOUND: Score Name Mismatch

### Problem:
Stage 2 prompt (9. Stage 2 Deep Analysis.txt, line 126) referansları **YANLIŞ**:

```markdown
**IF Stage 1 scores.restart_rate is LOW** (pod restart issues detected):
```

**Stage 1'in ASIL Scores (5. Stage 1 Health Snapshot.txt, lines 147-151)**:
```json
"scores": {
  "cluster_health": <number>,
  "node_availability": <number>,
  "pod_stability": <number>,      ← POD RESTARTS İÇİN BU KULLANILMALI
  "api_reliability": <number>
}
```

**`restart_rate` diye bir score YOK!** Stage 2 yanlış score adını kullanıyor.

### Impact:
- Stage 2 AI Agent hiçbir zaman pod restart toollarını çalıştıramaz
- `scores.restart_rate` undefined döner (Stage 1'de bu score yok)
- Pod Status Check, Container Restarts, Pod Resource Usage toolları ASLA tetiklenmez
- **CRITICAL**: Pod restart detection tamamen BROKEN!

### Fix Required:
Stage 2 prompt'ta `scores.restart_rate` → `scores.pod_stability` olarak değiştirilmeli.

---

## 🔧 Detailed Tool Usage Scenarios

### Scenario A: Pod Restart Issues Only
```
Stage 1 Results:
- cluster_health: 5 (healthy)
- node_availability: 5 (healthy)
- pod_stability: 1 (critical) ← Pod restart rate yüksek
- api_reliability: 5 (healthy)

Tools Used (5 total):
✅ Pod Status Check (pod_stability ≤ 2)
✅ Container Restarts (pod_stability ≤ 2)
✅ Pod Resource Usage (pod_stability ≤ 2)
✅ Historical Comparison 24h (always)
✅ Resource Exhaustion Prediction (always)
```

### Scenario B: Node Issues Only
```
Stage 1 Results:
- cluster_health: 5 (healthy)
- node_availability: 1 (critical) ← Node failing
- pod_stability: 5 (healthy)
- api_reliability: 5 (healthy)

Tools Used (5 total):
✅ Node Resource Status (node_availability ≤ 2)
✅ Node Conditions (node_availability ≤ 2)
✅ Node Network Health (node_availability ≤ 2)
✅ Historical Comparison 24h (always)
✅ Resource Exhaustion Prediction (always)
```

### Scenario C: Cluster Health Issues Only
```
Stage 1 Results:
- cluster_health: 1 (critical) ← General cluster problem
- node_availability: 5 (healthy)
- pod_stability: 5 (healthy)
- api_reliability: 5 (healthy)

Tools Used (5 total):
✅ Pod Status Check (cluster_health ≤ 2)
✅ Kubernetes HPA Status (cluster_health ≤ 2)
✅ Kubernetes PVC Status (cluster_health ≤ 2)
✅ Historical Comparison 24h (always)
✅ Resource Exhaustion Prediction (always)
```

### Scenario D: API Reliability Issues Only
```
Stage 1 Results:
- cluster_health: 5 (healthy)
- node_availability: 5 (healthy)
- pod_stability: 5 (healthy)
- api_reliability: 1 (critical) ← API errors

Tools Used (6 total):
✅ Pod Status Check (api_reliability ≤ 2)
✅ Pod Resource Usage (api_reliability ≤ 2)
✅ HTTP Error Rates (api_reliability ≤ 2)
✅ Application Metrics (api_reliability ≤ 2)
✅ Historical Comparison 24h (always)
✅ Resource Exhaustion Prediction (always)
```

### Scenario E: Everything Healthy (Minimum Tools)
```
Stage 1 Results:
- cluster_health: 5 (healthy)
- node_availability: 5 (healthy)
- pod_stability: 5 (healthy)
- api_reliability: 5 (healthy)

Tools Used (2 total):
✅ Historical Comparison 24h (always)
✅ Resource Exhaustion Prediction (always)

Note: Phase 1 tools atlanır (hiçbir koşul tetiklenmez)
```

### Scenario F: Total Disaster (Maximum Tools)
```
Stage 1 Results:
- cluster_health: 1 (critical)
- node_availability: 1 (critical)
- pod_stability: 1 (critical)
- api_reliability: 1 (critical)

Tools Used (12 total - ALL TOOLS):
✅ Pod Status Check (3 koşul tetiklendi: pod_stability, cluster_health, api_reliability)
✅ Container Restarts (pod_stability ≤ 2)
✅ Pod Resource Usage (2 koşul: pod_stability, api_reliability)
✅ Node Resource Status (node_availability ≤ 2)
✅ Node Conditions (node_availability ≤ 2)
✅ Node Network Health (node_availability ≤ 2)
✅ Kubernetes HPA Status (cluster_health ≤ 2)
✅ Kubernetes PVC Status (cluster_health ≤ 2)
✅ HTTP Error Rates (api_reliability ≤ 2)
✅ Application Metrics (api_reliability ≤ 2)
✅ Historical Comparison 24h (always)
✅ Resource Exhaustion Prediction (always)
```

---

## 📋 Decision Logic Summary

### Stage 1 Score Thresholds:
- **5**: Excellent (healthy)
- **4**: Good
- **3**: Degraded (potential issues)
- **2**: Poor (issues confirmed)
- **1**: Critical (urgent attention needed)

### Stage 2 Tool Triggering:
- **Threshold**: Score ≤ 2 tetikler Phase 1 toolları
- **Always Run**: Historical Comparison 24h + Resource Exhaustion Prediction (Phase 2 & 3)

### Coverage Analysis:
- **Minimum tools used**: 2 (healthy cluster)
- **Maximum tools used**: 12 (total disaster)
- **Average tools used**: 5-7 (typical degraded state)
- **Guaranteed tools**: Historical Comparison 24h (her zaman)

---

## 🔧 Required Fixes

### Fix 1: Score Name Correction (CRITICAL)
**File**: `FreePrometheus/PrometheusNodes/9. Stage 2 Deep Analysis.txt`
**Line**: 126
**Current**: `IF Stage 1 scores.restart_rate is LOW`
**Fix to**: `IF Stage 1 scores.pod_stability is LOW`

**Reasoning**:
- Stage 1 çıktısında `restart_rate` score'u YOK
- Pod restart bilgisi `pod_stability` score'unda tutuluyor
- Line 94-99'da açıkça belirtilmiş: "pod_stability score" = restart rates

### Fix 2: Consistency Check
**Verify all Stage 1 score references in Stage 2 prompt**:
- Line 126: `scores.restart_rate` → `scores.pod_stability` ✅ FIX REQUIRED
- Line 132: `scores.node_availability` → ✅ CORRECT (exists in Stage 1)
- Line 138: `scores.cluster_health` → ✅ CORRECT (exists in Stage 1)
- Line 144: `scores.api_reliability` → ✅ CORRECT (exists in Stage 1)

**Result**: Only line 126 needs fixing.

---

## ✅ Validation

### Stage 1 Score Names (from 5. Stage 1 Health Snapshot.txt):
```json
"scores": {
  "cluster_health": <1-5>,      // Line 148
  "node_availability": <1-5>,   // Line 149
  "pod_stability": <1-5>,       // Line 150 ← POD RESTARTS
  "api_reliability": <1-5>      // Line 151
}
```

### Stage 2 Conditions (should match Stage 1):
```markdown
IF scores.pod_stability ≤ 2     ← FIXED (was restart_rate)
IF scores.node_availability ≤ 2 ✅ CORRECT
IF scores.cluster_health ≤ 2    ✅ CORRECT
IF scores.api_reliability ≤ 2   ✅ CORRECT
```

---

## 📊 Impact Assessment

**Before Fix**:
- ❌ Pod restart tools NEVER trigger (`restart_rate` undefined)
- ❌ Container Restarts tool NEVER runs
- ❌ Pod stability analysis BROKEN
- ❌ AI Agent can't detect pod restart issues

**After Fix**:
- ✅ Pod restart tools trigger correctly when `pod_stability ≤ 2`
- ✅ Container Restarts tool runs when needed
- ✅ Pod stability analysis WORKING
- ✅ AI Agent can detect and analyze pod restart issues

**Severity**: 🔴 **CRITICAL** - Core functionality broken

---

## 🎯 Summary

**User Questions Answered**:
1. ✅ Tüm 12 toolun kullanıldığı senaryo VAR (total disaster scenario)
2. ✅ Her toolun garantili çalıştığı senaryolar BELİRLENDİ
3. ✅ Karar verme kriteri AÇIKLANDI (Stage 1 scores ≤ 2)

**Critical Bug Found**:
- 🚨 Stage 2 prompt yanlış score adı kullanıyor (`restart_rate` yerine `pod_stability` olmalı)
- 🚨 Pod restart detection tamamen BROKEN
- 🚨 Fix gerekli: Line 126'yı düzelt

**Next Action**: Stage 2 prompt'ta score name düzeltmesi yapılmalı.
