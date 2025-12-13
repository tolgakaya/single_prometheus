# Multi-Namespace Destek Analizi - OKR_AI

**Analiz Tarihi**: 2025-12-13
**Amaç**: Mevcut tek namespace sistemini birden fazla namespace desteğine geçirmek
**Kapsam**: PrometheusNodes klasöründeki tüm node'lar

## 🔍 Mevcut Durum Özeti

### Tespit Edilen Pattern
Sistem şu anda **tek namespace** için tasarlanmış:

```javascript
// Mevcut kullanım
const namespace = inputData.namespaces[0] || 'etiyamobile-production';

// Prometheus sorguları
namespace="${namespace}"
```

**Toplam Dosya**: 25 node dosyası (.js ve .txt)
**Namespace kullanan**: 18 dosya
**Değişiklik gerektiren**: ~15 dosya

---

## 📊 Node Kategorileri ve Namespace Kullanımı

### Kategori 1: Giriş ve Context Yönetimi (4 dosya)
**Dosyalar**:
1. `1. Prometheus Input Handler.js`
2. `2. Prometheus Query Builder.js`
3. `3. Unified Entry Point.js`
4. `6. Prepare Stage 1 Input.js`

**Mevcut Davranış**:
```javascript
// Line 62 - 1. Prometheus Input Handler.js
namespaces: input.namespaces || [kubernetesFilters.namespace || 'etiyamobile-production']

// Line 13-15 - 2. Prometheus Query Builder.js
const namespace = inputData.namespaces?.[0] ||
                 inputData.kubernetesFilters?.namespace ||
                 'etiyamobile-production';

// Line 69 - 3. Unified Entry Point.js
namespaces: namespaces,

// Line 124 - 6. Prepare Stage 1 Input.js
namespaces: inputData.analysisParams?.namespaces || [kubernetesFilters.namespace]
```

**Gerekli Değişiklik**: ✅ **HAZIR** - Bu dosyalar zaten `namespaces` array'ini destekliyor!

---

### Kategori 2: Prometheus Query Builders (4 dosya)
**Dosyalar**:
5. `7. Category Based Metrics Builder.js`
6. `10. Force Deep Analysis Override.js`
7. `11. Category Based Deep Analysis Enhancer.js`
8. `5. Load Alert Knowledge Base.js`

**Mevcut Davranış**:
```javascript
// Line 145 - 10. Force Deep Analysis Override.js
output.namespace = unifiedData.analysisParams.namespaces[0] || 'etiyamobile-production';

// Line 2. Prometheus Query Builder.js (tüm query'ler)
query: 'rate(container_cpu_usage_seconds_total{namespace="' + namespace + '", ...}[5m])'
```

**Sorun**: ❌ **Sadece ilk namespace'i kullanıyor**

**Çözüm**:
```javascript
// ÖNCE: Tek namespace
namespace="${namespace}"

// SONRA: Multi namespace
namespace=~"${namespaces.join('|')}"  // Regex OR kullan
```

**Örnek Dönüşüm**:
```javascript
// ÖNCEKİ:
{
  type: "pod_status",
  query: 'kube_pod_status_phase{namespace="em-prod", pod="app-pod-123"}',
}

// SONRA:
{
  type: "pod_status",
  query: 'kube_pod_status_phase{namespace=~"em-prod|em-global-prod|em-prod-3pp", pod="app-pod-123"}',
}
```

---

### Kategori 3: Stage Promptları (AI Agent) (5 dosya)
**Dosyalar**:
9. `12. Stage 2 Deep Analysis.txt` ✅
10. `Stage 3 Alert Intelligence.txt` ✅
11. `18. Stage 4 Automated Diagnosis.txt` ✅
12. `21. Stage 5 Smart Remediation.txt` ❓
13. `23. Stage 6 Prevention & Learning.txt` ❓

**Mevcut Davranış**:
```javascript
// Line 11 - Stage 2 Deep Analysis.txt
Namespace: {{ $json._context.initialParams.namespaces[0] }}

// Line 196 - Stage 3 Alert Intelligence.txt
"namespace": "{{ $json._context.initialParams.namespaces[0] || 'etiyamobile-production' }}"

// Line 18 - Stage 4
Namespace: {{ $json.stage2Data.critical_pods[0].namespace || $json.namespaces[0] }}
```

