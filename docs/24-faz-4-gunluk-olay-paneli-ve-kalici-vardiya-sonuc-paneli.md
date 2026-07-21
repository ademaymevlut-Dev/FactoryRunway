# 24 — Faz 4: Günlük Olay Paneli ve Kalıcı Vardiya Sonuç Paneli

## Amaç

Bu fazda iki ana sistem tamamlanacaktır:

1. Vardiya progress paneli simülasyon bittikten sonra otomatik kapanmayacak.
2. Sağdan açılan premium günlük olay paneli ve finansal tetikleyiciler eklenecek.

Ana ürün kararı:

```text
Vardiya playback tamamlanınca sonuç paneli açık kalır.
Oyuncu kapatma butonuna basmadan kaybolmaz.
```

Oyuncu vardiya sonunda:

- hangi departmanın ne kadar ürettiğini,
- hangi ürünlere işlem uygulandığını,
- ürün adı, küçük görsel ve işlenen adedi,
- gün içinde oluşan finans, üretim ve sevkiyat olaylarını

inceleyebilmelidir.

---

# 1. Zorunlu Başlangıç İncelemesi

Kod yazmadan önce oku:

```text
docs/00-Development_Rules.md
docs/10-ShiftSimulation_and_ShiftLineResult.md
docs/13-Staff_and_Organization.md
docs/20-vardiya-simulasyonu-gunluk-olay-paneli-ve-tetikleyici-sistemi.md
docs/21-faz-2-departman-sonuclari-ve-vardiya-playback-ui.md
docs/22-siparis-oncelik-ve-otomatik-allocation-duzeltmesi.md
docs/23-compact-yatirim-paneli-scroll-ve-leasing-sistemi.md
```

Ayrıca gerçek dosya yollarını bularak incele:

```text
shift-playback-hud.tsx
shift-playback.ts
shift-playback-view.ts
game-snapshot.ts
day-simulation.ts
ShiftSimulation
ShiftLineResult
ShiftDepartmentResult
ProductionAllocation
ProductionOrder
Product
Product image / CARD image ilişkileri
Game UI store
OverlayLayerManager
panel-registry.tsx
FinanceDue
FactoryFinanceTransaction
FactoryLeasingContract
sevkiyat servisleri
müşteri tahsilat servisleri
fason servisleri
```

Kodlamadan önce kısa analiz ver:

```text
1. Playback panelinin neden otomatik kapandığı
2. Sonuç verisinin şu anda nerede tutulduğu
3. Ürün bazlı vardiya sonuçlarının hangi tablolardan üretilebileceği
4. Günlük event altyapısının mevcut durumu
5. Finansal tetikleyicilerin mevcut servisleri
6. Kullanılacak panel ve animation altyapısı
7. Uygulama dosya planı
```

---

# 2. Kesin Veritabanı Kuralı

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

Gerekli değilse schema değiştirme.

`--accept-data-loss` otomatik kullanma.

---

# 3. Vardiya Playback Paneli Yeni Yaşam Döngüsü

Mevcut panel 25 saniye sonunda kapanmaktadır. Bu davranış değiştirilecektir.

Yeni state akışı:

```text
PLAYING
→ COMPLETED_WAITING_FOR_USER
→ CLOSED_BY_USER
```

## PLAYING

- Progress bar ilerler.
- Oyun saati 08:00 → 17:00 akar.
- Departman sayaçları animasyonla ilerler.
- Yönetim aksiyonları kilitlidir.

## COMPLETED_WAITING_FOR_USER

- Progress %100 olur.
- Saat 17:00 olur.
- Bütün sayaçlar final değerde kalır.
- Ürün bazlı sonuç listesi görünür.
- Panel açık kalır.
- Oyuncu sonucu inceleyebilir.
- Panel otomatik kapanmaz.

## CLOSED_BY_USER

- Oyuncu kapatma butonuna basar.
- Panel kapanır.
- Yeni gün snapshotı görünür.
- Yönetim aksiyonları tekrar açılır.

---

# 4. Otomatik Kapanma ve Refresh Düzeltmesi

25 saniye sonunda paneli kapatan veya sonucu görünmez yapan mevcut:

```text
router.refresh()
state reset
overlay close
```

davranışını incele.

Yeni kural:

- 25 saniye sonunda yalnızca playback state `COMPLETED` olur.
- Final değerler ekranda kalır.
- Otomatik panel close yapılmaz.
- Otomatik yeni gün UI geçişi yapılmaz.
- Yeni gün snapshotı tercihen kullanıcı kapattıktan sonra yüklenir.
- Kullanıcı close butonuna bastığında tek `router.refresh()` çalışır.
- Aynı sonuç paneli ikinci kez açılmaz.

