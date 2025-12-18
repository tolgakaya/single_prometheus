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

### Adım 1: Yeni Code Node Oluştur

1. **Stage 1 AI Agent** ile **5.5 Validate** arasına **yeni bir Code node** ekle
2. Node'a şu ismi ver: **"5.1 Set Stage 1 Result"**
3. Aşağıdaki kodu yapıştır:

```javascript
// Kod 5.1 Set Stage 1 Result.js dosyasından kopyala
// Veya GitHub'dan indir: LokiFlow/LokiNodes/5.1 Set Stage 1 Result.js
```

**Kod çok uzun, dosyadan kopyalayın**: [5.1 Set Stage 1 Result.js](../LokiNodes/5.1%20Set%20Stage%201%20Result.js)

**Önemli**: Kod, n8n'in doğru syntax'ını kullanır:
```javascript
const contextData = $('Service Dependency Loader').first().json;
```

### Adım 2: Bağlantıları Düzenle

**Eski Workflow** (YANLIŞ):
```
4. Service Dependency Loader
  ↓
5. Stage 1 AI Agent
  ↓
5.5 Validate ❌ (metadata/context kayboldu!)
```

**Yeni Workflow** (DOĞRU):
```
4. Service Dependency Loader
  ↓
5. Stage 1 AI Agent
  ↓
5.1 Set Stage 1 Result (Node 4'ten context alır, AI output ile birleştirir)
  ↓
5.5 Validate After Stage 1 ✅
```

**Adım Adım**:

1. **Stage 1 AI → Node 5.1** bağlantısı:
   - Stage 1 AI Agent çıktısını
   - "5.1 Set Stage 1 Result" girişine bağla

2. **Node 5.1 → Validation** bağlantısı:
   - "5.1 Set Stage 1 Result" çıktısını
   - "5.5 Validate After Stage 1" girişine bağla

**Not**: Merge node'a gerek yok! Node 5.1 otomatik olarak Node 4'ü `$('Service Dependency Loader').first().json` ile erişir.

### Adım 3: Test Et

1. Workflow'u test modunda çalıştır

2. **"5.1 Set Stage 1 Result"** console log'unu kontrol et:
   ```
   === SET STAGE 1 RESULT ===
   Stage 1 AI output exists? YES
   Context from Node 4 exists? YES
   ```

3. **"5.1 Set Stage 1 Result"** çıktısını kontrol et:
   ```json
   {
     "metadata": { ... },  ← Node 4'ten geldi ✅
     "context": { ... },   ← Node 4'ten geldi ✅
     "stageResults": {
       "stage1": {         ← Stage 1 AI'dan geldi ✅
         "stage": "health_snapshot",
         "status": "normal",
         "metrics": { ... }
       }
     }
   }
   ```

4. **"5.5 Validate After Stage 1"** console log'unu kontrol et:
   ```
   === VALIDATE AFTER STAGE 1 ===
   Stage 1 result exists: true ✅
   Validation Results:
   - Errors: 0 ✅
   - Warnings: 0 ✅
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
