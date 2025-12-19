# Scheduler Flow Jira Ticket Sorunu - Çözüm

## Sorun

Jira'da oluşan ticket'lar **ham ve detaysız** görünüyor.

## Kök Neden

Scheduler Flow JSON dosyasındaki **"Process Results & Decision"** node'u eski kodu kullanıyor:

### ❌ Mevcut Kod (YANLIŞ)
```javascript
// Line 16-17 in Flow JSON
const jiraTicketInfo = analysisResult.oncallTicket || {}; // YANLIŞ!
```

Bu kod:
- `oncallTicket` kullanıyor (oncall-friendly, basit)
- `jiraTicket` kullanmalı (Jira-optimized, zengin HTML/CSS)
- Yeni Final Report format'ını kullanmıyor

## Karşılaştırma

### Mevcut Output (Ham)
```json
{
  "title": "🔴 CRITICAL Unknown Alert: bss-mc-pcm-product-offer-detail",
  "description": "<div>...basit HTML...</div>",
  "priority": "Critical"
}
```

### Olması Gereken (Zengin)
```json
{
  "title": "[KubePodCrashLooping] domain-config-service-t3 - Pod repeatedly crashes after starting",
  "description": "<div style=\"border: 2px solid #d32f2f; border-radius: 8px; margin: 10px 0; background: #ffebee;\">
    <div style=\"background: #d32f2f; color: white; padding: 12px;\">
      🚨 INCIDENT SUMMARY
    </div>
    ...zengin HTML/CSS formatlanmış içerik...
    <h2>📊 INCIDENT DETAILS</h2>
    <h2>📚 KNOWLEDGE BASE INTELLIGENCE</h2>
    <h2>🔍 ISSUE IDENTIFICATION</h2>
    <h2>🕐 INCIDENT TIMELINE</h2>
    <h2>🚀 ACTION PLAN</h2>
  </div>",
  "priority": "Critical",
  "labels": ["KubePodCrashLooping", "critical", "etiyamobile-production", ...],
  "components": ["domain-config-service-t3"],
  "issueType": "Incident",
  "customFields": {...}
}
```

## Çözüm: 2 Dosya Güncellemesi Gerekiyor

### 1. ✅ FreePrometheus/SchedulerNodes/2. Process Results and Decision.js
**Durum:** ✅ ZATEN GÜNCELLENDİ (commit 2be1653)

### 2. ❌ FreePrometheus/Scheduler Cluster Health Flow.json
**Durum:** ❌ HALA ESKİ KOD VAR - GÜNCELLENMELİ

## Gerekli Değişiklik

### Dosya: `FreePrometheus/Scheduler Cluster Health Flow.json`

**Node Name:** "Process Results & Decision" (id: bba73c0e-af87-46b2-ab17-a5fa51469214)

**Line 16-17'yi değiştir:**

```javascript
// ESKİ (YANLIŞ):
//const jiraTicketInfo = analysisResult.jiraTicket || {};
const jiraTicketInfo = analysisResult.oncallTicket || {};

// YENİ (DOĞRU):
const jiraTicketInfo = analysisResult.jiraTicket || {};
```

### Ama Daha İyisi: Tüm Node Kodunu Değiştir

`FreePrometheus/SchedulerNodes/2. Process Results and Decision.js` dosyasındaki GÜNCEL kodu kullan:

```javascript
// Process Results & Decision Node - UPDATED VERSION
// Purpose:
// 1. Process FreePrometheus analysis results
// 2. Generate fingerprint for deduplication
// 3. Prepare Jira ticket data
// 4. Decide if Jira ticket should be created

// Simple hash function for n8n compatibility (no crypto module needed)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(16, '0').substring(0, 16);
}

// Get FreePrometheus analysis result
const analysisResult = $input.item.json;

// Extract key information from FreePrometheus output
const executiveSummary = analysisResult.executiveSummary || {};
const findings = analysisResult.findings || {};
const stage1Results = analysisResult.stage1Results || {};
const actions = analysisResult.actions || {};
const metrics = analysisResult.metrics || {};
const contextTracking = analysisResult.contextTracking || {};

// ... (tüm kod FreePrometheus/SchedulerNodes/2. Process Results and Decision.js dosyasında)
```

## Neden İki Dosya Var?

1. **`FreePrometheus/SchedulerNodes/2. Process Results and Decision.js`**
   - Standalone JavaScript dosyası
   - Geliştirme ve versiyon kontrolü için
   - ✅ Güncel kod burada

2. **`FreePrometheus/Scheduler Cluster Health Flow.json`**
   - n8n workflow tanımı
   - Node kodları JSON içinde embedded
   - ❌ Eski kod burada

## Çözüm Adımları

### Option 1: Manual Update (Önerilen)

1. n8n'i aç
2. "Scheduler Cluster Health Flow"'u aç
3. "Process Results & Decision" node'unu aç
4. Kodu `FreePrometheus/SchedulerNodes/2. Process Results and Decision.js` dosyasından kopyala-yapıştır
5. Flow'u kaydet
6. Export et → `FreePrometheus/Scheduler Cluster Health Flow.json` dosyasının üzerine yaz

### Option 2: JSON Direct Edit (Riskli)

1. `FreePrometheus/Scheduler Cluster Health Flow.json` aç
2. "Process Results & Decision" node'unu bul (id: bba73c0e-af87-46b2-ab17-a5fa51469214)
3. `parameters.jsCode` field'ını güncelle
4. n8n'de flow'u yeniden import et

## Beklenen Sonuç

✅ Jira ticket'larda şunlar olacak:

1. **Zengin HTML/CSS formatlanmış description**
   - Severity-based color coding (🔴 critical, 🟠 high, etc.)
   - Structured sections (Summary, Details, Timeline, Actions)
   - Professional visual appearance

2. **Tam bilgi içeriği**
   - Incident Summary table
   - Incident Details
   - Knowledge Base Intelligence
   - Issue Identification with confidence
   - Full Timeline with stages
   - Complete Action Plan
   - kubectl commands
   - Context ID for tracking

3. **Metadata**
   - Labels: alert type, severity, namespace, confidence
   - Components: affected services
   - Custom Fields: contextId, confidence, namespace, pod, etc.
   - Due Date: severity-based (Critical: 4h, High: 24h, etc.)
   - Environment: Production/Staging/Development

## Verification

Güncelleme sonrası test et:

```bash
# Flow'u manuel tetikle
# Jira'da oluşan ticket'ı kontrol et:
# - Description HTML/CSS formatted mı?
# - Labels var mı?
# - Components var mı?
# - Custom fields dolu mu?
```

## Dosya Konumları

```
FreePrometheus/
├── SchedulerNodes/
│   └── 2. Process Results and Decision.js  ✅ GÜNCEL
└── Scheduler Cluster Health Flow.json      ❌ ESKİ KOD VAR
```

## Sonuç

**Sorun:** Flow JSON'da embedded kod eski
**Çözüm:** `.js` dosyasındaki güncel kodu Flow JSON'a kopyala
**Yöntem:** n8n UI'dan node'u aç, kodu güncelle, export et
