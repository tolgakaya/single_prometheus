# Scheduler Flow Node Files - Implementation Guide

## 📁 Oluşturulan Dosyalar

Tüm node dosyaları `FreePrometheus/SchedulerNodes/` klasöründe oluşturuldu:

### 1. Node JavaScript Dosyaları
- ✅ `1. Prepare Prometheus Input.js` - Schedule trigger'dan FreePrometheus input'una çevirir
- ✅ `2. Process Results and Decision.js` - Analiz sonuçlarını işler, fingerprint oluşturur, Jira verisi hazırlar
- ✅ `3. Redis State Check.js` - Redis sonucunu yorumlar, deduplication kararı verir
- ✅ `4. Prepare Redis Data.js` - Redis'e yazılacak veriyi hazırlar
- ✅ `5. Update Jira Comment.js` - Mevcut ticket için comment hazırlar
- ✅ `6. Prepare Notification.js` - Final notification formatını hazırlar (Slack, Teams, Email)

### 2. Dokümantasyon Dosyaları
- ✅ `SCHEDULER_FLOW_ANALYSIS.md` - Detaylı flow analizi ve mimari dokümantasyon
- ✅ `CONFIGURATION_UPDATES.md` - Manuel yapılacak n8n konfigürasyon değişiklikleri
- ✅ `README.md` - Bu dosya (implementation guide)

---

## 🚀 HIZLI BAŞLANGIÇ

### Adım 1: Dosyaları Oku
```bash
# Önce analiz dokümanını oku (flow yapısını anlamak için)
FreePrometheus/claudedocs/SCHEDULER_FLOW_ANALYSIS.md

# Sonra konfigürasyon güncellemelerini oku
FreePrometheus/SchedulerNodes/CONFIGURATION_UPDATES.md
```

### Adım 2: n8n'de Node Ekle
1. n8n'de "Scheduler Cluster Health Flow"u aç
2. "Schedule Trigger" ile "Execute Prometheus Analysis" arasına **Code node** ekle
3. Node adını "Prepare Prometheus Input" yap
4. `1. Prepare Prometheus Input.js` dosyasındaki kodu kopyala

### Adım 3: Mevcut Node'ları Güncelle

#### Process Results & Decision
- Mevcut kodu **tamamen sil**
- `2. Process Results and Decision.js` dosyasındaki kodu kopyala

#### Redis Get
- Key parametresini güncelle:
  - Eski: `alert:{{ $node["Alert Deduplication"].json.fingerprint }}`
  - Yeni: `alert:{{ $json.fingerprint }}`

#### Redis State Check
- Mevcut kodu **tamamen sil**
- `3. Redis State Check.js` dosyasındaki kodu kopyala

#### Prepare Redis Data
- Mevcut kodu **tamamen sil** (opsiyonel - mevcut kod da çalışır)
- `4. Prepare Redis Data.js` dosyasındaki kodu kopyala

#### Decision Router (Switch Node)
- Rules'ları güncelle:
  - Rule 0: `$json.dedupStatus === 'new'`
  - Rule 1: `$json.dedupStatus === 'existing'`

#### Create Jira Incident
- Priority field'ı dynamic yap: `{{ $json.jiraTicketData.priority }}`
- Labels ekle: `{{ $json.jiraTicketData.labels }}`

#### Update Jira Comment
- Mevcut kodu **tamamen sil** (opsiyonel)
- `5. Update Jira Comment.js` dosyasındaki kodu kopyala

#### Prepare Notification
- Mevcut kodu **tamamen sil**
- `6. Prepare Notification.js` dosyasındaki kodu kopyala

### Adım 4: Bağlantıları Düzenle
1. Schedule Trigger → Execute Prometheus Analysis bağlantısını **sil**
2. Schedule Trigger → Prepare Prometheus Input bağlantısı **ekle**
3. Prepare Prometheus Input → Execute Prometheus Analysis bağlantısı **ekle**

### Adım 5: Test Et
1. "Manual Test Trigger" node'unu tetikle
2. Her node'un output'unu kontrol et
3. Redis'te key oluşturuldu mu kontrol et
4. Jira ticket oluşturuldu mu kontrol et

---

## 🎯 KRİTİK NOKTALAR

### 1. Fingerprint Algoritması
Fingerprint şu verilerden oluşturulur:
```javascript
{
  component: "bss-mc-crm-search-integrator",
  issueType: "Memory pressure causing",  // İlk 3 kelime
  namespace: "bstp-cms-global-production",
  severity: "degraded"
}
→ SHA256 hash → 16 karakter
```

**ÖNEMLİ**: Fingerprint algoritması değiştirilirse mevcut Redis key'leri geçersiz olur!

### 2. Deduplication Logic
- **NEW**: Redis'te fingerprint yok → Yeni ticket oluştur
- **EXISTING**: Redis'te fingerprint var → Mevcut ticket'a comment ekle

### 3. Redis TTL (Severity Bazlı)
- Critical: 1 gün (86400 saniye)
- Degraded: 3 gün (259200 saniye)
- Warning: 7 gün (604800 saniye)
- Default: 7 gün