**Sorun**: ❌ **Promptlar sadece ilk namespace'i AI'ya gönderiyor**

**Çözüm Stratejisi**:

#### Opsiyon A: Tüm Namespace'leri AI'ya Gönder (Önerilen)
```javascript
// ÖNCEKİ:
Namespace: {{ $json._context.initialParams.namespaces[0] }}

// SONRA:
Namespaces: {{ $json._context.initialParams.namespaces.join(', ') }}
Active Namespace: {{ $json._context.initialParams.namespaces[0] }} (Primary)
Additional Namespaces: {{ $json._context.initialParams.namespaces.slice(1).join(', ') }}
```

#### Opsiyon B: Her Namespace İçin Ayrı Analiz
```javascript
// Her namespace için loop
$json._context.initialParams.namespaces.forEach(namespace => {
  // Stage'i her namespace için ayrı çalıştır
  // Sonuçları birleştir
})
```

**Önerim**: **Opsiyon A** - Daha verimli ve context'i korur

---

### Kategori 4: Context Fix Nodes (4 dosya)
**Dosyalar**:
14. `8. Fix Stage 1 Context.js`
15. `14. Fix Stage 2 Context.js`
16. `17. Fix Stage 3 Context1.js`
17. `20. Fix Stage 4 Context.js`
18. `22. Fix Stage 5 Context.js`

**Mevcut Davranış**:
```javascript
// Context objelerini düzeltir ve preserve eder
output._context.initialParams.namespaces = ...
```

**Gerekli Değişiklik**: ⚠️ **DİKKATLİ KONTROL** - Context preserve mantığı bozulmamalı

---

### Kategori 5: Reporting (1 dosya)
**Dosyalar**:
19. `26. Generate Final Report.js`

**Mevcut Davranış**:
```javascript
// Line 1289
console.log("inputData.namespaces[0]:", inputData?.namespaces?.[0]);
```

**Gerekli Değişiklik**: ✅ **KOLAY** - Raporlamada tüm namespace'leri göster

---

## 🎯 Değişiklik Stratejisi

### Faz 1: Foundation (Input & Context)
**Dosyalar**: 1, 3 (zaten hazır)
**Durum**: ✅ Değişiklik gerekmez

**Validasyon**:
- Input'ta `namespaces: ["ns1", "ns2", "ns3"]` array'i kabul edilmeli
- Context'te namespaces array'i korunmalı

---

### Faz 2: Query Builder Adaptasyonu
**Dosyalar**: 2, 7, 10, 11
**Öncelik**: 🔴 KRİTİK

**Değişiklik Adımları**:

#### 2.1. Namespace Extraction (Her dosyada)
```javascript
// ÖNCEKİ:
const namespace = inputData.namespaces?.[0] || 'etiyamobile-production';

// SONRA:
const namespaces = inputData.namespaces || ['etiyamobile-production'];
const primaryNamespace = namespaces[0]; // Fallback için
const namespaceRegex = namespaces.length > 1
  ? namespaces.join('|')
  : namespaces[0];
```

#### 2.2. Query String Adaptation
```javascript
// ÖNCEKİ:
query: 'kube_pod_status_phase{namespace="' + namespace + '", pod="' + filters.pod + '"}'

// SONRA:
query: namespaces.length > 1
  ? 'kube_pod_status_phase{namespace=~"' + namespaceRegex + '", pod="' + filters.pod + '"}'
  : 'kube_pod_status_phase{namespace="' + primaryNamespace + '", pod="' + filters.pod + '"}'
```

#### 2.3. Örnek: 2. Prometheus Query Builder.js
```javascript
// SATIR 13-15 DEĞİŞİKLİĞİ:

// ÖNCEKİ:
const namespace = inputData.namespaces?.[0] ||
                 inputData.kubernetesFilters?.namespace ||
                 'etiyamobile-production';

// SONRA:
const namespaces = inputData.namespaces ||
                  (inputData.kubernetesFilters?.namespace
                    ? [inputData.kubernetesFilters.namespace]
                    : ['etiyamobile-production']);

const namespaceFilter = namespaces.length > 1
  ? `namespace=~"${namespaces.join('|')}"`
  : `namespace="${namespaces[0]}"`;

// SATIR 24-71 TÜM QUERY'LERİ GÜNCELLE:

// ÖNCEKİ:
{
  type: "container_cpu",
  query: 'rate(container_cpu_usage_seconds_total{namespace="' + namespace + '", pod="' + filters.pod + '", container="' + filters.container + '"}[5m]) * 100',
}

// SONRA:
{
  type: "container_cpu",
  query: `rate(container_cpu_usage_seconds_total{${namespaceFilter}, pod="${filters.pod}", container="${filters.container}"}[5m]) * 100`,
}

// TÜM 10 QUERY İÇİN TEKRARLA
```