---

# 5. Kapatma Butonu

Vardiya sonuç panelinde sağ üstte görünür bir close button bulunmalıdır.

Kurallar:

- Playback devam ederken buton görünür ancak disabled.
- Playback tamamlanınca aktif.
- Tooltip: `Kapat`.
- Keyboard erişilebilir.
- Escape yalnızca playback tamamlandıktan sonra kapatabilir.
- Kapatma sonrası yalnızca tek state reset/refresh çalışır.

---

# 6. Vardiya Sonuç Paneli İçeriği

Panel şunları içermelidir:

```text
1. Gün ve vardiya başlığı
2. Global progress bar
3. 08:00 / güncel saat / 17:00
4. Departman sonuç kartları
5. Ürün bazlı işlem sonuçları
6. Kapatma butonu
```

Mevcut departman değerleri korunur:

```text
Bugün Gelen
Bugün Tamamlanan
Vardiya Başı
Kalan
```

Playback tamamlanınca kartlar final değerlerle ekranda kalır.

---

# 7. Ürün Bazlı Vardiya Sonuçları

Departman kartlarının altında o gün gerçekten işlem gören ürünler gösterilecektir.

Her ürün satırı:

```text
Küçük ürün görseli
Ürün adı
Sipariş kodu
İşlem gören departman veya departman breakdown
İşlenen adet
```

Tercih edilen görünüm:

```text
[ürün görseli] Manama T-Shirt
Sipariş: ORD-1042

Kesim: 600
Dikim: 520
Ütü & Paket: 480

Toplam işlenen: 1.600
```

Aynı ürün birden fazla departmanda işlem gördüyse departman bazlı breakdown göster.

Yeni ve ağır rapor tablosu oluşturma.

---

# 8. Ürün Sonuç Verisinin Kaynağı

Client tahmin yapmayacaktır.

Kaynaklar:

```text
ShiftLineResult
ProductionAllocation
ProductionOrder
Product
Product CARD image
Department
```

Örnek DTO:

```ts
type ShiftProductResult = {
  productId: string
  productName: string
  productImageUrl: string | null
  orderId: string | null
  orderCode: string | null
  totalProcessedQuantity: number
  departments: Array<{
    departmentId: string
    departmentName: string
    processedQuantity: number
  }>
}
```

Kurallar:

- Aynı product + order kayıtları aggregate edilmeli.
- Adetler gerçek `ShiftLineResult` üzerinden gelmeli.
- Client toplam hesaplamamalı.
- Product görselinde mevcut CARD image ilişkisi kullanılmalı.
- Görsel yoksa mevcut fallback kullanılmalı.
- Teknik key ana ürün adı olarak gösterilmemeli.

---

# 9. Ürün Sonuç Listesi UI

Liste compact olmalıdır.

```text
Thumbnail: 48–56 px
Ürün adı
Sipariş kodu
Departman breakdown
Toplam işlenen adet
```

Kurallar:

- Büyük kartlar kullanma.
- 10+ ürün varsa panel içinde scroll devam etmeli.
- Thumbnail `object-contain`.
- Satırlar arasında hafif separator.
- Sayılar sağa hizalanabilir.
- Ürün listesi playback tamamlanınca 100–160 ms stagger ile görünebilir.
- Final sayılar kesin olmalı.

---

# 10. Vardiya Sonuç Paneli Animasyonları

Premium fakat ağır olmayan animasyon kullan.

## Giriş

```text
opacity: 0 → 1
translateY: -10px → 0
scale: 0.985 → 1
duration: 320–420ms
ease: cubic-bezier(0.22, 1, 0.36, 1)
```

## Playback tamamlanması

17:00 olduğunda:

- Progress bar hafif bir tamamlanma ışığı verir.
- Başlık `Vardiya Tamamlandı` durumuna dönüşür.
- Close button aktifleşir.
- Ürün sonuçları 100–160 ms stagger ile görünür.

Confetti, büyük bounce veya ağır glow kullanma.

## Kapanış

```text
opacity: 1 → 0
translateY: 0 → -8px
scale: 1 → 0.99
duration: 220–280ms
```

Animasyon tamamlanmadan component unmount etme.

Mevcut GSAP / Framer Motion / CSS animation altyapısından projede kullanılanı tercih et.

Yeni animation kütüphanesi ekleme.

`prefers-reduced-motion` desteği zorunlu.

