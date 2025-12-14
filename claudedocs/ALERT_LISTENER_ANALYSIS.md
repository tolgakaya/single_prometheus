# Alert Listener Flow - Node Analizi

**Başlangıç Tarihi**: 2025-12-14
**Flow**: Alert Listener n8n flow.json
**Klasör**: AlertListenerNodes/
**Amaç**: Her node'u input/output'larıyla birlikte adım adım incelemek

---

## Flow Yapısı ve Node Sıralaması

Alert Listener flow'u gelen Prometheus alarmlarını işler ve Prometheus analysis flow'una gönderir.

### Node Sıralaması:

| # | Node İsmi | Input Dosyası | Output Dosyası | Code Dosyası |
|---|-----------|---------------|----------------|--------------|
| 0 | WebHook | - | ✅ 0. WebHook Output.json | (n8n built-in) |
| 1 | Generate Test Alert | - | - | ✅ 1. Generate Test Alert.js |
| 2 | Normalize Alerts | ✅ 2. Normalize Alerts Input.json | ✅ 2. Normalize Alerts Output.json | ✅ 2. Normalize Alerts.js |
| 3 | Alert Deduplication | - | - | ✅ 3. Alert Deduplication.js |
| 4 | AI Alert Analyzer | ✅ 4. AI Alert Analyzer Input.json | ✅ 4. AI Alert Analyzer Output.json | ✅ 4. AI Alert Analyzer.txt |
| 5 | Process AI Output | ✅ 5. Process AI Output Input.json | ✅ 5. Process AI Output Output.json | ✅ 5. Process AI Output.js |
| 6 | Prepare Prometheus Input | ✅ 6. Prepare Prometheus Input Input.json | ✅ 6. Prepare Prometheus Input Output.json | ✅ 6. Prepare Prometheus Input.js |
| 7 | Process Results & Decision | - | - | ✅ 7. Process Results & Decision.js |

---

## NODE 0: WebHook (Başlangıç)

**Amaç**: Prometheus Alertmanager'dan gelen HTTP POST request'lerini yakalar

### Analiz Durumu: ✅ TAMAMLANDI

**Output Dosyası**: [AlertListenerNodes/0. WebHook Output.json](../AlertListenerNodes/0. WebHook Output..json)

### Output İncelemesi:

#### Gelen Request Yapısı:

**HTTP Headers**:
- `user-agent`: "Alertmanager/0.28.1"
- `content-type`: "application/json"
- Host: etiya-infra-n8n-test.etiya.com

#### Webhook Body Yapısı:

```json
{
  "receiver": "mail-and-teams",
  "status": "firing",
  "alerts": [...],           // Alert dizisi
  "groupLabels": {...},      // Alert gruplama
  "commonLabels": {...},     // Ortak etiketler
  "commonAnnotations": {...},// Ortak açıklamalar
  "externalURL": "...",      // Alertmanager URL
  "version": "4",
  "groupKey": "...",
  "truncatedAlerts": 0
}
```

#### Örnek Alert:

**Alert Name**: `KubeAPIDown`
**Severity**: `critical`
**Status**: `firing`

**Labels**:
- alertname: "KubeAPIDown"
- prometheus: "bss-prod-eks-monitoring/kube-prometheus-stack-prometheus"
- severity: "critical"

**Annotations**:
- description: "KubeAPI has disappeared from Prometheus target discovery."
- runbook_url: "https://runbooks.prometheus-operator.dev/runbooks/kubernetes/kubeapidown"
- summary: "Target disappeared from Prometheus target discovery."

**Timing**:
- startsAt: "2025-12-13T08:49:41.236Z"
- endsAt: "0001-01-01T00:00:00Z" (hala aktif)

**Unique ID**:
- fingerprint: "3ea286ca18e805ff"

### Bulgular:

1. ✅ **Alertmanager Integration**: Prometheus Alertmanager 0.28.1'den gelen standart webhook formatı
2. ✅ **Alert Grouping**: Alertler gruplanmış halde geliyor (`groupLabels`, `groupKey`)
3. ✅ **Rich Metadata**: Her alert labels, annotations, runbook URL içeriyor
4. ✅ **Timing Info**: Start time var, end time yoksa hala "firing" durumda
5. ✅ **Namespace Info**: Prometheus'un namespace'i label'da mevcut: `bss-prod-eks-monitoring`

### Kritik Alanlar:

| Alan | Değer | Amaç |
|------|-------|------|
| `body.alerts[]` | Alert dizisi | Her bir alert'in detayı |
| `alerts[].labels.alertname` | "KubeAPIDown" | Alert tipi |
| `alerts[].labels.severity` | "critical" | Öncelik seviyesi |
| `alerts[].fingerprint` | "3ea286ca18e805ff" | Unique ID (deduplication için) |
| `alerts[].status` | "firing" | Alert durumu |

### Node 2'ye Giden Veri:

WebHook çıktısı **body.alerts** dizisi olarak Node 2'ye (Normalize Alerts) gider.

---

## NODE 1: Generate Test Alert

**Amaç**: Test amaçlı sahte alert üretir (development/testing için)

### Analiz Durumu: ⏸️ BEKLEMEDE

