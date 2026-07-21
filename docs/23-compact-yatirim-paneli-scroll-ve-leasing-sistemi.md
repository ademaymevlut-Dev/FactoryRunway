# 23 — Compact Yatırım Paneli, Scroll Düzeltmeleri ve Leasing Sistemi

## Amaç

Bu fazda üç konu birlikte tamamlanacaktır:

1. Yatırım paneli ve dock menü panellerindeki taşma/scroll hatalarının düzeltilmesi
2. Üretim hattı yatırım panelinin dinamik tab yapısıyla compact yeniden tasarlanması
3. 2, 3 ve 5 yıllık leasing seçeneklerinin gerçek sözleşme ve ödeme sistemiyle çalışması

---

# 1. Kesin Ürün Kararları

- Yatırım panelinde bütün template kartları aynı anda listelenmeyecek.
- İlgili departmanda veritabanında kaç aktif üretim hattı template’i varsa o kadar tab üretilecek.
- Tab sayısı hardcode edilmeyecek.
- Sewing için 4 aktif template varsa 4 tab:
  - WORKSHOP
  - INDUSTRIAL
  - PRECISION
  - SMART
- Printing için yalnızca SMART varsa tek tab olacak.
- Tab içinde mevcut W / I / P / S SVG logosu ve grade metni birlikte kullanılacak.
- Her tab yalnızca seçilen üretim hattının detayını gösterecek.
- Sol taraf panel genişliğinin yaklaşık %40’ı olacak ve büyük üretim hattı görseli gösterecek.
- Sağ taraf yaklaşık %60 olacak ve teknik bilgiler, yatırım etkisi, ödeme yöntemi ve CTA içerecek.
- Panel compact olacak.
- İçerik panel yüksekliğini aşarsa panelin kendi içinde scroll oluşacak.
- Arka sayfa panel açıkken scroll olmayacak.
- Dock menüden açılan sipariş listelerinde çok ürün varsa liste kendi içinde scroll olacak.
- Leasing vadeleri:
  - 2 yıl
  - 3 yıl
  - 5 yıl
- Leasing vadeleri radio/segmented option gibi seçilecek.
- Oyuncuya faiz oranı gösterilmeyecek.
- Oyuncuya gösterilecek finans bilgileri:
  - Peşin satın alma fiyatı
  - Leasing için bugün ödenecek tutar varsa bu tutar
  - Her 22 oyun gününde ödenecek taksit
  - Taksit sayısı
  - Leasing sonunda toplam maliyet
- Leasing teklifleri client içinde uydurulmayacak.
- Teklifler admin/master data üzerinden gelecek.
- Bir finans ayı oyunda 22 oyun günüdür.

---

# 2. Zorunlu Başlangıç İncelemesi

Kod yazmadan önce oku:

```text
docs/00-Development_Rules.md
docs/06-Factory_and_FactoryProductionLine.md
docs/13-Staff_and_Organization.md
docs/14-ProductionLine_Cost_Config.md
docs/15-Factory_Operating_Stage_and_Shared_Cost.md
docs/20-vardiya-simulasyonu-gunluk-olay-paneli-ve-tetikleyici-sistemi.md
docs/21-faz-2-departman-sonuclari-ve-vardiya-playback-ui.md
docs/22-siparis-oncelik-ve-otomatik-allocation-duzeltmesi.md
```

Gerçek dosya yollarını bularak incele:

```text
production-line-investment-panel.tsx
production-line-template-purchase-card.tsx
purchase-production-line-action.ts
purchase-production-line.ts
production-line-investment.ts
panel-registry.tsx
ortak panel/dialog/sheet shell
dock menu panel bileşenleri
sipariş listesi paneli
sortable / draggable sipariş listesi
Game UI store
FactoryLeasingContract modeli
FinanceDue modeli
FactoryFinanceTransaction modeli
ProductionLineTemplate modeli
ProductionLineLeasingOffer veya eşdeğer mevcut model
W / I / P / S SVG logo dosyaları
vardiya/gün finans tetikleyici servisleri
```