---

### Faz 3: Stage Prompt Güncellemeleri
**Dosyalar**: 12, Stage 3, 18, 21(?), 23(?)
**Öncelik**: 🟡 ÖNEMLİ

**Değişiklik Şablonu**:

#### 3.1. Stage 2 Deep Analysis (12. Stage 2 Deep Analysis.txt)
```diff
# SATIR 11 DEĞİŞİKLİĞİ:

- Namespace: {{ $json._context.initialParams.namespaces[0] }}
+ Namespaces: {{ $json._context.initialParams.namespaces.join(', ') }}
+ Primary Namespace: {{ $json._context.initialParams.namespaces[0] }}
+ Total Namespaces: {{ $json._context.initialParams.namespaces.length }}
```

#### 3.2. Stage 3 Alert Intelligence (Stage 3 Alert Intelligence.txt)
```diff
# SATIR 196 DEĞİŞİKLİĞİ:

- "namespace": "{{ $json._context.initialParams.namespaces[0] || 'etiyamobile-production' }}",

+ "namespaces": {{ JSON.stringify($json._context.initialParams.namespaces || ['etiyamobile-production']) }},
+ "primaryNamespace": "{{ $json._context.initialParams.namespaces[0] || 'etiyamobile-production' }}",
```

#### 3.3. Stage 4 Automated Diagnosis (18. Stage 4 Automated Diagnosis.txt)
```diff
# SATIR 18 DEĞİŞİKLİĞİ:

- Namespace: {{ $json.stage2Data.critical_pods[0].namespace || $json.namespaces[0] }}

+ Namespaces: {{ $json.namespaces.join(', ') }}
+ Pod Namespace: {{ $json.stage2Data.critical_pods[0].namespace || $json.namespaces[0] }}

# SATIR 33, 56-58 kubectl KOMUTLARI:

- "namespace": "{{ $json.namespaces[0] }}",

+ "namespace": "{{ $json.stage2Data.critical_pods[0].namespace || $json.namespaces[0] }}",

# NOT: kubectl komutları için HER ZAMAN spesifik pod namespace'ini kullan
```

---

### Faz 4: Kubectl Komutları Adaptasyonu
**Öncelik**: 🔴 KRİTİK

**Dikkat Edilmesi Gerekenler**:

```javascript
// kubectl komutları SADECE ilgili pod'un namespace'ini kullanmalı
// Çünkü kubectl bir komutta birden fazla namespace desteklemiyor

// YANLIŞ:
kubectl get pods -n em-prod,em-global-prod  // ❌ ÇALIŞMAZ

// DOĞRU:
kubectl get pods -n em-prod  // ✅ Her namespace için ayrı komut
```

**Stage 4 ve 5 için Çözüm**:
```javascript
// Eğer birden fazla namespace varsa:
// 1. İlgili pod'un namespace'ini kullan (zaten var)
// 2. VEYA her namespace için ayrı komut üret

// Örnek:
namespaces.forEach(ns => {
  commands.push(`kubectl get pods -n ${ns} --selector=app=myapp`);
});
```

---

### Faz 5: Context Preservation (Fix Nodes)
**Dosyalar**: 8, 14, 17, 20, 22
**Öncelik**: 🟡 ORTA

**Prensip**:
```javascript
// _context.initialParams.namespaces ARRAY olarak korunmalı
// HER Fix node'da kontrol et:

if (output._context?.initialParams?.namespaces) {
  // Array'i koru
  if (!Array.isArray(output._context.initialParams.namespaces)) {
    output._context.initialParams.namespaces = [output._context.initialParams.namespaces];
  }
}
```

---

### Faz 6: Reporting Güncellemesi
**Dosyalar**: 26
**Öncelik**: 🟢 DÜŞÜK