---

# 11. Sağ Günlük Olay Paneli

Sağdan açılan dikey panel tam ekran olmayacaktır.

Masaüstü ölçü:

```text
width: 380–420 px
max-width: calc(100vw - 24px)
height: min(760px, calc(100dvh - 48px))
right: 16–24 px
top: 24 px
bottom: 24 px
```

Fabrika haritası arka planda görünmeye devam eder.

Tam ekran karartma kullanma.

---

# 12. Günlük Olay Paneli Yaşam Döngüsü

Vardiya başlatıldığında:

- Panel sağdan premium animasyonla açılır.
- Günün olayları kronolojik olarak eklenir.
- Panel açık kalır.
- Oyuncu kapatabilir.
- Oyuncu aynı gün kapattıktan sonra panel otomatik tekrar açılmaz.
- Yeni event varsa unread badge gösterilebilir.

Yeni oyun gününde:

- Yeni boş panel state’i başlar.
- Önceki gün olayları panelde taşınmaz.
- Geçmiş olaylar ileride raporlardan okunabilir.

---

# 13. Sağ Panel Giriş ve Kapanış Animasyonu

## Giriş

```text
opacity: 0 → 1
translateX: 48px → 0
scale: 0.985 → 1
duration: 380–480ms
ease: cubic-bezier(0.22, 1, 0.36, 1)
```

- Hafif backdrop blur olabilir.
- Sürekli glow kullanma.
- Panel açıldığında bir kez hafif border pulse olabilir.

## Kapanış

```text
opacity: 1 → 0
translateX: 0 → 40px
scale: 1 → 0.99
duration: 240–320ms
ease: ease-in
```

Animasyon bitmeden unmount etme.

Escape ile kapanabilir.

---

# 14. Event Mesajı Animasyonları

Her yeni event satırı:

```text
opacity: 0 → 1
translateX: 16px → 0
translateY: 4px → 0
duration: 240–320ms
```

Birden çok olay gelirse:

```text
stagger: 60–90ms
```

Kurallar:

- Kronolojik sıra korunmalı.
- Panel en alttaysa smart auto-scroll.
- Kullanıcı yukarı scroll etmişse zorla aşağı atlama.
- Yeni event indicator göster.
- Event satırları otomatik silinmez.
- Panel kapanırken reverse stagger/fade kullanılabilir.
- `prefers-reduced-motion` desteklenmeli.

---

# 15. Günlük Olay Paneli İçeriği

Header:

```text
Günlük Olaylar
22. Gün
Event sayısı
Close button
```

Body:

- Kronolojik event listesi
- Kendi içinde vertical scroll
- `min-h-0 overflow-y-auto`
- Oyun saati + kategori + mesaj
- Severity icon/border

Footer zorunlu değildir.

---

# 16. Event Kategorileri ve Severity

Kategoriler:

```text
PRODUCTION
FINANCE
SHIPPING
PAYMENT
OUTSOURCING
SYSTEM
```

Geleceğe hazır:

```text
STAFF
MACHINE
```

Severity:

```text
INFO
SUCCESS
WARNING
CRITICAL
```

Mevcut theme token’larını kullan.

Bağımsız hardcoded renk sistemi kurma.

---

# 17. Event Veri Yapısı

Domain event ile UI event’i ayır.

Tercih edilen akış:

```text
Domain/finance/production sonucu
→ ShiftTimelineEvent veya DailyEvent projection
→ Sağ panel UI
```

Örnek:

```ts
type DailyEventItem = {
  id: string
  gameDay: number
  minute: number
  sequence: number
  category: string
  severity: string
  eventKey: string
  payload: Record<string, unknown>
  sourceType?: string
  sourceId?: string
}
```

Kurallar:

- Aynı dakika olayları `sequence` ile sıralanmalı.
- Görünür metin DB’ye Türkçe kaydedilmemeli.
- `eventKey + payload` üzerinden translation yapılmalı.
- Event idempotent olmalı.
- Refresh sonrası duplicate event oluşmamalı.

---

# 18. İlk Fazda Üretilecek Olaylar

## Üretim

```text
Vardiya başladı
Departman üretimi tamamladı
Departmanda işlenecek WIP bulunamadı
Departman kapasitesi tamamen kullanıldı
Departman erken tamamlandı
Vardiya tamamlandı
```

## Sevkiyat

```text
Sipariş sevk edildi
```

## Müşteri tahsilatı

```text
Müşteri ödemesi alındı
```

## Leasing

