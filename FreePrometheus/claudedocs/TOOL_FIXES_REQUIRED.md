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

## 3. Stage 2 Tools - Multi-Namespace Support Fix

**Status**: 🔴 CRITICAL - REQUIRES n8n FLOW EDITS
**Problem**: All Stage 2 tools use single namespace fallback instead of multi-namespace regex
**Impact**: Tools only query 1 namespace instead of all 12 production namespaces

### Required Fix Pattern:

**YANLIŞ (Mevcut):**
```javascript
const ns = $json.namespace || 'etiyamobile-production';
// Query: namespace="${ns}"
```

**DOĞRU (Olması Gereken):**
```javascript
const namespaceRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
// Query: namespace=~"${namespaceRegex}"
```

---

### c. Pod Status Check - Multi-Namespace Fix
**Mevcut Query (YANLIŞ):**
```javascript
{{
(() => {
  const ns = $json.namespace || 'etiyamobile-production';
  const svc = $json.service || '';

  if (svc) {
    return `kube_pod_container_status_restarts_total{namespace="${ns}", pod=~".*${svc}.*"} or kube_pod_container_status_waiting_reason{namespace="${ns}", pod=~".*${svc}.*"} or kube_pod_status_phase{namespace="${ns}", pod=~".*${svc}.*"}`;
  } else {
    return `topk(20, kube_pod_container_status_restarts_total{namespace="${ns}"} > 0) or topk(20, kube_pod_container_status_waiting_reason{namespace="${ns}", reason!='ContainerCreating'}) or topk(20, kube_pod_status_phase{namespace="${ns}", phase=~'Failed|Unknown|Pending'} == 1)`;
  }
})()
}}
```

**Düzeltilmiş Query (DOĞRU):**
```javascript
{{
(() => {
  const namespaceRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
  const svc = $json.service || '';

  if (svc) {
    return `kube_pod_container_status_restarts_total{namespace=~"${namespaceRegex}", pod=~".*${svc}.*"} or kube_pod_container_status_waiting_reason{namespace=~"${namespaceRegex}", pod=~".*${svc}.*"} or kube_pod_status_phase{namespace=~"${namespaceRegex}", pod=~".*${svc}.*"}`;
  } else {
    return `topk(20, kube_pod_container_status_restarts_total{namespace=~"${namespaceRegex}"} > 0) or topk(20, kube_pod_container_status_waiting_reason{namespace=~"${namespaceRegex}", reason!='ContainerCreating'}) or topk(20, kube_pod_status_phase{namespace=~"${namespaceRegex}", phase=~'Failed|Unknown|Pending'} == 1)`;
  }
})()
}}
```

---

### d. Node Network Health - Multi-Namespace Fix
**NOT**: Node metrikleri namespace kullanmaz, bu tool için değişiklik GEREKMEZ.

**Mevcut Query (DOĞRU - değiştirme):**
```javascript
{{
(() => {
  const ns = $json.namespace || 'etiyamobile-production';

  return `sum by (node, device) (rate(node_network_receive_errs_total{device!~"lo|veth.*|docker.*|flannel.*|cali.*|cbr.*"}[5m])) > 0 or sum by (node, device) (rate(node_network_transmit_errs_total{device!~"lo|veth.*|docker.*|flannel.*|cali.*|cbr.*"}[5m])) > 0 or sum by (node) (rate(node_network_receive_drop_total[5m])) > 0`;
})()
}}
```

---

### e. Container Restarts - Multi-Namespace Fix
**Mevcut Query (YANLIŞ):**
```javascript
{{
(() => {
  const ns = $json.namespace || 'etiyamobile-production';
  const svc = $json.service || '';

  if (svc) {
    return `topk(10, sum by (namespace, pod, container) (kube_pod_container_status_restarts_total{namespace="${ns}", pod=~".*${svc}.*"})) or topk(10, sum by (namespace, pod, container, reason) (kube_pod_container_status_last_terminated_reason{namespace="${ns}", pod=~".*${svc}.*", reason!="Completed"}))`;
  } else {
    return `topk(10, sum by (namespace, pod, container) (kube_pod_container_status_restarts_total)) or topk(10, sum by (namespace, pod, container, reason) (kube_pod_container_status_last_terminated_reason{reason!="Completed"}))`;
  }
})()
}}
```

