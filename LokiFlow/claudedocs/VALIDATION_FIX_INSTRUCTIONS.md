# Validasyon Hatası Düzeltme Talimatları

## Hata

```
Problem in node 'Validate After Stage 1'
CRITICAL: Missing metadata section,
CRITICAL: Missing context section,
CRITICAL: Missing stageResults section [line 92]
```

## Sorunun Nedeni

**Stage 1 AI Agent** çıktısını `output` field'ına yazar, ama **`stageResults.stage1`** field'ı oluşturmaz.

**Validasyon node'u** `stageResults.stage1` field'ını arar → Bulamaz → HATA!

## Çözüm

Stage 1 AI Agent ile Validasyon node'u arasına **yeni bir node** eklemeli ki AI çıktısını `stageResults.stage1`'e yazsın.

---

## n8n'de Adım Adım Düzeltme

### Adım 1: Yeni Node Oluştur

1. n8n workflow editor'ü aç
2. "Stage 1 Quick Health Check" ile "Validate After Stage 1" arasına **yeni bir Code node** ekle
3. Node'a şu ismi ver: **"5.1 Set Stage 1 Result"**
4. Aşağıdaki kodu yapıştır:

```javascript
// Set Stage 1 Result - Write AI output to stageResults.stage1
const input = $input.first().json;

console.log("=== SET STAGE 1 RESULT ===");

// Stage 1 AI Agent returns output in 'output' field
const stage1Output = input.output || input;

console.log("Stage 1 output exists?", stage1Output.stage ? "YES" : "NO");
console.log("Stage 1 stage value:", stage1Output.stage);

// CRITICAL: Write Stage 1 result to standardized structure
return [{
  json: {
    // Preserve entire standardized structure from previous nodes
    ...input,

    // Write Stage 1 result to stageResults.stage1
    stageResults: {
      ...(input.stageResults || {}),
      stage1: {
        stage: stage1Output.stage || "health_snapshot",
        execution_time: stage1Output.execution_time || new Date().toISOString(),
        status: stage1Output.status || "unknown",
        metrics: stage1Output.metrics || {},
        critical_errors: stage1Output.critical_errors || [],
        affected_services: stage1Output.affected_services || [],
        tools_executed: stage1Output.tools_executed || [],
        quick_summary: stage1Output.quick_summary || "",
        proceed_to_anomaly: stage1Output.proceed_to_anomaly !== undefined ? stage1Output.proceed_to_anomaly : false
      }
    },

    // Legacy compatibility - keep output field
    output: stage1Output
  }
}];
```

### Adım 2: Bağlantıları Düzenle

**Eski Workflow**:
```
5. Stage 1 Quick Health Check
  ↓
5.5 Validate After Stage 1 ❌ (stage1 henüz yok)
```

**Yeni Workflow**:
```
5. Stage 1 Quick Health Check
  ↓
5.1 Set Stage 1 Result ✅ (yeni node)
  ↓
5.5 Validate After Stage 1 ✅ (artık stage1 var!)
```

**Adımlar**:
1. "5. Stage 1 Quick Health Check" → "5.5 Validate" bağlantısını **KES**
2. "5. Stage 1 Quick Health Check" → **"5.1 Set Stage 1 Result"** bağla
3. **"5.1 Set Stage 1 Result"** → "5.5 Validate After Stage 1" bağla

### Adım 3: Test Et

1. Workflow'u test modunda çalıştır
2. "5.1 Set Stage 1 Result" node'unun çıktısını kontrol et:
   ```json
   {
     "metadata": { ... },
     "context": { ... },
     "stageResults": {
       "stage1": {  ← Bu alan artık VAR!
         "stage": "health_snapshot",
         "status": "normal",
         "metrics": { ... }
       }
     }
   }
   ```
3. "5.5 Validate After Stage 1" console log'unu kontrol et:
   ```
   === VALIDATE AFTER STAGE 1 ===
   Stage 1 result exists: true ✅
   ✅ Stage 1 Validation PASSED
   ```

---

## Neden Bu Düzeltme Gerekli?

### AI Agent Node'ların Davranışı

n8n'de **AI Agent node'lar** çıktıyı şu formatta verir:

```json
{
  "output": {
    "stage": "health_snapshot",
    "status": "normal",
    "metrics": { ... }
  }
}
```

**Ama standardize edilmiş yapıda** Stage 1 sonucu şurada olmalı:

```json
{
  "stageResults": {
    "stage1": {
      "stage": "health_snapshot",
      "status": "normal",
      "metrics": { ... }
    }
  }
}
```

**Bu nedenle** AI Agent'ın `output` field'ını `stageResults.stage1`'e kopyalayan bir **transformation node** gerekiyor.

### Diğer Stage'ler İçin

Aynı düzeltme **tüm AI Agent node'lardan sonra** gerekli:

1. **Stage 1 sonrası**: ✅ "5.1 Set Stage 1 Result" (şimdi oluşturduk)
2. **Anomaly sonrası**: Node 8 (Merge Anomaly Results) zaten bunu yapıyor ✅
3. **Stage 2 sonrası**: Node 11 (Preserve Context After Stage 2) zaten bunu yapıyor ✅
4. **Stage 3 sonrası**: Node 15 (Combine All Stages) zaten bunu yapıyor ✅

**Sadece Stage 1 eksikti!** 🎯

---

## Alternatif Çözüm (Hızlı Ama Önerilmez)

Eğer yeni node eklemek istemezseniz, **Node 6 (Pass Context to Anomaly)** kodunu değiştirin ve **Stage 1'den HEMEN SONRA** çalıştırın:

**Ama bu önerilmez çünkü**:
- Node 6'nın asıl görevi anomaly stage'e veri geçirmek
- Stage 1 validation'ı anomaly'den ÖNCE yapılmalı
- Daha temiz çözüm: dedicated "Set Stage 1 Result" node'u

---

## Özet

**Problem**: Stage 1 AI Agent çıktısı `output` field'ında, ama validasyon `stageResults.stage1` arıyor

**Çözüm**: Yeni "5.1 Set Stage 1 Result" node'u ekle → `output` → `stageResults.stage1` dönüşümü yap

**Dosya**: [5.1 Set Stage 1 Result.js](../LokiNodes/5.1%20Set%20Stage%201%20Result.js)

---

**Son Güncelleme**: 2025-12-19
**Durum**: ✅ Çözüm hazır, n8n'de uygulanmalı
