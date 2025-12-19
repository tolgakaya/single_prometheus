# Scheduler Flow Jira Ticket Mapping Sorunu - Çözüm

## Sorun Özeti

**Alert Listener Flow** (Flow 1): ✅ Güzel, detaylı Jira ticket'lar
**Scheduler Flow** (Flow 2): ❌ Ham, detaysız Jira ticket'lar

## Kök Neden

Scheduler Flow'daki **"Create Jira Incident"** node'unun data mapping'i YANLIŞ!

### Mevcut Mapping (YANLIŞ)

```javascript
// Line 44 - Summary
"summary": "={{ $json.alert.jiraTicketData.summary }}",

// Line 52 - Description
"description": "={{ $json.alert.originalAnalysis.jiraTicket.description }}",
```

### Sorun

1. `$json.alert.jiraTicketData.summary` → YANLIŞ PATH!
2. `$json.alert.originalAnalysis.jiraTicket.description` → YANLIŞ PATH!

**Neden Yanlış?**

`Process Results & Decision` node'unun OUTPUT yapısı:

```javascript
{
  fingerprint: "...",
  fingerprintData: {...},
  needsJiraTicket: true,
  alertSummary: {...},
  kubernetesAnalysis: {...},
  report: "...",
  jiraTicketData: {           // ← Direkt burada!
    project: 'INCIDENT',
    issueType: 'Incident',
    summary: "...",            // ← Burası!
    description: "...",        // ← Burası!
    priority: "...",
    labels: [...],
    components: [...],
    customFields: {...}
  },
  originalAnalysis: {         // ← originalAnalysis burada
    jiraTicket: {
      title: "...",
      description: "...",      // ← Ama buraya erişmeye çalışıyor!
      priority: "..."
    }
  }
}
```

**Sonuç:**
- `$json.alert.jiraTicketData` → `undefined` (path yanlış)
- `$json.alert.originalAnalysis.jiraTicket.description` → Var ama `$json.jiraTicketData.description` kullanmalı

## Çözüm

### Dosya: `FreePrometheus/Scheduler Cluster Health Flow.json`

**Node ID:** `f4941a45-e1d3-4e7f-9c7f-58880a9eb6ef` (Create Jira Incident)

### Değişiklik 1: Summary Field (Line 44)

```json
// ESKİ (YANLIŞ):
"summary": "={{ $json.alert.jiraTicketData.summary }}",

// YENİ (DOĞRU):
"summary": "={{ $json.jiraTicketData.summary }}",
```

### Değişiklik 2: Description Field (Line 52)

```json
// ESKİ (YANLIŞ):
"description": "={{ $json.alert.originalAnalysis.jiraTicket.description }}",

// YENİ (DOĞRU):
"description": "={{ $json.jiraTicketData.description }}",
```

### Tam Düzeltilmiş Jira Node Config

```json
{
  "parameters": {
    "jiraVersion": "server",
    "project": {
      "__rl": true,
      "value": "13601",
      "mode": "list",
      "cachedResultName": "Etiya Mobile MVNO"
    },
    "issueType": {
      "__rl": true,
      "value": "10200",
      "mode": "list",
      "cachedResultName": "Task"
    },
    "summary": "={{ $json.jiraTicketData.summary }}",  // ✅ DÜZELTME
    "additionalFields": {
      "assignee": {
        "__rl": true,
        "value": "platform_support@etiya.com",
        "mode": "list",
        "cachedResultName": "Platform_Support"
      },
      "description": "={{ $json.jiraTicketData.description }}",  // ✅ DÜZELTME
      "customFieldsUi": {
        "customFieldsValues": [
          {
            "fieldId": {
              "__rl": true,
              "value": "customfield_10100",
              "mode": "list",
              "cachedResultName": "Epic Link"
            },
            "fieldValue": "EM-5364"
          }
        ]
      },
      "serverLabels": [],
      "priority": {
        "__rl": true,
        "value": "2",
        "mode": "list",
        "cachedResultName": "High"
      }
    }
  },
  "id": "f4941a45-e1d3-4e7f-9c7f-58880a9eb6ef",
  "name": "Create Jira Incident",
  "type": "n8n-nodes-base.jira",
  "typeVersion": 1
}
```

