# OKR_AI Proje Yapısı - Detaylı Harita

**Amaç**: Her seansta proje yapısını hızlıca anlamak için referans

## Flow Haritası

### 1. Alert Listener Flow (Alert Listener n8n flow.json)

**Amaç**: Alarmları yakalama, normalize etme, işleme

**Akış**:
```
Alarm Kaynakları (Email/Webhook/Prometheus)
    ↓
Alert Receiver (Yakalama)
    ↓
Normalization (Standartlaştırma)
    ↓
AI Alert Analyzer (İlk analiz - LiteLLM)
    ↓
Context Builder (Bağlam oluşturma)
    ↓
Prometheus Flow Trigger (Tetikleme)
```

**Node Konumu**: `AlertListenerNodes/`

**Mevcut Node'lar**:
```
AlertListenerNodes/
└── 4. AI Alert Analyzer.txt
```

**Node Özellikleri**:
- Tip: Code node (JavaScript)
- İçerik: LiteLLM AI analiz promptu
- Çıktı: Normalize edilmiş alarm verisi + context

### 2. Prometheus Flow (Prometheus n8n flow.json)

**Amaç**: Multi-stage analiz pipeline, Prometheus sorgulama, çıktı üretme

**Akış**:
```
Alert Listener Trigger
    ↓
Stage 1: Initial Triage (Hızlı değerlendirme)
    ↓
Stage 2: Deep Analysis (Detaylı inceleme)
    ↓
Stage 3: Alert Intelligence (SLO etki + korelasyon)
    ↓
Stage 4: Automated Diagnosis (Kök neden)
    ↓
Stage 5: Smart Remediation (Otomatik düzeltme)
    ↓
Stage 6: Prevention & Learning (Öğrenme)
    ↓
Çıktı (Analiz sonuçları + aksiyon önerileri)
```

**Node Konumu**: `PrometheusNodes/`

**Mevcut Node'lar**:
```
PrometheusNodes/
├── 12. Stage 2 Deep Analysis.txt
├── 18. Stage 4 Automated Diagnosis.txt
├── 21. Stage 5 Smart Remediation.txt
├── 23. Stage 6 Prevention & Learning.txt
└── Stage 3 Alert Intelligence.txt
```

**Node Özellikleri**:
- Tip: Code node (JavaScript) + AI Agent promptları
- İçerik: Prometheus sorguları + analiz mantığı + AI promptları
- Giriş: Önceki stage'den gelen `_context` objesi
- Çıktı: Stage analiz sonuçları + güncel `_context` objesi

## Stage Detayları

### Stage 2: Deep Analysis (12. Stage 2 Deep Analysis.txt)

**Görev**: Pod analizi, trend analizi, anomali tespiti

**Fazlar**:
1. **Instant Analysis**: Anlık durum
   - Pod status
   - Container restarts
   - Resource usage

2. **Trend Analysis**: 24 saat karşılaştırması
   - Memory growth
   - Restart patterns

3. **Anomaly Detection**: Gelecek tahminleri
   - Resource exhaustion prediction
   - Pattern anomalies

**Prometheus Sorguları**: 3-6 adet
**Çıktı Format**: JSON (execution_phases, correlation_matrix, root_cause)

### Stage 3: Alert Intelligence (Stage 3 Alert Intelligence.txt)

**Görev**: SLO etki değerlendirmesi, alert korelasyonu

**Kritik Optimizasyon**:
- **Alert History**: TEK ÇAĞRI (tüm alertler için)
- **Active Alerts**: TEK ÇAĞRI (aggregate)
- **SLO Checks**: Koşullu (alert tipine göre)
- **Maksimum**: ≤ 7 tool çağrısı

**Fazlar**:
1. **Alert Discovery**: Aktif alertleri bul
2. **SLO Assessment**: Koşullu SLO kontrolleri

**SLO Bileşenleri** (Ağırlıklı):
- Pod Ready SLO (30%)
- Container Running SLO (20%)
- Node Ready SLO (25%)
- Pod Restart Rate SLO (15%)
- Deployment Health (10%)

**Çıktı Format**: JSON (active_alerts, alert_groups, slo_impact, recommended_actions)

### Stage 4: Automated Diagnosis (18. Stage 4 Automated Diagnosis.txt)

**Görev**: Kök neden tanımlama, kanıt toplama

**Kanıt Toplama**:
- Pod events (kubectl)
- Container logs (kubectl)
- Resource metrics (Prometheus)
- Network tests
- Dependency health

