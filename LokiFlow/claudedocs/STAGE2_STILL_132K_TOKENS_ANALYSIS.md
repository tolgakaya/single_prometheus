# Stage 2 Still 132K Tokens - Root Cause Analysis

## Yeni Hata

```
litellm.ContextWindowExceededError: This model's maximum context length is 128000 tokens.
However, your messages resulted in 132827 tokens (132507 in the messages, 320 in the functions).
```

**Yer**: Node 10 - Stage 2 Pattern Analysis AI Agent
**Durum**: AgentTools.txt düzeltildi (topk → limit), ama token sayısı hala 132K!

---

## Token Hesaplama

### Node 9 Output Boyutu

**Dosya**: `9. Pass Time Context to Stage 2 Output.json`
- **Boyut**: 17,587 bytes (17.5KB)
- **Tahmini Token**: ~4,400 tokens (17587 / 4)

### Stage 2 Prompt Boyutu

**Dosya**: `10. Stage 2 Pattern Analysis.txt`
- **Tahmini Boyut**: ~4KB
- **Tahmini Token**: ~1,000 tokens

### Toplam Input Token
```
Node 9 output: ~4,400 tokens
Stage 2 prompt: ~1,000 tokens
Total input: ~5,400 tokens
```

### HTTP Tool Responses Token

**Gerçek hata**: 132,827 tokens
**Input**: 5,400 tokens
**HTTP tool responses**: 132,827 - 5,400 = **~127,400 tokens** 🔴

---

## Problem: `| limit` Neden Çalışmadı?

### LogQL `limit` Davranışı

LogQL'de `limit` işlemi **client-side** değil **server-side** yapılır, AMA:

1. **n8n HTTP Request node behavior**:
   - LogQL query'sini Loki API'ye gönderir
   - API **FULL response** döndürür
   - `limit` backend'de uygulanır AMA...

2. **Loki API Response Format**:
   ```json
   {
     "status": "success",
     "data": {
       "resultType": "streams",
       "result": [
         {
           "stream": {...},
           "values": [
             ["timestamp", "log line 1"],
             ["timestamp", "log line 2"],
             ...  // limit 100 demiş olsak da, API tüm match'leri döndürebilir!
           ]
         }
       ]
     }
   }
   ```

3. **n8n AI Agent Tool Execution**:
   - AI Agent HTTP tool'u çağırır
   - Loki API tüm logs döndürür (limit ignored or ineffective)
   - AI Agent context'e **TÜM response** eklenir
   - Result: 127K tokens!

---

## Root Cause: `limit` Etkisiz

### Neden `limit` Yeterli Değil?

1. **Time Range Hala Geniş**:
   - Node 9'dan gelen `timeRange`: 1 saat (3600 saniye)
   - 12 namespace × 1 hour × ERROR|FATAL|WARN logs = Binlerce log
   - `limit 100` backend'de uygulanıyor ama **response size hala büyük**

2. **Loki API Pagination Issue**:
   - `limit` query'de belirtilmiş ama Loki API **ilk fetch'te hepsini dönüyor**
   - n8n HTTP tool pagination yapmıyor
   - Sonuç: Full log data AI Agent context'e ekleniyor

3. **Multi-Namespace Query**:
   - 12 namespace'e parallel query
   - Her namespace 1000+ log
   - Total: 12,000+ log lines × 100 tokens/line = 1.2M raw tokens
   - Compression ile ~127K token

---

## Çözüm Stratejileri

### Strateji 1: Time Range Daraltma (ÖNERİLEN) ⚡

**Node 9'da time range'i daralt**:

```javascript
// ÖNCEKİ (1 saat)
const stage2TimeRange = {
  start: timeRange.start,  // -1 hour
  end: timeRange.end,      // now
  durationMinutes: 60
};

// YENİ (Son 15 dakika)
const stage2TimeRange = {
  start: timeRange.end - 900,  // Son 15 dakika
  end: timeRange.end,
  durationMinutes: 15
};
```

**Token Impact**: 127K → ~32K tokens (75% azalma)

**Rationale**:
- Pattern analysis için 1 saat gerekli değil
- Stage 1 zaten 1 saatlik health check yaptı
- Stage 2 sadece **recent patterns** aramalı (son 15-30 dakika)

---

### Strateji 2: serviceDependencies Kaldırma 🔧

**Node 9'da serviceDependencies objesini Stage 2'ye gönderme**:

**ÖNCEKİ**:
```javascript
context: {
  timeRange: {...},
  serviceDependencies: {
    raw: { /* 28 services × 5 deps = 140 entries */ },
    reverse: { /* 140 entries */ },
    criticality: { /* 140 entries */ },
    serviceGroups: { /* 7 groups */ }
  }  // ~13KB JSON
}
```

**YENİ**:
```javascript
context: {
  timeRange: {...},
  criticalServices: ["bstp-pcm-product-catalog", "ntf-engine-service", ...]  // Top 5 only
  // serviceDependencies kaldırıldı
}
```

**Token Impact**: -3,250 tokens (13KB / 4)

**Not**: Bu yeterli değil ama yardımcı olur.

---

### Strateji 3: HTTP Tool Query'leri Daha da Daraltma ⚠️

**AgentTools.txt'de limit'i daha da düşür**:

```logql
# Query 3: Cascade Timeline
{...} | limit 50  # Önce 100, şimdi 50

# Query 4: Request ID Correlation
{...} | limit 25  # Önce 50, şimdi 25
```

**Token Impact**: Minimal (~10K azalma), çünkü asıl problem time range

---

### Strateji 4: Stage 2 Prompt Kısaltma 📝

