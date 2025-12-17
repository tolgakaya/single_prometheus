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

# STAGE 2 TOOL FIXES

## 2. Historical Comparison 24h Tool - MISSING TOOL

**Status**: ❌ TOOL DOES NOT EXIST IN FLOW
**Severity**: HIGH
**Location**: Should be added to FreePrometheusFlow.json

### Problem:
- General_flow_infos.md satır 163-178'de "Historical Comparison 24h" tool belirtilmiş
- Bu tool Stage 2'nin 12 tool'undan biri
- Flow'da sadece 11 tool var, bu tool eksik
- Stage 2 prompt'ta Phase 2 (Trend Analysis) bu tool'a referans veriyor

### Required Tool Configuration:
```json
{
  "parameters": {
    "url": "https://prometheus.saas.etycloudbss.com/api/v1/query",
    "sendQuery": true,
    "queryParameters": {
      "parameters": [
        {
          "name": "query",
          "value": "={{ (() => { let metricQuery = $json.metric_query || 'up{job=\"kubernetes-nodes\"}'; const svc = $json.service || ''; if (svc && metricQuery === 'up{job=\"kubernetes-nodes\"}') { metricQuery = `kube_pod_container_status_restarts_total{pod=~\".*${svc}.*\"}`; } return metricQuery; })() }}"
        }
      ]
    },
    "options": {
      "timeout": 5000
    }
  },
  "name": "Historical Comparison 24h",
  "type": "n8n-nodes-base.httpRequestTool"
}
```

### Manuel Uygulama Adımları:
1. n8n flow editöründe "Stage 2: Deep Analysis" Agent node'unu aç
2. Tools bölümüne yeni HTTP Request Tool ekle
3. Tool adı: "Historical Comparison 24h"
4. URL: `https://prometheus.saas.etycloudbss.com/api/v1/query`
5. Query parameter yukarıdaki dynamic query'yi ekle
6. Timeout: 5000ms
7. Save/Deploy

### Etki:
- Stage 2 AI Agent artık trend analysis yapabilecek
- Phase 2 (10-20s) tamamlanabilecek
- "memory_growth", "restart_pattern", "peak_times" findings üretilebilecek

---

## 3. Stage 2 Tools - Namespace Filtering Issues

**Affected Tools**: 9 tools (tüm dinamik namespace kullanan tool'lar)
**Severity**: MEDIUM
**Issue**: Tools use single namespace default instead of all production namespaces

### Tools Requiring Update:

#### 3a. Pod Status Check
**Current**: `const ns = $json.namespace || 'etiyamobile-production';`
**Should Be**: Multi-namespace support or use all 12 production namespaces

#### 3b. Node Network Health
**Current**: `const ns = $json.namespace || 'etiyamobile-production';`
**Note**: Node metrics don't support namespace filtering (cluster-wide)

#### 3c. Container Restarts
**Current**: `const ns = $json.namespace || 'etiyamobile-production';`
**Should Be**: Multi-namespace support

#### 3d. Application Metrics
**Current**: `const ns = $json.namespace || 'etiyamobile-production';`
**Should Be**: Multi-namespace support

#### 3e. HTTP Error Rates
**Current**: `const ns = $json.namespace || 'etiyamobile-production';`
**Should Be**: Multi-namespace support

#### 3f. Pod Resource Usage
**Current**: `const ns = $json.namespace || 'etiyamobile-production';`
**Should Be**: Multi-namespace support

#### 3g. Resource Exhaustion Prediction
**Current**: `const ns = $json.namespace || 'etiyamobile-production';`
**Should Be**: Multi-namespace support

#### 3h. Kubernetes PVC Status
**Current**: `const ns = $json.namespace || 'etiyamobile-production';`
**Should Be**: Multi-namespace support

#### 3i. Kubernetes HPA Status
**Current**: `const ns = $json.namespace || 'etiyamobile-production';`
**Should Be**: Multi-namespace support

### Note on Namespace Handling:
Bu tool'ların hepsi dokümanda dynamic namespace kullanıyor: `$json.namespace || 'etiyamobile-production'`

**İki yaklaşım**:
1. **Dynamic approach** (Current): Force Deep Analysis Override'dan gelen namespace'i kullan
2. **Hardcoded approach** (Stage 1 style): Tüm 12 production namespace'i hardcode et

**Recommendation**: Dynamic approach kalsın çünkü:
- Force Deep Analysis Override zaten `namespaceRegex` hazırlıyor
- Farklı namespace'ler için farklı analizler yapılabilir
- Daha flexible

**Ancak validation gerekli**: `$json.namespace` boş gelirse fallback olarak tüm namespace'leri kullanmalı, sadece 'etiyamobile-production' değil.

### Suggested Fix Pattern:
```javascript
const namespaces = $json.namespaces || ['bstp-cms-global-production', 'bstp-cms-prod-v3', 'em-global-prod-3pp', 'em-global-prod-eom', 'em-global-prod-flowe', 'em-global-prod', 'em-prod-3pp', 'em-prod-eom', 'em-prod-flowe', 'em-prod', 'etiyamobile-production', 'etiyamobile-prod'];
const namespaceRegex = namespaces.join('|');
// Then use: namespace=~"${namespaceRegex}"
```

**Decision**: Bu değişiklik Stage 2 prompt optimization ile birlikte yapılabilir (LOW priority)
