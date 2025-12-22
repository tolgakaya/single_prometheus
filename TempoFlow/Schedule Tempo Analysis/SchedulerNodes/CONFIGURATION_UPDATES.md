# Scheduler Flow - Manual Configuration Updates

Bu dosya n8n Scheduler Flow'unda manuel olarak yapılması gereken konfigürasyon değişikliklerini içerir.

## 📋 YENİ NODE EKLE

### 1. "Prepare Prometheus Input" Node Ekle

**Pozisyon**: "Schedule Trigger" ile "Execute Prometheus Analysis" arasına

**Node Tipi**: Code (n8n-nodes-base.code)

**Konfigürasyon**:
- Mode: `runOnceForEachItem`
- JavaScript Code: `SchedulerNodes/1. Prepare Prometheus Input.js` dosyasındaki kodu kopyala

**Bağlantılar**:
- **Input**: Schedule Trigger → Prepare Prometheus Input
- **Output**: Prepare Prometheus Input → Execute Prometheus Analysis

**Test**:
```javascript
// Schedule Trigger tetiklendiğinde şu output'u vermeli:
{
  "orchestratorInput": {
    "requestId": "scheduled-1734445200-abc123",
    "orchestratorId": "scheduler-health-check-1734445200",
    "timestamp": "2025-12-17T15:00:00.000Z",
    "requestType": "scheduled_health_check",
    "timeRange": { "start": 1734441600, "end": 1734445200, "duration": "1h" },
    "context": { ... },
    "metadata": { ... },
    "priority": "normal"
  },
  "schedulerInfo": { ... }
}
```

---

## 🔧 MEVCUT NODE'LARI GÜNCELLE

### 2. "Process Results & Decision" Node'u Güncelle

**Node Adı**: Process Results & Decision

**Güncelleme**: JavaScript kodunu **tamamen değiştir**

**Yeni Kod**: `SchedulerNodes/2. Process Results and Decision.js` dosyasındaki kodu kopyala

**Kritik Değişiklikler**:
- ✅ Fingerprint generation eklendi
- ✅ FreePrometheus output formatına uyumlu hale getirildi
- ✅ Gereksiz node referansları kaldırıldı (`Alert Deduplication`, `Prepare Prometheus Input`)
- ✅ Jira ticket description builder eklendi

**Test**:
```javascript
// Output'ta şunlar olmalı:
{
  "fingerprint": "abc123def456",  // SHA256 hash (16 char)
  "needsJiraTicket": true/false,
  "alertSummary": { ... },
  "kubernetesAnalysis": { ... },
  "jiraTicketData": { ... } || null
}
```

---

### 3. "Redis Get" Node'u Güncelle

**Node Adı**: Redis Get

**Güncelleme**: Key parametresini düzelt

**Eski Key**: `alert:{{ $node["Alert Deduplication"].json.fingerprint }}`

**Yeni Key**: `alert:{{ $json.fingerprint }}`

**Açıklama**: Fingerprint artık "Process Results & Decision" node'undan geliyor

**Test**:
```bash
# Redis'te key şu formatta olmalı:
alert:abc123def456

# n8n expression'da test:
{{ $json.fingerprint }}  // "abc123def456" döndürmeli
```

---

### 4. "Redis State Check" Node'u Güncelle

**Node Adı**: Redis State Check

**Güncelleme**: JavaScript kodunu **tamamen değiştir**

**Yeni Kod**: `SchedulerNodes/3. Redis State Check.js` dosyasındaki kodu kopyala

**Kritik Değişiklikler**:
- ✅ `Alert Deduplication` node referansı kaldırıldı
- ✅ `Process Results & Decision`'dan veri alınıyor
- ✅ Deduplication metrics hesaplaması eklendi

**Test**:
```javascript
// NEW alert için output:
{
  "dedupStatus": "new",
  "fingerprint": "abc123",
  "existingTicket": null,
  "actions": {
    "skipAnalysis": false,
    "createNewTicket": true
  }
}

// EXISTING alert için output:
{
  "dedupStatus": "existing",
  "fingerprint": "abc123",
  "existingTicket": {
    "key": "INCIDENT-123",
    "occurrences": 3
  },
  "actions": {
    "updateTicket": true,
    "escalate": false
  }
}
```

---

### 5. "Prepare Redis Data" Node'u Güncelle

**Node Adı**: Prepare Redis Data

**Güncelleme**: JavaScript kodunu **tamamen değiştir** (isteğe bağlı - mevcut kod iyi)

**Yeni Kod**: `SchedulerNodes/4. Prepare Redis Data.js` dosyasındaki kodu kopyala

**İyileştirmeler**:
- ✅ Severity-based TTL eklendi
- ✅ Daha detaylı Redis data structure
- ✅ Debug bilgileri eklendi

