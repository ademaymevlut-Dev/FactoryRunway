# CODEX PROMPT — FAZ 2  
## Departman Günlük Sonuçları ve 25 Saniyelik Vardiya Playback Arayüzü

Factory Runway vardiya sisteminin Faz 1 çalışması tamamlandı.

Faz 1 sonucunda:

- Aynı vardiya ikinci kez çalıştırılamıyor.
- `ShiftSimulation.create()` ile vardiya claim ediliyor.
- `@@unique([factoryId, gameDay])` ve deterministik idempotency key kullanılıyor.
- Claim alınmadan üretim veya finans yan etkileri başlamıyor.
- Transaction `Serializable`.
- `P2034` yarış durumunda en fazla üç kez retry yapılıyor.
- `P2002` durumunda mevcut vardiya sonucu okunuyor.
- Gün yalnızca `currentDay === simulatedGameDay` koşuluyla ilerliyor.
- `simulatedGameDay` ve `nextGameDay` typed sözleşmede ayrıldı.
- Server Action redirect yerine typed sonuç döndürüyor.
- `completedAt`, mevcut playback başlangıç ankrajı olarak kullanılıyor.
- Playback süresi 25 saniye.
- Sayfa yenilendiğinde aktif playback `getGameSnapshot()` üzerinden yeniden yükleniyor.
- `departmentResults` ve `timelineEvents` alanları gelecekte kullanılmak üzere sözleşmede hazır, şimdilik boş.
- Prisma şeması Faz 1 sırasında değiştirilmedi.

Bu görev Faz 2 kapsamıdır.

Faz 2 iki alt aşamada uygulanacaktır:

1. **Faz 2A — Departman sonuç verisi ve playback sözleşmesi**
2. **Faz 2B — Global vardiya progress barı ve departman sayaç arayüzü**

Faz 2A tamamlanıp test edilmeden Faz 2B’ye geçme.

---

# 1. Zorunlu Başlangıç İncelemesi

Kod yazmadan önce mutlaka aşağıdaki dosyaları oku:

```text
docs/00-Development_Rules.md
docs/10-ShiftSimulation_and_ShiftLineResult.md
docs/13-Staff_and_Organization.md
docs/20-vardiya-simulasyonu-gunluk-olay-paneli-ve-tetikleyici-sistemi.md
```

Ayrıca Faz 1’de değiştirilen aşağıdaki dosyaları incele:

```text
web/src/features/game/actions/advance-factory-day-action.ts
web/src/features/game/services/day-simulation.ts
web/src/features/game/services/shift-transaction.ts
web/src/features/game/shift-playback.ts
web/src/features/game/services/shift-playback-view.ts
web/src/features/game/types.ts
web/src/features/game/services/game-snapshot.ts
web/src/features/game/components/shift-control-bar.tsx
```

Bunlara ek olarak gerçek dosya konumlarını bularak incele:

```text
web/prisma/schema.prisma
web/src/components/ui/CountUp.tsx
GameShell
Game UI store
OverlayLayerManager
Üretim kuyruk ve route progress servisleri
ShiftLineResult oluşturan servisler
Üretim kapasitesi ve workload hesapları
```

İlk olarak kısa bir uygulama planı çıkar. Ardından yalnızca Faz 2 kapsamını kodla.

---

# 2. Kesin Veritabanı Kuralı

Migration kesinlikle kullanılmayacaktır.

Yasak komutlar:

```bash
npx prisma migrate dev
npx prisma migrate deploy
npx prisma migrate reset
```

Prisma şeması değişirse:

```bash
npx prisma db push
```

kullanılacaktır.

Schema değişikliği gerekmiyorsa `db push` çalıştırma.

Migration dosyası oluşturma.

---

# 3. Faz 2’nin Ana Hedefi

Oyuncu vardiyayı başlattığında sunucu gerçek vardiya sonucunu önceden hesaplamaktadır.

Faz 2’de yapılacak iş:

1. Bu gerçek sonucu departman bazında kalıcı ve tekrar okunabilir günlük sonuçlara dönüştürmek.
2. Sonucu client tarafında tek global zaman çizelgesiyle 25 saniyede oynatmak.
3. Ekranın üst sabit HUD alanında:
   - vardiya progress barını,
   - departman günlük sayaç kartlarını
   göstermek.
4. Sayfa yenilendiğinde aynı vardiya playback’ine kaldığı yerden devam etmek.
5. Playback tamamlanınca yeni oyun gününü yüklemek.

Client hiçbir üretim hesabı yapmayacaktır.

Client yalnızca sunucuda hesaplanıp kaydedilmiş sonucu görselleştirecektir.

---

# 4. Faz 2A — Departman Günlük Sonuç Modeli

## 4.1. Departman bazında tutulacak değerler

Her vardiya ve departman için aşağıdaki dört temel değer kesin olarak hesaplanmalıdır:

```ts
startingQueueQuantity
queueEnteredQuantity
producedQuantity
endingQueueQuantity
```

Anlamları:

### `startingQueueQuantity`

Vardiya başlamadan hemen önce ilgili departmanda işlenmeyi bekleyen toplam ürün adedi.

Bu değer önceki günlerden kalan WIP miktarını içerir.

### `queueEnteredQuantity`

Yalnızca o vardiya sırasında ilgili departmanın kuyruğuna yeni eklenen toplam ürün adedi.

Bu değer tarihsel toplam değildir.

Bu değer mevcut kümülatif alanlardan vardiya sonunda tahmin edilmemelidir. Simülasyon sırasında kuyruğa yapılan gerçek eklemeler izlenerek hesaplanmalıdır.

### `producedQuantity`

Yalnızca o vardiya sırasında ilgili departmanda tamamlanan toplam ürün adedi.

Aynı departmana bağlı birden fazla üretim hattı varsa bütün hatların `ShiftLineResult.producedQuantity` değerleri departman bazında toplanmalıdır.

### `endingQueueQuantity`

Vardiya tamamlandığında ilgili departmanda işlenmeyi bekleyen toplam ürün adedi.

Bu değer yalnızca formülle tahmin edilmemeli; simülasyon sonrası gerçek queue/WIP durumundan doğrulanmalıdır.

---

## 4.2. Örnekler

### Önceki günden kuyruk var, bugün giriş yok

```text
Vardiya Başı Kuyruk: 800
Bugün Gelen: 0
Bugün Tamamlanan: 650
Kalan Kuyruk: 150
```

Bu sonuç geçerlidir.

UI oyuncuya yalnızca `Bugün Gelen: 0` ve `Bugün Tamamlanan: 650` gösterip ürünlerin kaynağını belirsiz bırakmamalıdır. Küçük alt satırda vardiya başı ve kalan kuyruk da gösterilecektir.

### Bugün ürün geldi fakat aynı gün işlenmiyor

Mevcut simülasyon kararına göre bir departmanın bugünkü çıktısı sonraki departmanın kuyruğuna bugün eklenebilir, fakat sonraki departman bunu ancak ertesi oyun günü işleyebilir.

Örnek:

```text
Dikim
Vardiya Başı Kuyruk: 0
Bugün Gelen: 650
Bugün Tamamlanan: 0
Kalan Kuyruk: 650
```

Mevcut günlük batch kuralını değiştirme.

Aynı gün departmanlar arası gerçek zamanlı transfer ve yeniden üretim motoru yazma.

---

## 4.3. Önerilen model

Mevcut şemayı inceleyerek en uygun modeli oluştur.

Tercih edilen yön:

```prisma
model ShiftDepartmentResult {
  id                    String
  shiftSimulationId     String
  departmentId          String

  activeLineCount       Int

  startingQueueQuantity Int
  queueEnteredQuantity  Int
  producedQuantity      Int
  endingQueueQuantity   Int

  productionStartMinute Int?
  productionEndMinute   Int?

  createdAt             DateTime

  @@unique([shiftSimulationId, departmentId])
}
```

