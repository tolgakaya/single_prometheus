# n8n HTTP Request Tool Configuration Fix

## Problem

AI Agent'ın kullandığı **HTTP Request (Prometheus Query) tool**'ların query parametrelerinde hardcoded namespace kullanılıyor:

```javascript
// ❌ WRONG - Hardcoded namespace
const ns = $json.namespace || 'etiyamobile-production';
query: `count by (namespace, service, pod) (up{namespace="${ns}", service!="", pod!=""})`
```

Bu query sadece **1 namespace** sorgular, oysa **12 namespace** sorgulanmalı.

## Solution

Tool'ların query parametrelerini **namespaceRegex** kullanacak şekilde güncelle:

```javascript
// ✅ CORRECT - Dynamic namespace regex
const nsRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
query: `count by (namespace, service, pod) (up{namespace=~"${nsRegex}", service!="", pod!=""})`
```

## n8n UI'da Değişiklik Yapılacak Tool'lar

### Stage 1 Tools (Health Snapshot)

#### 1. **List Kubernetes Services** Tool
**Bulunacak yer:** Stage 1 AI Agent → Tools → HTTP Request

**Mevcut query parametresi:**
```javascript
{{
(() => {
  const ns = $json.namespace || 'etiyamobile-production';
  return `count by (namespace, service, pod) (up{namespace="${ns}", service!="", pod!=""})`;
})()
}}
```

**Yeni query parametresi:**
```javascript
{{
(() => {
  // Namespace regex'i al, yoksa default listeyi kullan
  const nsRegex = $json.namespaceRegex ||
    'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';

  // Service regex'i al
  const svcRegex = $json.serviceRegex || '.*';

  // Ready-to-use query varsa direkt kullan
  if ($json.queryHelpers?.exampleQueries?.podCount) {
    return $json.queryHelpers.exampleQueries.podCount;
  }

  // Yoksa manuel oluştur
  return `count by (namespace, service, pod) (up{namespace=~"${nsRegex}", service!="", pod!=""})`;
})()
}}
```

---

### Stage 2 Tools (Deep Analysis)

#### 2. **Pod Status Check** Tool
**Mevcut:**
```javascript
const ns = $json.namespace || 'etiyamobile-production';
const svc = $json.service || '';

if (svc) {
  return `kube_pod_container_status_restarts_total{namespace="${ns}", pod=~".*${svc}.*"}`;
} else {
  return `topk(20, kube_pod_container_status_restarts_total{namespace="${ns}"} > 0)`;
}
```

**Yeni:**
```javascript
const nsRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
const svcRegex = $json.serviceRegex || '.*';

if ($json.serviceRegex && $json.serviceRegex !== '.*') {
  // Service filter varsa
  return `kube_pod_container_status_restarts_total{namespace=~"${nsRegex}", pod=~".*${svcRegex}.*"} or kube_pod_container_status_waiting_reason{namespace=~"${nsRegex}", pod=~".*${svcRegex}.*"} or kube_pod_status_phase{namespace=~"${nsRegex}", pod=~".*${svcRegex}.*"}`;
} else {
  // Tüm servisler
  return `topk(20, kube_pod_container_status_restarts_total{namespace=~"${nsRegex}"} > 0) or topk(20, kube_pod_container_status_waiting_reason{namespace=~"${nsRegex}", reason!='ContainerCreating'}) or topk(20, kube_pod_status_phase{namespace=~"${nsRegex}", phase=~'Failed|Unknown|Pending'} == 1)`;
}
```

#### 3. **Network Health Check** Tool
**Mevcut:**
```javascript
const ns = $json.namespace || 'etiyamobile-production';
return `sum by (node, device) (rate(node_network_receive_errs_total{device!~"lo|veth.*|docker.*|flannel.*|cali.*|cbr.*"}[5m])) > 0`;
```

**Yeni:**
```javascript
// Network metrikleri node-level olduğu için namespace filter gerekmiyor
// Ama consistency için namespace bilgisini debug'da tut
const nsRegex = $json.namespaceRegex || 'all';
return `sum by (node, device) (rate(node_network_receive_errs_total{device!~"lo|veth.*|docker.*|flannel.*|cali.*|cbr.*"}[5m])) > 0 or sum by (node, device) (rate(node_network_transmit_errs_total{device!~"lo|veth.*|docker.*|flannel.*|cali.*|cbr.*"}[5m])) > 0`;
```

#### 4. **Container Restarts** Tool
**Mevcut:**
```javascript
const ns = $json.namespace || 'etiyamobile-production';
const svc = $json.service || '';

if (svc) {
  return `topk(10, sum by (namespace, pod, container) (kube_pod_container_status_restarts_total{namespace="${ns}", pod=~".*${svc}.*"}))`;
}
```