**Düzeltilmiş Query (DOĞRU):**
```javascript
{{
(() => {
  const namespaceRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
  const svc = $json.service || '';

  if (svc) {
    return `topk(10, sum by (namespace, pod, container) (kube_pod_container_status_restarts_total{namespace=~"${namespaceRegex}", pod=~".*${svc}.*"})) or topk(10, sum by (namespace, pod, container, reason) (kube_pod_container_status_last_terminated_reason{namespace=~"${namespaceRegex}", pod=~".*${svc}.*", reason!="Completed"}))`;
  } else {
    return `topk(10, sum by (namespace, pod, container) (kube_pod_container_status_restarts_total{namespace=~"${namespaceRegex}"})) or topk(10, sum by (namespace, pod, container, reason) (kube_pod_container_status_last_terminated_reason{namespace=~"${namespaceRegex}", reason!="Completed"}))`;
  }
})()
}}
```

---

### f. Application Metrics - Multi-Namespace Fix
**Mevcut Query (YANLIŞ):**
```javascript
{{
(() => {
  const ns = $json.namespace || 'etiyamobile-production';
  const svc = $json.service || '';

  if (svc) {
    return `topk(10, sum by (namespace, pod) (rate(container_network_receive_bytes_total{namespace="${ns}", pod=~".*${svc}.*"}[5m]))) or topk(10, sum by (namespace, pod) (rate(container_network_transmit_bytes_total{namespace="${ns}", pod=~".*${svc}.*"}[5m])))`;
  } else {
    return `topk(10, sum by (namespace, pod) (rate(container_network_receive_bytes_total{namespace="${ns}"}[5m]))) or topk(10, sum by (namespace, pod) (rate(container_network_transmit_bytes_total{namespace="${ns}"}[5m])))`;
  }
})()
}}
```

**Düzeltilmiş Query (DOĞRU):**
```javascript
{{
(() => {
  const namespaceRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
  const svc = $json.service || '';

  if (svc) {
    return `topk(10, sum by (namespace, pod) (rate(container_network_receive_bytes_total{namespace=~"${namespaceRegex}", pod=~".*${svc}.*"}[5m]))) or topk(10, sum by (namespace, pod) (rate(container_network_transmit_bytes_total{namespace=~"${namespaceRegex}", pod=~".*${svc}.*"}[5m])))`;
  } else {
    return `topk(10, sum by (namespace, pod) (rate(container_network_receive_bytes_total{namespace=~"${namespaceRegex}"}[5m]))) or topk(10, sum by (namespace, pod) (rate(container_network_transmit_bytes_total{namespace=~"${namespaceRegex}"}[5m])))`;
  }
})()
}}
```

---

### g. HTTP Error Rates - Multi-Namespace Fix
**Mevcut Query (YANLIŞ):**
```javascript
{{
(() => {
  const ns = $json.namespace || 'etiyamobile-production';
  const svc = $json.service || '';

  if (svc) {
    return `topk(10, sum by (namespace, pod) (kube_pod_status_phase{namespace="${ns}", pod=~".*${svc}.*", phase=~"Failed|Unknown"} == 1)) or topk(10, sum by (namespace, pod, reason) (kube_pod_container_status_waiting_reason{namespace="${ns}", pod=~".*${svc}.*", reason!="ContainerCreating"}))`;
  } else {
    return `topk(10, sum by (namespace, pod) (kube_pod_status_phase{namespace="${ns}", phase=~"Failed|Unknown"} == 1)) or topk(10, sum by (namespace, pod, reason) (kube_pod_container_status_waiting_reason{namespace="${ns}", reason!="ContainerCreating"}))`;
  }
})()
}}
```