```text
Leasing peşinatı ödendi
Leasing taksiti ödendi
Leasing taksiti kısmi ödendi
Leasing taksiti gecikti
Leasing sözleşmesi tamamlandı
```

## Fason

```text
Fason işlem tamamlandı
Fason ödeme yapıldı
```

---

# 19. Maaş Tetikleyicisi

Maaş ödeme günleri:

```text
22, 44, 66, 88...
```

Kural:

```ts
gameDay % 22 === 0
```

Tutar:

- aktif direkt personel,
- aktif support/yönetim personeli,
- gerçek DB salary config/assignment kayıtları

üzerinden hesaplanır.

Günlük accrual oluşturma.

Finance transaction:

```text
Category: SALARY
Direction: EXPENSE
Game day
Reference key
Previous balance
Next balance
```

Event:

```text
Maaş ödemesi yapıldı
Toplam personel
Toplam tutar
```

Yetersiz nakitte mevcut finance due altyapısını kullan.

Nakit negatif yapılmamalı.

---

# 20. Elektrik ve İşletme Gideri Tetikleyicisi

İlk ödeme günü:

```text
10. gün
```

Sonraki ödeme günleri:

```text
32, 54, 76...
```

Kural:

```ts
gameDay >= 10 &&
(gameDay - 10) % 22 === 0
```

Elektrik:

- kurulu/aktif production line template’lerinin
- `monthlyElectricityBaseCents`
- veya gerçek eşdeğer alanlarının toplamından

hesaplanır.

Gerçek utilization hesabı kullanma.

Karar:

```text
Kurulu mevcut fabrika yapısının snapshot gideri
```

Diğer işletme giderleri mevcut config sisteminden okunur.

Finance transaction ve event idempotent olmalı.

---

# 21. Leasing Taksit Event Entegrasyonu

Mevcut leasing contract ve FinanceDue sistemini kullan.

Taksit günü:

```text
contract.nextDueDay
```

Kurallar:

- Bir kez ödeme
- Benzersiz reference key
- Yetersiz nakitte PARTIAL/OVERDUE
- Negatif bakiye yok
- Event üretimi
- Son taksitte contract COMPLETED event’i

Faz 23’te çalışan leasing ödeme sistemini yeniden yazma; DailyEvent’e bağla.

---

# 22. Müşteri Tahsilatları ve Sevkiyat

Mevcut sistemleri yeniden yazma.

Müşteri tahsilatı sonucunu event’e projekte et:

```text
Müşteri
Sipariş
Tahsil edilen tutar
```

Sevkiyat event’i:

```text
Sipariş kodu
Ürün
Sevk edilen adet
```

Duplicate finance veya shipment kaydı oluşturma.

---

# 23. Fason Ödeme Zamanlaması

Kesin ürün kararı:

```text
Fason teklif seçildiğinde ödeme yapılmaz.
İş tamamlanıp fabrikaya döndüğü gün ödeme yapılır.
```

Akış:

```text
Offer seçimi
→ job oluşturulur
→ due day belirlenir
→ ödeme yapılmaz

Completion day
→ ürün fabrikaya döner
→ ödeme yapılır
→ finance transaction oluşur
→ DailyEvent oluşur
```

Mevcut kod hâlâ başta ödeme yapıyorsa bu fazda düzelt.

Yetersiz nakitte mevcut due/overdue davranışını kullan.

---

# 24. İki Panelin Ayrımı

## Vardiya Sonuç Paneli

- Üst/merkez HUD
- Progress ve üretim sonuçları
- Playback bitince açık kalır
- Kullanıcı kapatır

## Günlük Olay Paneli

- Sağdan açılır
- Finans, sevkiyat, üretim ve sistem olaylarını listeler
- Kullanıcı ayrıca kapatabilir

Aynı panel değildir.

Mevcut overlay store tek panel destekliyorsa yardımcı overlay layer kullan.

Z-index ve pointer-event çatışması yaratma.

---

# 25. Scroll Davranışı

Her iki panelde:

```text
max-height
min-h-0
overflow-y-auto
overscroll-behavior: contain
```

doğru uygulanmalı.

- Vardiya sonuç panelinde ürün listesi uzarsa scroll
- Event panelinde event sayısı artarsa scroll
- Arka sayfa gereksiz scroll olmamalı

---

# 26. Bu Fazda Yapılmayacaklar

```text
Personel devamsızlığı
Makine arızası
FactoryChaosEvent kapasite etkileri
Leasing default sonrası hat kapatma
Yeni rapor route’u
Playback hızlandırma
Playback skip
Pause/resume
Tam ekran event paneli
Yeni mobil navigasyon sistemi
```

