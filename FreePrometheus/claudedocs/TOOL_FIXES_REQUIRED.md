# HTTP Tool Fixes Required

Bu dokümandaki değişikliklerin n8n flow editöründe manuel olarak yapılması gerekiyor.

## 1. Quick Cluster Health Tool - Query Parameter Fix

**Tool Name**: Quick Cluster Health
**Tool ID**: 70faf0f9-1adf-42b3-93f4-5f18e1f3fad7
**Location**: FreePrometheusFlow.json (line ~247)

### Current Query Parameter (YANLIŞ):
```promql
(sum(kube_node_status_condition{condition="Ready",status="false",namespace=~"{{ $json.namespaceRegex }}"} == 1) > 0) or (sum(rate(kube_pod_container_status_restarts_total{namespace=~"{{ $json.namespaceRegex }}"}[5m]) > 0.1) > 0)
```

### Required Query Parameter (DOĞRU - General_flow_infos.md'den):
```promql
(sum(kube_node_status_condition{condition="Ready",status="false",namespace=~"bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod"} == 1) > 0) or (sum(rate(kube_pod_container_status_restarts_total{namespace=~"bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod"}[5m]) > 0.1) > 0)
```

### Değişiklik Sebebi:
- Kural 11: Sorgu parametresi amacı dışında değiştirilmemeli
- Kural 12: Namespace listesi hardcoded olarak tüm production namespace'leri içermeli
- General_flow_infos.md satır 32-35'te bu sorgu açıkça belirtilmiş
- `{{ $json.namespaceRegex }}` yerine hardcoded namespace listesi kullanılmalı

### Manuel Uygulama Adımları:
1. n8n flow editöründe "Quick Cluster Health" HTTP tool'una tıkla
2. Query Parameters bölümünde "query" parametresini bul
3. Yukarıdaki "Required Query Parameter" değerini kopyala
4. Eski değeri sil, yeni değeri yapıştır
5. Save/Deploy

### Etki:
- Query artık doğru namespace'lerde sorgulama yapacak
- Stage 1 Agent gerçek veri alacak (boş sonuç yerine)
- `proceed_to_stage2` doğru hesaplanacak

---

## Validation:
Bu değişiklik yapıldıktan sonra Stage 1 çalıştırıldığında:
- Quick Cluster Health tool'u data dönmeli (boş array değil)
- Stage 1 Output'ta `overall_status: "unknown"` olmamalı
- `proceed_to_stage2: true` olmalı (eğer cluster healthy ise false)

---

# STAGE 2 IMPROVEMENTS

## 2. Stage 2 Prompt - COMPLETED IMPROVEMENTS ✅

**Status**: ✅ IMPROVEMENTS APPLIED
**Location**: FreePrometheus/PrometheusNodes/9. Stage 2 Deep Analysis.txt

### Changes Made:

#### A. Added Decision Logic (lines 62-84):
- Explicit conditions for when to set `proceed_to_stage3 = true`
- Explicit conditions for when to set `proceed_to_stage3 = false`
- Default to true if uncertain (better to correlate alerts than miss issues)

#### B. Added Confidence Calculation (lines 86-118):
- Formula for calculating root_cause.confidence (0.0 - 1.0)
- 5 factors with specific weights:
  - Multiple tools agreement (+0.3)
  - Evidence depth (+0.2)
  - Stage 1 correlation (+0.2)
  - Historical pattern (+0.2)
  - Blast radius clarity (+0.1)
- Concrete examples showing confidence calculation

#### C. Fixed Tool Name Mismatches (lines 120-146):
- Changed "Node Status Check" → "Node Resource Status"
- Changed "Node Resource Usage" → "Node Conditions" + "Node Resource Status"
- Removed non-existent tools: "Service Endpoints Health", "Ingress Status"
- Added explicit tool selection based on Stage 1 scores

#### D. Added Historical Comparison 24h Usage Instructions (lines 148-181):
- Explained that tool requires `metric_query` parameter
- Provided 3 concrete examples:
  - For restart trends
  - For memory growth
  - For CPU trends
- Showed how to use `{{ $json.namespaceRegex }}` in queries

#### E. CRITICAL FIX - Score Name Mismatch (line 126):
- Changed `scores.restart_rate` → `scores.pod_stability`
- **Problem**: Stage 2 referenced non-existent score name (`restart_rate` doesn't exist in Stage 1)
- **Impact**: Pod restart tools were NEVER triggered (critical functionality broken)
- **Solution**: Use correct Stage 1 score name `pod_stability` which contains pod restart data
- **Stage 1 scores**: cluster_health, node_availability, pod_stability, api_reliability

### Impact:
- ✅ AI will make consistent decisions about `proceed_to_stage3`
- ✅ AI will calculate objective confidence scores (not guessing)
- ✅ AI will call correct tools that exist in flow
- ✅ AI will properly use Historical Comparison 24h for trend analysis
- ✅ Pod restart detection now WORKING (was completely broken)

---

## 3. Stage 2 Tools - Namespace Filtering (LOW PRIORITY - Optional Optimization)

**Status**: ⚠️ OPTIONAL IMPROVEMENT (Not Critical)
**Affected Tools**: 9 tools (Pod Status Check, Container Restarts, Application Metrics, HTTP Error Rates, Pod Resource Usage, Resource Exhaustion Prediction, Kubernetes PVC Status, Kubernetes HPA Status)
**Current Behavior**: Tools use `$json.namespace || 'etiyamobile-production'` as fallback

### Current Analysis:

**✅ Dynamic Approach is WORKING CORRECTLY:**
- Force Deep Analysis Override passes `namespaceRegex` to Stage 2 prompt
- Stage 2 prompt instructs AI to use `{{ $json.namespaceRegex }}` in queries
- Tools receive namespace from AI's tool call parameters
- Fallback to 'etiyamobile-production' only happens if AI doesn't pass namespace

**⚠️ Potential Minor Issue:**
- Single namespace fallback ('etiyamobile-production') vs all 12 namespaces
- Only matters if AI Agent forgets to pass namespace parameter

### Recommendation: KEEP CURRENT APPROACH ✅

**Reasons**:
1. **Flexibility**: Dynamic approach allows targeted analysis per namespace
2. **Force Override Works**: `namespaceRegex` is already prepared and passed
3. **Prompt Instructs Correctly**: Stage 2 prompt has clear namespace usage instructions
4. **Fallback is Acceptable**: Single namespace fallback is reasonable default

### Optional Future Improvement (LOW PRIORITY):

IF you want to improve fallback behavior, change tool queries from:
```javascript
const ns = $json.namespace || 'etiyamobile-production';
```

TO:
```javascript
const DEFAULT_NAMESPACES = ['bstp-cms-global-production', 'bstp-cms-prod-v3', 'em-global-prod-3pp', 'em-global-prod-eom', 'em-global-prod-flowe', 'em-global-prod', 'em-prod-3pp', 'em-prod-eom', 'em-prod-flowe', 'em-prod', 'etiyamobile-production', 'etiyamobile-prod'];
const namespaceRegex = $json.namespaceRegex || DEFAULT_NAMESPACES.join('|');
// Then use: namespace=~"${namespaceRegex}"
```

**Impact**: Minimal. Only affects cases where AI doesn't pass namespace parameter.
**Decision**: Can be done later as optimization. Not critical for functionality.