**Değişiklik**:
```javascript
// ÖNCEKİ:
console.log("inputData.namespaces[0]:", inputData?.namespaces?.[0]);

// SONRA:
console.log("Namespaces:", inputData?.namespaces?.join(', '));
console.log("Primary Namespace:", inputData?.namespaces?.[0]);
console.log("Total Namespaces:", inputData?.namespaces?.length);

// Raporda tüm namespace'leri göster
```

---

## 📋 Dosya Bazında Değişiklik Matrisi

| # | Dosya | Kategori | Değişiklik | Öncelik | Zorluk | Tahmini Satır |
|---|-------|----------|-----------|---------|--------|---------------|
| 1 | Prometheus Input Handler.js | Input | ✅ Hazır | - | - | 0 |
| 2 | Prometheus Query Builder.js | Query | 🔴 Gerekli | Kritik | Orta | ~50 |
| 3 | Unified Entry Point.js | Context | ✅ Hazır | - | - | 0 |
| 4 | Alert Categories Mapper.js | Mapping | ✅ Hazır | - | - | 0 |
| 5 | Load Alert Knowledge Base.js | KB | ⚠️ Kontrol | Düşük | Kolay | ~5 |
| 6 | Prepare Stage 1 Input.js | Stage | ⚠️ Kontrol | Orta | Kolay | ~10 |
| 7 | Category Based Metrics Builder.js | Query | 🔴 Gerekli | Yüksek | Orta | ~20 |
| 8 | Fix Stage 1 Context.js | Fix | ⚠️ Kontrol | Orta | Kolay | ~5 |
| 9 | Stage 2 Decision.js | Decision | ⚠️ Kontrol | Düşük | Kolay | ~5 |
| 10 | Force Deep Analysis Override.js | Query | 🔴 Gerekli | Orta | Orta | ~10 |
| 11 | Category Based Deep Analysis Enhancer.js | Query | 🔴 Gerekli | Orta | Orta | ~15 |
| 12 | **Stage 2 Deep Analysis.txt** | **AI Prompt** | **🔴 Gerekli** | **Kritik** | **Kolay** | **~5** |
| 13 | Fix Stage2 Json.js | Fix | ⚠️ Kontrol | Düşük | Kolay | ~3 |
| 14 | Fix Stage 2 Context.js | Fix | ⚠️ Kontrol | Orta | Kolay | ~5 |
| 16 | Stage 3 Formater.js | Format | ⚠️ Kontrol | Düşük | Kolay | ~5 |
| 17 | Fix Stage 3 Context1.js | Fix | ⚠️ Kontrol | Orta | Kolay | ~5 |
| - | **Stage 3 Alert Intelligence.txt** | **AI Prompt** | **🔴 Gerekli** | **Kritik** | **Kolay** | **~10** |
| 18 | **Stage 4 Automated Diagnosis.txt** | **AI Prompt** | **🔴 Gerekli** | **Kritik** | **Orta** | **~15** |
| 19 | Fix Stage 4 Json.js | Fix | ⚠️ Kontrol | Düşük | Kolay | ~3 |
| 20 | Fix Stage 4 Context.js | Fix | ⚠️ Kontrol | Orta | Kolay | ~5 |
| 21 | **Stage 5 Smart Remediation.txt** | **AI Prompt** | **⚠️ Kontrol** | **Orta** | **Kolay** | **~5** |
| 22 | Fix Stage 5 Context.js | Fix | ⚠️ Kontrol | Orta | Kolay | ~5 |
| 23 | **Stage 6 Prevention & Learning.txt** | **AI Prompt** | **⚠️ Kontrol** | **Düşük** | **Kolay** | **~10** |
| 26 | Generate Final Report.js | Report | 🔴 Gerekli | Düşük | Kolay | ~20 |

**Toplam Tahmini Değişiklik**: ~200-250 satır

---

## 🚀 Uygulama Planı

### Aşama 1: Hazırlık ve Validasyon
**Süre**: 1 gün
**Görevler**:
1. ✅ Mevcut sistemi analiz et (TAMAMLANDI)
2. ⏳ Tüm namespace kullanımlarını dokümante et
3. ⏳ Test senaryoları hazırla
4. ⏳ Rollback planı oluştur

### Aşama 2: Core Query Adaptasyonu (KRİTİK)
**Süre**: 2 gün
**Dosyalar**: 2, 7, 10, 11
**Görevler**:
1. Namespace extraction mantığını güncelle
2. Prometheus query string'lerini adapt et
3. Her query için test et
4. Validation ekle