**Code Dosyası**: [AlertListenerNodes/1. Generate Test Alert.js](../AlertListenerNodes/1. Generate Test Alert.js)

---

## NODE 2: Normalize Alerts

**Amaç**: Gelen alertleri standart formata dönüştürür

### Analiz Durumu: ✅ TAMAMLANDI

**Input**: [AlertListenerNodes/2. Normalize Alerts Input.json](../AlertListenerNodes/2. Normalize Alerts Input.json)
**Output**: [AlertListenerNodes/2. Normalize Alerts Output.json](../AlertListenerNodes/2. Normalize Alerts Output.json)
**Code**: [AlertListenerNodes/2. Normalize Alerts.js](../AlertListenerNodes/2. Normalize Alerts.js)

### Input → Output Dönüşümü:

#### INPUT (Alertmanager Raw Format):
```json
{
  "body": {
    "alerts": [{
      "labels": {
        "alertname": "KubeAPIDown",
        "prometheus": "bss-prod-eks-monitoring/kube-prometheus-stack-prometheus",
        "severity": "critical"
      },
      "annotations": {
        "description": "KubeAPI has disappeared...",
        "runbook_url": "https://...",
        "summary": "Target disappeared..."
      },
      "startsAt": "2025-12-13T08:49:41.236Z",
      "fingerprint": "3ea286ca18e805ff"
    }]
  }
}
```

#### OUTPUT (Normalized Format):
```json
{
  "source": "alertmanager",
  "sourceId": "alertmanager-1765629803231",
  "timestamp": "2025-12-13T08:49:41.236Z",
  "title": "KubeAPIDown",
  "body": "KubeAPI has disappeared from Prometheus target discovery.",
  "sender": "AlertManager",
  "priority": "critical",
  "container": null,
  "pod": null,
  "namespace": "default",
  "service": null,
  "deployment": null,
  "instance": null,
  "job": null,
  "node": null,
  "persistentvolumeclaim": null,
  "volumename": null,
  "cluster": null,
  "alertname": "KubeAPIDown",
  "status": "firing",
  "fingerprint": "3ea286ca18e805ff",
  "generatorURL": "http://...",
  "runbook_url": "https://...",
  "raw": { /* tüm orijinal data */ }
}
```

### Normalizasyon Mantığı:

#### 1. **Priority Mapping**:
```javascript
// Severity → Priority dönüşümü
"critical" → "critical"
"high/major" → "high"
"warning/minor" → "medium"
"info/low" → "low"
```

#### 2. **Kubernetes Metadata Extraction**:
```javascript
// Label'lardan çıkarılan alanlar:
labels.namespace → namespace
labels.pod → pod
labels.container → container
labels.service → service
labels.deployment → deployment
labels.node → node
labels.persistentvolumeclaim → persistentvolumeclaim
```

#### 3. **Service Name Extraction**:
```javascript
// Pod isminden service çıkarma:
// "bss-ntf-batch-t3-645d68cbc8-4h88r" → "bss-ntf-batch-t3"
// Son 2 parça hash ve pod-id olarak çıkarılıyor
```

#### 4. **Fallback Values**:
```javascript
namespace: labels.namespace || "default"
priority: mapAlertManagerSeverity(labels.severity) || "medium"
```

### Bulgular:

1. ✅ **Multi-Source Support**: AlertManager, Email, Teams formatlarını destekliyor
2. ✅ **Kubernetes Metadata**: Pod, namespace, container gibi K8s bilgileri çıkarılıyor
3. ✅ **Service Discovery**: Pod isminden service ismi otomatik çıkarılıyor
4. ⚠️ **Namespace Fallback**: Eğer label'da namespace yoksa → `"default"` kullanılıyor
5. ✅ **Raw Data Preservation**: Orijinal data `raw` alanında saklanıyor

### Kritik Dönüşümler:

| Alertmanager Field | Normalized Field | Transformation |
|--------------------|------------------|----------------|
| `labels.alertname` | `alertname`, `title` | Direct copy |
| `labels.severity` | `priority` | Severity mapping |
| `labels.namespace` | `namespace` | Direct copy or "default" |
| `labels.pod` | `pod`, `service` | Extract service from pod name |
| `annotations.description` | `body` | Direct copy |
| `startsAt` | `timestamp` | Direct copy |
| `fingerprint` | `fingerprint` | Unique ID for deduplication |

### Namespace Handling:

**ÖNEMLİ**: Bu node'da namespace fallback olarak `"default"` kullanılıyor:

```javascript
// Code'dan:
namespace: labels.namespace || "default"
```

**Örnek Output'ta**: `"namespace": "default"` olduğunu görüyoruz çünkü `KubeAPIDown` alertinde namespace label'ı yok.

**SORU**: Birden fazla namespace izleniyorsa, bu fallback doğru mu?

### Node 4'e (AI Analyzer) Giden Veri:

Normalize edilmiş alert objesi AI analizi için hazır.

---

## NODE 3: Alert Deduplication

**Amaç**: Duplicate alertleri filtreler

### Analiz Durumu: ⏸️ BEKLEMEDE

**Code**: [AlertListenerNodes/3. Alert Deduplication.js](../AlertListenerNodes/3. Alert Deduplication.js)