Bu yalnızca önerilen şekildir.

Mevcut Prisma isimlendirme, ID, relation ve timestamp standartlarına uy.

Gereksiz JSON alanı ekleme.

Gereksiz enum üretme.

Bir departman sonucu yalnızca UI için değil, vardiya raporu ve sayfa yenileme için de tekrar okunabilir olmalıdır.

---

# 5. Günlük Queue Değerlerinin Hesaplanması

`queueEnteredQuantity` değerini şu şekilde üretme:

```ts
endingQueue - startingQueue + produced
```

Bu formül bazı basit senaryolarda doğru görünse de:

- fason,
- route değişimi,
- iptal,
- yeniden işleme,
- ileride fire ve kalite kaybı

gibi durumlarda güvenilir olmayabilir.

Tercih edilen yaklaşım:

1. Vardiya başlangıcında departman queue snapshotlarını al.
2. Simülasyon sırasında her departmanın kuyruğuna yapılan gerçek eklemeleri bir accumulator içinde izle.
3. Departman üretim sonuçlarını gerçek `ShiftLineResult` kayıtlarından topla.
4. Vardiya sonunda queue snapshotlarını tekrar al.
5. Dört değeri açıkça `ShiftDepartmentResult` içine kaydet.

Bu kayıtlar aynı transaction içinde oluşturulmalıdır.

Faz 1 idempotency güvenliğini bozma.

İkinci claim veya retry sırasında departman sonuçları iki kez oluşmamalıdır.

---

# 6. Departman Playback Verisi

UI bütün sayaçları 25 saniye boyunca aynı hızla `0 → final` biçiminde oynatmamalıdır.

Bir departman işi erken bitiriyorsa sayaç da vardiya bitmeden final değerine ulaşmalıdır.

Bu nedenle typed playback DTO aşağıdaki yapıyı desteklemelidir:

```ts
type ShiftDepartmentPlayback = {
  departmentId: string
  departmentCode: string
  departmentName: string
  activeLineCount: number

  startingQueueQuantity: number
  queueEnteredQuantity: number
  producedQuantity: number
  endingQueueQuantity: number

  queueEnteredTimeline: ShiftQuantityPoint[]
  producedTimeline: ShiftQuantityPoint[]
}

type ShiftQuantityPoint = {
  minute: number
  quantity: number
}
```

Timeline değerleri vardiya başlangıcından itibaren dakika olarak tutulmalıdır:

```text
0   = 08:00
540 = 17:00
```

İlk Faz 2 uygulamasında karmaşık chaos segmentleri yoktur.

Bu nedenle basit timeline üretilebilir:

```ts
producedTimeline: [
  { minute: 0, quantity: 0 },
  { minute: productionEndMinute, quantity: producedQuantity }
]
```

Departman işi vardiya sonunda bitiyorsa:

```ts
productionEndMinute = 540
```

İşi erken bitiyorsa gerçek hesaplanan dakika kullanılmalıdır.

`queueEnteredTimeline` mevcut üretim motorunun sağladığı gerçek transfer zamanlarından üretilebiliyorsa onları kullan.

Mevcut motor kesin transfer dakikası üretmiyorsa:

- deterministik,
- mevcut üretim sırasına uygun,
- tekrar okunabilir

bir timeline üret.

Ancak final `queueEnteredQuantity` kesinlikle gerçek queue mutation toplamı olmalıdır.

Timeline yalnızca görsel playback dağılımıdır.

Gelecekte personel ve makine olayları pause segmentleri ekleyebilmelidir. DTO’yu buna uygun tut, fakat bu fazda chaos sistemi kodlama.

---

# 7. Departman Filtreleme ve Sıralama

HUD üzerinde yalnızca ilgili vardiyada anlamlı veriye sahip departmanlar gösterilmelidir.

