# Scheduler Flow - Detaylı Analiz ve İmplementasyon Planı

## 📋 GENEL BAKIŞ

Bu flow, her 15 dakikada bir çalışarak Kubernetes cluster sağlığını kontrol edecek, sorunları tespit edecek ve Jira ticket yönetimi yapacak bir scheduler sistemidir.

## 🎯 FLOW AMACI

1. **Periyodik Kontrol**: Her 15 dakikada FreePrometheus Flow'u tetikler
2. **Fingerprint Bazlı Deduplication**: Aynı sorun için tekrar ticket oluşturmayı engeller
3. **Redis State Management**: Alert durumlarını Redis'te saklar
4. **Jira Ticket Yönetimi**: Yeni ticket oluşturur veya mevcut ticket'a comment ekler

---

## 📊 FLOW MİMARİSİ

```
Schedule Trigger (15 dakika) 
    ↓
Execute Prometheus Analysis (FreePrometheus Flow tetikleme)
    ↓
Process Results & Decision (Analiz sonuçlarını işle, Jira ticket verisini hazırla)
    ↓
Redis Get (Fingerprint ile Redis'te ara)
    ↓
Redis State Check (Redis sonucunu yorumla, dedup kararı ver)
    ↓
Prepare Redis Data (Redis'e yazılacak veriyi hazırla)
    ↓
Redis Set (Alert durumunu Redis'e yaz)
    ↓
Decision Router (Yeni mi, mevcut mi?)
    ↓
    ├─ NEW → Create Jira Ticket? → Create Jira Incident → Prepare Notification
    └─ EXISTING → Update Jira Comment → Add a comment → Prepare Notification
```

---

## 🔍 NODE DETAYLARI

### 1. Schedule Trigger
**Görev**: Her 15 dakikada bir flow'u tetikler
**Konfigürasyon**: 
- Interval: 15 minutes
- Type: scheduleTrigger

**Yapılması Gereken**:
- ✅ Zaten konfigüre edilmiş, değişiklik yok

---

### 2. Execute Prometheus Analysis
**Görev**: FreePrometheus Flow'unu tetikler ve analiz sonuçlarını bekler

**Current Workflow ID**: `ysMD5nc5K6RCPF0Q`

**Input Mapping**:
```javascript
{
  requestId: "{{ $json.orchestratorInput.requestId }}",
  orchestratorId: "{{ $json.orchestratorInput.orchestratorId }}",
  timestamp: "{{ $json.orchestratorInput.timestamp }}",
  requestType: "{{ $json.orchestratorInput.requestType }}",
  timeRange: JSON.stringify($json.orchestratorInput.timeRange),
  context: JSON.stringify($json.orchestratorInput.context),
  metadata: JSON.stringify($json.orchestratorInput.metadata),
  priority: "{{ $json.orchestratorInput.priority }}"
}
```

**SORUN**: Schedule trigger'dan gelen veri `orchestratorInput` içermiyor!

**Yapılması Gereken**:
- Schedule Trigger ile Execute Prometheus Analysis arasına yeni bir Code node ekle
- Bu node FreePrometheus Flow için gerekli input'u hazırlasın
- **Dosya**: `SchedulerNodes/1. Prepare Prometheus Input.js`

---

### 3. Process Results & Decision
**Görev**: 
- FreePrometheus Flow'dan gelen analiz sonucunu işler
- Jira ticket için gerekli veriyi hazırlar
- Fingerprint oluşturur (Redis için)

**Expected Input**: FreePrometheus output (20. Generate Final Report Output.json formatında)

**Expected Output**:
```javascript
{
  needsJiraTicket: boolean,
  alertSummary: {
    alertId: string,
    source: string,
    title: string,
    detectedAt: ISO timestamp,
    severity: string,
    businessImpact: string,
    identifiedIssue: string
  },
  kubernetesAnalysis: { ... },
  report: string (markdown),
  jiraTicketData: { ... } || null,
  fingerprint: string  // ÖNEMLİ: Fingerprint burada oluşturulmalı!
}
```