**Düzeltilmiş Query (DOĞRU):**
```javascript
{{
(() => {
  const namespaceRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
  const svc = $json.service || '';

  if (svc) {
    return `topk(10, sum by (namespace, pod) (kube_pod_status_phase{namespace=~"${namespaceRegex}", pod=~".*${svc}.*", phase=~"Failed|Unknown"} == 1)) or topk(10, sum by (namespace, pod, reason) (kube_pod_container_status_waiting_reason{namespace=~"${namespaceRegex}", pod=~".*${svc}.*", reason!="ContainerCreating"}))`;
  } else {
    return `topk(10, sum by (namespace, pod) (kube_pod_status_phase{namespace=~"${namespaceRegex}", phase=~"Failed|Unknown"} == 1)) or topk(10, sum by (namespace, pod, reason) (kube_pod_container_status_waiting_reason{namespace=~"${namespaceRegex}", reason!="ContainerCreating"}))`;
  }
})()
}}
```

---

### h. Pod Resource Usage - Multi-Namespace Fix
**Mevcut Query (YANLIŞ):**
```javascript
{{
(() => {
  const ns = $json.namespace || 'etiyamobile-production';
  const svc = $json.service || '';

  if (svc) {
    return `topk(10, container_memory_working_set_bytes{namespace="${ns}", pod=~".*${svc}.*", container!=""}) or topk(10, rate(container_cpu_usage_seconds_total{namespace="${ns}", pod=~".*${svc}.*", container!=""}[5m]))`;
  } else {
    return `topk(10, container_memory_working_set_bytes{namespace="${ns}", container!=""}) or topk(10, rate(container_cpu_usage_seconds_total{namespace="${ns}", container!=""}[5m]))`;
  }
})()
}}
```

**Düzeltilmiş Query (DOĞRU):**
```javascript
{{
(() => {
  const namespaceRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
  const svc = $json.service || '';

  if (svc) {
    return `topk(10, container_memory_working_set_bytes{namespace=~"${namespaceRegex}", pod=~".*${svc}.*", container!=""}) or topk(10, rate(container_cpu_usage_seconds_total{namespace=~"${namespaceRegex}", pod=~".*${svc}.*", container!=""}[5m]))`;
  } else {
    return `topk(10, container_memory_working_set_bytes{namespace=~"${namespaceRegex}", container!=""}) or topk(10, rate(container_cpu_usage_seconds_total{namespace=~"${namespaceRegex}", container!=""}[5m]))`;
  }
})()
}}
```

---

### i. Resource Exhaustion Prediction - Multi-Namespace Fix
**Mevcut Query (YANLIŞ):**
```javascript
{{
(() => {
  const ns = $json.namespace || 'etiyamobile-production';
  const svc = $json.service || '';

  if (svc) {
    return `predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[1h], 4*3600) < 0 or predict_linear(container_memory_working_set_bytes{namespace="${ns}", pod=~".*${svc}.*"}[1h], 4*3600) > container_spec_memory_limit_bytes{namespace="${ns}", pod=~".*${svc}.*"} or predict_linear(kubelet_volume_stats_available_bytes{namespace="${ns}", persistentvolumeclaim=~".*${svc}.*"}[1h], 4*3600) < 1073741824`;
  } else {
    return `predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[1h], 4*3600) < 0 or predict_linear(node_memory_MemAvailable_bytes[1h], 4*3600) < 1073741824 or predict_linear(kubelet_volume_stats_available_bytes[1h], 4*3600) < 1073741824 or (kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes) > 0.85`;
  }
})()
}}
```