**10. Stage 2 Pattern Analysis.txt** prompt'unda gereksiz açıklamaları kısalt.

**Token Impact**: ~500 tokens (çok küçük)

---

## ÖNERİLEN ÇÖZÜM (Kombine Yaklaşım)

### Adım 1: Node 9'da Time Range Daralt (CRITICAL) 🔴

**Dosya**: `9. Pass Time Context to Stage 2.js`

**Değişiklik**:
```javascript
// Line ~50 civarı
const stage2TimeRange = {
  start: timeRange.end - 900,  // Son 15 dakika (önceden 3600)
  end: timeRange.end,
  durationMinutes: 15
};
```

**Token Impact**: 127K → ~32K (75% azalma) ✅

---

### Adım 2: serviceDependencies Kısalt (MEDIUM) 🟡

**Dosya**: `9. Pass Time Context to Stage 2.js`

**Değişiklik**:
```javascript
context: {
  timeRange: stage2TimeRange,
  queryParams: {...},
  affectedServices: [...],
  // serviceDependencies: contextData.context.serviceDependencies,  ❌ Remove
  criticalServices: contextData.context.serviceDependencies.metadata.mostCritical.map(s => s.service)  ✅ Top 5 only
}
```

**Token Impact**: -3K tokens

---

### Adım 3: AgentTools.txt Limit Düşür (OPTIONAL) 🟢

**Dosya**: `AgentTools.txt`

**Değişiklik**:
```logql
# Query 3
{...} | limit 50  # 100 → 50

# Query 4
{...} | limit 25  # 50 → 25
```

**Token Impact**: -5K tokens

---

## Beklenen Sonuç

### After All Fixes
```
Input (Node 9): ~3K tokens (time range kısaldı, serviceDependencies kısaldı)
Prompt: ~1K tokens
HTTP Tools:
  - Query 1 (Thread Correlation): ~2K tokens
  - Query 2 (Service Error Distribution): ~3K tokens
  - Query 3 (Cascade Timeline): ~5K tokens (limit 50, 15 min)
  - Query 4 (Request ID Correlation): ~2.5K tokens (limit 25, 15 min)
  - Query 5 (Error Pattern): ~8K tokens

Total: 3K + 1K + 2K + 3K + 5K + 2.5K + 8K = ~24.5K tokens ✅
```

**Safety Margin**: 24.5K / 128K = 19% utilization (81% under limit)

---

## Risk Analizi

### Risk 1: 15 Dakika Yeterli mi?

**Concern**: Pattern analysis için 15 dakika kısa olabilir

**Mitigation**:
- Stage 1 zaten 1 saatlik health check yaptı
- Stage 2'nin amacı **recent cascade patterns** bulmak
- 15 dakika son error pattern'leri görmek için yeterli
- Eğer yetersizse → 30 dakikaya çıkarabiliriz (hala 128K altında kalır)

### Risk 2: serviceDependencies Kaybı

**Concern**: Cascade detection için dependency graph gerekli

**Mitigation**:
- Top 5 critical services korunuyor
- Node 12 (Cascade Failure Detector) zaten dependency analysis yapıyor
- AI Agent sadece log pattern'lere odaklanmalı, dependency graph logic Node 12'de

---

## Test Prosedürü

### 1. Node 9 Değişikliği Sonrası

**Beklenen**:
```javascript
console.log("Stage 2 Time Range:", {
  start: stage2TimeRange.start,
  end: stage2TimeRange.end,
  duration: "15 minutes"  // ✅ 15 dakika
});
```

### 2. Stage 2 AI Agent Token Kontrolü

**Beklenen**:
```
Stage 2 Pattern Analysis:
  Input: ~3K tokens
  HTTP tools: ~20K tokens
  Total: ~24.5K tokens ✅ (81% under limit)
```

**Başarısız ise**:
- 30 dakikaya çıkar (hala ~40K tokens)
- Query limit'leri 30/15'e düşür

---

## Alternatif: AgentTools Yerine Code Node

Eğer tüm bunlar yeterli olmazsa, **son çare**:

### Code Node ile Custom Query

**Yeni Node**: "Stage 2 Custom Queries" (AI Agent öncesi)

```javascript
// Loki API'den sadece top 50 log al
const response = await fetch(lokiUrl, {
  method: 'POST',
  body: JSON.stringify({
    query: `{namespace=~"..."} | json | limit 50`,
    start: start,
    end: end
  })
});

// Parse ve summarize et
const logs = response.data.result.flatMap(r => r.values).slice(0, 50);
const summary = {
  total_logs: logs.length,
  top_errors: logs.slice(0, 10),  // Sadece top 10
  // Full log data yerine summary gönder
};

return { json: { cascade_summary: summary } };
```

**Token Impact**: Full control, guaranteed <5K tokens

**Dezavantaj**: AI Agent tool'ları kullanamaz, hard-coded logic gerekir

---

## Özet

### Root Cause
- `| limit` çalışıyor AMA time range hala 1 saat
- 12 namespace × 1 hour × ERROR logs = 127K tokens
- serviceDependencies 13KB ekstra veri

### Çözüm (Priority Order)
1. 🔴 **Node 9 time range**: 1 saat → 15 dakika (75% token azalma)
2. 🟡 **serviceDependencies**: Full object → Top 5 only (3K token azalma)
3. 🟢 **AgentTools limit**: 100/50 → 50/25 (5K token azalma)

### Beklenen Sonuç
132K tokens → ~24.5K tokens (81% azalma) ✅

---

**Sonraki Adım**: Node 9'u değiştir, test et