**Root Cause Scoring**:
- Evidence-based confidence calculation
- Multiple evidence sources weighted
- Minimum 0.7 confidence for remediation

**Çıktı Format**: JSON (root_cause, diagnostic_data, recommended_actions, blast_radius)

### Stage 5: Smart Remediation (21. Stage 5 Smart Remediation.txt)

**Görev**: Güvenli otomatik düzeltme

**Risk Matrisi**:
| Aksiyon | Risk | Auto-Onay Eşiği |
|---------|------|----------------|
| Restart Pod | Low | ≥ 0.8 |
| Scale Deployment | Medium | ≥ 0.9 |
| Delete PVC | High | Manuel |
| Node Drain | Critical | Manuel |

**Safety Gates**:
1. Risk level check
2. Confidence threshold
3. Blast radius validation
4. SLO impact prediction
5. Rollback plan verification

**Çıktı Format**: JSON (remediation, rollback_plan, post_remediation_state)

### Stage 6: Prevention & Learning (23. Stage 6 Prevention & Learning.txt)

**Görev**: Olay sonrası analiz, bilgi tabanı güncelleme

**İşlemler**:
1. Incident timeline reconstruction
2. Pattern extraction
3. Knowledge base update
4. Preventive measures identification
5. Documentation generation

**Çıktı Format**: JSON (incident_summary, lessons_learned, preventive_measures, knowledge_base_update)

## Veri Akışı

### Context Object Yapısı

Her stage arasında taşınan veri:

```json
{
  "_context": {
    "contextId": "unique_id",
    "priority": "critical|high|medium|low",
    "initialParams": {
      "startTime": "unix_timestamp",
      "endTime": "unix_timestamp",
      "namespaces": ["namespace"],
      "pods": ["pod_name"],
      "services": ["service_name"]
    },
    "alertContext": {
      "alertName": "KubePodNotReady",
      "severity": "critical",
      "source": "prometheus"
    },
    "kubernetesFilters": {
      "namespace": "em-prod",
      "pod": "pod_name",
      "container": "container_name"
    }
  },
  "_debug": {
    "nodeType": "Stage N",
    "processedAt": "ISO_timestamp",
    "contextId": "unique_id",
    "contextPreserved": true,
    "receivedFromStage": "Stage N-1",
    "stageSequence": ["Stage 1", "Stage 2", ...],
    "toolCallCount": 5
  }
}
```

### Stage'ler Arası Veri Geçişi

```
Alert Listener → {normalized_alert + context}
    ↓
Stage 1 → {stage1Results + _context}
    ↓
Stage 2 → {stage2Data + _context}
    ↓
Stage 3 → {stage3Data + _context}
    ↓
Stage 4 → {stage4Data + _context}
    ↓
Stage 5 → {stage5Data + _context}
    ↓
Stage 6 → {final_output + _context}
```

**Kritik**: `_context` objesi HER stage'de korunmalı ve bir sonrakine geçilmeli!

## Dosya Organizasyonu

```
OKR_AI/
├── Alert Listener n8n flow.json       # Flow 1: Alarm yakalama
│   └── Node'lar → AlertListenerNodes/
│
├── Prometheus n8n flow.json           # Flow 2: Analiz pipeline
│   └── Node'lar → PrometheusNodes/
│
├── AlertListenerNodes/                # Alert Listener node dosyaları
│   └── [N]. [Node Name].txt           # Format: Numara + isim
│       ├── JavaScript kodu
│       └── AI promptları (varsa)
│
├── PrometheusNodes/                   # Prometheus node dosyaları
│   └── [N]. Stage [X] [Name].txt      # Format: Numara + stage + isim
│       ├── JavaScript kodu
│       ├── AI promptları
│       └── Prometheus sorguları
│
├── alert_example.json                 # Örnek alarm yapısı
├── services.txt                       # Kubernetes servis listesi
├── notes.md                           # Konfigürasyon ve credential'lar
│
└── claudedocs/                        # Dokümantasyon
    ├── project-memory/                # 🔴 Kalıcı hafıza (HER SEANS OKU!)
    │   ├── CRITICAL_PROJECT_RULES.md  # Kritik kurallar
    │   └── PROJECT_STRUCTURE.md       # Bu dosya
    │
    ├── PROJECT_OVERVIEW.md            # Proje özeti
    ├── ARCHITECTURE.md                # Mimari detayları
    ├── QUICK_START.md                 # Kurulum rehberi
    ├── STAGE_REFERENCE.md             # Stage referansı
    └── INDEX.md                       # Dokümantasyon indeksi
```