## Opsiyonel İyileştirmeler

### Priority'yi Dynamic Yap

Şu an sabit "High" (value: "2"), ama `jiraTicketData.priority` kullanabilirsin:

```json
"priority": "={{ $json.jiraTicketData.priority }}",
```

**Ama dikkat:** Jira priority field'ı ID bekliyor, isim değil!

`Process Results & Decision` node'u zaten mapping yapıyor:
```javascript
priority: mapJiraPriorityNameToId(result.jiraTicket.priority)
// "Critical" -> "Highest"
// "High" -> "High"
// etc.
```

### Labels ve Components Ekle

Şu an `serverLabels: []` boş. `jiraTicketData`'dan alabilirsin:

```json
"serverLabels": "={{ $json.jiraTicketData.labels }}",
```

### Custom Fields Ekle

Şu an sadece Epic Link var. Daha fazla ekleyebilirsin:

```json
"customFieldsUi": {
  "customFieldsValues": [
    {
      "fieldId": {
        "__rl": true,
        "value": "customfield_10100",
        "mode": "list",
        "cachedResultName": "Epic Link"
      },
      "fieldValue": "EM-5364"
    },
    {
      "fieldId": {
        "__rl": true,
        "value": "customfield_10001",
        "mode": "list",
        "cachedResultName": "Context ID"
      },
      "fieldValue": "={{ $json.jiraTicketData.customFields.customfield_10001 }}"
    },
    {
      "fieldId": {
        "__rl": true,
        "value": "customfield_10002",
        "mode": "list",
        "cachedResultName": "Confidence"
      },
      "fieldValue": "={{ $json.jiraTicketData.customFields.customfield_10002 }}"
    }
    // ... daha fazla custom field
  ]
}
```

## Alert Listener Flow ile Karşılaştırma

### Alert Listener Flow (Doğru Mapping)

`Alert Listener n8n flow.json` dosyasında Jira node'unun mapping'i nasıl yapılmış, ona bakalım:

**Eğer Alert Listener'da doğru mapping varsa, aynısını kullan!**

### Varsayılan Doğru Mapping

Alert Listener muhtemelen şöyle yapıyor:

```json
"summary": "={{ $json.jiraTicket.title }}",
"description": "={{ $json.jiraTicket.description }}",
```

VEYA

```json
"summary": "={{ $json.summary }}",
"description": "={{ $json.description }}",
```

**Scheduler Flow'da da aynı mantığı kullan!**

## Adım Adım Uygulama

### n8n UI'dan Düzeltme (Önerilen)

1. n8n'i aç
2. **"Scheduler Cluster Health Flow"**'u aç
3. **"Create Jira Incident"** node'unu aç
4. **Summary** field'ını değiştir:
   - Eski: `{{ $json.alert.jiraTicketData.summary }}`
   - Yeni: `{{ $json.jiraTicketData.summary }}`
5. **Description** field'ını değiştir:
   - Eski: `{{ $json.alert.originalAnalysis.jiraTicket.description }}`
   - Yeni: `{{ $json.jiraTicketData.description }}`
6. **Priority** field'ını dynamic yap (opsiyonel):
   - `{{ $json.jiraTicketData.priority }}`
7. **Save** → **Export** → JSON'u kaydet

### JSON'dan Direkt Düzeltme (Riskli)

1. `FreePrometheus/Scheduler Cluster Health Flow.json` dosyasını aç
2. Line 44'ü bul ve değiştir:
   ```json
   "summary": "={{ $json.jiraTicketData.summary }}",
   ```
3. Line 52'yi bul ve değiştir:
   ```json
   "description": "={{ $json.jiraTicketData.description }}",
   ```
4. Kaydet
5. n8n'de flow'u yeniden import et