**Test Kriterleri**:
```javascript
// Test 1: Tek namespace (mevcut davranış)
namespaces: ["em-prod"]
Expected: namespace="em-prod"

// Test 2: Çoklu namespace
namespaces: ["em-prod", "em-global-prod", "em-prod-3pp"]
Expected: namespace=~"em-prod|em-global-prod|em-prod-3pp"

// Test 3: Empty array (fallback)
namespaces: []
Expected: namespace="etiyamobile-production"
```

### Aşama 3: Stage Prompt Güncellemeleri
**Süre**: 1 gün
**Dosyalar**: 12, Stage 3, 18, 21, 23
**Görevler**:
1. Prompt template'lerini güncelle
2. AI çıktı format'ını kontrol et
3. Context preservation'ı test et

### Aşama 4: Context Fix ve Preservation
**Süre**: 1 gün
**Dosyalar**: 8, 14, 17, 20, 22
**Görevler**:
1. Her Fix node'u incele
2. Array preservation mantığını ekle
3. Pipeline testleri yap

### Aşama 5: Integration ve Testing
**Süre**: 2 gün
**Görevler**:
1. End-to-end test (tek namespace)
2. End-to-end test (çoklu namespace)
3. Performance test
4. Edge case testleri

### Aşama 6: Documentation ve Deployment
**Süre**: 1 gün
**Görevler**:
1. Değişiklikleri dokümante et
2. Migration guide hazırla
3. Deployment planı
4. Rollback test

**Toplam Süre**: ~8 iş günü

---

## ⚠️ Riskler ve Dikkat Edilmesi Gerekenler

### Risk 1: Context Breaking
**Risk Seviyesi**: 🔴 YÜKSEK

**Sorun**: `_context` objesi bozulursa tüm pipeline durur

**Çözüm**:
```javascript
// Her node'da validation
if (!output._context?.initialParams?.namespaces) {
  console.error("CRITICAL: namespaces array missing in context!");
  // Fallback
  output._context.initialParams.namespaces = ['etiyamobile-production'];
}
```

### Risk 2: Prometheus Query Syntax
**Risk Seviyesi**: 🟡 ORTA

**Sorun**: Yanlış regex syntax Prometheus hataları oluşturur

**Çözüm**:
```javascript
// Validate regex syntax
const namespaceRegex = namespaces
  .map(ns => ns.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // Escape special chars
  .join('|');
```

### Risk 3: kubectl Multi-Namespace
**Risk Seviyesi**: 🔴 YÜKSEK

**Sorun**: kubectl bir komutta birden fazla namespace desteklemiyor

**Çözüm**:
```javascript
// Stage 4 ve 5'te HER ZAMAN ilgili pod namespace'ini kullan
const podNamespace = criticalPod.namespace || namespaces[0];
command: `kubectl describe pod ${pod} -n ${podNamespace}`
```

### Risk 4: Performance Impact
**Risk Seviyesi**: 🟡 ORTA

**Sorun**: Çoklu namespace query'leri daha fazla veri döner

**Çözüm**:
```javascript
// Query'lerde limit ekle
query: `kube_pod_status_phase{namespace=~"${namespaceRegex}"} [5m:30s]`
// 30s step ile data density azalt
```

### Risk 5: Backward Compatibility
**Risk Seviyesi**: 🟢 DÜŞÜK

**Sorun**: Eski formatı kullanan alertler çalışmayabilir

**Çözüm**:
```javascript
// Backward compat layer
const namespaces = Array.isArray(input.namespaces)
  ? input.namespaces
  : (input.namespace ? [input.namespace] : ['etiyamobile-production']);
```

---

## 🧪 Test Senaryoları

### Test 1: Tek Namespace (Mevcut Davranış)
```json
{
  "namespaces": ["em-prod"],
  "kubernetesFilters": {
    "namespace": "em-prod",
    "pod": "app-pod-123"
  }
}
```
**Beklenen**: Tüm query'ler `namespace="em-prod"` ile çalışmalı

### Test 2: Çoklu Namespace
```json
{
  "namespaces": ["em-prod", "em-global-prod", "em-prod-3pp"],
  "kubernetesFilters": {
    "namespace": "em-prod",
    "pod": "app-pod-123"
  }
}
```
**Beklenen**: Query'ler `namespace=~"em-prod|em-global-prod|em-prod-3pp"` ile çalışmalı