Neon üzerinde yalnızca read-only sorgularla incele:

- Departmanlara göre aktif template sayıları
- Template fiyatları
- Mevcut leasing contract kayıtları
- FinanceDue ve leasing category alanları
- Mevcut leasing offer/master data bulunup bulunmadığı

Kodlamadan önce kısa analiz ver:

```text
1. Mevcut panel shell ve overflow sorununun nedeni
2. Sipariş paneli overflow sorununun nedeni
3. Mevcut yatırım paneli bileşen yapısı
4. W/I/P/S SVG dosyalarının konumu
5. Mevcut leasing modelleri
6. Eksik master data/model alanları
7. Uygulama dosya planı
```

Sonra kodlamaya geç.

---

# 3. Kesin Veritabanı Kuralı

Migration kullanılmayacaktır.

Yasak:

```bash
npx prisma migrate dev
npx prisma migrate deploy
npx prisma migrate reset
```

Schema değişikliği gerekirse:

```bash
npx prisma db push
```

kullan.

`db push` öncesinde bütün `schema.prisma` farklarını raporla.

Gerekli değilse schema değiştirme ve `db push` çalıştırma.

`--accept-data-loss` otomatik kullanma. Prisma bunu isterse önce nedenini ve etkilenecek index/kolonları raporla.

---

# 4. Ortak Panel Scroll Düzeltmesi

Mevcut yatırım paneli viewport dışına taşıyor ve scroll üretmiyor.

Bu sorun yalnızca yatırım panelinde lokal bir CSS yamasıyla çözülmemeli. Mevcut panel shell uygun ise ortak yapıda düzeltilmelidir.

Önerilen panel shell:

```text
Panel root
├── Header              flex-none
├── Optional tab strip  flex-none
├── Scroll body         flex-1 min-h-0 overflow-y-auto
└── Optional footer     flex-none veya sticky bottom
```

Masaüstü sınırları:

```css
width: min(980px, calc(100vw - 32px));
max-height: calc(100dvh - 32px);
display: flex;
flex-direction: column;
overflow: hidden;
```

Scroll alanı:

```css
flex: 1 1 auto;
min-height: 0;
overflow-y: auto;
overscroll-behavior: contain;
```

Kurallar:

- `min-h-0` zinciri eksiksiz olmalı.
- İçerik uzadığında panel body scroll etmeli.
- Header ve close button görünür kalmalı.
- CTA panel içinde erişilebilir kalmalı.
- Arka sayfa scroll olmamalı.
- Mevcut body-scroll-lock davranışını kullan.
- Yeni modal kütüphanesi ekleme.
- Uygun yerde `100dvh` kullan.
- Safari viewport davranışını kontrol et.

---

# 5. Dock Menü ve Sipariş Listesi Scroll Düzeltmesi

Dock menüden açılan sipariş panelinde sipariş sayısı arttığında liste dışarı taşıyor.

Uygulanacak yapı:

```text
Dock panel
├── Panel header
├── Filters / summary
└── Order list
    └── flex-1 min-h-0 overflow-y-auto
```

Kurallar:

- 5 siparişte gereksiz scroll üretme.
- 20+ siparişte panel içinde scroll et.
- En alttaki siparişlere erişilebilsin.
- Drag-and-drop scroll içinde çalışmaya devam etsin.
- Sürükleme sırasında auto-scroll desteği korunmalı.
- Panel dışına taşma olmasın.
- Arka sayfa scroll olmasın.
- Ortak shell hatasıysa ortak çözüm uygula.

---

# 6. Tekrarlanan Header Bilgilerini Kaldır

Mevcut panelde yatırım başlığı ve açıklaması tekrar ediyor.

Tek başlık bırak:

```text
Dikim Hattı Yatırımı
```

Altına tek kısa açıklama:

```text
Üretim hattı türünü ve ödeme yöntemini seçin.
```

Kaldır:

- İkinci kez yazılan “ÜRETİM HATTI YATIRIMI”
- Aynı anlamdaki tekrar açıklamalar
- Karar için değer taşımayan gereksiz badge’ler

---

# 7. Dinamik Grade Tab Sistemi

Tablar ilgili departmanın aktif template kayıtlarından dinamik oluşturulacak.

Kaynak:

```text
ProductionLineTemplate
```

Filtre:

```text
template.sectorId === factory.sectorId
template.departmentId === selectedDepartmentId
template.status === ACTIVE
department.kind === PRODUCTION
```

Sıralama:

```text
sortOrder
→ grade order
→ key
```

Fallback grade sırası:

```text
WORKSHOP
INDUSTRIAL
PRECISION
SMART
```

Tab örneği:

```text
[ W  WORKSHOP ] [ I  INDUSTRIAL ] [ P  PRECISION ] [ S  SMART ]
```

Kurallar:

- Mevcut W/I/P/S SVG logolarını kullan.
- Yeni harf badge’i çizme.
- SVG ve grade text birlikte göster.
- Tek template varsa tek tab göster.
- Seçili tab mevcut tema border/accent ile belirgin olsun.
- Ağır gradient ve büyük glow kullanma.
- Accessible Tabs yapısı kullan.
- Tab state route’a taşınmasın.

---

# 8. Tab İçeriği Yerleşimi

Masaüstü:

```text
┌──────────────────────────────────────────────────────────────┐
│ Sol %40                         Sağ %60                      │
│                                                              │
│ Büyük hat görseli               Grade / Hat adı              │
│                                 Teknik özellikler             │
│                                 Personel ve gider etkisi      │
│                                 Ödeme yöntemi                 │
│                                 Fiyat / taksit / toplam       │
│                                 CTA                           │
└──────────────────────────────────────────────────────────────┘
```

Önerilen grid:

```css
grid-template-columns: minmax(260px, 40%) minmax(0, 1fr);
gap: 20px;
```

## Sol alan

- Template CARD görselini kullan.
- Görsel büyük olmalı.
- Sol alana dayalı olmalı.
- `object-contain` kullan.
- Gereksiz büyük padding bırakma.

## Sağ alan

Compact sıra:

```text
1. Template/grade başlığı
2. Teknik özellikler
3. Personel ve dönemsel gider etkisi
4. Ödeme yöntemi
5. Finans özeti
6. CTA
```

Teknik bilgiler compact 2 sütunlu grid:

```text
Günlük kapasite
İdeal personel
Makine
Alan
Baz elektrik
Diğer sürekli gider
```

Nested büyük kartlarla ekranı doldurma.

---

# 9. Template Adı

Template translation modeli varsa kullan.

Yoksa teknik key’i ana başlık olarak gösterme:

```text
sewing_workshop
```

yerine:

```text
Dikim · Workshop
```

fallback üret.

Department translation + grade label kullan.

---

# 10. Ödeme Yöntemi UI

Tab içinde segmented/radio yapı:

```text
[ Peşin Satın Al ] [ Leasing ]
```

Peşin ve leasing için ayrı büyük üst kartlar kullanma.

## Peşin

Göster:

```text
Peşin fiyat
Bugün ödenecek
Satın alma sonrası nakit
```

CTA:

```text
Peşin Satın Al
```

## Leasing

Göster:

```text
Vade seçimi
Bugün ödenecek tutar
Her 22 günde taksit
Taksit sayısı
Toplam leasing maliyeti
```

CTA:

```text
Leasing ile Kur
```

Faiz oranı gösterme.

---

# 11. Leasing Offer Master Data

Mevcut uygun model varsa genişlet.

Yoksa önerilen model:

```prisma
model ProductionLineLeasingOffer {
  id                       String   @id @default(cuid())
  productionLineTemplateId String   @map("production_line_template_id")

  termYears                Int      @map("term_years")
  installmentCount         Int      @map("installment_count")

  downPaymentCents         Int      @default(0) @map("down_payment_cents")
  installmentAmountCents   Int      @map("installment_amount_cents")
  totalCostCents           Int      @map("total_cost_cents")

  sortOrder                Int      @default(0) @map("sort_order")
  status                   MasterDataStatus @default(ACTIVE)

  metadata                 Json?

  createdAt                DateTime @default(now()) @map("created_at")
  updatedAt                DateTime @updatedAt @map("updated_at")

  productionLineTemplate   ProductionLineTemplate
    @relation(fields: [productionLineTemplateId], references: [id], onDelete: Cascade)

  @@unique([productionLineTemplateId, termYears])
  @@index([productionLineTemplateId, status, sortOrder])
  @@map("production_line_leasing_offers")
}
```

Gerçek proje standartlarına uy.

Kesin seçenekler:

```text
2 yıl → 24 taksit
3 yıl → 36 taksit
5 yıl → 60 taksit
```

Client hesap yapmayacak.

UI server DTO’dan şunları kullanacak:

```text
downPaymentCents
installmentAmountCents
installmentCount
totalCostCents
```

Offer yoksa Leasing disabled olacak.

---

# 12. Leasing Radio Seçenekleri

Compact seçenekler:

```text
2 Yıl
24 taksit

3 Yıl
36 taksit

5 Yıl
60 taksit
```

Seçenek üzerinde:

```text
2 Yıl
€2.480 / dönem
```

gibi kısa bilgi olabilir.

Seçim sonrası özet:

```text
Bugün: €5.000
Her 22 günde: €2.480
Taksit: 24
Toplam maliyet: €64.520
```

---

# 13. Leasing Contract

Mevcut `FactoryLeasingContract` modelini kullan.

Seçilen offer şartlarını contract üzerine snapshot olarak kaydet.

En az:

```text
factoryId
productionLineId
offerId
principal / financed amount
downPayment
installment amount
installment count
remaining installments
total contract cost
startedDay
nextDueDay
term years
ownership transfer
status
```

Master offer değişse bile mevcut contract değişmemeli.

`FactoryProductionLine.acquisitionType = LEASED`.

---

# 14. Leasing ile Hat Kurma Transaction

Typed Server Action kullan.

Input:

```ts
type LeaseProductionLineInput = {
  factoryId: string
  productionLineTemplateId: string
  leasingOfferId: string
  requestId: string
}
```

Client’tan fiyat, taksit, toplam, vade veya department alma.

Transaction:

```text
1. Factory sahipliği ve aktiflik
2. Aktif vardiya/playback guard
3. Template aktiflik ve sector kontrolü
4. Department PRODUCTION kontrolü
5. Offer aktif mi ve template’e bağlı mı
6. Down payment için nakit kontrolü
7. lineNumber hesaplama
8. sortOrder hesaplama
9. FactoryProductionLine oluşturma
10. Direkt personel oluşturma
11. Stage farkı support personelini oluşturma
12. Down payment nakit düşümü
13. Down payment finance transaction
14. FactoryLeasingContract oluşturma
15. İlk FinanceDue / takvim kaydı
16. Operating stage/history güncelleme
17. Typed sonuç
```

Bütün işlem atomik olmalı.

---

# 15. Leasing Idempotency

Reference key örnekleri:

```text
LINE_LEASING_CREATE:{factoryId}:{requestId}
LEASING_DOWN_PAYMENT:{contractId}
LEASING_PAYMENT:{contractId}:{periodIndex}
```

Aynı request ikinci:

- hat,
- contract,
- personel,
- down payment,
- finance due

oluşturmamalı.

---

# 16. Leasing Ödeme Takvimi

Bir leasing dönemi:

```text
22 oyun günü
```

İlk taksit:

```text
nextDueDay = startedDay + 22
```

Sonraki taksitler:

```text
+22 oyun günü
```

Mevcut finance due sistemini kullan.

Aynı due iki kez ödenmemeli.

---

# 17. Yetersiz Nakit

Taksit gününde nakit yetmiyorsa:

- Nakit negatif yapılmayacak.
- `PARTIAL` veya `OVERDUE` kullanılacak.
- Ödenen tutar varsa kaydedilecek.
- Kalan borç due üzerinde korunacak.
- Aynı period için duplicate due olmayacak.
- Hat bu fazda otomatik kapatılmayacak veya satılmayacak.

---

# 18. Contract Tamamlanması

Son taksit ödendiğinde:

```text
remainingInstallments = 0
status = COMPLETED
endedDay = currentDay
```

`acquisitionType = LEASED` geçmiş bilgisi olarak kalabilir.

Mülkiyet contract status üzerinden okunabilir.

---

# 19. Yatırım Önizlemesi

Mevcut server-computed yatırım önizlemesini koru:

```text
Direkt personel
Support personel farkı
Maaş artışı
Elektrik artışı
Diğer sürekli giderler
Resulting stage
Toplam dönemsel gider artışı
```

Peşin veya leasing yalnızca yatırım finansmanını değiştirir.

Personel ve işletme giderleri iki yöntemde de aynıdır.

UI’da ayır:

```text
Yatırım Finansmanı
İşletme Gideri Etkisi
```

---

# 20. CTA

CTA panel içinde kaybolmamalı.

Tercih:

- Sağ kolon sonunda
- veya panel içi sticky footer

CTA:

- pending sırasında disabled
- çift tıklamaya karşı güvenli
- başarı sonrası tek refresh
- başarısızlıkta panel kapanmamalı
- hata mevcut translation sistemiyle gösterilmeli

---

# 21. Responsive

Masaüstü:

```text
Sol %40
Sağ %60
```

Dar ekran:

```text
Tablar yatay scroll olabilir
Görsel üstte
Detaylar altta
Panel body kendi içinde scroll
CTA görünür
```

Test:

```text
1280×720
1440×900
Safari
```

---

# 22. Bu Fazda Yapılmayacaklar

```text
Hat upgrade
Hat satışı
Leasing hattını geri alma
Otomatik hat kapatma
Faiz oranını oyuncuya gösterme
Kredi puanı
Banka seçimi
Günlük olay paneli
Maaş tetikleyicisi değişikliği
10+22 genel gider tetikleyicisi değişikliği
Personel devamsızlığı
Makine arızası
Yeni modal/route sistemi
Global UI theme yeniden tasarımı
```

Leasing taksitlerinin finance due/transaction olarak çalışması bu fazın içindedir.

---

# 23. Test Gereksinimleri

## Panel ve scroll

1. Yatırım paneli viewport dışına taşmıyor.
2. İçerik uzadığında panel body scroll ediyor.
3. Header ve close button görünür kalıyor.
4. CTA erişilebilir kalıyor.
5. Arka sayfa scroll olmuyor.
6. Dock sipariş panelinde 20+ kayıt scroll ile erişilebilir.
7. Drag-and-drop scroll içinde çalışıyor.
8. Safari viewport testinde taşma yok.

## Dinamik tablar

9. Sewing 4 aktif template → 4 tab.
10. Printing 1 aktif template → 1 tab.
11. Pasif template tab oluşturmuyor.
12. Başka departman template’i görünmüyor.
13. W/I/P/S SVG ve text doğru eşleşiyor.
14. Tab değişince doğru detay geliyor.
15. Teknik key ana isim olarak görünmüyor.

## Peşin

16. Peşin satın alma regresyon testleri geçiyor.
17. Doğru fiyat gösteriliyor.
18. Yetersiz nakit doğru işleniyor.
19. Yatırım/personel/stage transaction atomik kalıyor.

## Leasing