### 4. Jira Ticket Creation Threshold
Ticket oluşturulma koşulları:
```javascript
severity === 'critical' ||
severity === 'degraded' ||
alertsCritical > 0 ||
issuesFound > 0 ||
confidence >= 0.7 ||
immediateActions.length > 0
```

---

## 📊 VERI AKIŞI

```
Schedule Trigger (empty)
    ↓
Prepare Prometheus Input (orchestratorInput oluştur)
    ↓
Execute Prometheus Analysis (FreePrometheus Flow çalıştır)
    ↓
Process Results & Decision (fingerprint + Jira data hazırla)
    ↓
Redis Get (alert:fingerprint ara)
    ↓
Redis State Check (new/existing kararı ver)
    ↓
Prepare Redis Data (Redis data hazırla)
    ↓
Redis Set (Redis'e yaz)
    ↓
Decision Router (NEW mi EXISTING mi?)
    ↓
    ├─ NEW → Create Jira Ticket? → Create Jira Incident
    └─ EXISTING → Update Jira Comment → Add a comment
    ↓
Prepare Notification (Slack/Teams/Email formatla)
```

---

## 🔍 ÖRNEK VERI YAPILARI

### Fingerprint
```
"abc123def456"  // 16 karakter SHA256 hash
```

### Redis Key-Value
```javascript
// Key
"alert:abc123def456"

// Value
{
  "alert_fingerprint": "abc123def456",
  "first_seen": "1734445200000",
  "last_seen": "1734445800000",
  "occurrence_count": "3",
  "status": "active",
  "severity": "degraded",
  "title": "Memory pressure causing pod restarts",
  "source": "kubernetes",
  "component": "bss-mc-crm-search-integrator",
  "namespace": "bstp-cms-global-production",
  "jira_ticket_id": "12345",
  "jira_ticket_key": "INCIDENT-123",
  "call_count": "0",
  "updated_at": "2025-12-17T15:00:00.000Z"
}
```

### Jira Ticket Data
```javascript
{
  "project": "INCIDENT",
  "issueType": "Incident",
  "summary": "[KubeHpaMaxedOut] bss-mc-crm-search-integrator - Memory pressure",
  "description": "# Kubernetes Cluster Health Report\n...",
  "priority": "High",
  "labels": [
    "kubernetes",
    "auto-generated",
    "scheduler",
    "severity-degraded",
    "confidence-80"
  ],
  "components": ["bss-mc-crm-search-integrator"]
}
```

---

## ⚠️ TROUBLESHOOTING

### Problem 1: Fingerprint undefined
**Sebep**: "Process Results & Decision" node'u doğru çalışmıyor
**Çözüm**: Node kodunu `2. Process Results and Decision.js` ile değiştir

### Problem 2: Redis key bulunamıyor
**Sebep**: Redis Get node'u yanlış key kullanıyor
**Çözüm**: Key'i `alert:{{ $json.fingerprint }}` yap

### Problem 3: Decision Router yanlış output veriyor
**Sebep**: Rules yanlış (`$json.alert.dedupStatus` yerine `$json.dedupStatus`)
**Çözüm**: Rules'ları `CONFIGURATION_UPDATES.md`'ye göre düzelt

### Problem 4: Jira ticket oluşturulmuyor
**Sebep**: `needsJiraTicket` false dönüyor
**Çözüm**: 
1. Severity threshold'u kontrol et
2. FreePrometheus output'unda `issuesFound > 0` olmalı

### Problem 5: FreePrometheus Flow çalışmıyor
**Sebep**: Prepare Prometheus Input yanlış format gönderiyor
**Çözüm**: `orchestratorInput` formatını kontrol et, FreePrometheus Flow input beklentilerine uygun olmalı

---

## 📞 DESTEK

### Dokümantasyon
- Flow Analizi: `claudedocs/SCHEDULER_FLOW_ANALYSIS.md`
- Konfigürasyon: `SchedulerNodes/CONFIGURATION_UPDATES.md`
- Node Dosyaları: `SchedulerNodes/1-6. *.js`

### Test Senaryoları
`CONFIGURATION_UPDATES.md` dosyasında detaylı test senaryoları mevcut:
- Test 1: Yeni Alert
- Test 2: Duplicate Alert

### Kontrol Listesi
`CONFIGURATION_UPDATES.md` dosyasının sonunda kapsamlı kontrol listesi mevcut.

---

## ✅ SON ADIMLAR

1. [ ] Tüm node dosyalarını oku ve anla
2. [ ] `CONFIGURATION_UPDATES.md`'yi takip ederek n8n'de değişiklikleri yap
3. [ ] Bağlantıları düzenle (Prepare Prometheus Input ekle)
4. [ ] Jira URL'lerini güncelle (your-jira.atlassian.net → kendi instance)
5. [ ] Test 1'i çalıştır (yeni alert)
6. [ ] Test 2'yi çalıştır (duplicate alert)
7. [ ] Redis'i kontrol et (keys, TTL, values)
8. [ ] Jira'yı kontrol et (ticket creation, comments)
9. [ ] Production'a deploy et

---

**Hazırlayan**: Claude Code  
**Tarih**: 2025-12-17  
**Versiyon**: 1.0  
**Toplam Dosya**: 9  
**Toplam Satır**: ~2000 lines of code + documentation