**SORUN**: 
1. Code içinde `$node["Prepare Prometheus Input"]` referansı var ama bu node henüz yok
2. Code içinde `$node["Redis State Check"]` referansı var ama bu node daha sonra geliyor (sıralama hatası)
3. Fingerprint oluşturma kodu yok!

**Yapılması Gereken**:
- Kodu FreePrometheus output'una göre yeniden yaz
- Fingerprint oluşturma ekle
- Gereksiz node referanslarını kaldır
- **Dosya**: `SchedulerNodes/2. Process Results and Decision.js`

---

### 4. Redis Get
**Görev**: Fingerprint ile Redis'te alert durumunu kontrol eder

**Key Format**: `alert:{{ fingerprint }}`

**SORUN**: 
- Key'de `$node["Alert Deduplication"].json.fingerprint` kullanılıyor
- Ama "Alert Deduplication" diye bir node yok!
- Fingerprint "Process Results & Decision" node'undan gelmeli

**Yapılması Gereken**:
- Key formatını düzelt: `alert:{{ $json.fingerprint }}`
- **Dosya**: Redis node konfigürasyonunu doğrudan düzeltebilirsin (kod dosyası yok)

---

### 5. Redis State Check
**Görev**: 
- Redis'ten gelen sonucu yorumlar
- Alert yeni mi, mevcut mi karar verir
- Deduplication metrikleri hesaplar

**Expected Input**:
```javascript
{
  value: string (Redis'ten gelen JSON string) || null,
  // + Process Results & Decision'dan gelen tüm data
}
```

**Expected Output**:
```javascript
{
  fingerprint: string,
  dedupStatus: 'new' | 'existing',
  existingTicket: { ... } || null,
  metrics: { ... },
  actions: {
    skipAnalysis: boolean,
    updateTicket: boolean,
    escalate: boolean,
    makeCall: boolean
  },
  // + Original alert data
}
```

**SORUN**:
- Code içinde `$node["Alert Deduplication"].json.fingerprint` referansı var
- Bu referansı Process Results & Decision'dan almalı

**Yapılması Gereken**:
- Node referanslarını düzelt
- Deduplication logic'i gözden geçir
- **Dosya**: `SchedulerNodes/3. Redis State Check.js`

---

### 6. Prepare Redis Data
**Görev**: Redis'e yazılacak veriyi hazırlar

**Expected Output**:
```javascript
{
  key: "alert:{{ fingerprint }}",
  value: JSON.stringify({
    alert_fingerprint: string,
    first_seen: timestamp,
    last_seen: timestamp,
    occurrence_count: string,
    status: 'active',
    severity: string,
    title: string,
    source: string,
    jira_ticket_id: string,
    jira_ticket_key: string,
    call_count: string,
    updated_at: ISO timestamp
  }),
  ttl: 604800, // 7 days
  alert: { ... },
  fingerprint: string
}
```

**Yapılması Gereken**:
- Mevcut kod iyi görünüyor, sadece kontrol et
- **Dosya**: `SchedulerNodes/4. Prepare Redis Data.js`

---

### 7. Redis Set
**Görev**: Hazırlanan veriyi Redis'e yazar

**Yapılması Gereken**:
- ✅ Zaten konfigüre edilmiş, değişiklik yok

---

### 8. Decision Router (Switch Node)
**Görev**: Alert'in yeni mi mevcut mi olduğuna göre route eder

**Rules**:
- Rule 0: `$json.alert.dedupStatus === 'new'` → Output 0 (Create Jira Ticket?)
- Rule 1: `$json.alert.dedupStatus === 'existing'` → Output 1 (Update Jira Comment)

**SORUN**:
- `$json.alert.dedupStatus` yolu yanlış
- Doğrusu: `$json.dedupStatus` olmalı

**Yapılması Gereken**:
- Switch rules'u düzelt
- **Dosya**: Node konfigürasyonunu doğrudan düzeltebilirsin

---