## Test Senaryosu

1. Scheduler Flow'u manuel tetikle (Manual Test Trigger)
2. Execution'ı aç
3. **"Process Results & Decision"** node output'unu kontrol et:
   - `jiraTicketData.summary` dolu mu?
   - `jiraTicketData.description` HTML/CSS içeriyor mu?
4. **"Create Jira Incident"** node input'unu kontrol et:
   - Summary ve Description doğru geliyor mu?
5. Jira'da oluşan ticket'ı kontrol et:
   - Description HTML/CSS formatted mı?
   - Tüm detaylar var mı?

## Beklenen Sonuç

✅ Jira ticket'larda şunlar olacak:

### Summary
```
[KubeHpaMaxedOut] bss-mc-pcm-product-offer-detail - Pod restarts and scaling limitations detected
```

### Description (HTML/CSS Formatted)
```html
<div style="border: 2px solid #d32f2f; border-radius: 8px; padding: 20px; background-color: #ffebee;">
  <h2 style="color: #d32f2f;">🔴 Unknown Alert</h2>
  <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">

  <h3 style="color: #333;">🎯 Issue Summary</h3>
  <p><strong>Component:</strong> bss-mc-pcm-product-offer-detail</p>
  <p><strong>Issue:</strong> Pod restarts and scaling limitations detected</p>
  <p><strong>Confidence:</strong> 45%</p>
  <p><strong>Severity:</strong> <span style="color: #d32f2f; font-weight: bold;">CRITICAL</span></p>

  <h3 style="color: #333;">📊 SLO Impact</h3>
  <p><strong>Availability SLO:</strong> 100% (Target: 99.9%) - Status: <strong>GREEN</strong></p>

  <h3 style="color: #333;">🔧 Recommended Actions</h3>
  <ol>
    <li>
      <strong>Rollback deployment to previous version</strong><br>
      <span style="font-size: 12px; color: #666;">Risk: low | Time: 2-5 minutes</span><br>
      <code style="background: #f4f4f4; padding: 2px 6px; border-radius: 3px;">kubectl rollout undo deployment/...</code>
    </li>
  </ol>

  <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
  <p style="font-size: 12px; color: #999;">Generated at 2025-12-18T08:52:31.131Z</p>
</div>
```

### Priority
```
Critical (Highest)
```

### Labels
```javascript
[
  "kubernetes",
  "auto-generated",
  "scheduler",
  "severity-degraded",
  "category-UNKNOWN",
  "urgency-CRITICAL",
  "cascade-risk-MEDIUM",
  "confidence-54",
  "context-ctx-1766047820092-cwifgeo4t"
]
```

### Custom Fields
```javascript
{
  "customfield_10001": "ctx-1766047820092-cwifgeo4t",  // Context ID
  "customfield_10002": 0.5375,                          // Confidence
  "customfield_10003": "bss-mc-pcm-product-offer-detail", // Namespace
  "customfield_10004": 6,                               // Symptoms count
  "customfield_10005": "Diagnosis: Pod restarts...",    // Root cause
  "customfield_10006": "kubectl rollout undo...",       // Quick action
  "customfield_10007": 7,                               // Stages executed
  "customfield_10008": "2025-12-18T...",               // Timestamp
  "customfield_10009": true                             // Oncall friendly
}
```

## Özet

**Sorun:** Jira node'unun data mapping'i yanlış path kullanıyor
**Çözüm:** `$json.jiraTicketData.summary` ve `$json.jiraTicketData.description` kullan
**Sonuç:** Alert Listener gibi güzel, detaylı, HTML/CSS formatted Jira ticket'lar

**Dosya:** `FreePrometheus/Scheduler Cluster Health Flow.json`
**Node:** "Create Jira Incident" (id: f4941a45-e1d3-4e7f-9c7f-58880a9eb6ef)
**Değişiklik:** Line 44 ve Line 52

---

**Not:** Alert Listener flow'un Jira node mapping'ini de kontrol et, aynı pattern'i kullan!
