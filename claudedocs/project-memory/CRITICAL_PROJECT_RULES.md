# 🔴 KRİTİK PROJE KURALLARI - OKR_AI

**UYARI**: Bu kurallar HER SEANSTA okunmalı ve KEsinlikle uyulmalıdır!

## Proje Yapısı (DEĞİŞMEZ)

### Flow Mimarisi
```
Alert Listener n8n flow.json
    ↓ (Alarmları yakalar ve işler)
    ↓ (Tetikler)
Prometheus n8n flow.json
    ↓ (Prometheus endpointlerini sorgular)
    ↓ (Multi-stage analiz yapar)
    ↓ (Çıktı üretir)
```

### Node Organizasyonu

**Alert Listener Flow Node'ları**:
- Konum: `AlertListenerNodes/` klasörü
- Format: Sıra numarası ile birlikte
- Örnek: `4. AI Alert Analyzer.txt`
- Tip: Code node'lar (JavaScript)

**Prometheus Flow Node'ları**:
- Konum: `PrometheusNodes/` klasörü
- Format: Sıra numarası ile birlikte
- Örnekler:
  - `12. Stage 2 Deep Analysis.txt`
  - `18. Stage 4 Automated Diagnosis.txt`
  - `21. Stage 5 Smart Remediation.txt`
  - `23. Stage 6 Prevention & Learning.txt`
  - `Stage 3 Alert Intelligence.txt`
- Tip: Code node'lar (JavaScript) + Agent promptları

## 🚨 DEĞİŞMEZ KURALLAR

### 1. Flow Yapısı ve Bağlantılar
- ✅ **KORUNMALI**: Tüm flow bağlantıları
- ✅ **KORUNMALI**: Node sıralaması ve numaralandırması
- ✅ **KORUNMALI**: Mevcut node yapısı
- ❌ **DEĞİŞTİRİLEMEZ**: Hiçbir bağlantı
- ❌ **DEĞİŞTİRİLEMEZ**: Hiçbir node

### 2. Prompt ve Kod Detayları
- ✅ **KORUNMALI**: Promptlardaki her bir ayrıntı
- ✅ **KORUNMALI**: Code node'lardaki tüm JavaScript kodu
- ✅ **KORUNMALI**: Stage yapıları ve logic
- ❌ **DEĞİŞTİRİLEMEZ**: Prompt formatları
- ❌ **DEĞİŞTİRİLEMEZ**: Var olan kod mantığı

### 3. Yeni Node Ekleme Prosedürü
```
EĞER yeni_node_gerekli İSE:
    1. Kullanıcıdan izin AL
    2. Onay gelene kadar BEKLE
    3. Onay gelirse:
        - Mevcut yapıyı KORUYARAK ekle
        - Hiçbir bağlantıyı DEĞİŞTİRME
        - Hiçbir node'u DEĞİŞTİRME
    4. Onay gelmezse:
        - Alternatif çözüm öner
        - ASLA kendin ekleme
```

### 4. Her Seans Başlangıç Protokolü
```bash
# ZORUNLU ADıMLAR (Her seansta)
1. Bu dosyayı oku: claudedocs/project-memory/CRITICAL_PROJECT_RULES.md
2. Proje yapısını oku: claudedocs/project-memory/PROJECT_STRUCTURE.md
3. Mevcut durumu kontrol et
4. Çalışmaya başla
```

## Dosya Yapısı

```
OKR_AI/
├── Alert Listener n8n flow.json      # Ana flow 1 - Alarm yakalama
├── Prometheus n8n flow.json          # Ana flow 2 - Analiz pipeline
├── AlertListenerNodes/               # Alert Listener node'ları
│   └── [N]. [Node Adı].txt           # Sıra numaralı node'lar
├── PrometheusNodes/                  # Prometheus node'ları
│   ├── [N]. Stage [X] [Adı].txt      # Sıra numaralı stage node'ları
│   └── Stage [X] [Adı].txt           # Stage node'ları
├── alert_example.json                # Örnek alarm
├── services.txt                      # Servis listesi
├── notes.md                          # Konfigürasyon notları
└── claudedocs/                       # Dokümantasyon
    ├── project-memory/               # 🔴 Kalıcı hafıza (HER SEANS OKU!)
    │   ├── CRITICAL_PROJECT_RULES.md # Bu dosya
    │   └── PROJECT_STRUCTURE.md      # Detaylı yapı
    ├── PROJECT_OVERVIEW.md
    ├── ARCHITECTURE.md
    ├── QUICK_START.md
    ├── STAGE_REFERENCE.md
    └── INDEX.md
```

