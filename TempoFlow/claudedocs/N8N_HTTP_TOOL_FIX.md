# n8n HTTP Tool Fallback Query Fix

**Problem**: Recent Errors HTTP tool'unda fallback query hatalı syntax kullanıyor

---

## 🔍 Sorun:

**n8n'deki HTTP Tool Query Parametresi**:
```javascript
{{ $json.searchParams?.customQuery || '{status=error && .deployment.environment="etiyamobile-production" }' }}
```

**Fallback Query** (ikinci kısım):
```traceql
{status=error && .deployment.environment="etiyamobile-production" }
```

### ❌ İki Hata:

1. **`status=error`** → Geçersiz! TraceQL'de `status` bir span attribute, `.code` gerekli
2. **`.deployment.environment`** → Geçersiz! Leading dot olmamalı, `resource.` prefix gerekli

---

## ✅ Düzeltme:

### n8n'de Recent Errors HTTP Tool'u Aç:

1. **TempoFlow workflow'unda** "Recent Errors" node'unu bul
2. **Query Parameters** bölümüne git
3. **`q` parametresini** bul (Tempo query parametresi)

### Eski Değer:
```javascript
{{ $json.searchParams?.customQuery || '{status=error && .deployment.environment="etiyamobile-production" }' }}
```

### Yeni Değer:
```javascript
{{ $json.searchParams?.customQuery || '{resource.deployment.environment=~"bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod" && status.code>=400}' }}
```

### Açıklama:

**Öncelik**: `$json.searchParams?.customQuery` varsa onu kullan (Node 1 veya Node 4'ten gelir)

**Fallback** (eğer customQuery yoksa):
```traceql
{resource.deployment.environment=~"bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod" && status.code>=400}
```

**Değişiklikler**:
- ✅ `status=error` → `status.code>=400`
- ✅ `.deployment.environment="..."` → `resource.deployment.environment=~"..."`
- ✅ Tek namespace → 12 namespace (regex pattern)

---

## 📝 Adım Adım n8n'de Düzeltme:

### 1. TempoFlow Workflow'unu Aç
- n8n UI'da TempoFlow workflow'unu aç

### 2. Recent Errors Node'unu Bul
- Genellikle **"Stage 1: Quick Health Check"** agent'ından önce
- Node ismi: "Recent Errors" veya "HTTP Request - Recent Errors"

### 3. Node'u Düzenle
- Node'a tıkla → **Edit** butonuna bas

### 4. Query Parameters Bölümüne Git
- **Parameters** → **Query Parameters** sekmesine git
- `q` parametresini bul

### 5. Değeri Değiştir
**Eski**:
```
{{ $json.searchParams?.customQuery || '{status=error && .deployment.environment="etiyamobile-production" }' }}
```

**Yeni**:
```
{{ $json.searchParams?.customQuery || '{resource.deployment.environment=~"bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod" && status.code>=400}' }}
```

### 6. Kaydet
- **Save** butonuna bas
- Workflow'u aktif et

---

## 🧪 Test:

### Manuel Trigger Testi:
1. TempoFlow'u manuel çalıştır
2. Recent Errors node output'unu kontrol et
3. **Beklenen**: Traces bulunmalı veya "No traces found"
4. **Hata almamalı**: "parse error at col 246" hatası gitmeli

### Fallback Testi:
1. Node 1'i devre dışı bırak (customQuery üretilmesin)
2. Manuel trigger çalıştır
3. Fallback query kullanılacak
4. **Beklenen**: 12 namespace'ten trace araması

---

## 📊 Diğer HTTP Tool Node'ları:

Aynı hata **başka HTTP tool node'larında da olabilir**. Kontrol edilmesi gerekenler:

### Stage 2'de Kullanılan Tool'lar:
- **Exception Spans**
- **High Latency**
- **Recent External Service Latency Errors**
- **Yesterday 3 Hours**
- **Last Week 3 Hours**

Bu tool'larda da fallback query varsa, aynı syntax düzeltmesi gerekli:
- `status=error` → `status.code>=400`
- `.deployment.environment` → `resource.deployment.environment`
- Tek namespace → Multi-namespace pattern

---

## ⚠️ Önemli Notlar:

1. **customQuery Öncelikli**: Normalde Node 1 veya Node 4 `customQuery` üretir, fallback kullanılmaz
2. **Fallback Sadece Hata Durumunda**: Eğer upstream node'lar çalışmazsa fallback devreye girer
3. **Production Safety**: Fallback'in de doğru olması gerekli, yoksa acil durumlarda hata alınır

---

## 🔍 Nereden Col 246 Geliyor?

**Query**:
```traceql
{ resource.deployment.environment=~"bstp-cms-global-production|..." && (service.name="APIGateway" || ...) && status=error }
                                                                                                                    ^
                                                                                                                 col 246
```

Tempo, sorguyu parse ederken:
1. `resource.deployment.environment=~"..."` → OK
2. `(service.name="..." || ...)` → OK
3. `status=error` → ❌ **HATA!** (col 246'da `error` kelimesini beklenmeyen identifier olarak görüyor)

**Çözüm**: `status.code>=400` kullan

---

**Son Güncelleme**: 2025-12-21