**Düzeltilmiş Query (DOĞRU):**
```javascript
{{
(() => {
  const namespaceRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
  const svc = $json.service || '';

  if (svc) {
    return `predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[1h], 4*3600) < 0 or predict_linear(container_memory_working_set_bytes{namespace=~"${namespaceRegex}", pod=~".*${svc}.*"}[1h], 4*3600) > container_spec_memory_limit_bytes{namespace=~"${namespaceRegex}", pod=~".*${svc}.*"} or predict_linear(kubelet_volume_stats_available_bytes{namespace=~"${namespaceRegex}", persistentvolumeclaim=~".*${svc}.*"}[1h], 4*3600) < 1073741824`;
  } else {
    return `predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[1h], 4*3600) < 0 or predict_linear(node_memory_MemAvailable_bytes[1h], 4*3600) < 1073741824 or predict_linear(kubelet_volume_stats_available_bytes{namespace=~"${namespaceRegex}"}[1h], 4*3600) < 1073741824 or (kubelet_volume_stats_used_bytes{namespace=~"${namespaceRegex}"} / kubelet_volume_stats_capacity_bytes{namespace=~"${namespaceRegex}"}) > 0.85`;
  }
})()
}}
```

---

### j. Historical Comparison 24h - No Fix Needed
**NOT**: Bu tool AI tarafından dinamik metric_query alır, namespace filtering AI'ın sorumluluğunda.

**Mevcut Query (DOĞRU - değiştirme):**
```javascript
{{
(() => {
  let metricQuery = $json.metric_query || 'up{job="kubernetes-nodes"}';
  const svc = $json.service || '';

  if (svc && metricQuery === 'up{job="kubernetes-nodes"}') {
    metricQuery = `kube_pod_container_status_restarts_total{pod=~".*${svc}.*"}`;
  }

  return metricQuery;
})()
}}
```

---

### k. Kubernetes PVC Status - Multi-Namespace Fix
**Mevcut Query (YANLIŞ):**
```javascript
{{
(() => {
  const ns = $json.namespace || 'etiyamobile-production';
  const svc = $json.service || '';

  if (svc) {
    return `(kubelet_volume_stats_used_bytes{namespace="${ns}", persistentvolumeclaim=~".*${svc}.*"} / kubelet_volume_stats_capacity_bytes{namespace="${ns}", persistentvolumeclaim=~".*${svc}.*"} > 0.8) * on(namespace, persistentvolumeclaim) group_left(storageclass, volumename) kube_persistentvolumeclaim_info{namespace="${ns}", persistentvolumeclaim=~".*${svc}.*"} or kube_persistentvolumeclaim_status_phase{namespace="${ns}", persistentvolumeclaim=~".*${svc}.*", phase!="Bound"} == 1`;
  } else {
    return `(kubelet_volume_stats_used_bytes{namespace="${ns}"} / kubelet_volume_stats_capacity_bytes{namespace="${ns}"} > 0.8) * on(namespace, persistentvolumeclaim) group_left(storageclass, volumename) kube_persistentvolumeclaim_info{namespace="${ns}"} or kube_persistentvolumeclaim_status_phase{namespace="${ns}", phase!="Bound"} == 1`;
  }
})()
}}
```

**Düzeltilmiş Query (DOĞRU):**
```javascript
{{
(() => {
  const namespaceRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
  const svc = $json.service || '';

  if (svc) {
    return `(kubelet_volume_stats_used_bytes{namespace=~"${namespaceRegex}", persistentvolumeclaim=~".*${svc}.*"} / kubelet_volume_stats_capacity_bytes{namespace=~"${namespaceRegex}", persistentvolumeclaim=~".*${svc}.*"} > 0.8) * on(namespace, persistentvolumeclaim) group_left(storageclass, volumename) kube_persistentvolumeclaim_info{namespace=~"${namespaceRegex}", persistentvolumeclaim=~".*${svc}.*"} or kube_persistentvolumeclaim_status_phase{namespace=~"${namespaceRegex}", persistentvolumeclaim=~".*${svc}.*", phase!="Bound"} == 1`;
  } else {
    return `(kubelet_volume_stats_used_bytes{namespace=~"${namespaceRegex}"} / kubelet_volume_stats_capacity_bytes{namespace=~"${namespaceRegex}"} > 0.8) * on(namespace, persistentvolumeclaim) group_left(storageclass, volumename) kube_persistentvolumeclaim_info{namespace=~"${namespaceRegex}"} or kube_persistentvolumeclaim_status_phase{namespace=~"${namespaceRegex}", phase!="Bound"} == 1`;
  }
})()
}}
```