Bir departman aşağıdakilerden en az birine sahipse gösterilebilir:

```text
startingQueueQuantity > 0
queueEnteredQuantity > 0
producedQuantity > 0
endingQueueQuantity > 0
```

Tamamen sıfır olan departmanları Faz 2 HUD’ına ekleme.

Departman sırası:

- mevcut route/departman sırasına,
- sektör departman sırasına,
- mevcut UI order alanına

göre deterministik olmalıdır.

İsim ve görünür metinlerde mevcut çoklu dil/veritabanı çeviri sistemini kullan.

Türkçe sabit departman isimleri yazma.

---

# 8. Typed Server Action Sözleşmesi

Faz 1’de oluşturulan typed sonucu genişlet.

Beklenen yön:

```ts
type StartShiftResult =
  | {
      ok: true
      shiftId: string
      simulatedGameDay: number
      nextGameDay: number
      playbackStartedAt: string
      durationSeconds: 25
      departmentResults: ShiftDepartmentPlayback[]
      timelineEvents: []
      summary: ...
    }
  | {
      ok: false
      code: ...
      message: ...
    }
```

Mevcut proje result/error standartlarına uy.

Yeni API route oluşturma.

Mevcut Server Action ve `useActionState` yapısını koru.

`timelineEvents` bu fazda boş kalacaktır.

---

# 9. Sayfa Yenileme ve Playback Devamı

`getGameSnapshot()` aktif playback’i tekrar yüklediğinde aynı departman sonuçlarını döndürmelidir.

Kurallar:

- Yeni vardiya hesaplanmayacak.
- Yeni departman sonucu oluşturulmayacak.
- Aynı `shiftId` kullanılacak.
- Aynı playback ankrajı kullanılacak.
- `completedAt` mevcut Faz 1 kararına göre playback başlangıç ankrajıdır.
- Geçen gerçek süre 25 saniyeden düşülecek.
- Playback süresi dolmuşsa final sonuç gösterilecek ve yeni gün snapshotı yüklenebilecek.

Aktif playback sorgusu yalnızca en son vardiyayı dikkate almalıdır.

Eski vardiyalar yeniden playback olarak dönmemelidir.

---

# 10. Faz 2B — Tek Global Vardiya Timeline’ı

Tek global zaman kaynağı kullanılmalıdır.

Örnek:

```ts
const elapsedMs = Date.now() - playbackStartedAt
const progress = clamp(elapsedMs / 25_000, 0, 1)
const shiftMinute = Math.floor(progress * 540)
```

Oyun saati:

```ts
const displayMinute = 480 + shiftMinute
```

Burada:

```text
480 dakika = 08:00
1020 dakika = 17:00
```

Kurallar:

- Her departman için ayrı `setInterval` oluşturma.
- Her sayaç için ayrı 25 saniyelik timer oluşturma.
- 50–60 üretim hattı için ayrı animation loop oluşturma.
- Tek `requestAnimationFrame`, tek GSAP ticker veya projede zaten bulunan tek global animation altyapısını kullan.
- React state güncellemesini gereksiz şekilde 60 FPS yapma.
- Görsel progress bar CSS transform veya mevcut performanslı yöntemle akıcı olabilir.
- Sayaç değerleri global `shiftMinute` üzerinden türetilmelidir.

---

# 11. `CountUp.tsx` Kullanım Kuralı

Gerçek dosya:

```text
web/src/components/ui/CountUp.tsx
```

Bu bileşeni incele ve mümkünse yeniden kullan.

Ancak `CountUp` simülasyon zamanının sahibi olmayacaktır.

Yanlış:

```tsx
<CountUp from={0} to={650} duration={25} />
```

Doğru yaklaşım:

```ts
const displayedProduced = getQuantityAtMinute(
  department.producedTimeline,
  shiftMinute
)
```

```tsx
<CountUp value={displayedProduced} />
```

`CountUp` yalnızca ardışık hedef değerler arasındaki kısa görsel geçişi yumuşatmalıdır.