### 9. Create Jira Ticket? (IF Node)
**Görev**: Jira ticket oluşturulmalı mı kontrol eder

**Condition**: `$json.needsJiraTicket === true`

**Yapılması Gereken**:
- ✅ Zaten konfigüre edilmiş, değişiklik yok

---

### 10. Create Jira Incident
**Görev**: Jira'da yeni ticket oluşturur

**Current Config**:
- Project: 13601 (Etiya Mobile MVNO)
- Issue Type: 10200 (Task)
- Summary: `{{ $json.jiraTicketData.summary }}`
- Description: `{{ $json.jiraTicketData.description }}`
- Assignee: platform_support@etiya.com
- Epic Link: EM-5364
- Priority: High (2)

**Yapılması Gereken**:
- Priority'yi dynamic yap: `{{ $json.jiraTicketData.priority }}`
- Labels ekle: `{{ $json.jiraTicketData.labels }}`
- **Dosya**: Node konfigürasyonunu manuel düzelt

---

### 11. Update Jira Comment
**Görev**: Mevcut ticket için comment verisi hazırlar

**Expected Input**: Redis State Check'ten gelen data

**Expected Output**:
```javascript
{
  ticketKey: string,
  comment: string (markdown formatted),
  escalate: boolean,
  alert: { ... }
}
```

**Yapılması Gereken**:
- Mevcut kod iyi görünüyor, sadece kontrol et
- **Dosya**: `SchedulerNodes/5. Update Jira Comment.js`

---

### 12. Add a comment (Jira Node)
**Görev**: Jira ticket'a comment ekler

**Yapılması Gereken**:
- ✅ Zaten konfigüre edilmiş, değişiklik yok

---

### 13. Prepare Notification
**Görev**: 
- Final notification verisini hazırlar
- Slack, email, Teams için formatlar

**Expected Output**:
```javascript
{
  timestamp: ISO,
  status: 'completed',
  alert: { ... },
  incidentReport: { ... },
  jiraTicket: { ... },
  formats: {
    slack: ...,
    chatSummary: ...,
    markdown: ...
  },
  summary: string
}
```

**Yapılması Gereken**:
- Phone call kısmını yorumdan çıkar (gelecekte kullanılacak)
- FreePrometheus output formatına göre güncelle
- **Dosya**: `SchedulerNodes/6. Prepare Notification.js`

---

## 🚨 KRİTİK SORUNLAR

### 1. **Missing Node: "Prepare Prometheus Input"**
**Problem**: Execute Prometheus Analysis'e input sağlayan node yok
**Solution**: Schedule Trigger ve Execute Prometheus Analysis arasına Code node ekle

### 2. **Missing Node: "Alert Deduplication"**
**Problem**: Birçok node "Alert Deduplication" node'una referans veriyor ama yok
**Solution**: Bu node'u "Process Results & Decision" node'u içine integrate et

### 3. **Fingerprint Generation**
**Problem**: Fingerprint nasıl oluşturulacağı belli değil
**Solution**: 
```javascript
// Process Results & Decision içinde:
const fingerprint = crypto
  .createHash('sha256')
  .update(`${alert.source}-${alert.title}-${affectedService}`)
  .digest('hex')
  .substring(0, 16);
```

### 4. **Node Reference Errors**
**Problem**: Birçok node henüz çalışmamış node'lara referans veriyor
**Solution**: Node referanslarını doğru sırayla kullan

---

## 📁 OLUŞTURULACAK DOSYALAR

### 1. SchedulerNodes/1. Prepare Prometheus Input.js
**Görev**: Schedule trigger'dan FreePrometheus Flow input'una çevirir

### 2. SchedulerNodes/2. Process Results and Decision.js
**Görev**: 
- FreePrometheus output'unu işler
- Fingerprint oluşturur
- Jira ticket verisini hazırlar
- Alert deduplication logic'i içerir

### 3. SchedulerNodes/3. Redis State Check.js
**Görev**: Redis sonucunu yorumlar, dedup kararı verir