---

## NODE 4: AI Alert Analyzer

**Amaç**: AI ile alert analizi yapar ve structured JSON response üretir

### Analiz Durumu: ✅ TAMAMLANDI

**Input**: [AlertListenerNodes/4. AI Alert Analyzer Input.json](../AlertListenerNodes/4. AI Alert Analyzer Input.json)
**Output**: [AlertListenerNodes/4. AI Alert Analyzer Output.json](../AlertListenerNodes/4. AI Alert Analyzer Output.json)
**Prompt**: [AlertListenerNodes/4. AI Alert Analyzer.txt](../AlertListenerNodes/4. AI Alert Analyzer.txt)

### Input → Output Dönüşümü:

#### INPUT (From Node 3 - Deduplication):
```json
{
  "key": "alert:alertmanager|kubeapidown|critical",
  "value": "{...}",  // Redis dedup data
  "alert": {
    // Normalized alert from Node 2
    "title": "KubeAPIDown",
    "body": "KubeAPI has disappeared from Prometheus target discovery.",
    "priority": "critical",
    "namespace": "default",
    "fingerprint": "alertmanager|kubeapidown|critical"
  },
  "dedupStatus": "new",
  "actions": {
    "skipAnalysis": false,
    "updateTicket": false,
    "escalate": false,
    "makeCall": true
  }
}
```

#### OUTPUT (AI Structured Analysis):
```json
{
  "output": "```json\n{...}\n```"  // JSON içinde JSON string
}
```

**Parsed AI Output**:
```json
{
  "alertIdentification": {
    "source": "alertmanager",
    "timestamp": "2025-12-13T08:49:41.236Z",
    "title": "KubeAPIDown",
    "body": "KubeAPI has disappeared from Prometheus target discovery.",
    "sender": "AlertManager",
    "priority": "critical"
  },
  "timeAnalysis": {
    "incidentStartTime": "2025-12-13T08:49:41.236Z",
    "timeRange": "Ongoing since the alert time"
  },
  "affectedComponents": {
    "services": ["Kubernetes API Server"],
    "components": ["Prometheus Target Discovery", "KubeAPI"]
  },
  "severityAssessment": {
    "severity": "critical",
    "businessImpact": "High potential impact on Kubernetes cluster management..."
  },
  "technicalDetails": {
    "technicalIndicators": [
      "KubeAPI not listed in Prometheus target discovery",
      "Potential disruption in communication with the Kubernetes control plane"
    ],
    "patterns": [
      "Disappearance from monitoring targets",
      "High likelihood of API server unavailability or network issues"
    ]
  },
  "recommendations": {
    "shortTerm": [
      "Verify the status of the Kubernetes API server...",
      "Check network connections and firewall/network policies..."
    ],
    "longTerm": [
      "Implement additional monitoring and alerting...",
      "Review fault-tolerance and high-availability configurations..."
    ]
  }
}
```

### AI Prompt Analizi:

**Prompt Template** ([4. AI Alert Analyzer.txt](../AlertListenerNodes/4. AI Alert Analyzer.txt)):
```
Analyze this alert and provide a structured analysis.

Alert Details:
- Source: {{ $('Normalize Alerts').item.json.source }}
- Timestamp: {{ $('Normalize Alerts').item.json.timestamp }}
- Title: {{ $('Normalize Alerts').item.json.title }}
- Body: {{ $('Normalize Alerts').item.json.body }}
- Sender: {{ $('Normalize Alerts').item.json.sender }}
- Priority: {{ $('Normalize Alerts').item.json.priority }}

You MUST provide your response as a valid JSON object...

Extract:
1. Time range when incident occurred
2. Affected services and components
3. Severity and business impact
4. Technical indicators and patterns

Provide analysis in structured format:
- Alert identification
- Time analysis
- Affected components
- Severity assessment
- Technical details
- Recommendations
```

### AI Analysis Mantığı:

#### 1. **Input Preparation**:
```javascript
// n8n template variables kullanılıyor
Source: $('Normalize Alerts').item.json.source
Timestamp: $('Normalize Alerts').item.json.timestamp
Title: $('Normalize Alerts').item.json.title
Body: $('Normalize Alerts').item.json.body
Priority: $('Normalize Alerts').item.json.priority
```

#### 2. **AI Response Structure**:
AI'dan beklenen JSON schema:
- `alertIdentification`: Alert'in temel bilgileri
- `timeAnalysis`: Zaman analizi (başlangıç, süre)
- `affectedComponents`: Etkilenen servisler ve componentler
- `severityAssessment`: Severity ve business impact
- `technicalDetails`: Teknik göstergeler ve pattern'ler
- `recommendations`: Kısa ve uzun vadeli öneriler

#### 3. **KubeAPIDown Örneği**:

**AI'nın Çıkarımları**:
- **Affected Services**: "Kubernetes API Server" (alert'te belirtilmemiş, AI çıkarımı)
- **Components**: "Prometheus Target Discovery", "KubeAPI"
- **Business Impact**: "High potential impact on cluster management"
- **Technical Indicators**:
  - "KubeAPI not listed in Prometheus target discovery"
  - "Potential disruption in control plane"
- **Recommendations**:
  - Short-term: Verify API server status, check network
  - Long-term: Implement redundancy, review HA configs

### Bulgular:

1. ✅ **Structured Analysis**: AI raw alert'i structured JSON'a dönüştürüyor
2. ✅ **Inference Capability**: Alert'te olmayan bilgileri çıkarım yapıyor
   - "Kubernetes API Server" → Alert'te sadece "KubeAPI" var
   - Business impact → Alert'te yok, AI ekliyor
3. ✅ **Actionable Recommendations**: Kısa ve uzun vadeli action'lar
4. ⚠️ **Namespace Context Missing**: AI'ya namespace bilgisi gönderilmiyor
   - Prompt'ta namespace yok
   - Alert "default" namespace'de ama AI bunu analiz etmiyor
5. ✅ **JSON in JSON Format**: Output JSON string içinde embedded JSON
   - Parse gerektirecek: `JSON.parse(output.replace(/```json\n|\n```/g, ''))`

### Output Format Challenge:

**AI Output**:
```json
{
  "output": "```json\n{...}\n```"
}
```

**Parse Edilmesi Gereken**:
```javascript
// Node 5'te muhtemelen şu yapılıyor:
const rawOutput = aiResponse.output;
const cleanedJson = rawOutput.replace(/```json\n|\n```/g, '');
const parsedAnalysis = JSON.parse(cleanedJson);
```

### Node 5'e Giden Veri:

AI analysis output (JSON string) → Node 5'te parse edilecek ve Prometheus input'a eklenecek

### Kritik Gözlemler:

| Alan | Değer | Not |
|------|-------|-----|
| **Input Source** | Node 2 (Normalize Alerts) | n8n template: `$('Normalize Alerts').item.json.*` |
| **Dedup Info** | Node 3'ten geliyor | `dedupStatus`, `actions` |
| **AI Model** | Belirtilmemiş | Muhtemelen OpenAI/Anthropic |
| **Response Format** | JSON string in JSON | Parse gerekiyor |
| **Namespace Usage** | ❌ Kullanılmıyor | Prompt'ta yok |
| **Service Discovery** | ✅ AI inference | "Kubernetes API Server" çıkarımı |

### Namespace Sorusu:

**Problem**: AI prompt'unda namespace bilgisi yok:
```
- Source: {{ ... }}
- Timestamp: {{ ... }}
- Title: {{ ... }}
- Body: {{ ... }}
- Sender: {{ ... }}
- Priority: {{ ... }}
// namespace YOK!
```

**Sonuç**: AI namespace context'i olmadan analiz yapıyor
- KubeAPIDown için sorun değil (infrastructure alert)
- Application-specific alertler için namespace önemli olabilir

**Öneri**: Prompt'a namespace eklenebilir:
```
- Namespace: {{ $('Normalize Alerts').item.json.namespace }}
```

---

## NODE 5: Process AI Output

**Amaç**: AI çıktısını işler, Kubernetes filters oluşturur ve Prometheus input'u hazırlar

### Analiz Durumu: ✅ TAMAMLANDI

**Input**: ❌ Input.json dosyası yok (Node 4 output'u direkt kullanılıyor)
**Output**: ❌ Output.json dosyası yok
**Code**: [AlertListenerNodes/5. Process AI Output.js](../AlertListenerNodes/5. Process AI Output.js)

### Not: Input/Output Dosyaları Eksik

Bu node için örnek input/output JSON dosyaları mevcut değil. Analiz sadece kod üzerinden yapıldı.

### Code İncelemesi (150 satır):

#### Version & Purpose:
```javascript
// PROCESS AI OUTPUT - BACKWARD COMPATIBLE CHAOS ENHANCED
// Bu version Execute Orchestrator Analysis hanging sorununu çözer
// Tüm chaos enhancement'ları korur ama Orchestrator'ın beklediği structure kullanır
```

**Version**: v2-backward-compatible-chaos-enhanced
**Özel Özellik**: Chaos Engineering (tatbikat) detection desteği

### Ana İşleyiş:

#### 1. **Input Acquisition**:
```javascript
const aiOutput = $input.item.json.output || $input.item.json.text || $input.item.json;
const normalizedAlert = $node["Normalize Alerts"].json;
```

**Kaynak**:
- AI output: Node 4'ten gelen AI analysis
- Normalized alert: Node 2'den gelen normalized alert

#### 2. **DEFAULT_NAMESPACES (✅ 10 Namespace)**:
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
```

**✅ DOĞRU**: Node 5'te 10 production namespace array kullanılıyor!

#### 3. **Kubernetes Filters Construction**:
```javascript
const kubernetesFilters = {
    container: normalizedAlert.container || null,
    pod: normalizedAlert.pod || null,
    namespace: normalizedAlert.namespace || DEFAULT_NAMESPACES[0],  // ⚠️ Sadece ilk namespace
    service: normalizedAlert.service || null,
    deployment: normalizedAlert.deployment || null,
    node: normalizedAlert.node || null,
    persistentvolumeclaim: normalizedAlert.persistentvolumeclaim || null,
    volumename: normalizedAlert.volumename || null,
    useSpecificFilters: !!(normalizedAlert.container || normalizedAlert.pod || normalizedAlert.service)
};
```

**⚠️ ÖNEMLİ**: `namespace` fallback → `DEFAULT_NAMESPACES[0]` (sadece ilk namespace)
- Eğer alert'te namespace yoksa → `bstp-cms-global-production` kullanılır
- Diğer 9 namespace ignore edilir

#### 4. **Chaos Engineering Detection**:
```javascript
function detectChaosEngineering(alert) {
    const indicators = [
        alert.body?.toLowerCase().includes('chaos'),
        alert.body?.toLowerCase().includes('tatbikat'),  // Türkçe: tatbikat
        alert.body?.toLowerCase().includes('drill'),
        alert.body?.toLowerCase().includes('test'),
        alert.namespace?.includes('test'),
        alert.namespace?.includes('chaos'),
        isPlannedTestingWindow()
    ];

    return indicators.filter(Boolean).length > 0;
}
```

**Özellik**: Chaos engineering test'lerini detect ediyor
- Alert body'de "chaos", "tatbikat", "drill", "test" arıyor
- Namespace'de "test", "chaos" arıyor
- Planned testing window kontrolü yapıyor

#### 5. **Focus Areas Detection** (Alert Type Based):
```javascript
function determineFocusAreas(alert, isChaos) {
    if (alert.alertname?.includes('Pod') || alert.alertname?.includes('Container')) {
        areas.push('pod-analysis', 'container-logs');
    }
    if (alert.alertname?.includes('Node')) {
        areas.push('node-health', 'system-resources');
    }
    if (alert.alertname?.includes('etcd')) {
        areas.push('etcd-health', 'cluster-state');
    }
    if (alert.alertname?.includes('Memory') || alert.alertname?.includes('OOM')) {
        areas.push('resource-analysis', 'memory-analysis');
    }
    if (alert.alertname?.includes('Storage') || alert.alertname?.includes('Volume')) {
        areas.push('storage-analysis', 'volume-health');
    }

    // Chaos-specific
    if (isChaos) {
        areas.push('chaos-recovery', 'resilience-testing');
    }
}
```

**KubeAPIDown için**: Muhtemelen `['etcd-health', 'cluster-state']` focus areas

#### 6. **Output Structure** (Flattened for Orchestrator):
```javascript
return {
    // ROOT LEVEL (critical for backward compatibility)
    normalizedAlert: normalizedAlert,
    alertAnalysis: {
        alertId: `alert-${Date.now()}`,
        incidentTimeRange: {...},
        affectedComponents: [...],
        pattern: {...},
        technicalIndicators: {...},
        severity: {...},
        correlations: {...},
        orchestratorParams: {
            priority: ...,
            forceDeepAnalysis: ...,
            suggestedAgents: ["tempo", "prometheus", "loki"],
            focusAreas: [...],
            timeWindowMinutes: 60,
            kubernetesFilters: kubernetesFilters  // ← Prometheus'a gidecek
        },
        actionRequired: {...}
    },

    // Quick access fields
    kubernetesFilters: kubernetesFilters,
    focusAreas: [...],
    affectedServices: [...],
    isChaosTest: false,

    // Metadata
    processedAt: "...",
    version: "v2-backward-compatible-chaos-enhanced"
}
```

### Alert Analysis Structure:

**1. incidentTimeRange**:
- `detectedAt`: Alert timestamp
- `startedAt`: 30 dakika önce (varsayılan)
- `isOngoing`: true
- `duration`: "30 minutes"

**2. affectedComponents**:
```javascript
// Eğer service varsa:
{
    name: "service-name",
    type: "kubernetes-service",
    pod: "...",
    namespace: "...",
    node: "...",
    impact: "critical|high|medium",
    confidence: "high",
    source: "service-field"
}

// Fallback (service yoksa):
{
    name: "namespace-name",
    type: "namespace",
    impact: "...",
    confidence: "low",
    source: "fallback"
}
```

**3. orchestratorParams** (Prometheus flow için kritik):
- `priority`: Alert priority'ye göre
- `forceDeepAnalysis`: Critical alertlerde true
- `suggestedAgents`: ["tempo", "prometheus", "loki"]
- `focusAreas`: Alert type'a göre focus areas
- `timeWindowMinutes`: 30 (chaos) veya 60 (normal)
- `kubernetesFilters`: **Prometheus query'lerine gidecek**

### Namespace Handling İncelemesi:

**Senaryo 1: Alert'te namespace VAR**:
```javascript
normalizedAlert.namespace = "em-prod"
→ kubernetesFilters.namespace = "em-prod"
```

**Senaryo 2: Alert'te namespace YOK**:
```javascript
normalizedAlert.namespace = null/undefined
→ kubernetesFilters.namespace = DEFAULT_NAMESPACES[0]  // "bstp-cms-global-production"
```

**KubeAPIDown Örneği için**:
```javascript
// Node 2'den gelen:
normalizedAlert.namespace = "default"  // Fallback

// Node 5'te:
kubernetesFilters.namespace = "default"  // ⚠️ "default" kullanılıyor, DEFAULT_NAMESPACES değil!
```

### Bulgular:

1. ✅ **10 Namespace Array Mevcut**: DEFAULT_NAMESPACES doğru tanımlanmış
2. ⚠️ **Sadece İlk Namespace Kullanılıyor**: Fallback'te `DEFAULT_NAMESPACES[0]` (diğer 9 ignore)
3. ⚠️ **"default" Namespace Geçiyor**: Node 2'den gelen "default" aynen korunuyor
4. ✅ **Chaos Engineering Support**: Tatbikat detection ve özel handling var
5. ✅ **Kubernetes Filters**: Pod, service, container, namespace, deployment, node hepsi extract ediliyor
6. ✅ **Focus Areas**: Alert type'a göre intelligent focus area detection
7. ✅ **Backward Compatible**: Orchestrator'ın beklediği flat structure kullanılıyor
8. ❌ **Input/Output Örnekleri Yok**: Bu node için gerçek çalışma verisi eksik

### Namespace Fallback Sorunları:

**Sorun 1**: Node 2'de namespace yoksa → `"default"`
```javascript
// Node 2:
namespace: labels.namespace || "default"
```

**Sorun 2**: Node 5'te "default" aynen geçiyor:
```javascript
// Node 5:
kubernetesFilters.namespace = normalizedAlert.namespace || DEFAULT_NAMESPACES[0]
// normalizedAlert.namespace = "default" ise → "default" kullanılır
```

**Sorun 3**: DEFAULT_NAMESPACES[0] sadece alert'te namespace yoksa kullanılır:
```javascript
// Sadece normalizedAlert.namespace === null/undefined ise
kubernetesFilters.namespace = DEFAULT_NAMESPACES[0]  // "bstp-cms-global-production"
```

### Önerilen Düzeltme:

**Şu anda**:
```javascript
namespace: normalizedAlert.namespace || DEFAULT_NAMESPACES[0]
```

**Önerilen**:
```javascript
// "default" namespace'i de DEFAULT_NAMESPACES[0] ile değiştir
namespace: (normalizedAlert.namespace && normalizedAlert.namespace !== "default")
           ? normalizedAlert.namespace
           : DEFAULT_NAMESPACES[0]
```

Veya daha iyi bir yaklaşım - **multi-namespace support**:
```javascript
// Eğer namespace yoksa veya "default" ise → TÜM production namespaces kullan
namespaces: (normalizedAlert.namespace && normalizedAlert.namespace !== "default")
            ? [normalizedAlert.namespace]
            : DEFAULT_NAMESPACES  // 10 namespace birden
```

### Node 6'ya Giden Veri:

Enriched alert analysis + kubernetes filters → Prometheus flow input preparation

---

## NODE 6: Prepare Prometheus Input

**Amaç**: Prometheus flow için final input'u hazırlar

### Analiz Durumu: ⏸️ BEKLEMEDE

**Input**: [AlertListenerNodes/6. Prepare Prometheus Input Input.json](../AlertListenerNodes/6. Prepare Prometheus Input Input.json)
**Output**: [AlertListenerNodes/6. Prepare Prometheus Input Output.json](../AlertListenerNodes/6. Prepare Prometheus Input Output.json)
**Code**: [AlertListenerNodes/6. Prepare Prometheus Input.js](../AlertListenerNodes/6. Prepare Prometheus Input.js)

---

## NODE 7: Process Results & Decision

**Amaç**: Sonuçları işler ve karar verir

### Analiz Durumu: ⏸️ BEKLEMEDE

**Code**: [AlertListenerNodes/7. Process Results & Decision.js](../AlertListenerNodes/7. Process Results & Decision.js)

---

## İlerleme Özeti

| Durum | Node Sayısı |
|-------|-------------|
| ✅ Tamamlandı | 4 (Node 0, Node 2, Node 4, Node 5) |
| 🔄 Devam Ediyor | 0 |
| ⏸️ Beklemede | 4 (Node 1, 3, 6, 7) |
| **TOPLAM** | **8** |

---

## Bulgular ve Notlar

### Genel Gözlemler:

1. **Input/Output Dosyaları**:
   - Node 0, 2, 4, 5, 6 için input/output örnekleri mevcut
   - Node 1, 3, 7 için input/output örnekleri yok (muhtemelen ara node'lar veya test node'u)

2. **Flow Yapısı**:
   - WebHook → Normalize → Deduplicate → AI Analyze → Process → Prepare → Decision
   - 7 ana adımdan oluşuyor

3. **Eksik Dosyalar**:
   - Node 1, 3, 7 için input/output örnekleri eksik
   - Bu node'lar için gerçek çalışma verisi olmayabilir

---

## Sonraki Adımlar

1. ✅ Flow yapısını dokümante et
2. ✅ Node 0: WebHook output'unu incele
3. ✅ Node 2: Normalize Alerts incelemesi
4. 🔄 Node 4: AI Alert Analyzer incelemesi (SONRAKİ)
5. ⏸️ Node 5: Process AI Output
6. ⏸️ Node 6: Prepare Prometheus Input
7. ⏸️ Node 7: Process Results & Decision

---

## Kritik Bulgular ve Sorular

### 1. Namespace Fallback Problemi

**Bulgu**: Node 2'de namespace yoksa `"default"` kullanılıyor:
```javascript
namespace: labels.namespace || "default"
```

**Soru**: Birden fazla namespace izleniyorsa (10 production namespace var), bu fallback doğru mu?

**Önerilen Çözüm**:
- AlertManager'da alertlere namespace label'ı ekle
- Veya prometheus query'lerinde namespace bilgisini yakalayıp label olarak ekle
- Veya "default" yerine DEFAULT_NAMESPACES[0] kullan

### 2. Service Name Extraction

**Bulgu**: Pod isminden service ismi çıkarılıyor:
```javascript
"bss-ntf-batch-t3-645d68cbc8-4h88r" → "bss-ntf-batch-t3"
```

**Durum**: ✅ İyi çalışıyor, services.txt'deki gerçek service isimleriyle uyumlu

### 3. KubeAPIDown Alert Özellikleri

**Bulgu**: Bu infrastructure-level bir alert:
- Pod/container bilgisi yok (null)
- Namespace bilgisi yok (default'a düşüyor)
- Cluster-wide bir sorun

**Not**: Infrastructure alert'leri için farklı bir namespace stratejisi gerekebilir

### 4. Namespace Fallback Chain Problemi (KRİTİK)

**Sorun Akışı**:

1. **Alertmanager → WebHook (Node 0)**:
   - KubeAPIDown alert'inde `labels.namespace` yok

2. **Normalize Alerts (Node 2)**:
   ```javascript
   namespace: labels.namespace || "default"
   // Result: "default"
   ```

3. **Process AI Output (Node 5)**:
   ```javascript
   namespace: normalizedAlert.namespace || DEFAULT_NAMESPACES[0]
   // normalizedAlert.namespace = "default" (not null)
   // Result: "default" (NOT bstp-cms-global-production)
   ```

**Sonuç**: Infrastructure alertleri "default" namespace'de kalıyor, 10 production namespace'e bakmıyor!

**Etki**:
- Infrastructure alertler için Prometheus query sadece `namespace="default"` ile yapılacak
- 10 production namespace'teki gerçek sorunlar kaçırılabilir

**Çözüm Önerileri**:

**Seçenek A**: Node 2'de "default" yerine DEFAULT_NAMESPACES[0] kullan
```javascript
// Node 2'de:
namespace: labels.namespace || DEFAULT_NAMESPACES[0]
// Result: "bstp-cms-global-production"
```

**Seçenek B**: Node 5'te "default" check ekle
```javascript
// Node 5'te:
namespace: (normalizedAlert.namespace && normalizedAlert.namespace !== "default")
           ? normalizedAlert.namespace
           : DEFAULT_NAMESPACES[0]
```

**Seçenek C** (ÖNERİLEN): Multi-namespace support
```javascript
// Node 5'te:
namespaces: (normalizedAlert.namespace && normalizedAlert.namespace !== "default")
            ? [normalizedAlert.namespace]
            : DEFAULT_NAMESPACES  // TÜM 10 namespace
```

### 5. AI Prompt'unda Namespace Eksikliği

**Bulgu**: Node 4 (AI Alert Analyzer) prompt'unda namespace field yok
```
Alert Details:
- Source: {{ ... }}
- Timestamp: {{ ... }}
- Title: {{ ... }}
- Body: {{ ... }}
- Priority: {{ ... }}
// namespace YOK!
```

**Etki**: AI namespace context olmadan analiz yapıyor
- Application-specific alertlerde hangi namespace'in etkilendiği belirsiz

**Öneri**: Prompt'a namespace ekle
```
- Namespace: {{ $('Normalize Alerts').item.json.namespace }}
```

---

## ✅ NAMESPACE FIX UYGULAMASI (2025-12-14)

### Sorun Özeti:

Infrastructure alerts (KubeAPIDown gibi) namespace label'ı olmadan geliyor → "default" namespace'e düşüyor → Prometheus query sadece "default"'ta arama yapıyor → Gerçek production namespace'lerdeki 216 servisi kaçırıyor!

### Uygulanan Çözüm:

**1. DEFAULT_NAMESPACES Güncellendi (12 namespace)**:

```javascript
// ÖNCE: 10 namespace
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

// SONRA: 12 namespace (monitoring + control-plane eklendi)
const DEFAULT_NAMESPACES = [
  'bss-prod-eks-monitoring',      // 45 services: Prometheus, Grafana, Loki, Alertmanager
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
  'em-control-plane-prod'          // 5 services: control plane components
];
```

**2. Node 2 (Normalize Alerts) - "default" fallback kaldırıldı**:

```javascript
// ÖNCE:
namespace: labels.namespace || "default"  // Infrastructure alert → "default"

// SONRA:
namespace: labels.namespace || null  // Infrastructure alert → null
// NOTE: Infrastructure alerts (KubeAPIDown) don't have namespace labels - this is NORMAL
// We keep namespace as null here, and Node 5 will handle multi-namespace queries
```

**3. Node 5 (Process AI Output) - Multi-namespace support eklendi**:

```javascript
// ÖNCE: Single namespace fallback
const kubernetesFilters = {
    namespace: normalizedAlert.namespace || DEFAULT_NAMESPACES[0],  // Sadece 1 namespace
};

// SONRA: Multi-namespace support
const hasSpecificNamespace = normalizedAlert.namespace && normalizedAlert.namespace !== 'default';
const kubernetesFilters = {
    namespace: hasSpecificNamespace ? normalizedAlert.namespace : null,  // Single namespace (app alerts)
    namespaces: hasSpecificNamespace ? [normalizedAlert.namespace] : DEFAULT_NAMESPACES,  // Multi-namespace (infra alerts)
    useMultiNamespace: !hasSpecificNamespace  // Flag for query builders
};
```

**4. Node 6 (Prepare Prometheus Input) - kubernetesFilters entegrasyonu**:

```javascript
// ÖNCE: Hardcoded fallback
kubernetesFilters: {
    namespace: normalizedAlert.namespace || 'etiyamobile-prod',  // Hardcoded fallback
    ...
}

// SONRA: Node 5'ten gelen kubernetesFilters kullanılıyor
kubernetesFilters: kubernetesFilters,  // Multi-namespace support included

// Namespaces array update
namespaces: kubernetesFilters.namespaces || [normalizedAlert.namespace || 'em-prod'],

// Context kubernetes section update
kubernetes: {
    namespace: kubernetesFilters.namespace,  // null for infrastructure alerts
    namespaces: kubernetesFilters.namespaces,  // array of namespaces to query
    useMultiNamespace: kubernetesFilters.useMultiNamespace
}
```

### Davranış Değişikliği:

**ÖNCE** (KubeAPIDown infrastructure alert için):
```
Node 0 (Webhook): labels.namespace = undefined
       ↓
Node 2 (Normalize): namespace = "default"
       ↓
Node 5 (Process): namespace = "default" (kubernetesFilters.namespace)
       ↓
Node 6 (Prepare): namespace = "default"
       ↓
Prometheus Query: namespace="default" → Sadece 1 service (kubernetes API)
```

**SONRA** (KubeAPIDown infrastructure alert için):
```
Node 0 (Webhook): labels.namespace = undefined
       ↓
Node 2 (Normalize): namespace = null
       ↓
Node 5 (Process): namespace = null
                  namespaces = [12 production namespaces]
                  useMultiNamespace = true
       ↓
Node 6 (Prepare): namespace = null
                  namespaces = [12 production namespaces]
       ↓
Prometheus Query: namespace=~"bss-prod-eks-monitoring|bstp-cms-global-production|..." → 216 services
```

**Application alert örneği** (namespace label'ı olan):
```
Node 0 (Webhook): labels.namespace = "em-prod"
       ↓
Node 2 (Normalize): namespace = "em-prod"
       ↓
Node 5 (Process): namespace = "em-prod"
                  namespaces = ["em-prod"]
                  useMultiNamespace = false
       ↓
Node 6 (Prepare): namespace = "em-prod"
                  namespaces = ["em-prod"]
       ↓
Prometheus Query: namespace="em-prod" → Targeted query
```

### Etkilenen Dosyalar:

1. ✅ [AlertListenerNodes/2. Normalize Alerts.js](../AlertListenerNodes/2. Normalize Alerts.js)
   - Line 140: `namespace: labels.namespace || null` (was: `|| "default"`)
   - Line 185: `namespace: alert.labels?.namespace || null` (was: `|| "default"`)

2. ✅ [AlertListenerNodes/5. Process AI Output.js](../AlertListenerNodes/5. Process AI Output.js)
   - Line 24-37: DEFAULT_NAMESPACES array updated (10 → 12 namespaces)
   - Line 41-54: Multi-namespace support added (namespace, namespaces, useMultiNamespace)

3. ✅ [AlertListenerNodes/6. Prepare Prometheus Input.js](../AlertListenerNodes/6. Prepare Prometheus Input.js)
   - Line 65: kubernetesFilters from Node 5 (was: hardcoded)
   - Line 79: namespaces array using kubernetesFilters.namespaces
   - Line 104-112: kubernetes context updated with multi-namespace fields
   - Line 128-130: Console logs updated to show multi-namespace info

### Beklenen Sonuçlar:

1. ✅ Infrastructure alerts artık 12 production namespace'de arama yapacak
2. ✅ Application alerts targeted query yapacak (sadece kendi namespace'inde)
3. ✅ "default" namespace kullanımı elimine edildi
4. ✅ Prometheus query'lerinde namespace array desteği hazır
5. ✅ 216 production service artık infrastructure alertlerde görünür olacak

### Test Edilmesi Gerekenler:

- [ ] KubeAPIDown alertinin 12 namespace'de arama yapması
- [ ] Application alert'lerinin sadece kendi namespace'inde arama yapması
- [ ] Prometheus Query Builder'ın namespace array'i doğru handle etmesi
- [ ] Multi-namespace Prometheus query syntax: `namespace=~"ns1|ns2|ns3"`

---

**Son Güncelleme**: 2025-12-14
**İncelenen Node**: 4/8 (Namespace fix: ✅ UYGULANMIŞ)
**Tamamlanma**: 50% + Namespace Fix Completed