20. Yalnızca aktif offer’lar görünüyor.
21. 2/3/5 yıl doğru taksit adetleriyle geliyor.
22. Client fiyat hesaplamıyor.
23. Down payment, taksit ve toplam doğru gösteriliyor.
24. Offer olmayan template’te leasing disabled.
25. Leasing ile tek line oluşturuluyor.
26. acquisitionType = LEASED.
27. Direkt ve support personel doğru oluşturuluyor.
28. Down payment bir kez düşülüyor.
29. Contract şartları snapshot tutuluyor.
30. İlk due day = startedDay + 22.
31. Aynı request duplicate oluşturmuyor.
32. Rollback durumunda yan etki kalmıyor.
33. Due day’de doğru taksit ödeniyor.
34. Finance transaction bir kez oluşuyor.
35. Yetersiz nakitte negatif bakiye oluşmuyor.
36. PARTIAL/OVERDUE doğru güncelleniyor.
37. Aynı period ikinci kez ödenmiyor.
38. Son ödeme contract’ı COMPLETED yapıyor.

## Regresyon

39. Faz 1 vardiya idempotency testleri geçiyor.
40. Faz 2 playback testleri geçiyor.
41. Faz 3A yatırım/personel testleri geçiyor.
42. Sipariş priority ve otomatik allocation testleri geçiyor.

---

# 23.1 Dock Üretim Kuyruğundan Yatırım

Üretim hattı yatırımı yalnızca fabrika haritasındaki yatırım kartından açılmaz.
Oyuncunun sıralı üretim planlama akışını bozmamak için seçili Dock departmanının
üretim kuyruğu panelinde de `Yatırım Yap` aksiyonu bulunur.

Bu aksiyon:

```text
Dock departmanı seçilir
↓
Üretim kuyruğu paneli açılır
↓
Yatırım Yap
↓
Mevcut investment paneli departmentId bağlamıyla açılır
```

Yeni bir route, ikinci yatırım motoru veya farklı satın alma/leasing işlemi
oluşturulmaz. Aynı dinamik template, peşin satın alma, leasing, personel, finans,
operating stage ve idempotency servisleri kullanılır.

Baskı, Nakış, Boyama ve Yıkama için hat kurulduktan sonra oyuncu fason
seçeneğini kaybetmez. Üretim kuyruğu satırından miktar seçerek aynı işin bir
bölümünü fasona ayırabilir; kalan miktar iç hat allocation kuyruğunda kalır.

---

# 24. Doğrulama

Çalıştır:

```text
İlgili feature/unit/integration testleri
Hedefli ESLint
tsc --noEmit
Production build
git diff --check
```

Yeni hata ekleme.

---

# 25. Beklenen Son Rapor

```text
1. Okunan Dosyalar
2. Panel Overflow Kök Nedeni
3. Ortak Scroll Düzeltmesi
4. Dock Sipariş Listesi Scroll Düzeltmesi
5. Kaldırılan Tekrarlanan Header
6. Dinamik Grade Tab Sistemi
7. Kullanılan W/I/P/S SVG Dosyaları
8. Compact Tab İçeriği
9. Peşin Ödeme UI
10. Leasing Offer Master Yapısı
11. Leasing Radio Seçenekleri
12. Leasing Contract Oluşturma
13. Finance Due ve 22 Günlük Ödeme
14. Yetersiz Nakit Davranışı
15. Contract Tamamlanması
16. Değiştirilen Dosyalar
17. Prisma ve db push Durumu
18. Test, ESLint, TypeScript ve Build Sonuçları
19. Tarayıcı Görsel Kontrol Sonuçları
20. Açık Riskler
```

Önce kısa analiz ve dosya planı ver.

Sonra kodlamayı tamamla.

Ana UI kararı:

```text
Template sayısı kadar dinamik tab.
Bir tab içinde tek hattın bütün detayları.
Sol %40 büyük görsel.
Sağ %60 compact teknik ve finans bilgisi.
Panel dışına taşma yok.
```