---

### 6. "Decision Router" Switch Node'u Güncelle

**Node Adı**: Decision Router

**Node Tipi**: Switch (n8n-nodes-base.switch)

**Güncelleme**: Rules'ları düzelt

**Mevcut Rules**:
```javascript
// Rule 0:
$json.alert.dedupStatus === 'new'  // ❌ YANLIŞ

// Rule 1:
$json.alert.dedupStatus === 'existing'  // ❌ YANLIŞ
```

**Yeni Rules**:
```javascript
// Rule 0 (NEW alerts):
$json.dedupStatus === 'new'  // ✅ DOĞRU

// Rule 1 (EXISTING alerts):
$json.dedupStatus === 'existing'  // ✅ DOĞRU
```

**Açıklama**: `dedupStatus` artık root level'da, `alert` object'i içinde değil

**Test**:
```javascript
// Test data ile kontrol et:
// NEW alert:
{ "dedupStatus": "new", ... }  → Rule 0 matched → Output 0 (Create Jira)

// EXISTING alert:
{ "dedupStatus": "existing", ... }  → Rule 1 matched → Output 1 (Update Jira)
```

---

### 7. "Create Jira Incident" Node'u Güncelle

**Node Adı**: Create Jira Incident

**Node Tipi**: Jira (n8n-nodes-base.jira)

**Güncellemeler**:

#### a) Priority'yi Dynamic Yap

**Mevcut**: `Priority: High (2)` (hardcoded)

**Yeni**: 
```
Field: additionalFields.priority
Value: {{ $json.jiraTicketData.priority }}
Mode: Expression
```

#### b) Labels Ekle

**Ekle**:
```
Field: additionalFields.serverLabels
Value: {{ $json.jiraTicketData.labels }}
Mode: Expression
```

#### c) Components Ekle (Opsiyonel)

**Ekle**:
```
Field: additionalFields.components
Value: {{ $json.jiraTicketData.components }}
Mode: Expression
```

**Test**:
```javascript
// Input data kontrolü:
$json.jiraTicketData = {
  "summary": "[KubeHpaMaxedOut] bss-mc-crm-search-integrator - Memory pressure",
  "description": "# Kubernetes Cluster Health Report...",
  "priority": "High",
  "labels": ["kubernetes", "auto-generated", "scheduler", ...],
  "components": ["bss-mc-crm-search-integrator"]
}
```

---

### 8. "Update Jira Comment" Node'u Güncelle

**Node Adı**: Update Jira Comment

**Güncelleme**: JavaScript kodunu **tamamen değiştir** (isteğe bağlı - mevcut kod iyi)

**Yeni Kod**: `SchedulerNodes/5. Update Jira Comment.js` dosyasındaki kodu kopyala

**İyileştirmeler**:
- ✅ Daha detaylı recurrence bilgisi
- ✅ Severity change detection
- ✅ Escalation logic
- ✅ Formatted metrics

---

### 9. "Prepare Notification" Node'u Güncelle

**Node Adı**: Prepare Notification

**Güncelleme**: JavaScript kodunu **tamamen değiştir**

**Yeni Kod**: `SchedulerNodes/6. Prepare Notification.js` dosyasındaki kodu kopyala

**Kritik Değişiklikler**:
- ✅ FreePrometheus output formatına uyumlu
- ✅ Slack block format eklendi
- ✅ Chat summary eklendi
- ✅ Jira operation tracking (created/updated)

**Test**:
```javascript
// Output şu formatı içermeli:
{
  "timestamp": "2025-12-17T15:00:00.000Z",
  "status": "completed",
  "alert": { ... },
  "incidentReport": { ... },
  "jiraTicket": { "operation": "created", "key": "INCIDENT-123" },
  "formats": {
    "slack": { "text": "...", "blocks": [...] },
    "chatSummary": "...",
    "markdown": "..."
  },
  "summary": "Alert abc123 analyzed. ..."
}
```

---

## 🔗 BAĞLANTI DÜZENLEMELERİ

### Mevcut Bağlantılar:
```
Schedule Trigger → Execute Prometheus Analysis (❌ SİL)
```

### Yeni Bağlantılar:
```
Schedule Trigger → Prepare Prometheus Input (✅ EKLE)
Prepare Prometheus Input → Execute Prometheus Analysis (✅ EKLE)
```

**Diğer bağlantılar aynı kalıyor**

---

## 🎨 JİRA URL GÜNCELLEME

**Tüm Jira URL'leri**:

Aşağıdaki node'larda `https://your-jira.atlassian.net` URL'ini kendi Jira instance URL'iniz ile değiştirin:

1. **Process Results & Decision** (line ~120): Jira description içinde
2. **Prepare Notification** (line ~80): Slack notification ve chat summary içinde

