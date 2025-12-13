# Seans Başlatma Protokolü - OKR_AI

**Amaç**: Her yeni seansta projeyi doğru şekilde yüklemek

## 🔴 ZORUNLU ADıMLAR (Her Seans)

### 1. Kritik Kuralları Yükle
```bash
# OKU: claudedocs/project-memory/CRITICAL_PROJECT_RULES.md
```

**Kontrol**:
- [ ] Flow yapısı DEĞİŞMEZ kuralı anlaşıldı
- [ ] Prompt detayları KORUNMALI kuralı anlaşıldı
- [ ] Yeni node için İZİN GEREKLİ kuralı anlaşıldı
- [ ] Bağlantılar DEĞİŞTİRİLEMEZ kuralı anlaşıldı

### 2. Proje Yapısını Yükle
```bash
# OKU: claudedocs/project-memory/PROJECT_STRUCTURE.md
```

**Kontrol**:
- [ ] Alert Listener flow amacı bilinir
- [ ] Prometheus flow amacı bilinir
- [ ] 6 Stage yapısı anlaşıldı
- [ ] Node organizasyonu bilinir
- [ ] Context object yapısı bilinir

### 3. Mevcut Durumu Kontrol Et
```bash
# Proje dosyalarını kontrol et
ls -la AlertListenerNodes/
ls -la PrometheusNodes/
```

**Kontrol**:
- [ ] AlertListenerNodes/ klasörü mevcut
- [ ] PrometheusNodes/ klasörü mevcut
- [ ] Flow JSON dosyaları mevcut
- [ ] Dokümantasyon güncel

### 4. Çalışma Moduna Geç

**Hazır Durumu**:
- ✅ Kritik kurallar hafızada
- ✅ Proje yapısı anlaşıldı
- ✅ Dosya yapısı bilinir
- ✅ Değişiklik protokolü hazır

## Hızlı Başvuru Komutları

### Proje Yapısını Görüntüle
```bash
tree -L 2 -I 'node_modules'
```

### Node Listesini Görüntüle
```bash
# Alert Listener nodes
ls -1 AlertListenerNodes/

# Prometheus nodes
ls -1 PrometheusNodes/
```

### Belirli Bir Node'u Oku
```bash
# Örnek: Stage 3 promptunu oku
cat PrometheusNodes/"Stage 3 Alert Intelligence.txt"
```

## Sık Kullanılan Referanslar

| Gereksinim | Dosya |
|-----------|-------|
| Kritik kurallar | `claudedocs/project-memory/CRITICAL_PROJECT_RULES.md` |
| Proje yapısı | `claudedocs/project-memory/PROJECT_STRUCTURE.md` |
| Mimari detaylar | `claudedocs/ARCHITECTURE.md` |
| Stage referansı | `claudedocs/STAGE_REFERENCE.md` |
| Genel bakış | `claudedocs/PROJECT_OVERVIEW.md` |

## Çalışma Modları

### Mod 1: Dokümantasyon Güncelleme
- ✅ Dokümantasyon dosyalarını değiştir
- ✅ Yeni açıklama ekle
- ❌ Flow veya node'lara dokunma

### Mod 2: Bug Fix
- ✅ İlgili node dosyasını oku
- ✅ Minimal değişiklik öner
- ⚠️ Değişiklik öncesi izin al
- ❌ Bağlantılara dokunma

### Mod 3: Yeni Özellik
- ✅ Gereksinimi anla
- ✅ Mevcut yapıyı koru
- ⚠️ Yeni node gerekirse izin al
- ❌ Mevcut yapıyı değiştirme

### Mod 4: Analiz/İnceleme
- ✅ Dosyaları oku
- ✅ Yapıyı analiz et
- ✅ Rapor/açıklama üret
- ❌ Hiçbir değişiklik yapma

## Güvenli Çalışma Kontrol Listesi

Her işlem öncesi:

- [ ] Bu işlem flow bağlantılarını etkiler mi?
  - **Evet** → İZİN AL
  - **Hayır** → Devam et

- [ ] Bu işlem node yapısını değiştirir mi?
  - **Evet** → İZİN AL
  - **Hayır** → Devam et

- [ ] Bu işlem prompt detaylarını değiştirir mi?
  - **Evet** → İZİN AL
  - **Hayır** → Devam et

- [ ] Bu işlem sadece dokümantasyon mu?
  - **Evet** → Devam et
  - **Hayır** → Dikkatli ol

## Hatırlatıcılar

### 🔴 ASLA UNUTMA
1. Mevcut yapı KUTSALDıR
2. Her değişiklik öncesi İZİN AL
3. Bağlantılara DOKUNMA
4. Promptları DEĞİŞTİRME

### ✅ HER ZAMAN YAP
1. Kuralları oku
2. Yapıyı anla
3. İzin iste
4. Dikkatli çalış

### ❌ ASLA YAPMA
1. İzinsiz değişiklik
2. Bağlantı modifikasyonu
3. Node silme/ekleme
4. Prompt değiştirme

## Seans Başlatma Onay

Seans başlatmadan önce kendinize sorun:

1. ✅ CRITICAL_PROJECT_RULES.md okundu mu?
2. ✅ PROJECT_STRUCTURE.md okundu mu?
3. ✅ Proje yapısı anlaşıldı mı?
4. ✅ Değişmez kurallar hafızada mı?
5. ✅ İzin protokolü hazır mı?

**Hepsi ✅ ise → BAŞLA**
**Herhangi biri ❌ ise → Önce oku, sonra başla**

---

**Dosya Durumu**: Kalıcı - Her seans başında kullan
**Son Güncelleme**: 2025-12-13
**Amaç**: Güvenli seans başlatma
