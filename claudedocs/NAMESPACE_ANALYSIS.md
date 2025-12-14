# Namespace Analizi - Services vs DEFAULT_NAMESPACES

**Tarih**: 2025-12-14
**Amaç**: services.txt'deki gerçek namespace'leri DEFAULT_NAMESPACES array'i ile karşılaştırmak ve namespace fallback problemini çözmek

---

## 1. GERÇEK KUBERNETES NAMESPACE'LERİ (services.txt)

### Tüm Namespace Listesi (23 namespace):

```
1. [etiya-devops@ip-10-94-160-62  (shell prompt - gerçek namespace değil)
2. bss-devops
3. bss-prod-eks-monitoring         ← PROMETHEUS/ALERTMANAGER BURADAN
4. bstp-cms-global-production      ← DEFAULT_NAMESPACES[0]
5. bstp-cms-prod-v3                ← DEFAULT_NAMESPACES[1]
6. default                         ← SADECE "kubernetes" service var
7. em-control-plane-prod
8. em-global-prod                  ← DEFAULT_NAMESPACES[5]
9. em-global-prod-3pp              ← DEFAULT_NAMESPACES[2]
10. em-global-prod-eom             ← DEFAULT_NAMESPACES[3]
11. em-global-prod-flowe           ← DEFAULT_NAMESPACES[4]
12. em-prod                        ← DEFAULT_NAMESPACES[9]
13. em-prod-3pp                    ← DEFAULT_NAMESPACES[6]
14. em-prod-eom                    ← DEFAULT_NAMESPACES[7]
15. em-prod-flowe                  ← DEFAULT_NAMESPACES[8]
16. harbor
17. ingress-nginx
18. istio-ingress
19. istio-ingress-wso2
20. istio-system
21. kube-system
22. lagoon
23. velero
```

---

## 2. DEFAULT_NAMESPACES ARRAY (Code'daki 10 namespace)

```javascript
const DEFAULT_NAMESPACES = [
  'bstp-cms-global-production',  // ✅ Gerçekte var (7 service)
  'bstp-cms-prod-v3',             // ✅ Gerçekte var (7 service)
  'em-global-prod-3pp',           // ✅ Gerçekte var (18 service)
  'em-global-prod-eom',           // ✅ Gerçekte var (16 service)
  'em-global-prod-flowe',         // ✅ Gerçekte var (10 service)
  'em-global-prod',               // ✅ Gerçekte var (32 service)
  'em-prod-3pp',                  // ✅ Gerçekte var (18 service)
  'em-prod-eom',                  // ✅ Gerçekte var (16 service)
  'em-prod-flowe',                // ✅ Gerçekte var (10 service)
  'em-prod'                       // ✅ Gerçekte var (32 service)
];
```

**Toplam service sayısı**: 166 service (10 production namespace)

---

## 3. NAMESPACE KARŞILAŞTIRMA TABLOSU

| Namespace | DEFAULT_NAMESPACES'te var mı? | Service Sayısı | Kategori |
|-----------|-------------------------------|----------------|----------|
| **bstp-cms-global-production** | ✅ #0 | 7 | CMS Production (Global) |
| **bstp-cms-prod-v3** | ✅ #1 | 7 | CMS Production (v3) |
| **em-global-prod** | ✅ #5 | 32 | BSS Core (Global) |
| **em-global-prod-3pp** | ✅ #2 | 18 | 3rd Party (Global) |
| **em-global-prod-eom** | ✅ #3 | 16 | EOM (Global) |
| **em-global-prod-flowe** | ✅ #4 | 10 | FSTP/Flowe (Global) |
| **em-prod** | ✅ #9 | 32 | BSS Core (Regional) |
| **em-prod-3pp** | ✅ #6 | 18 | 3rd Party (Regional) |
| **em-prod-eom** | ✅ #7 | 16 | EOM (Regional) |
| **em-prod-flowe** | ✅ #8 | 10 | FSTP/Flowe (Regional) |
| **em-control-plane-prod** | ❌ | 5 | Control Plane |
| **bss-prod-eks-monitoring** | ❌ | 45 | **PROMETHEUS/ALERTMANAGER** |
| **default** | ❌ | 1 | Kubernetes API only |
| bss-devops | ❌ | ? | DevOps |
| harbor | ❌ | ? | Container Registry |
| ingress-nginx | ❌ | ? | Ingress |
| istio-ingress | ❌ | ? | Service Mesh |
| istio-ingress-wso2 | ❌ | ? | Service Mesh |
| istio-system | ❌ | ? | Service Mesh |
| kube-system | ❌ | ? | Kubernetes System |
| lagoon | ❌ | ? | Unknown |
| velero | ❌ | ? | Backup |