Progress bar, sayaçlar ve vardiya saati birbirinden bağımsız zamanlayıcılara sahip olmamalıdır.

Gerekli küçük iyileştirmeler:

- controlled target value desteği,
- final değere kesin sabitleme,
- locale sayı formatı,
- `prefers-reduced-motion`,
- artan ve azalan değer desteği.

Gerekçesiz yeni sayaç bileşeni oluşturma.

---

# 12. UI Yerleşimi

Progress bar ve departman kartları fabrika haritasının içinde bulunmayacaktır.

Harita:

- sağa ve sola hareket ediyor,
- oyuncunun fabrikası büyüdükçe genişliyor,
- üretim hatları ekran dışına çıkabiliyor.

Bu nedenle vardiya bilgileri sabit HUD katmanında bulunmalıdır.

Önerilen yapı:

```text
Sabit üst vardiya alanı
├── Ana progress bar
├── 08:00 / güncel saat / 17:00
└── Departman günlük sonuç kartları

Alt alan
└── Hareket ettirilebilir fabrika haritası
```

Mevcut `GameShell`, HUD ve overlay yapısını inceleyerek en az müdahaleli entegrasyonu yap.

Harita koordinatlarına veya üretim hattı kartlarının konumuna bağlama.

Yeni route oluşturma.

---

# 13. Progress Bar Tasarımı

Progress bar:

- vardiya boyunca 0’dan 100’e ilerlemeli,
- 08:00 başlangıcını göstermeli,
- 17:00 bitişini göstermeli,
- ortada güncel oyun saatini göstermeli,
- mümkünse simüle edilen günü belirtmeli.

Örnek:

```text
12. GÜN VARDİYASI

08:00 ━━━━━━━━━━━━━━━━━━━━━━━ 17:00
              13:42
```

Playback sırasında veritabanındaki `Factory.currentDay` zaten sonraki güne ilerlemiş olabilir.

Bu nedenle UI:

```ts
simulatedGameDay
```

değerini kullanmalıdır.

Playback bitmeden oyuncuya yeni gün planlama ekranı gösterme.

Playback tamamlandıktan sonra:

```ts
router.refresh()
```

veya mevcut en doğru yenileme yöntemiyle `nextGameDay` ekranını yükle.

---

# 14. Departman Kartı Tasarımı

Her departman kartı şu dört değeri göstermelidir:

```text
Bugün Gelen
Bugün Tamamlanan
Vardiya Başı
Kalan
```

Görsel hiyerarşi:

```text
DİKİM · 4 HAT

BUGÜN GELEN        BUGÜN TAMAMLANAN
650                 520

Vardiya Başı: 800  Kalan: 930
```

Kurallar:

- Büyük animasyonlu sayaçlar:
  - Bugün Gelen
  - Bugün Tamamlanan
- Küçük bilgi satırı:
  - Vardiya Başı
  - Kalan
- Kartlar departman toplamıdır.
- Üretim hattı bazında sayaç gösterme.
- Mevcut tema, typography, border, glass ve spacing sistemine uy.
- Yeni ve bağımsız bir görsel dil oluşturma.
- Gereksiz gradient ve ağır glow kullanma.
- Kartlar haritanın üstünde sabit HUD içinde kalmalı.
- Mevcut üç departmanda temiz görünmeli.
- Yapı ileride daha fazla departmanı desteklemeli.
- Şimdilik gereksiz carousel veya sanallaştırma ekleme.
- Responsive grid veya mevcut layout sistemine uygun kompakt wrap kullan.

---

# 15. Erken Biten Departman

Bir departman işini vardiya bitmeden tamamlıyorsa:

- `producedTimeline` final değere erken ulaşmalı,
- sayaç o anda durmalı,
- diğer departmanlar ilerlemeye devam etmeli,
- ana vardiya progress barı 17:00’ye kadar devam etmeli.

Örnek:

```text
Ütü kapasitesi: 900
Mevcut iş: 650
```

