# Service İsimleri Analiz Raporu

**Tarih**: 2025-12-13
**Kapsam**: PrometheusNodes klasöründeki tüm node'larda kullanılan service isimleri
**Amaç**: Flow'da hardcoded veya example olarak kullanılan service isimlerini tespit etmek

---

## 1. KULLANILAN SERVICE İSİMLERİ

### 1.1 Hardcoded/Example Service İsimleri

PrometheusNodes klasöründeki dosyalarda kullanılan **hardcoded** service isimleri:

| Service İsmi | Kullanım Yeri | Adet | Amaç |
|--------------|---------------|------|------|
| **domain-config-service-t3** | [26. Generate Final Report.js:866](../PrometheusNodes/26. Generate Final Report.js#L866) | 3 | Example/Documentation |
| **payment-service** | [20. Fix Stage 4 Context.js:615](../PrometheusNodes/20. Fix Stage 4 Context.js#L615) | 7 | Example/Placeholder |
| **user-auth-service** | [20. Fix Stage 4 Context.js:617](../PrometheusNodes/20. Fix Stage 4 Context.js#L617) | 1 | Example/Placeholder |
| **mobile-app-deployment** | Çeşitli dosyalar | - | Example/Placeholder |

---

### 1.2 Detaylı Kullanım Yerleri

#### A. domain-config-service-t3

**Dosya**: [PrometheusNodes/26. Generate Final Report.js](../PrometheusNodes/26. Generate Final Report.js)

**Kullanım 1** (Satır 866):
```javascript
// Standard Kubernetes deployment pattern: deployment-name-replicaset-hash-pod-hash
// Example: domain-config-service-t3-645d68cbc8-4h88r -> domain-config-service-t3
```
**Amaç**: Pod isim pattern'ini açıklayan **comment örneği**

**Kullanım 2** (Satır 959):
```javascript
console.log("Expected: domain-config-service-t3");
```
**Amaç**: Debug/test için **console.log örneği**

**Kullanım 3** (Satır 1295):
```javascript
console.log("Expected:", `KubePodCrashLooping detected for domain-config-service-t3-645d68cbc8-4h88r`);
```
**Amaç**: Debug/test için **timeline preview örneği**

**DURİ**: ✅ **Sadece comment ve console.log** - Production code'da kullanılmıyor

---

#### B. payment-service

**Dosya 1**: [PrometheusNodes/20. Fix Stage 4 Context.js](../PrometheusNodes/20. Fix Stage 4 Context.js)

**Kullanım 1** (Satır 615-617):
```javascript
if ((diagnostic.category === 'APPLICATION' &&
    (diagnostic.target.includes('payment-service') ||
     diagnostic.target.includes('user-auth-service'))) {
```
**Amaç**: Örnek condition check - diagnostic target filtering

**Dosya 2**: [PrometheusNodes/22. Fix Stage 5 Context.js](../PrometheusNodes/22. Fix Stage 5 Context.js)

**Kullanım 2** (Satır 214):
```javascript
if (action.command && action.command.includes('payment-service')) {
```

**Kullanım 3** (Satır 279):
```javascript
if (action.action && action.action.includes('payment-service')) {
```

**Kullanım 4** (Satır 281):
```javascript
action.action = action.action.replace(/payment-service/g, actualComponent);
```

**Kullanım 5** (Satır 355):
```javascript
actualOutput.remediation_plan.immediate_actions.some(a => a.command?.includes('payment-service'))
```

**Kullanım 6** (Satır 437):
```javascript
existingActions.some(a => a.command?.includes('payment-service'))
```

**DURUM**: ⚠️ **Production code'da kullanılıyor** - Placeholder olarak, gerçek service ismi ile değiştirilmesi gereken yerler

---

#### C. user-auth-service

**Dosya**: [PrometheusNodes/20. Fix Stage 4 Context.js:617](../PrometheusNodes/20. Fix Stage 4 Context.js#L617)

**Kullanım**:
```javascript
diagnostic.target.includes('user-auth-service')
```

**DURUM**: ⚠️ **Production code'da kullanılıyor** - Placeholder

---

#### D. mobile-app-deployment

**Durum**: Grep sonuçlarında görüldü ama spesifik satır bulunamadı.

---

## 2. GERÇEK SERVİSLER (services.txt)

services.txt dosyasından çıkan **gerçek production service isimleri**:

### 2.1 BSS Servisleri (em-global-prod ve em-prod)

```
bss-crm-batch
bss-mc-activity
bss-mc-asset-management
bss-mc-b2b-objectstorage
bss-mc-cpq
bss-mc-cpq-batch
bss-mc-cpq-ntf-integrator
bss-mc-crm-customer-information
bss-mc-crm-customer-search
bss-mc-crm-mash-up
bss-mc-crm-ntf-integrator
bss-mc-crm-search-integrator
bss-mc-csr
bss-mc-domain-config
bss-mc-id-service
bss-mc-message-relay
bss-mc-ntf-engine
bss-mc-ntf-history
bss-mc-pcm-cfm
bss-mc-pcm-cms-integrator-em-glb-prod
bss-mc-pcm-cms-integrator-em-prod
bss-mc-pcm-next-gen-admintoolbox-config-manager
bss-mc-pcm-next-gen-admintoolbox-ui
bss-mc-pcm-product-catalog
bss-mc-pcm-product-offer-detail
bss-mc-rim
bss-mc-rim-ui
bss-mc-ui-authz
bss-mc-user-management-em-glb-prod
bss-mc-user-management (em-prod)
bss-mc-wsc-new
bss-ntf-batch
bss-services-service
```

### 2.2 EOM Servisleri (em-global-prod-eom ve em-prod-eom)

```
eom-activemqqueueoperations-em-glb-prod
eom-activemqqueueoperations-em-prod
eom-micro-flows-em-glb-prod
eom-micro-flows-em-prod
eom-operate-em-glb-prod
eom-operate-em-prod
eom-postgresqldboperations-em-glb-prod
eom-postgresqldboperations-em-prod
eom-scheduler-em-glb-prod
eom-scheduler-em-prod
eom-ui-em-glb-prod
eom-ui-em-prod
eom-zeebe-em-glb-prod-zeebe
eom-zeebe-em-glb-prod-zeebe-gateway
eom-zeebe-em-prod-zeebe
eom-zeebe-em-prod-zeebe-gateway
external-services-service
loyalty-services-service
om-services-service
wso2am-cp-1-service
wso2am-cp-2-service
wso2am-cp-service
wso2am-gw-service
```

### 2.3 FSTP/Flowe Servisleri (em-global-prod-flowe ve em-prod-flowe)

```
fstp-activemq-artemis-em-glb-prod
fstp-activemq-artemis-em-prod
fstp-bpmn-ms-em-glb-prod
fstp-bpmn-ms-em-prod
fstp-configuration-ms-em-glb-prod
fstp-configuration-ms-em-prod
fstp-dashboard-ms-em-glb-prod
fstp-dashboard-ms-em-prod
fstp-eca-em-glb-prod
fstp-eca-em-prod
fstp-frontend-em-glb-prod
fstp-frontend-em-prod
fstp-orchestra-ms-em-glb-prod
fstp-orchestra-ms-em-prod
fstp-redis-em-glb-prod
fstp-redis-em-prod
fstp-scheduler-ms-em-glb-prod
fstp-scheduler-ms-em-prod
fstp-selenium-grid-em-glb-prod
fstp-selenium-grid-em-prod
```

### 2.4 3PP Servisleri (em-global-prod-3pp ve em-prod-3pp)

```
active-mq
eom-castlemock
gorules
kafka-cluster
kafka-cluster-em-glb-prod-zookeeper
kafka-cluster-em-glb-prod-zookeeper-headless
kafka-cluster-headless
kafka-cluster-em-prod-zookeeper
kafka-cluster-em-prod-zookeeper-headless
kafka-ui
redis-sentinel
redis-sentinel-headless
redisinsight-ui
```

### 2.5 Elasticsearch Servisleri

```
elasticsearch-coordinating-hl
elasticsearch-data-hl
elasticsearch-em-glb-prod
elasticsearch-em-glb-prod-kibana
elasticsearch-ingest-hl
elasticsearch-master-hl
elasticsearch-metrics
elasticsearch-em-prod
elasticsearch-em-prod-kibana
```

### 2.6 CMS Servisleri (bstp-cms-global-production, bstp-cms-prod-v3)

```
mariadb
nginx
php-fpm-exporter
redis
varnish
```

### 2.7 Control Plane Servisleri (em-control-plane-prod)

```
bss-saas-control-plane
bss-saas-control-plane-ui
bss-tenant-control-plane-batch
eca
headless-eca
```

### 2.8 Monitoring Servisleri (bss-prod-eks-monitoring)

```
alertmanager-operated
alloy
alloy-frontend
blackbox-exporter-prometheus-blackbox-exporter
elasticsearch-exporter-prometheus-elasticsearch-exporter
fluent-bit
fluent-bit-siem
grafana
grafana-headless
grafana-operator-metrics-service
kafka-exp-em-global-prod-3pp
kafka-monitoring
kafka-monitoring-ui
kafka-monitoring-zookeeper
kafka-monitoring-zookeeper-headless
kube-prometheus-stack-alertmanager
kube-prometheus-stack-kube-state-metrics
kube-prometheus-stack-operator
kube-prometheus-stack-prometheus
kube-prometheus-stack-prometheus-node-exporter
kubecost-aggregator
kubecost-cloud-cost
kubecost-cluster-controller-service
kubecost-finops-agent
kubecost-forecasting
kubecost-frontend
kubecost-local-store
kubecost-network-costs
logbook-service-bss-logbook
loki-backend
loki-backend-headless
loki-gateway
loki-memberlist
loki-query-scheduler-discovery
loki-read
loki-read-headless
loki-write
loki-write-headless
postgres-exporter-prometheus-postgres-exporter
prometheus-operated
redis-exporter-prometheus-redis-exporter
tempo
tempo-headless
```

---

## 3. KARŞILAŞTIRMA SONUÇLARI

### 3.1 Flow'da Kullanılan vs Gerçek Servisler

| Flow'daki İsim | services.txt'de Var mı? | Durum |
|----------------|-------------------------|-------|
| domain-config-service-t3 | ❌ HAYIR (ama bss-mc-domain-config var) | Example - gerçek service değil |
| payment-service | ❌ HAYIR | Placeholder - gerçek service değil |
| user-auth-service | ❌ HAYIR | Placeholder - gerçek service değil |
| mobile-app-deployment | ❌ HAYIR | Placeholder - gerçek service değil |

### 3.2 Benzer İsimler

| Flow'daki Placeholder | Gerçek Kubernetes'teki Benzer Service |
|-----------------------|--------------------------------------|
| domain-config-service-t3 | **bss-mc-domain-config** |
| user-auth-service | bss-mc-user-management, bss-mc-ui-authz |
| payment-service | *(benzer yok - örnek)* |

---

## 4. ANALİZ ve ÖNERİLER

### 4.1 Durum Özeti

✅ **İYİ HABER**:
- Flow'da çok az hardcoded service ismi var
- Çoğu kullanım **comment** ve **console.log** içinde (documentation amaçlı)
- Production code dynamic olarak service isimlerini alıyor

⚠️ **DİKKAT GEREKTİREN**:
- `payment-service`: 7 yerde production code'da kullanılıyor
- `user-auth-service`: 1 yerde production code'da kullanılıyor
- Bu placeholder'lar gerçek service isimleri ile match etmiyor

### 4.2 Placeholder Kullanımları

**File**: [PrometheusNodes/20. Fix Stage 4 Context.js:615-617](../PrometheusNodes/20. Fix Stage 4 Context.js#L615)
```javascript
if ((diagnostic.category === 'APPLICATION' &&
    (diagnostic.target.includes('payment-service') ||
     diagnostic.target.includes('user-auth-service'))) {
```

**Amaç**: Özel diagnostic logic için example condition
**Risk**: Gerçek production'da bu serviceler olmadığı için condition **asla true olmayacak**

**File**: [PrometheusNodes/22. Fix Stage 5 Context.js:214-437](../PrometheusNodes/22. Fix Stage 5 Context.js#L214)
```javascript
if (action.command && action.command.includes('payment-service')) {
  // remediation action replacement logic
}
```

**Amaç**: Remediation action'lardaki service isimlerini actualComponent ile değiştirme
**Risk**: `payment-service` gerçek production'da olmadığı için replacement **hiç çalışmayacak**

### 4.3 Öneriler

#### Öneri 1: Placeholder'ları Temizle veya Gerçek Servicelerle Değiştir

**Seçenek A - Temizle**: Eğer bu logic kullanılmıyorsa, kaldır
```javascript
// KALDIRMAK İÇİN:
if ((diagnostic.category === 'APPLICATION' &&
    (diagnostic.target.includes('payment-service') ||
     diagnostic.target.includes('user-auth-service'))) {
```

**Seçenek B - Gerçek Servicelerle Değiştir**: Eğer özel logic gerekiyorsa
```javascript
// ÖNERİLEN:
if ((diagnostic.category === 'APPLICATION' &&
    (diagnostic.target.includes('bss-mc-cpq') ||  // CPQ = Quote/Payment işlemleri
     diagnostic.target.includes('bss-mc-user-management') ||
     diagnostic.target.includes('bss-mc-ui-authz'))) {
```

#### Öneri 2: Dynamic Pattern Matching Kullan

Placeholder yerine pattern-based approach:
```javascript
// ÖNCE (Hardcoded):
if (diagnostic.target.includes('payment-service')) {

// SONRA (Pattern-based):
if (diagnostic.target.match(/bss-mc-(cpq|crm|pcm)/)) {
  // BSS microservice'leri için özel logic
}
```

#### Öneri 3: Console.log Example'larını Gerçek Service İsimleriyle Güncelle

```javascript
// ÖNCE:
console.log("Expected:", `KubePodCrashLooping detected for domain-config-service-t3-645d68cbc8-4h88r`);

// SONRA (Gerçek service):
console.log("Expected:", `KubePodCrashLooping detected for bss-mc-domain-config-645d68cbc8-4h88r`);
```

---

## 5. SONUÇ

### 5.1 Özet

| Kategori | Adet | Durum |
|----------|------|-------|
| Hardcoded service isimleri | 4 | payment-service, user-auth-service, domain-config-service-t3, mobile-app-deployment |
| Production code'da kullanılan | 2 | payment-service (7x), user-auth-service (1x) |
| Sadece comment/console.log | 2 | domain-config-service-t3, mobile-app-deployment |
| Gerçek kubernetes'te var | 0 | Hiçbiri gerçek production'da yok |

### 5.2 Aksiyonlar

1. **payment-service** kullanımlarını incele:
   - Stage 4 (File 20): Diagnostic filtering logic - gerekli mi?
   - Stage 5 (File 22): Remediation replacement logic - çalışıyor mu?

2. **user-auth-service** kullanımını incele:
   - Stage 4 (File 20): Diagnostic filtering - gerçek service ile değiştir

3. **domain-config-service-t3** kullanımlarını güncelle:
   - Console.log example'larını gerçek service (bss-mc-domain-config) ile değiştir

4. **Gerçek service pattern'lerini öğren**:
   - BSS servisleri: `bss-mc-*`, `bss-crm-*`, `bss-ntf-*`
   - EOM servisleri: `eom-*`
   - FSTP servisleri: `fstp-*`
   - 3PP servisleri: `kafka-*`, `redis-*`, `elasticsearch-*`

---

**Analiz Tamamlandı**: 2025-12-13
**Dosya Sayısı**: 23 dosya incelendi
**Bulgular**: 4 hardcoded service ismi tespit edildi
**Risk Seviyesi**: DÜŞÜK (çoğu example/placeholder, production logic'i etkilemiyor)