STAFF ve MACHINE kategorileri geleceğe hazır olabilir ancak event üretimi yapılmayacak.

---

# 27. Test Gereksinimleri

## Vardiya sonuç paneli

1. Playback 25 saniye sonunda kapanmıyor.
2. Progress %100 ve saat 17:00 kalıyor.
3. Close button playback bitene kadar disabled.
4. Playback sonrası close aktif.
5. Close sonrası yalnızca bir refresh.
6. Final departman değerleri görünür kalıyor.
7. Ürün listesi gerçek ShiftLineResult verisinden geliyor.
8. Aynı ürün/departman sonuçları doğru aggregate ediliyor.
9. Ürün görseli doğru geliyor.
10. 10+ ürün panel içinde scroll ediyor.

## Günlük olay paneli

11. Panel sağdan açılıyor.
12. Tam ekran olmuyor.
13. Panel kendi içinde scroll ediyor.
14. Kapanış animasyonu tamamlanmadan unmount olmuyor.
15. Event’ler kronolojik.
16. Aynı dakikada sequence sırası korunuyor.
17. Yeni event smart auto-scroll yapıyor.
18. Kullanıcı yukarıdaysa scroll zorlanmıyor.
19. Refresh sonrası duplicate event oluşmuyor.
20. Reduced motion desteği var.

## Finans tetikleyicileri

21. Maaş 22. günde bir kez çalışıyor.
22. Maaş 23. günde tekrar çalışmıyor.
23. İşletme gideri 10. günde çalışıyor.
24. Sonraki işletme gideri 32. günde çalışıyor.
25. Elektrik mevcut hatların template toplamından geliyor.
26. Leasing due bir kez ödeniyor.
27. Yetersiz nakitte negatif bakiye oluşmuyor.
28. PARTIAL/OVERDUE doğru.
29. Müşteri tahsilatı duplicate olmuyor.
30. Fason ödeme completion day’de çalışıyor.
31. Sevkiyat event’i doğru adet gösteriyor.

## Regresyon

32. Faz 1 idempotency testleri geçiyor.
33. Faz 2 playback/aggregation testleri geçiyor.
34. Faz 3A yatırım/personel testleri geçiyor.
35. Leasing testleri geçiyor.
36. Priority ve automatic allocation testleri geçiyor.

---

# 28. Animasyon Doğrulaması

Tarayıcıda kontrol et:

```text
1280×720
1440×900
Safari
Chrome
prefers-reduced-motion
```

Kontrol:

- Panel girişleri premium ve akıcı
- Bounce yok
- Aşırı glow yok
- Event stagger doğal
- Scroll sırasında jank yok
- Panel kapanırken içerik bir anda yok olmuyor

---

# 29. Doğrulama Komutları

Çalıştır:

```text
İlgili unit/integration/feature testleri
Hedefli ESLint
tsc --noEmit
Production build
git diff --check
```

Yeni lint veya type hatası ekleme.

---

# 30. Beklenen Son Rapor

```text
1. Okunan Dosyalar
2. Playback Panelinin Otomatik Kapanma Kök Nedeni
3. Yeni Playback Yaşam Döngüsü
4. Kalıcı Vardiya Sonuç Paneli
5. Ürün Bazlı Sonuç DTO ve UI
6. Close Button Davranışı
7. Sağ Günlük Olay Paneli
8. Panel Giriş/Kapanış Animasyonları
9. Event Satırı Animasyonları
10. DailyEvent / ShiftTimelineEvent Yapısı
11. Maaş Tetikleyicisi
12. İşletme Gideri Tetikleyicisi
13. Leasing Taksit Event Entegrasyonu
14. Müşteri Tahsilatı ve Sevkiyat Eventleri
15. Fason Completion-Day Ödeme Düzeltmesi
16. Scroll Davranışları
17. Değiştirilen Dosyalar
18. Prisma ve db push Durumu
19. Test, ESLint, TypeScript ve Build Sonuçları
20. Tarayıcı Görsel Kontrol Sonuçları
21. Açık Riskler
```

Önce kısa analiz ve dosya planı ver.

Sonra kodlamayı tamamla.

Ana ürün kararları:

```text
Playback tamamlanınca sonuç paneli açık kalır.
Oyuncu kapatmadan kapanmaz.

Ürün adı, küçük görsel ve işlenen adet gösterilir.

Sağ günlük olay paneli tam ekran olmaz.
Premium giriş, event stagger ve kapanış animasyonları kullanılır.
```