Departman üretimi yaklaşık vardiyanın %72’sinde tamamlanıyorsa:

```ts
productionEndMinute ≈ 390
```

Sayaç 390. dakikada final değere ulaşmalı ve son 150 oyun dakikasında sabit kalmalıdır.

Bu fazda olay paneli olmadığı için ayrıca bildirim üretme.

Yalnızca kartın sayacı doğru zamanda durmalıdır.

---

# 16. Playback Sırasında Yönetim Kilidi

Oyuncu vardiyayı başlattığında:

- üretim sonucu sunucuda tamamlanır,
- veritabanı günü sonraki güne ilerler,
- client önceki günün 25 saniyelik playback’ini gösterir.

Playback süresince aşağıdaki planlama aksiyonları UI seviyesinde devre dışı bırakılmalıdır:

- tekrar vardiya başlatma,
- yeni sipariş kabul etme,
- sipariş önceliği değiştirme,
- üretim planı değiştirme,
- yeni üretim hattı kurma,
- hat kapatma veya yatırım aksiyonları,
- personel ataması değiştirme,
- fason iş başlatma,
- vardiya sonucunu etkileyebilecek diğer planlama aksiyonları.

Merkezi bir:

```ts
isShiftPlaybackActive
```

durumu kullan.

Her bileşenin içine bağımsız timer veya playback hesabı koyma.

Bu fazda bütün server action’ları yeniden yazma.

Mevcut ortak guard yapısı varsa kullan; aksi durumda UI kilidini merkezi kur ve kapsamı gereksiz büyütme.

---

# 17. Faz 2 Dışında Kalan Konular

Bu fazda aşağıdakileri kodlama:

- Sağ günlük olay paneli
- `ShiftTimelineEvent` gerçek olay üretimi
- `FactoryChaosEvent` entegrasyonu
- Personel işe gelmeme sistemi
- Makine arıza sistemi
- Maaş ödeme tetikleyicisi
- Kira ve elektrik ödeme tetikleyicisi
- Fason ödeme zamanlaması değişikliği
- Müşteri ödeme akışı değişikliği
- Yeni rapor paneli
- Hızlandırma veya playback atlama
- Pause/resume
- Yeni Machine modeli
- Aynı gün gerçek zamanlı departman transfer motoru
- Eski `/shift` route’unu canlandırma
- Genel UI yeniden tasarımı

`timelineEvents` bu fazda boş kalmalıdır.

---

# 18. Test Gereksinimleri

## 18.1. Departman sonucu testleri

Aşağıdaki senaryolar için test yaz:

### Önceki günden kuyruk

```text
starting = 800
entered = 0
produced = 650
ending = 150
```

### Bugün gelen fakat aynı gün işlenmeyen ürün

```text
starting = 0
entered = 650
produced = 0
ending = 650
```

### Erken biten departman

- final üretim değeri 540. dakikadan önce tamamlanmalı,
- timeline sonrasında sabit kalmalı.

### Vardiya sonuna kadar çalışan departman

- final üretim 540. dakikada tamamlanmalı.

### Birden fazla hat

- aynı departmana bağlı bütün hatların üretimi tek departman sonucunda toplanmalı,
- `activeLineCount` doğru olmalı.

### Sıfır aktiviteli departman

- HUD playback sonucuna dahil edilmemeli.

### Farklı ürün workload değerleri

- adet ve workload matematiği birbirine karıştırılmamalı,
- gerçek üretilen adet toplanmalı.

---

## 18.2. Idempotency regresyon testleri

Faz 1 güvenliği bozulmamalı:

- aynı vardiya iki kez başlatılamamalı,
- tek `ShiftDepartmentResult` oluşmalı,
- gün bir kez ilerlemeli,
- XP bir kez yazılmalı,
- üretim bir kez uygulanmalı,
- sevkiyat ve tahsilat bir kez uygulanmalı.

---

## 18.3. Playback testleri