### 4. SchedulerNodes/4. Prepare Redis Data.js
**Görev**: Redis'e yazılacak veriyi hazırlar

### 5. SchedulerNodes/5. Update Jira Comment.js
**Görev**: Mevcut ticket için comment hazırlar

### 6. SchedulerNodes/6. Prepare Notification.js
**Görev**: Final notification formatını hazırlar

### 7. SchedulerNodes/CONFIGURATION_UPDATES.md
**Görev**: Manual olarak yapılması gereken node konfigürasyon değişikliklerini listeler

---

## ✅ İMPLEMENTASYON PLANI

### Faz 1: Node Dosyaları Oluşturma
1. 6 adet .js dosyası oluştur
2. Her dosyada ilgili node'un logic'ini yaz
3. FreePrometheus output formatına uyumlu yap

### Faz 2: Konfigürasyon Güncellemeleri
1. CONFIGURATION_UPDATES.md oluştur
2. Switch node rules güncelleme talimatları
3. Jira node konfigürasyon değişiklikleri
4. Redis node key format düzeltmeleri

### Faz 3: Flow Yapısı Düzenleme
1. Schedule Trigger ile Execute Prometheus Analysis arasına "Prepare Prometheus Input" ekle
2. Node bağlantılarını kontrol et
3. Missing node referanslarını düzelt

### Faz 4: Test Senaryoları
1. Yeni alert testi
2. Mevcut alert (duplicate) testi
3. Critical severity testi
4. Redis TTL testi

---

## 🎯 BEKLENTİLER

### Fingerprint Nereden Gelecek?
**20. Generate Final Report Output.json** dosyasında fingerprint YOK!

**Çözüm**: Process Results & Decision node'unda oluşturulmalı:
```javascript
const fingerprint = crypto
  .createHash('sha256')
  .update(JSON.stringify({
    source: 'kubernetes',
    title: executiveSummary.overallHealth,
    component: findings.rootCause?.component || 'unknown',
    issue: findings.rootCause?.issue || 'unknown'
  }))
  .digest('hex')
  .substring(0, 16);
```

### Redis'te Ne Saklanacak?
```json
{
  "alert_fingerprint": "abc123def456",
  "first_seen": "1734445200000",
  "last_seen": "1734445800000",
  "occurrence_count": "3",
  "status": "active",
  "severity": "critical",
  "title": "Memory pressure causing pod restarts",
  "source": "kubernetes",
  "jira_ticket_id": "12345",
  "jira_ticket_key": "INCIDENT-123",
  "call_count": "1",
  "updated_at": "2025-12-17T14:50:00.000Z"
}
```

### Jira Ticket Nasıl Oluşturulacak?
```javascript
{
  project: 'INCIDENT',
  issueType: 'Incident',
  summary: '[KubeHpaMaxedOut] bss-mc-crm-search-integrator - Memory pressure causing pod restarts',
  description: markdownReport || basicDescription,
  priority: 'High', // critical → Highest, high → High, medium → Medium
  labels: ['kubernetes', 'auto-generated', 'confidence-80', ...],
  components: ['bss-mc-crm-search-integrator'],
  assignee: 'platform_support@etiya.com',
  epicLink: 'EM-5364'
}
```

---

## 🔄 FLOW EXECUTION ÖRNEĞİ

### Senaryo 1: Yeni Alert
```
1. Schedule Trigger (00:00) → Empty input
2. Prepare Prometheus Input → {requestId, timestamp, timeRange, ...}
3. Execute Prometheus Analysis → FreePrometheus Flow çalışır
4. Process Results & Decision → {fingerprint: "abc123", needsJiraTicket: true, ...}
5. Redis Get (alert:abc123) → value: null
6. Redis State Check → {dedupStatus: 'new', actions: {updateTicket: false}}
7. Prepare Redis Data → {key: "alert:abc123", value: {...}, ttl: 604800}
8. Redis Set → ✅ Saved
9. Decision Router → Output 0 (NEW)
10. Create Jira Ticket? → needsJiraTicket: true → Output 0
11. Create Jira Incident → Jira ticket INCIDENT-123 created
12. Prepare Notification → {jiraTicket: {created: true, key: 'INCIDENT-123'}}
```