**Yeni:**
```javascript
const nsRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
const svcRegex = $json.serviceRegex || '.*';

if ($json.serviceRegex && $json.serviceRegex !== '.*') {
  return `topk(10, sum by (namespace, pod, container) (kube_pod_container_status_restarts_total{namespace=~"${nsRegex}", pod=~".*${svcRegex}.*"})) or topk(10, sum by (namespace, pod, container, reason) (kube_pod_container_status_last_terminated_reason{namespace=~"${nsRegex}", pod=~".*${svcRegex}.*", reason!="Completed"}))`;
} else {
  return `topk(10, sum by (namespace, pod, container) (kube_pod_container_status_restarts_total{namespace=~"${nsRegex}"})) or topk(10, sum by (namespace, pod, container, reason) (kube_pod_container_status_last_terminated_reason{namespace=~"${nsRegex}", reason!="Completed"}))`;
}
```

#### 5. **Pod Resource Usage** Tool
**Mevcut:**
```javascript
const ns = $json.namespace || 'etiyamobile-production';
const svc = $json.service || '';

if (svc) {
  return `topk(10, container_memory_working_set_bytes{namespace="${ns}", pod=~".*${svc}.*", container!=""})`;
} else {
  return `topk(10, container_memory_working_set_bytes{namespace="${ns}", container!=""})`;
}
```

**Yeni:**
```javascript
const nsRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
const svcRegex = $json.serviceRegex || '.*';

if ($json.serviceRegex && $json.serviceRegex !== '.*') {
  return `topk(10, container_memory_working_set_bytes{namespace=~"${nsRegex}", pod=~".*${svcRegex}.*", container!=""}) or topk(10, rate(container_cpu_usage_seconds_total{namespace=~"${nsRegex}", pod=~".*${svcRegex}.*", container!=""}[5m]))`;
} else {
  return `topk(10, container_memory_working_set_bytes{namespace=~"${nsRegex}", container!=""}) or topk(10, rate(container_cpu_usage_seconds_total{namespace=~"${nsRegex}", container!=""}[5m]))`;
}
```

#### 6. **Service Endpoints Health** Tool
**Mevcut:**
```javascript
const ns = $json.namespace || 'etiyamobile-production';
const svc = $json.service || '';

if (svc) {
  return `topk(10, sum by (namespace, pod) (rate(container_network_receive_bytes_total{namespace="${ns}", pod=~".*${svc}.*"}[5m])))`;
}
```

**Yeni:**
```javascript
const nsRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
const svcRegex = $json.serviceRegex || '.*';

if ($json.serviceRegex && $json.serviceRegex !== '.*') {
  return `topk(10, sum by (namespace, pod) (rate(container_network_receive_bytes_total{namespace=~"${nsRegex}", pod=~".*${svcRegex}.*"}[5m]))) or topk(10, sum by (namespace, pod) (rate(container_network_transmit_bytes_total{namespace=~"${nsRegex}", pod=~".*${svcRegex}.*"}[5m])))`;
} else {
  return `topk(10, sum by (namespace, pod) (rate(container_network_receive_bytes_total{namespace=~"${nsRegex}"}[5m]))) or topk(10, sum by (namespace, pod) (rate(container_network_transmit_bytes_total{namespace=~"${nsRegex}"}[5m])))`;
}
```

#### 7. **Ingress Status** Tool
**Mevcut:**
```javascript
const ns = $json.namespace || 'etiyamobile-production';
const svc = $json.service || '';

if (svc) {
  return `topk(10, sum by (namespace, pod) (kube_pod_status_phase{namespace="${ns}", pod=~".*${svc}.*", phase=~"Failed|Unknown"} == 1))`;
}
```

**Yeni:**
```javascript
const nsRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
const svcRegex = $json.serviceRegex || '.*';

if ($json.serviceRegex && $json.serviceRegex !== '.*') {
  return `topk(10, sum by (namespace, pod) (kube_pod_status_phase{namespace=~"${nsRegex}", pod=~".*${svcRegex}.*", phase=~"Failed|Unknown"} == 1)) or topk(10, sum by (namespace, pod, reason) (kube_pod_container_status_waiting_reason{namespace=~"${nsRegex}", pod=~".*${svcRegex}.*", reason!="ContainerCreating"}))`;
} else {
  return `topk(10, sum by (namespace, pod) (kube_pod_status_phase{namespace=~"${nsRegex}", phase=~"Failed|Unknown"} == 1)) or topk(10, sum by (namespace, pod, reason) (kube_pod_container_status_waiting_reason{namespace=~"${nsRegex}", reason!="ContainerCreating"}))`;
}
```

#### 8. **Resource Exhaustion Prediction** Tool
**Mevcut:**
```javascript
const ns = $json.namespace || 'etiyamobile-production';
const svc = $json.service || '';

if (svc) {
  return `predict_linear(container_memory_working_set_bytes{namespace="${ns}", pod=~".*${svc}.*"}[1h], 4*3600) > container_spec_memory_limit_bytes{namespace="${ns}", pod=~".*${svc}.*"}`;
}
```