---

### l. Kubernetes HPA Status - Multi-Namespace Fix
**Mevcut Query (YANLIŞ):**
```javascript
{{
(() => {
  const ns = $json.namespace || 'etiyamobile-production';
  const svc = $json.service || '';

  if (svc) {
    return `(kube_horizontalpodautoscaler_status_current_replicas{namespace="${ns}", horizontalpodautoscaler=~".*${svc}.*"} / kube_horizontalpodautoscaler_spec_max_replicas{namespace="${ns}", horizontalpodautoscaler=~".*${svc}.*"}) > 0.9 or kube_horizontalpodautoscaler_status_condition{namespace="${ns}", horizontalpodautoscaler=~".*${svc}.*", condition="ScalingLimited", status="true"} == 1`;
  } else {
    return `(kube_horizontalpodautoscaler_status_current_replicas{namespace="${ns}"} / kube_horizontalpodautoscaler_spec_max_replicas{namespace="${ns}"}) > 0.9 or (kube_horizontalpodautoscaler_status_current_replicas{namespace="${ns}"} == kube_horizontalpodautoscaler_spec_max_replicas{namespace="${ns}"}) or kube_horizontalpodautoscaler_status_condition{namespace="${ns}", condition="ScalingLimited", status="true"} == 1`;
  }
})()
}}
```

**Düzeltilmiş Query (DOĞRU):**
```javascript
{{
(() => {
  const namespaceRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
  const svc = $json.service || '';

  if (svc) {
    return `(kube_horizontalpodautoscaler_status_current_replicas{namespace=~"${namespaceRegex}", horizontalpodautoscaler=~".*${svc}.*"} / kube_horizontalpodautoscaler_spec_max_replicas{namespace=~"${namespaceRegex}", horizontalpodautoscaler=~".*${svc}.*"}) > 0.9 or kube_horizontalpodautoscaler_status_condition{namespace=~"${namespaceRegex}", horizontalpodautoscaler=~".*${svc}.*", condition="ScalingLimited", status="true"} == 1`;
  } else {
    return `(kube_horizontalpodautoscaler_status_current_replicas{namespace=~"${namespaceRegex}"} / kube_horizontalpodautoscaler_spec_max_replicas{namespace=~"${namespaceRegex}"}) > 0.9 or (kube_horizontalpodautoscaler_status_current_replicas{namespace=~"${namespaceRegex}"} == kube_horizontalpodautoscaler_spec_max_replicas{namespace=~"${namespaceRegex}"}) or kube_horizontalpodautoscaler_status_condition{namespace=~"${namespaceRegex}", condition="ScalingLimited", status="true"} == 1`;
  }
})()
}}
```

---

## Summary: Tools Requiring Multi-Namespace Fix

**9 tools need fixes** (namespace filtering):
1. ✅ c. Pod Status Check
2. ❌ d. Node Network Health (node metrics - no namespace)
3. ✅ e. Container Restarts
4. ✅ f. Application Metrics
5. ✅ g. HTTP Error Rates
6. ✅ h. Pod Resource Usage
7. ✅ i. Resource Exhaustion Prediction
8. ❌ j. Historical Comparison 24h (AI controlled)
9. ✅ k. Kubernetes PVC Status
10. ✅ l. Kubernetes HPA Status

**Key Changes:**
- `const ns = $json.namespace || 'etiyamobile-production'` → `const namespaceRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|...'`
- `namespace="${ns}"` → `namespace=~"${namespaceRegex}"`

**Impact:**
- Tools will now query ALL 12 production namespaces instead of just 1
- Stage 2 analysis will have complete cluster visibility
- No more missed issues in other namespaces