---

## 4. KRİTİK BULGULAR

### 4.1 "default" Namespace'in Gerçek Durumu

**services.txt'te "default" namespace**:
```
NAMESPACE: default
SERVICE:   kubernetes (tek bir service - Kubernetes API)
```

**SONUÇ**:
- ❌ "default" namespace'de **PRODUCTION SERVICE YOK**
- ✅ Sadece Kubernetes API service var (cluster-wide infrastructure)
- ❌ Infrastructure alertleri "default"e düşerse → **hiçbir production service sorgulanmayacak**

### 4.2 Prometheus/Alertmanager Namespace

**KubeAPIDown alert'inde**:
```javascript
labels.prometheus = "bss-prod-eks-monitoring/kube-prometheus-stack-prometheus"
```

**BULGU**: Alert **bss-prod-eks-monitoring** namespace'inden geliyor!
- Bu namespace DEFAULT_NAMESPACES'te YOK
- 45 monitoring service var bu namespace'de
- Infrastructure alertleri buradan geliyor

### 4.3 Eksik Namespaces (DEFAULT_NAMESPACES'te YOK)

**Production namespace'ler ama DEFAULT_NAMESPACES'te eksik**:

1. **bss-prod-eks-monitoring** (45 service)
   - Prometheus, Grafana, Loki, Tempo, Alertmanager
   - **BÜTÜN MONITORING STACK BURASI**

2. **em-control-plane-prod** (5 service)
   - Control plane servisleri
   - bss-saas-control-plane, tenant-control-plane-batch

3. **Infrastructure namespaces**:
   - kube-system
   - istio-system
   - ingress-nginx
   - velero

---

## 5. NAMESPACE FALLBACK PROBLEMİNİN GERÇEK ETKİSİ

### Senaryo 1: KubeAPIDown (Infrastructure Alert)

**Alert Kaynağı**:
- Prometheus: `bss-prod-eks-monitoring/kube-prometheus-stack-prometheus`
- Alert'te `labels.namespace` yok (infrastructure-level alert)

**Şu Anki Akış**:
```javascript
// Node 2:
namespace: labels.namespace || "default"
// Result: "default"

// Node 5:
kubernetesFilters.namespace = normalizedAlert.namespace || DEFAULT_NAMESPACES[0]
// Result: "default" (çünkü normalizedAlert.namespace = "default", null değil!)
```

**Prometheus Query**:
```promql
// Sadece "default" namespace'de arama yapılacak:
namespace="default"
```

**SORUN**:
- "default" namespace'de sadece "kubernetes" service var
- 10 production namespace'teki 166 service **SORGULANMAYACAK**
- Monitoring namespace'i (45 service) **SORGULANMAYACAK**

### Senaryo 2: Application Alert (Namespace Var)

**Alert**: `bss-mc-cpq` pod'u crash looping (em-prod namespace'de)

**Akış**:
```javascript
// Node 2:
namespace: labels.namespace || "default"
// labels.namespace = "em-prod"
// Result: "em-prod" ✅

// Node 5:
kubernetesFilters.namespace = normalizedAlert.namespace
// Result: "em-prod" ✅
```

**Prometheus Query**:
```promql
namespace="em-prod"  ✅ DOĞRU
```

---

## 6. ÇÖZÜM ÖNERİLERİ (GÜNCELLENMİŞ)

### Seçenek A: Multi-Namespace Fallback (ÖNERİLEN)