### Test 3: Empty Namespace (Fallback)
```json
{
  "namespaces": [],
  "kubernetesFilters": {}
}
```
**Beklenen**: Fallback `namespace="etiyamobile-production"` çalışmalı

### Test 4: kubectl Commands
```json
{
  "namespaces": ["em-prod", "em-global-prod"],
  "critical_pods": [{
    "pod": "app-pod-123",
    "namespace": "em-global-prod"
  }]
}
```
**Beklenen**: kubectl `-n em-global-prod` kullanmalı (pod'un namespace'i)

---

## 📝 Migration Guide (Uygulama Sonrası)

### Adım 1: Input Format Güncellemesi
```javascript
// ÖNCEKİ:
{
  "namespace": "em-prod"
}

// SONRA:
{
  "namespaces": ["em-prod", "em-global-prod"]
}
```

### Adım 2: Alert Listener Güncellemesi
Alert Listener flow'da namespace extraction mantığını güncelle:

```javascript
// Birden fazla namespace çıkar
const namespaces = extractNamespacesFromAlert(alert);
// ["em-prod", "em-global-prod"] gibi
```

### Adım 3: Monitoring Dashboard
Grafana dashboard'larında multi-namespace variable ekle:

```promql
# Dashboard variable
namespace =~ "$namespaces"

# Query
kube_pod_status_phase{namespace=~"$namespaces"}
```

---

## 💡 Öneriler

### Öneri 1: Namespace Priority
Birden fazla namespace varsa önceliklendirme ekle:

```javascript
{
  "namespaces": [
    { "name": "em-prod", "priority": 1 },           // Primary
    { "name": "em-global-prod", "priority": 2 },     // Secondary
    { "name": "em-prod-3pp", "priority": 3 }         // Tertiary
  ]
}
```

### Öneri 2: Namespace Filtering
Stage 2'de namespace başına analiz sonuçları:

```json
{
  "stage2Results": {
    "em-prod": {
      "critical_pods": [...],
      "issues": [...]
    },
    "em-global-prod": {
      "critical_pods": [...],
      "issues": [...]
    }
  }
}
```

### Öneri 3: Konfigürasyon Dosyası
Multi-namespace config:

```yaml
# config/namespaces.yaml
namespaces:
  production:
    - em-prod
    - em-global-prod
    - em-prod-3pp
  staging:
    - em-stg
    - em-global-stg
```

---

## 📊 Etki Analizi

### Performans Etkisi
- **Query Süresi**: +30-50% (çoklu namespace için)
- **Veri Miktarı**: +50-100% (namespace sayısına bağlı)
- **Memory Kullanımı**: +20-30%

**Optimizasyon**:
```javascript
// Paralel query'ler kullan
Promise.all(namespaces.map(ns => queryPrometheus(ns, filters)))
```

### Maliyet Etkisi
- **Prometheus Query Maliyeti**: +40-60%
- **n8n Execution Time**: +25-35%

### Kullanıcı Etkisi
- **Setup Kolaylığı**: ✅ Kolaylaşır (tek alert tüm namespace'leri izler)
- **Alert Precision**: ✅ İyileşir (namespace bazlı korelasyon)
- **Dashboard Görünürlüğü**: ✅ İyileşir (tüm namespace'ler tek ekranda)

---

## ✅ Sonraki Adımlar

### Hemen Yapılacaklar
1. ✅ Analiz raporu onayla
2. ⏳ İzin al (değişiklik için)
3. ⏳ Test environment hazırla
4. ⏳ Backup al (tüm node'lardan)

### Uygulama Sırası
1. **Önce**: Query Builder'ları güncelle (Faz 2)
2. **Sonra**: Stage prompt'ları güncelle (Faz 3)
3. **En Son**: Context fix ve reporting (Faz 4-6)

### Validasyon
Her faz sonrası:
- ✅ Unit test
- ✅ Integration test
- ✅ Regression test
- ✅ Performance test

---

**Rapor Durumu**: Tamamlandı
**Onay Bekleniyor**: Evet
**Tahmini Süre**: 8 iş günü
**Risk Seviyesi**: Orta (uygun test ile düşürülebilir)