**Yeni:**
```javascript
const nsRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
const svcRegex = $json.serviceRegex || '.*';

if ($json.serviceRegex && $json.serviceRegex !== '.*') {
  return `predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[1h], 4*3600) < 0 or predict_linear(container_memory_working_set_bytes{namespace=~"${nsRegex}", pod=~".*${svcRegex}.*"}[1h], 4*3600) > container_spec_memory_limit_bytes{namespace=~"${nsRegex}", pod=~".*${svcRegex}.*"} or predict_linear(kubelet_volume_stats_available_bytes{namespace=~"${nsRegex}", persistentvolumeclaim=~".*${svcRegex}.*"}[1h], 4*3600) < 1073741824`;
} else {
  return `predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[1h], 4*3600) < 0 or predict_linear(node_memory_MemAvailable_bytes[1h], 4*3600) < 1073741824 or predict_linear(kubelet_volume_stats_available_bytes{namespace=~"${nsRegex}"}[1h], 4*3600) < 1073741824 or (kubelet_volume_stats_used_bytes{namespace=~"${nsRegex}"} / kubelet_volume_stats_capacity_bytes{namespace=~"${nsRegex}"}) > 0.85`;
}
```

#### 9. **Anomaly Patterns** Tool
**Mevcut:**
```javascript
const ns = $json.namespace || 'etiyamobile-production';
const svc = $json.service || '';

if (svc) {
  return `stddev_over_time(rate(container_cpu_usage_seconds_total{namespace="${ns}", pod=~".*${svc}.*"}[5m])[2h:]) > 0.3`;
}
```

**Yeni:**
```javascript
const nsRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';
const svcRegex = $json.serviceRegex || '.*';

if ($json.serviceRegex && $json.serviceRegex !== '.*') {
  return `stddev_over_time(rate(container_cpu_usage_seconds_total{namespace=~"${nsRegex}", pod=~".*${svcRegex}.*"}[5m])[2h:]) > 0.3 or stddev_over_time(container_memory_working_set_bytes{namespace=~"${nsRegex}", pod=~".*${svcRegex}.*"}[2h:]) > 2147483648`;
} else {
  return `stddev_over_time(rate(container_cpu_usage_seconds_total{namespace=~"${nsRegex}"}[5m])[2h:]) > 0.3 or stddev_over_time(container_memory_working_set_bytes{namespace=~"${nsRegex}"}[2h:]) > 2147483648`;
}
```

---

### Stage 3 Tools (Alert Intelligence)

#### 10. **SLO Status Check Tools** (Multiple tools with namespace parameter)

**Her bir SLO tool için:**

**Mevcut:**
```javascript
{
  "namespace": "{{ $json._context.initialParams.namespaces[0] || 'etiyamobile-production' }}",
  "service": "{{ $json.output.correlation_matrix.affected_services && $json.output.correlation_matrix.affected_services[0] || '' }}"
}
```

**Yeni:**
```javascript
{
  "namespaceRegex": "{{ $json.namespaceRegex || 'bstp-cms-global-production|...' }}",
  "serviceRegex": "{{ $json.serviceRegex || '.*' }}"
}
```

**Ve query'lerde:**
```javascript
// Önceki: namespace="${params.namespace}"
// Yeni:     namespace=~"${params.namespaceRegex}"
```

---

## Default Namespace List (Fallback için)

Eğer `$json.namespaceRegex` yoksa kullanılacak default string:

```
bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod
```

## Değişiklik Pattern'i

Tüm tool'larda aynı pattern:

```javascript
// 1. Regex'i al
const nsRegex = $json.namespaceRegex || 'DEFAULT_12_NAMESPACES_PIPE_SEPARATED';
const svcRegex = $json.serviceRegex || '.*';

// 2. Ready-to-use query varsa kullan
if ($json.queryHelpers?.exampleQueries?.relevantQuery) {
  return $json.queryHelpers.exampleQueries.relevantQuery;
}

// 3. Yoksa manuel oluştur
// Önceki: namespace="${ns}"
// Yeni:   namespace=~"${nsRegex}"
```

## Test Checklist

n8n UI'da her tool'u güncelledikten sonra:

- [ ] Tool'un query parametresinde `namespaceRegex` kullanıldığını doğrula
- [ ] `namespace=~"..."` regex syntax kullanıldığını doğrula (equality `=` değil)
- [ ] Default fallback değeri 12 namespace içerdiğini doğrula
- [ ] Test çalıştır ve log'larda tüm namespace'lerin sorgulandığını gör
- [ ] Prometheus'tan dönen sonuçlarda 12 namespace'den veri geldiğini doğrula

## Expected Impact

**Before:**
- Query: `up{namespace="etiyamobile-production"}`
- Results: ~50-100 pods from 1 namespace

**After:**
- Query: `up{namespace=~"ns1|ns2|...|ns12"}`
- Results: ~600-1200 pods from 12 namespaces

Stage 1 "unknown" status sorunu çözülmeli, çünkü artık **tüm cluster verisi** toplanacak.