- 0. saniye = 08:00
- 25. saniye = 17:00
- 12,5. saniye yaklaşık 12:30
- Erken biten sayaç final değerde durmalı
- Bütün sayaçlar aynı global `shiftMinute` değerini kullanmalı
- Yenilemede aynı shift ve aynı playback ankrajı dönmeli
- Süresi bitmiş playback eski vardiyayı tekrar başlatmamalı
- Playback sonunda yeni gün snapshotı yüklenmeli
- `simulatedGameDay` ile `nextGameDay` karışmamalı

---

## 18.4. UI testleri

- Playback başladığında HUD görünmeli
- Departman kartları doğru sırada görünmeli
- Harita hareketinden etkilenmemeli
- Yönetim aksiyonları playback boyunca devre dışı kalmalı
- Final değerler kesin sayıya sabitlenmeli
- Reduced motion kullanıcısında sonuç doğru kalmalı
- Çoklu hatlar için hat bazlı timer oluşmamalı

---

# 19. Doğrulama Komutları

Uygulama sonunda:

- ilgili testleri çalıştır,
- değiştirilen dosyalarda ESLint çalıştır,
- `tsc --noEmit` çalıştır,
- production build çalıştır.

Tam repo lint’i Faz 1 dışındaki mevcut:

```text
web/src/components/ui/sortable.tsx
```

ref hatalarında duruyorsa bunu ayrı mevcut teknik borç olarak raporla.

Bu Faz 2 değişikliğini başarısız sayma, ancak yeni lint hatası ekleme.

---

# 20. Beklenen Son Rapor

Uygulama tamamlandığında aşağıdaki başlıklarla rapor ver:

```text
1. Okunan Dosyalar
2. Faz 2A Uygulanan Veri Modeli
3. Departman Sonuç Hesaplama Yöntemi
4. Queue Girişlerinin Nasıl İzlediği
5. Playback DTO Sözleşmesi
6. Faz 2B Global Timeline Uygulaması
7. Progress Bar ve Departman Kartları
8. CountUp Entegrasyonu
9. Sayfa Yenileme Davranışı
10. Playback Sırasında Yönetim Kilidi
11. Değiştirilen Dosyalar
12. Prisma Değişikliği ve db push Durumu
13. Eklenen Testler
14. ESLint / TypeScript / Build Sonuçları
15. Açık Riskler ve Sonraki Faz Notları
```

Her değiştirilen dosyanın gerçek yolunu belirt.

Prisma değişikliği yapıldıysa açıkça:

```text
Migration çalıştırılmadı.
Yalnızca prisma db push kullanıldı.
```

şeklinde raporla.

---

# 21. Uygulama Sırası

Kesin uygulama sırası:

```text
1. Faz 1 kodunu ve testlerini tekrar doğrula
2. ShiftDepartmentResult veri modelini planla
3. Schema gerekiyorsa güncelle
4. Yalnızca db push kullan
5. Vardiya başlangıç queue snapshotlarını al
6. Queue mutation accumulator ekle
7. Departman üretim aggregation yap
8. Vardiya sonu queue snapshotlarını al
9. ShiftDepartmentResult kayıtlarını transaction içinde oluştur
10. Typed playback DTO’yu doldur
11. Snapshot refresh desteğini tamamla
12. Faz 2A testlerini çalıştır
13. Global playback state oluştur
14. Progress barı ekle
15. Departman kartlarını ekle
16. CountUp kontrollü entegrasyonunu yap
17. Playback yönetim kilidini ekle
18. Playback sonunda yeni gün refresh akışını tamamla
19. Faz 2B testlerini çalıştır
20. TypeScript, lint ve production build doğrulamasını tamamla
```

Faz 2A testleri geçmeden Faz 2B’ye geçme.

Mevcut Faz 1 idempotency yapısını zayıflatma.

UI için gerçek hesaplama motorunu değiştirme.

Sonuç verisi doğru olmadan animasyon üretme.