## Teknoloji Stack

### Platform
- **n8n**: Workflow automation
- **LiteLLM**: AI analiz
- **Prometheus**: Metrik toplama
- **Grafana**: Görselleştirme
- **Loki**: Log toplama
- **Kubernetes**: Container platform

### Entegrasyonlar
- **Email**: Alert reception
- **Webhook**: Alertmanager integration
- **kubectl**: Kubernetes operations
- **Prometheus API**: Metric queries
- **Grafana API**: Dashboard access

## Tool Call Limitleri

Her stage için maksimum tool çağrısı:

| Stage | Max Tool Calls | Kritik? |
|-------|----------------|---------|
| Alert Listener | 1 (AI) | Hayır |
| Stage 1 | 1-2 | Hayır |
| Stage 2 | 3-8 | Hayır |
| Stage 3 | 2-7 | **✅ ÇOK KRİTİK** |
| Stage 4 | 5-9 | Hayır |
| Stage 5 | 3-5 | Hayır |
| Stage 6 | 1-3 | Hayır |

**Stage 3 Özel Optimizasyon**:
- Alert History: TEK ÇAĞRI ZORUNLU
- Active Alerts: TEK ÇAĞRI ZORUNLU
- SLO tools: Koşullu (alert tipine göre)
- Toplam: ASLA 7'yi geçemez

## Kritik Bağlantılar

### Flow Tetikleme
```
Alert Listener (Son node)
    ↓ [WEBHOOK/EVENT TRIGGER]
Prometheus Flow (İlk node/Stage 1)
```

**Değiştirilemez**: Bu tetikleme mekanizması

### Stage Bağlantıları
```
Stage N (output node)
    ↓ [DIRECT CONNECTION]
Stage N+1 (input node)
```

**Değiştirilemez**: Stage sırası ve bağlantıları

## Önemli Yapısal Özellikler

### 1. Node Numaralandırması
- Her node bir sıra numarası taşır
- Format: `[N]. [Stage X] [İsim].txt`
- Numaralar flow içindeki sırayı gösterir
- **Değiştirilemez**: Numaralama sistemi

### 2. Prompt Yapıları
- Her AI node'un özel promptu var
- Promptlar JSON çıktı üretmek için optimize
- **Değiştirilemez**: Prompt detayları ve formatı

### 3. Context Preservation
- `_context` objesi tüm pipeline boyunca taşınır
- Her stage `_context`'i alır ve bir sonrakine geçirir
- **Değiştirilemez**: Context yapısı ve geçiş mekanizması

### 4. Output Formatları
- Tüm stage'ler JSON çıktı üretir
- Markdown wrapper YOK
- Strict schema validation
- **Değiştirilemez**: Output format yapısı

## Bakım ve Güncelleme

### İzin Verilen
- ✅ Dokümantasyon güncellemeleri
- ✅ Yeni dokümantasyon ekleme
- ✅ Kod içi yorum ekleme (logic değişmeden)
- ✅ Debug logging ekleme (onay ile)

### İzin Verilmeyen
- ❌ Flow bağlantılarını değiştirme
- ❌ Node sıralamasını değiştirme
- ❌ Prompt yapılarını değiştirme
- ❌ Context object yapısını değiştirme
- ❌ Stage logic'ini değiştirme
- ❌ İzinsiz yeni node ekleme

## Hızlı Referans

### Her Seans Başında
1. `claudedocs/project-memory/CRITICAL_PROJECT_RULES.md` OKU
2. `claudedocs/project-memory/PROJECT_STRUCTURE.md` OKU (bu dosya)
3. Mevcut çalışma konusunu belirle
4. Yapısal değişiklik gerekli mi kontrol et
5. Gerekirse izin iste

### Değişiklik İhtiyacında
1. Değişikliğin tipini belirle
2. Mevcut yapıya etkisini analiz et
3. Kullanıcıya açıkla ve izin iste
4. Onay bekle
5. Onay gelirse dikkatli uygula
6. Onay gelmezse alternatif öner

### Hata Ayıklama
1. Hangi stage/node'da hata var belirle
2. İlgili .txt dosyasını oku (AlertListenerNodes/ veya PrometheusNodes/)
3. Kod ve prompt yapısını koru
4. Sadece bug fix için minimal değişiklik öner
5. Değişiklik öncesi izin al

---

**Dosya Durumu**: Kalıcı - Her seansta okunmalı
**Son Güncelleme**: 2025-12-13
**Amaç**: Proje yapısını hızlıca anlamak ve korumak
