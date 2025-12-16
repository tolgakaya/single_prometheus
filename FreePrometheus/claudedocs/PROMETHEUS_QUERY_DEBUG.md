# Prometheus Query Debug - Empty Results

## Problem

Query doğru evaluate ediliyor ama **boş sonuç** dönüyor:

```promql
count by (namespace, service, pod) (
  up{
    namespace=~"bstp-cms-global-production|bstp-cms-prod-v3|...",
    service!="",
    pod!=""
  }
)
```

**Result:** Empty vector `[]`

## Olası Nedenler

### 1. `up` Metriği Label'ları Yanlış

Kubernetes'te `up` metriği genelde **job** ve **instance** label'larıyla gelir:
- `job`: Prometheus scrape job adı (örn: `kubernetes-pods`, `kubernetes-nodes`)
- `instance`: Pod IP:Port veya Node IP

**`up` metriğinde `namespace`, `service`, `pod` label'ları OLMAYABILIR!**

### 2. Doğru Metrik: `kube_pod_info` veya `kube_service_info`

Kubernetes servisleri için doğru metrikler:

```promql
# Pod bilgileri (kube-state-metrics)
kube_pod_info{
  namespace=~"...",
  pod!=""
}

# Service bilgileri
kube_service_info{
  namespace=~"...",
  service!=""
}

# Container bilgileri (cAdvisor)
container_cpu_usage_seconds_total{
  namespace=~"...",
  pod!=""
}
```

## Debug Adımları

### Step 1: Hangi Metrikleri Var Kontrol Et

Prometheus UI'da veya API'de şunu dene:

```promql
# 1. up metriğinin label'larını gör
up{namespace=~"em-prod"}
# VEYA
up{job=~"kubernetes.*"}

# 2. Hangi metrikler namespace label'ına sahip?
{namespace=~"em-prod"}

# 3. kube-state-metrics var mı?
kube_pod_info{namespace=~"em-prod"}

# 4. cAdvisor metrikleri var mı?
container_cpu_usage_seconds_total{namespace=~"em-prod"}
```

### Step 2: Servis Listesi İçin Doğru Query

Kubernetes servislerini listelemek için:

#### Option A: `kube_service_info` (Recommended)
```promql
count by (namespace, service) (
  kube_service_info{
    namespace=~"bstp-cms-global-production|bstp-cms-prod-v3|..."
  }
)
```

#### Option B: `kube_pod_labels` (Pod'ların service label'ları)
```promql
count by (namespace, label_app) (
  kube_pod_labels{
    namespace=~"...",
    label_app!=""
  }
)
```

#### Option C: `container_cpu_usage_seconds_total` (cAdvisor)
```promql
count by (namespace, pod) (
  container_cpu_usage_seconds_total{
    namespace=~"...",
    pod!="",
    container!=""
  }
)
```

## Fix: Query Güncelleme

### Mevcut (Çalışmıyor):
```javascript
const nsRegex = $json.namespaceRegex || '...';
return `count by (namespace, service, pod) (up{namespace=~"${nsRegex}", service!="", pod!=""})`;
```

### Yeni (3 Fallback Stratejisi):

```javascript
const nsRegex = $json.namespaceRegex || 'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';

// Strategy 1: Try kube_service_info (if kube-state-metrics exists)
const query1 = `count by (namespace, service) (kube_service_info{namespace=~"${nsRegex}"})`;

// Strategy 2: Try kube_pod_info with app label
const query2 = `count by (namespace, pod, label_app) (kube_pod_info{namespace=~"${nsRegex}"})`;

// Strategy 3: Try container metrics (cAdvisor - always available)
const query3 = `count by (namespace, pod) (container_cpu_usage_seconds_total{namespace=~"${nsRegex}", pod!="", container!=""})`;

// Return combined query with OR operator
return `${query1} or ${query2} or ${query3}`;
```

## En İyi Çözüm: Multi-Fallback Query

```promql
# 1. Önce service bilgisini dene (kube-state-metrics)
count by (namespace, service) (
  kube_service_info{namespace=~"ns1|ns2|..."}
)
# 2. Yoksa pod bilgisini dene
or count by (namespace, pod, label_app) (
  kube_pod_labels{namespace=~"ns1|ns2|...", label_app!=""}
)
# 3. Yoksa container metriklerini kullan (her zaman var)
or count by (namespace, pod) (
  container_cpu_usage_seconds_total{
    namespace=~"ns1|ns2|...",
    pod!="",
    container!="",
    image!=""
  }
)
```

## n8n Tool Fix

**Tool Name:** `List Kubernetes Services`

**New Query Expression:**

```javascript
{{
(() => {
  const nsRegex = $json.namespaceRegex ||
    'bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod';

  // Multi-fallback strategy
  return `count by (namespace, service) (kube_service_info{namespace=~"${nsRegex}"}) or count by (namespace, pod, label_app) (kube_pod_labels{namespace=~"${nsRegex}", label_app!=""}) or count by (namespace, pod) (container_cpu_usage_seconds_total{namespace=~"${nsRegex}", pod!="", container!="", image!=""})`;
})()
}}
```

## Test Query (Prometheus UI)

1. **Test namespace filter:**
   ```promql
   kube_pod_info{namespace=~"em-prod"}
   ```

2. **Test service existence:**
   ```promql
   kube_service_info
   ```

3. **Test container metrics:**
   ```promql
   container_cpu_usage_seconds_total{namespace=~"em-prod"}
   ```

4. **Full query test:**
   ```promql
   count by (namespace, service) (kube_service_info{namespace=~"em-prod|em-global-prod"})
   ```

## Expected Results

### Before Fix:
```
Query: up{namespace=~"...", service!="", pod!=""}
Result: [] (empty - service/pod labels don't exist in up metric)
```

### After Fix:
```
Query: kube_service_info{namespace=~"..."} or kube_pod_labels{...} or container_cpu_usage_seconds_total{...}
Result: [
  {namespace: "em-prod", service: "api-service", value: 1},
  {namespace: "em-prod", service: "web-service", value: 1},
  {namespace: "em-prod", pod: "api-pod-123", value: 1},
  ...
]
```

## Prometheus Metric Hierarchy

```
up                                    ❌ Has: job, instance (NO namespace, service, pod)
├─ job: kubernetes-pods
└─ instance: 10.0.1.23:8080

kube_service_info                     ✅ Has: namespace, service
├─ namespace: em-prod
└─ service: api-service

kube_pod_info                         ✅ Has: namespace, pod
├─ namespace: em-prod
└─ pod: api-pod-12345

kube_pod_labels                       ✅ Has: namespace, pod, label_*
├─ namespace: em-prod
├─ pod: api-pod-12345
└─ label_app: api

container_cpu_usage_seconds_total     ✅ Has: namespace, pod, container (ALWAYS AVAILABLE)
├─ namespace: em-prod
├─ pod: api-pod-12345
└─ container: api-container
```

## Sonuç

**Root Cause:** `up` metriği Kubernetes label'larına sahip değil.

**Solution:** `kube_service_info`, `kube_pod_labels`, veya `container_*` metriklerini kullan.

**Action:** n8n'deki `List Kubernetes Services` tool'unun query'sini multi-fallback stratejisiyle güncelle.