**Örnek**:
```javascript
// Eski:
url: `https://your-jira.atlassian.net/browse/${jiraTicket.key}`

// Yeni (kendi URL'iniz):
url: `https://etiya.atlassian.net/browse/${jiraTicket.key}`
```

---

## 🧪 TEST SENARYOLARI

### Test 1: Yeni Alert (Schedule Trigger)

1. Schedule Trigger'ı manuel tetikle
2. Prepare Prometheus Input → orchestratorInput oluşturmalı
3. Execute Prometheus Analysis → FreePrometheus Flow çalışmalı
4. Process Results & Decision → fingerprint oluşturmalı
5. Redis Get → value: null (yeni alert)
6. Redis State Check → dedupStatus: 'new'
7. Prepare Redis Data → Redis key-value hazırlanmalı
8. Redis Set → Redis'e yazılmalı
9. Decision Router → Output 0 (NEW)
10. Create Jira Ticket? → needsJiraTicket check
11. Create Jira Incident → Ticket oluşturulmalı (severity >= degraded ise)
12. Prepare Notification → Slack + chat summary hazırlanmalı

**Beklenen Sonuç**:
- Redis'te key oluşturulmalı: `alert:abc123def456`
- Jira ticket oluşturulmalı (eğer severity threshold geçildi ise)
- Notification hazırlanmalı

### Test 2: Duplicate Alert (15 Dakika Sonra)

1. Schedule Trigger tekrar tetiklensin
2. Aynı root cause tespit edilsin → **Aynı fingerprint**
3. Redis Get → value: {...} (mevcut alert)
4. Redis State Check → dedupStatus: 'existing', occurrences: 2
5. Prepare Redis Data → occurrence_count: '2'
6. Redis Set → Redis güncellenmeli
7. Decision Router → Output 1 (EXISTING)
8. Update Jira Comment → Comment hazırlanmalı
9. Add a comment → Mevcut ticket'a comment eklenmeli
10. Prepare Notification → Slack + chat summary (jiraTicket.operation: 'updated')

**Beklenen Sonuç**:
- Redis'te occurrence_count güncellensin: '2'
- Jira ticket'a "Occurrence #2" comment'i eklensin
- Notification'da "updated" operation olsun

---

## ✅ KONTROL LİSTESİ

### Flow Yapısı
- [ ] "Prepare Prometheus Input" node'u eklendi
- [ ] Schedule Trigger → Prepare Prometheus Input bağlantısı yapıldı
- [ ] Prepare Prometheus Input → Execute Prometheus Analysis bağlantısı yapıldı
- [ ] Eski Schedule Trigger → Execute Prometheus Analysis bağlantısı silindi

### Node Güncellemeleri
- [ ] Process Results & Decision kodu güncellendi
- [ ] Redis Get key formatı düzeltildi
- [ ] Redis State Check kodu güncellendi
- [ ] Prepare Redis Data kodu güncellendi (opsiyonel)
- [ ] Decision Router rules düzeltildi
- [ ] Create Jira Incident priority/labels eklendi
- [ ] Update Jira Comment kodu güncellendi (opsiyonel)
- [ ] Prepare Notification kodu güncellendi

### Konfigürasyon
- [ ] Jira URL'leri güncellendi (your-jira.atlassian.net → kendi instance)
- [ ] Redis credentials doğrulandı
- [ ] Jira credentials doğrulandı
- [ ] Schedule interval kontrol edildi (15 dakika)

### Test
- [ ] Yeni alert senaryosu test edildi
- [ ] Duplicate alert senaryosu test edildi
- [ ] Redis'te key oluşturuldu
- [ ] Jira ticket oluşturuldu
- [ ] Jira comment eklendi
- [ ] Notification formatları kontrol edildi

---

## 🚨 ÖNEMLİ NOTLAR

1. **Fingerprint Consistency**: Fingerprint algoritması değiştirilirse tüm mevcut Redis key'leri geçersiz olur!

2. **Redis TTL**: Severity bazlı TTL kullanılıyor. Critical: 1 gün, Degraded: 3 gün, Warning: 7 gün

3. **Jira Custom Fields**: Custom field ID'leri (`customfield_10001` vb.) kendi Jira instance'ınıza göre güncelleyin

4. **FreePrometheus Flow ID**: `Execute Prometheus Analysis` node'undaki workflow ID'yi kontrol edin: `ysMD5nc5K6RCPF0Q`

5. **Phone Call Feature**: Şu an kapalı (commented out). Gelecekte Retell AI entegrasyonu eklenecek.

---

**Güncelleme Tarihi**: 2025-12-17  
**Versiyon**: 1.0  
**Toplam Güncellenecek Node**: 9  
**Yeni Eklenecek Node**: 1