**Node 5'te değişiklik**:
```javascript
const kubernetesFilters = {
    // ... diğer alanlar

    // Tek namespace yerine namespace array kullan
    namespaces: (normalizedAlert.namespace &&
                 normalizedAlert.namespace !== "default" &&
                 DEFAULT_NAMESPACES.includes(normalizedAlert.namespace))
                ? [normalizedAlert.namespace]  // Spesifik namespace varsa sadece onu kullan
                : DEFAULT_NAMESPACES,           // Yoksa BÜTÜN production namespaces

    // Backward compatibility için namespace field de kalsın
    namespace: (normalizedAlert.namespace && normalizedAlert.namespace !== "default")
               ? normalizedAlert.namespace
               : DEFAULT_NAMESPACES[0],

    useSpecificFilters: !!(normalizedAlert.container || normalizedAlert.pod || normalizedAlert.service)
};
```

**Prometheus Query Builder'da**:
```javascript
// Eğer namespaces array varsa:
const namespaceFilter = kubernetesFilters.namespaces
  ? `namespace=~"${kubernetesFilters.namespaces.join('|')}"`  // Multi-namespace regex
  : `namespace="${kubernetesFilters.namespace}"`;             // Single namespace

// Query örneği:
// namespace=~"bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod|..."
```

**Avantajlar**:
- ✅ Infrastructure alertleri 10 production namespace'te arama yapar
- ✅ Application alertleri spesifik namespace'te arama yapar
- ✅ Backward compatible (namespace field de var)
- ✅ Prometheus regex syntax ile çalışır

### Seçenek B: Node 2'de "default" Kullanma

**Node 2'de değişiklik**:
```javascript
const DEFAULT_NAMESPACES = [
  'bstp-cms-global-production',
  'bstp-cms-prod-v3',
  'em-global-prod-3pp',
  'em-global-prod-eom',
  'em-global-prod-flowe',
  'em-global-prod',
  'em-prod-3pp',
  'em-prod-eom',
  'em-prod-flowe',
  'em-prod'
];

// "default" yerine ilk production namespace kullan
namespace: labels.namespace || DEFAULT_NAMESPACES[0]  // "bstp-cms-global-production"
```

**Dezavantaj**:
- ❌ Hala tek namespace'te arama yapıyor
- ❌ bss-prod-eks-monitoring alertleri bstp-cms'e düşer (yanlış!)

### Seçenek C: Monitoring Namespace Ekle (EK ÖNERİ)

**DEFAULT_NAMESPACES'e monitoring ekle**:
```javascript
const DEFAULT_NAMESPACES = [
  'bss-prod-eks-monitoring',      // ← YENİ: Monitoring stack
  'bstp-cms-global-production',
  'bstp-cms-prod-v3',
  'em-global-prod-3pp',
  'em-global-prod-eom',
  'em-global-prod-flowe',
  'em-global-prod',
  'em-prod-3pp',
  'em-prod-eom',
  'em-prod-flowe',
  'em-prod',
  'em-control-plane-prod'          // ← YENİ: Control plane
];
```

**Toplam**: 12 namespace (10 production + 1 monitoring + 1 control plane)

---

## 7. NAMESPACE KATEGORİLERİ

### Production Application Namespaces (10):
```
bstp-cms-global-production    → CMS (Global)
bstp-cms-prod-v3              → CMS (v3)
em-global-prod                → BSS Core (Global) - 32 service
em-global-prod-3pp            → 3rd Party (Global) - 18 service
em-global-prod-eom            → EOM (Global) - 16 service
em-global-prod-flowe          → FSTP/Flowe (Global) - 10 service
em-prod                       → BSS Core (Regional) - 32 service
em-prod-3pp                   → 3rd Party (Regional) - 18 service
em-prod-eom                   → EOM (Regional) - 16 service
em-prod-flowe                 → FSTP/Flowe (Regional) - 10 service
```

### Monitoring & Infrastructure (2):
```
bss-prod-eks-monitoring       → Prometheus, Grafana, Loki, Tempo (45 service)
em-control-plane-prod         → Control plane servisleri (5 service)
```

### Infrastructure (6):
```
default                       → Kubernetes API only
kube-system                   → Kubernetes system components
istio-system                  → Service mesh
ingress-nginx                 → Ingress controller
harbor                        → Container registry
velero                        → Backup
```

---

## 8. ÖNERİLEN UYGULAMA PLANI

### Adım 1: Node 5'te Multi-Namespace Support Ekle

**Dosya**: [AlertListenerNodes/5. Process AI Output.js](../AlertListenerNodes/5. Process AI Output.js)