### Senaryo 2: Duplicate Alert
```
1. Schedule Trigger (00:15) → Empty input
2. Prepare Prometheus Input → {requestId, timestamp, timeRange, ...}
3. Execute Prometheus Analysis → FreePrometheus Flow çalışır
4. Process Results & Decision → {fingerprint: "abc123", needsJiraTicket: true, ...}
5. Redis Get (alert:abc123) → value: "{jira_ticket_key: 'INCIDENT-123', occurrence_count: '1', ...}"
6. Redis State Check → {dedupStatus: 'existing', existingTicket: {key: 'INCIDENT-123', occurrences: 2}}
7. Prepare Redis Data → {occurrence_count: '2', last_seen: '1734445800000'}
8. Redis Set → ✅ Updated
9. Decision Router → Output 1 (EXISTING)
10. Update Jira Comment → {ticketKey: 'INCIDENT-123', comment: '## 🔄 Occurrence #2...'}
11. Add a comment → Comment added to INCIDENT-123
12. Prepare Notification → {jiraTicket: {updated: true, key: 'INCIDENT-123'}}
```

---

## 🎨 FINGERPRINT OLUŞTURMA STRATEJİSİ

### Seçenek 1: Root Cause Bazlı (Önerilen)
```javascript
const fingerprintData = {
  component: findings.rootCause?.component || 'unknown',
  issue: findings.rootCause?.issue || 'unknown',
  namespace: findings.rootCause?.namespace || 'unknown'
};

const fingerprint = crypto
  .createHash('sha256')
  .update(JSON.stringify(fingerprintData))
  .digest('hex')
  .substring(0, 16);
```

**Avantaj**: Aynı root cause = Aynı fingerprint
**Dezavantaj**: Root cause değişirse farklı fingerprint

### Seçenek 2: Alert Bazlı
```javascript
const fingerprintData = {
  alertName: stage1Results.alerts.top_alerts[0] || 'unknown',
  namespace: findings.affectedServices[0] || 'unknown',
  severity: executiveSummary.overallHealth
};
```

**Avantaj**: Alert tabanlı deduplication
**Dezavantaj**: Aynı root cause farklı alertler tetikleyebilir

### Seçenek 3: Hybrid (En İyi)
```javascript
const fingerprintData = {
  // Primary: Root cause
  component: findings.rootCause?.component || 'unknown',
  issue_type: findings.rootCause?.issue?.split(' ')[0] || 'unknown', // "Memory" from "Memory pressure..."
  
  // Secondary: Context
  namespace: findings.affectedServices[0] || 'unknown',
  severity: executiveSummary.overallHealth
};

const fingerprint = crypto
  .createHash('sha256')
  .update(JSON.stringify(fingerprintData))
  .digest('hex')
  .substring(0, 16);
```

**Avantaj**: Root cause + context = Precise deduplication
**Dezavantaj**: Complexity

---

## 📊 REDIS TTL STRATEJİSİ

**Mevcut**: 604800 seconds (7 days)

**Öneri**: Severity bazlı TTL
```javascript
const ttlBySeverity = {
  'critical': 86400,    // 1 day
  'high': 259200,       // 3 days
  'medium': 604800,     // 7 days
  'low': 1209600,       // 14 days
  'degraded': 604800    // 7 days (default)
};

const ttl = ttlBySeverity[severity] || 604800;
```

---

## 🚀 SONRAKI ADIMLAR

1. ✅ Bu analiz dokümanını oku ve anla
2. ⏳ 6 adet node dosyası oluştur
3. ⏳ CONFIGURATION_UPDATES.md oluştur
4. ⏳ Flow yapısını güncelle
5. ⏳ Test senaryolarını çalıştır

---

**Analiz Tamamlandı**: 2025-12-17
**Toplam Node**: 13
**Oluşturulacak Dosya**: 7
**Güncellenecek Node**: 4