## Alert Listener Flow Özellikleri

### İşlev
1. Alarmları yakalar (Email/Webhook/Prometheus)
2. Normalize eder
3. İşler (AI analiz)
4. Prometheus flow'unu tetikler

### Node'lar
- AlertListenerNodes/ klasöründe
- JavaScript code node'lar
- Sıra numaralı format

## Prometheus Flow Özellikleri

### İşlev
1. Alert Listener'dan tetiklenir
2. Prometheus endpointlerini sorgular
3. Multi-stage analiz yapar:
   - Stage 1: Initial Triage
   - Stage 2: Deep Analysis
   - Stage 3: Alert Intelligence
   - Stage 4: Automated Diagnosis
   - Stage 5: Smart Remediation
   - Stage 6: Prevention & Learning
4. Çıktı üretir

### Node'lar
- PrometheusNodes/ klasöründe
- JavaScript code node'lar + Agent promptları
- Sıra numaralı format
- Stage bazlı organizasyon

## Çalışma Prensipleri

### ✅ YAPILMASI GEREKENLER
- Mevcut yapıyı korumak
- Promptları aynen kullanmak
- Kod mantığını muhafaza etmek
- Değişiklik öncesi izin almak
- Her seansta bu kuralları okumak

### ❌ ASLA YAPILMAMASI GEREKENLER
- Flow bağlantılarını değiştirmek
- Node sırasını değiştirmek
- Prompt detaylarını değiştirmek
- İzinsiz yeni node eklemek
- Mevcut node'ları silmek/değiştirmek

## Değişiklik İzin Prosesi

```javascript
async function requestChange(changeType, details) {
  // 1. Değişiklik türünü belirle
  const changeCategory = categorizeChange(changeType);

  // 2. Mevcut yapıya etkisini analiz et
  const impact = analyzeImpact(details);

  // 3. Kullanıcıdan izin iste
  const request = {
    type: changeCategory,
    impact: impact,
    currentStructure: "Preserved",
    proposedChange: details,
    question: "Bu değişikliği yapmamı onaylıyor musunuz?"
  };

  // 4. Onay bekle
  const approval = await askUser(request);

  // 5. Onay varsa uygula, yoksa alternatif öner
  if (approval) {
    applyChangeWhilePreservingStructure(details);
  } else {
    suggestAlternative(details);
  }
}
```

## Önemli Notlar

### Kalıcı Hafıza Kullanımı
Bu proje için kalıcı hafıza sistemi kullanılıyor:
- Her seans başında bu dosya okunmalı
- Proje kuralları hiçbir zaman unutulmamalı
- Yapısal değişiklikler kayıt altında tutulmalı

### Dokümantasyon Güncellemeleri
- Dokümantasyon güncellenebilir
- ANCAK flow yapısı ve node'lar DEĞİŞMEZ
- Dokümantasyon sadece açıklayıcı amaçlıdır

### Hata Ayıklama
- Hata ayıklarken mevcut yapı korunmalı
- Debug için yeni node eklemek gerekirse izin alınmalı
- Geçici değişiklikler bile onaylanmalı

## Kontrol Listesi (Her Seans)

- [ ] CRITICAL_PROJECT_RULES.md okundu
- [ ] PROJECT_STRUCTURE.md okundu
- [ ] Flow yapısı anlaşıldı
- [ ] Değişmez kurallar hafızada
- [ ] Node organizasyonu bilinir
- [ ] İzin prosedürü anlaşıldı

## Son Hatırlatma

**🔴 EN ÖNEMLİ KURAL**:
```
EĞER emin_değilsen:
    Kullanıcıya SOR
    Onay BEKLE
    ASLA kendin karar verme
```

---

**Dosya Durumu**: Kalıcı - Her seansta okunmalı
**Son Güncelleme**: 2025-12-13
**Kritiklik Seviyesi**: 🔴 MAXIMUM