**Değişiklik**:
```javascript
// Monitoring ve Control Plane ekle
const DEFAULT_NAMESPACES = [
  'bss-prod-eks-monitoring',      // Monitoring stack
  'bstp-cms-global-production',
  'bstp-cms-prod-v3',
  'em-global-prod-3pp',
  'em-global-prod-eom',
  'em-global-prod-flowe',
  'em-global-prod',
  'em-prod-3pp',
  'em-prod-eom',
  'em-prod-flowe',
  'em-prod',
  'em-control-plane-prod'
];

// Kubernetes filters - multi-namespace support
const kubernetesFilters = {
    container: normalizedAlert.container || null,
    pod: normalizedAlert.pod || null,

    // Multi-namespace support
    namespaces: determineNamespaces(normalizedAlert),

    // Backward compatibility
    namespace: (normalizedAlert.namespace && normalizedAlert.namespace !== "default")
               ? normalizedAlert.namespace
               : DEFAULT_NAMESPACES[0],

    service: normalizedAlert.service || null,
    deployment: normalizedAlert.deployment || null,
    node: normalizedAlert.node || null,
    persistentvolumeclaim: normalizedAlert.persistentvolumeclaim || null,
    volumename: normalizedAlert.volumename || null,
    useSpecificFilters: !!(normalizedAlert.container || normalizedAlert.pod || normalizedAlert.service)
};

// Helper function
function determineNamespaces(alert) {
    // Eğer valid production namespace varsa, sadece onu kullan
    if (alert.namespace &&
        alert.namespace !== "default" &&
        DEFAULT_NAMESPACES.includes(alert.namespace)) {
        return [alert.namespace];
    }

    // Eğer namespace yoksa veya "default" ise, BÜTÜN production namespaces kullan
    return DEFAULT_NAMESPACES;
}
```

### Adım 2: Prometheus Query Builder'ı Güncelle

**Dosya**: [PrometheusNodes/2. Prometheus Query Builder.js](../PrometheusNodes/2. Prometheus Query Builder.js)

**Mevcut**:
```javascript
const namespaces = inputData.namespaces ||
                   (inputData.kubernetesFilters?.namespace
                     ? [inputData.kubernetesFilters.namespace]
                     : DEFAULT_NAMESPACES);
```

**Güncelleme**: Zaten doğru! `namespaces` array'i destekliyor.

### Adım 3: Test Senaryoları

**Test 1: Infrastructure Alert (KubeAPIDown)**
- Input: `labels.namespace` yok
- Node 2 Output: `namespace: "default"`
- Node 5 Output: `namespaces: [12 namespace]`
- Prometheus Query: `namespace=~"bss-prod-eks-monitoring|bstp-cms-global-production|..."`
- ✅ Beklenen: 12 namespace'te arama yapar

**Test 2: Application Alert (em-prod)**
- Input: `labels.namespace: "em-prod"`
- Node 2 Output: `namespace: "em-prod"`
- Node 5 Output: `namespaces: ["em-prod"]`
- Prometheus Query: `namespace="em-prod"`
- ✅ Beklenen: Sadece em-prod'da arama yapar

---

## 9. SONUÇ ve ÖZET

### Mevcut Durum:
- ❌ Infrastructure alertleri "default" namespace'e düşüyor
- ❌ "default"te sadece "kubernetes" service var (production service YOK)
- ❌ 166 production service + 45 monitoring service **SORGULANMIYOR**

### Önerilen Çözüm:
- ✅ DEFAULT_NAMESPACES'e 2 namespace ekle (monitoring + control plane) → 12 namespace
- ✅ Node 5'te multi-namespace support ekle
- ✅ "default" namespace'i fallback olarak kullanma
- ✅ Spesifik namespace varsa → tek namespace
- ✅ Namespace yoksa veya "default" ise → 12 namespace birden

### Etki:
- ✅ Infrastructure alertleri 12 production namespace'te arama yapar
- ✅ Application alertleri doğru namespace'te arama yapar
- ✅ Backward compatible
- ✅ Prometheus regex syntax ile uyumlu

---

**Hazırlayan**: Claude Code
**Tarih**: 2025-12-14
**Durum**: Öneri - Kullanıcı onayı bekleniyor
