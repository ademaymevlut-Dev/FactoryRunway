# 18 - Player Onboarding Factory Setup Flow

Bu doküman, oyuncu sektör seçtikten sonra başlayacak fabrika kurulum
akışının ekranlarını, oyuncu girişlerini, sistem kayıtlarını ve sonraki ilk
3 gün tutorial bağlantısını tanımlar.

Bu doküman motion veya final UI tasarım dokümanı değildir.

Amaç önce akışı düzene koymaktır:

```text
Oyuncu ne görür?
Oyuncu ne seçer veya girer?
Sistem hangi kaydı ne zaman oluşturur?
Oyuncu oyuna hangi hazırlıkla bırakılır?
```

Görsel detaylar ve animasyon dili bu akış netleştikten sonra ayrıca
tasarlanacaktır.

---

# 1. Ana Hedef

Sektör seçimi sonrası oyuncuya şunu hissettirmek:

```text
Sektörümü seçtim.
Başlangıç sermayem verildi.
İlk üretim hatlarım kuruldu.
Başlangıç ekibim hazır.
Artık ilk siparişimi alıp ilk 3 günü oynayabilirim.
```

Akış form gibi hissettirmemelidir.
Ancak ilk aşamada ekranlar normal, sade ve düzenli kurgulanmalıdır.

Önce karar ve kayıt akışı netleşir.
Sonra bu ekranların görsel sunumu, motion dili ve sahne tasarımı zenginleştirilir.

---

# 2. Önerilen Step Listesi

| Sıra | Ekran | Teknik Step | Oyuncu Aksiyonu | Ana Sonuç |
| ---: | --- | --- | --- | --- |
| 1 | Sektör Seçimi | `SECTOR` | Aktif sektörü seçer | `PlayerOnboardingDraft.sectorId` yazılır |
| 2 | Başlangıç Sermayesi | `CAPITAL` | Bilgilendirmeyi onaylar | Başlangıç sermayesi gösterilir |
| 3 | Fabrika Kimliği | `FACTORY_IDENTITY` | Fabrika adı ve para etiketi seçer | Draft tamamlanır |
| 4 | Başlangıç Hat Kurulumu | `STARTER_LINES` | Hatları sırayla inceler ve zemine yerleştirir | Başlangıç hatları oyuncuya anlatılır |
| 5 | Başlangıç Kadrosu | `STARTER_STAFF` | Kadroyu inceler | Personel dağılımı oyuncuya anlatılır |
| 6 | Aylık Gider Bilgilendirmesi | `COST_PREVIEW` | 22 günlük gider özetini inceler | Maaş ve sabit giderler anlatılır |
| 7 | Kurulum Özeti | `REVIEW` | Kurulumu başlatır | Final onay alınır |
| 8 | Fabrika Oluşturma | `PROVISIONING` | Bekler | Transaction çalışır |
| 9 | İlk 3 Gün Başlangıcı | `FIRST_DAYS` | İlk siparişe geçer | Tutorial başlar |

Not:

Mevcut Prisma `OnboardingStep` enum içinde şu değerler vardır:

```text
SECTOR_SELECTION
PLAYER_IDENTITY
CURRENCY_SELECTION
FACTORY_SETUP
WELCOME
SECTOR
FACTORY
REVIEW
PROVISIONING
```

Uygulama sırasında mevcut enum değerleriyle uyumlu ilerlenebilir.
Eğer yeni ara step'ler kalıcı olacaksa enum genişletme ayrıca kararlaştırılmalıdır.
İlk uygulama için ara step detayları `PlayerOnboardingDraft.draftData` içinde
tutulabilir.

---

# 3. Step 1 - Sektör Seçimi

## Amaç

Oyuncu aktif sektörü seçer.
Beta başlangıcında oynanabilir sektör Textile olarak kabul edilir.
Diğer sektörler pasif veya coming soon olarak görünebilir.

## Oyuncu Ne Görür?

- Aktif sektör kartı
- Pasif sektör kartları
- Aktif sektör için kısa açıklama
- `Tekstil ile başla` aksiyonu

## Oyuncu Ne Yapar?

Aktif sektör kartında başlatma butonuna basar.

## DB Etkisi

Bu aşamada kesin fabrika oluşturulmaz.
Önce draft güncellenir:

```text
User.onboardingStatus = IN_PROGRESS
User.onboardingStep = SECTOR veya FACTORY_SETUP
PlayerOnboardingDraft.sectorId = selectedSectorId
PlayerOnboardingDraft.revision += 1
```

## Not

Sektör seçimi gerçek kurulum niyetidir.
Ancak oyuncu fabrika adı ve review adımlarını görmeden final `Factory`
kaydı oluşturulmamalıdır.

---

# 4. Step 2 - Başlangıç Sermayesi

## Amaç

Oyuncuya oyuna hangi finansal güçle başladığı açıkça gösterilir.

## Oyuncu Ne Görür?

```text
Başlangıç sermayen hazır.
1.000.000
```

Bu para birimi oyuncunun seçtiği etikete göre `EUR` veya `USD` olarak
gösterilir.

## Oyuncu Ne Yapar?

Sadece devam eder.
Bu ekranda karar yükü olmamalıdır.

## DB Etkisi

Bu aşamada gerçek para kaydı oluşturulmaz.
Sermaye bilgisi draft'a snapshot olarak yazılabilir:

```json
{
  "startingCapitalCents": "100000000"
}
```

Final transaction sırasında bu değer `Factory.cashBalanceCents` alanına yazılır.

## Kural

Başlangıç sermayesinin ana kaynağı `SectorSimulationConfig.startingCapitalCents`
olmalıdır.

Beta / sandbox başlangıcı için hedef:

```text
1.000.000 = 100_000_000 cents
```

---

# 5. Step 3 - Fabrika Kimliği

## Amaç

Oyuncunun kurduğu fabrika ile kişisel bağ kurmasını sağlamak.

## Oyuncu Ne Görür?

- Fabrika adı input'u
- Para etiketi seçimi
- Sektör özeti

## Oyuncu Girişleri

| Alan | Zorunlu | Açıklama |
| --- | --- | --- |
| `factoryName` | Evet | Oyuncunun ilk fabrikasının adı |
| `currencyCode` | Evet | `EUR` veya `USD`; hesaplamayı değiştirmez, sadece gösterim etiketi |

## DB Etkisi

Bu aşamada draft güncellenir:

```text
PlayerOnboardingDraft.factoryName
PlayerOnboardingDraft.currencyCode
PlayerOnboardingDraft.draftData.identityCompleted = true
```

`PlayerProfile.factoryName` nullable kalabilir.
Final transaction tamamlandığında canlı fabrika adı `Factory.name` içinde tutulur.

---

# 6. Step 4 - Başlangıç Hat Kurulumu

## Amaç

Oyuncuya hangi üretim altyapısıyla oyuna gireceğini göstermek.

Bu ekran satın alma ekranı değildir.
Oyuncu burada tek tek hat satın almaz.
Başlangıç paketi sistem tarafından verilir.

Bu step'in görsel görevi, oyuncuya ilk atölyesinin gerçekten kurulduğunu
hissettirmektir.

## Oyuncu Ne Görür?

Önce fabrika zemini görünür.
Bu zemin için mevcut `/shift` ekranındaki fabrika floor / production layout
dili temel alınmalıdır.

Başlangıçta zemin boş veya yarı boş görünür.
Sonra üretim hatları sırayla modal / layer içinde tanıtılır ve oyuncu `Next`
dediğinde görsel küçülerek fabrika zeminindeki yerine yerleşir.

Kurulacak başlangıç hatları:

| Hat | Template Key | Grade | Başlangıç Durumu |
| --- | --- | --- | --- |
| Kesim | `cutting_workshop` | `WORKSHOP` | Kurulu |
| Dikim | `sewing_workshop` | `WORKSHOP` | Kurulu |
| Ütü / Paket | `ironing_packing_workshop` | `WORKSHOP` | Kurulu |

## Hat Modal / Layer İçeriği

Her hat sırayla büyük bir modal veya layer içinde açılır.
Ana kartın dışı karartılır.
Odak aktif production line üzerindedir.

Modal içinde gösterilecek bilgiler:

- Üretim hattı görseli
- Departman adı
- Hat adı
- Segment / Grade: `WORKSHOP`
- Yatırım sermayesi veya başlangıç paket değeri
- Gerekli çalışan personel detayı
- Kapasite veya workload özeti
- Kurulum durumu: başlangıç paketi içinde

Önerilen modal akışı:

```text
1. Kesim departmanı modal içinde açılır.
2. Oyuncu Next'e basar.
3. Kesim görseli küçülerek fabrika zeminine yerleşir.
4. Dikim departmanı modal içinde açılır.
5. Oyuncu Next'e basar.
6. Dikim görseli Kesim'in yanına yerleşir.
7. Ütü / Paket departmanı modal içinde açılır.
8. Oyuncu Next'e basar.
9. Ütü / Paket görseli Dikim'in yanına yerleşir.
10. Oyuncu ortada üç departmanı yan yana kurulmuş halde görür.
```

Bu akışta oyuncu seçim yapmaz.
Oyuncu kurulum ritmini Next aksiyonlarıyla takip eder.

## Fabrika Zemini ve Yerleşim Kararı

Fabrika zemini için `/shift` ekranındaki mevcut görsel dil referans alınmalıdır:

```text
factory-map-canvas
factory-map-landscape
factory-floor-details
factory-production-layout
factory-production-stage
```

Onboarding içinde bu component'lerin birebir kopyalanması şart değildir.
Ancak zemin hissi ve üretim hatlarının yan yana yerleşim mantığı aynı aileden
gelmelidir.

Başlangıç kurulumunda 3 hat ortada yan yana gösterilmelidir:

```text
[ Kesim ] [ Dikim ] [ Ütü / Paket ]
```

Bu görsel, oyuncunun review ekranına geçmeden önce "fabrikam kuruldu" hissini
almasını sağlar.

## Production Line Görsel Varyantı Kararı

Üretim hattı görsellerinde mevcut varyantlar:

```text
CARD       512 x 384
MAP        768 x 512
DETAIL    1024 x 768
THUMBNAIL  320 x 240
```

Önerilen kullanım:

| Kullanım Yeri | Tercih Edilecek Görsel |
| --- | --- |
| Modal / layer içindeki büyük tanıtım | `DETAIL` |
| Fabrika zeminine yerleşen üretim hattı | `MAP` |
| Küçük özet kart veya performans gerekirse | `CARD` |
| Mini gösterge veya liste içi küçük önizleme | `THUMBNAIL` |

Eğer seçilen varyant bulunamazsa bir alt uygun varyanta düşülebilir.
Örneğin `DETAIL` yoksa modal içinde `MAP` kullanılabilir.

## Oyuncu Ne Yapar?

Her modalda `Next` butonuna basar.
Her `Next` aksiyonu bir üretim hattını fabrika zeminine ekler.
Üçüncü hat eklendikten sonra oyuncu bir sonraki aşamaya geçer.

Bu adımda alternatif yatırım seçimi yaptırılmaz.

## DB Etkisi

Bu aşamada canlı `FactoryProductionLine` kayıtları henüz oluşturulmayabilir.
Draft'a kurulacak template listesi yazılır:

```json
{
  "starterLineTemplateKeys": [
    "cutting_workshop",
    "sewing_workshop",
    "ironing_packing_workshop"
  ]
}
```

Final transaction sırasında:

```text
FactoryProductionLine kayıtları oluşturulur.
departmentId template üzerinden kopyalanır.
acquisitionType = STARTER
purchasePriceCents = 0
conditionBps = 10000
status = IDLE
installedDay = 1
```

Görseldeki sıralama ile DB sıralaması uyumlu olmalıdır:

```text
Kesim -> sortOrder 1
Dikim -> sortOrder 2
Ütü / Paket -> sortOrder 3
```

## Fason Departmanlar

Başlangıçta iç hat olarak kurulmayacak departmanlar:

| Departman | Başlangıç Durumu |
| --- | --- |
| Nakış | Fason |
| Baskı | Fason |
| Yıkama | Fason |
| Boyama | Fason |

Bu departmanlar için başlangıçta `FactoryProductionLine` kaydı oluşturulmaz.
Oyuncuya "dış servis bağlantısı" gibi anlatılabilir.

---

# 7. Step 5 - Başlangıç Kadrosu

## Amaç

Oyuncuya fabrikanın sadece makineden oluşmadığını, çalışan kadrosuyla birlikte
başladığını göstermek.

## Oyuncu Ne Görür?

Önerilen gruplar:

| Grup | İçerik |
| --- | --- |
| Direkt Üretim | Hat gereksinimlerinden gelen çalışanlar |
| Destek Kadrosu | Small workshop stage gereksinimlerinden gelen destek rolleri |
| Toplam | Başlangıç çalışan sayısı |

Mevcut başlangıç referansı:

```text
29 direkt üretim + 9 destek = 38 çalışan
```

## Oyuncu Ne Yapar?

Kadroyu inceler ve devam eder.
İlk beta için tek tek işe alma yaptırılmaz.

## DB Etkisi

Final transaction sırasında:

```text
ProductionLineTemplateStaffRequirement okunur.
FactoryStaffAssignment ile hat bazlı direkt üretim personeli oluşturulur.
SectorFactoryOperatingStageStaffRequirement okunur.
FactoryStaffAssignment ile fabrika geneli destek kadrosu oluşturulur.
```

Bu işlem transaction içinde olmalıdır.

---

# 8. Step 6 - Aylık Gider Bilgilendirmesi

## Amaç

Oyuncuya fabrikanın sadece başlangıç sermayesi ve makinelerden oluşmadığını,
her ay düzenli giderleri olduğunu anlatmak.

Bu ekran final review'dan hemen önce gelmelidir.

## Oyuncu Ne Görür?

22 günlük ay düzenine göre gider özeti gösterilir.

Önerilen kalemler:

| Kalem | Açıklama |
| --- | --- |
| Toplam işçilik gideri | Başlangıç kadrosunun 22 günlük / aylık maaş etkisi |
| Kira / alan gideri | Üretim alanı ve fabrika stage maliyeti |
| Sabit işletme giderleri | Elektrik, yemek, overhead gibi başlangıç maliyetleri |
| Toplam aylık gider | Yukarıdaki kalemlerin toplamı |

Bu ekranda cent detayı gösterilmez.
Oyuncuya okunabilir para etiketiyle bilgi verilir.

Örnek metin:

```text
Fabrikan 22 günlük işletme dönemleriyle çalışır.
Maaş, kira ve sabit giderler her dönemde kasandan düşer.
```

## Hesaplama Notu

İlk uygulamada bu ekran veriyi şu kaynaklardan türetmelidir:

```text
FactoryStaffAssignment.quantity
StaffRole.monthlySalaryCents
SectorOperatingCostConfig
ProductionLineTemplate.areaM2
SectorSimulationConfig.financePeriodDays = 22
```

Maaş hesabı:

```text
monthlyPayrollCents =
sum(FactoryStaffAssignment.quantity * StaffRole.monthlySalaryCents)
```

Kira ve diğer sabit giderler için `SectorOperatingCostConfig` temel alınmalıdır.

## Oyuncu Ne Yapar?

Giderleri inceler ve `Devam` der.
Bu ekranda karar yaptırılmaz.

---

# 9. Step 7 - Kurulum Özeti

## Amaç

Oyuncuya final kararları ve kurulacak varlıkları tek ekranda göstermek.

## Oyuncu Ne Görür?

Önerilen özet:

| Alan | İçerik |
| --- | --- |
| Sektör | Tekstil |
| Fabrika adı | Oyuncunun girdiği ad |
| Başlangıç sermayesi | 1.000.000 |
| Para etiketi | EUR veya USD |
| Kurulacak hatlar | Kesim, Dikim, Ütü / Paket |
| Fason destekler | Nakış, Baskı, Yıkama, Boyama |
| Çalışan sayısı | 38 |
| Toplam işçilik gideri | 22 günlük / aylık maaş toplamı |
| Kira ve sabit giderler | 22 günlük / aylık işletme gideri |
| Başlangıç günü | Day 1 |

## Onaylanan Alanlar

Şu alanlar onaylanmıştır:

```text
Sektör = Tekstil
Fabrika adı = Oyuncunun girdiği ad
Başlangıç sermayesi = 1.000.000
Para etiketi = EUR veya USD
Kurulacak hatlar = Kesim, Dikim, Ütü / Paket
Fason destekler = Nakış, Baskı, Yıkama, Boyama
Çalışan sayısı = 38
Başlangıç günü = Day 1
```

## Oyuncu Ne Yapar?

`Fabrikayı Başlat` butonuna basar.

## DB Etkisi

Bu butondan önce canlı fabrika oluşturulmamışsa, final transaction burada
başlar.

---

# 10. Step 8 - Fabrika Oluşturma Transaction

## Amaç

Kurulum kararlarını canlı oyun kayıtlarına dönüştürmek.

Bu işlem tek transaction içinde yapılmalıdır.

## Transaction Sırası

```text
1. User ve PlayerProfile doğrulanır.
2. Sector doğrulanır.
3. PlayerOnboardingDraft okunur.
4. Aynı player + sector için mevcut Factory var mı kontrol edilir.
5. Factory oluşturulur.
6. Başlangıç FactoryProductionLine kayıtları oluşturulur.
7. Direkt üretim staff assignment kayıtları oluşturulur.
8. FactoryOperatingStageState oluşturulur.
9. Stage support staff assignment kayıtları oluşturulur.
10. Başlangıç finans transaction veya snapshot kayıtları oluşturulur.
11. User.onboardingStatus = COMPLETED yapılır.
12. User.onboardingCompletedAt set edilir.
13. PlayerOnboardingDraft korunur veya arşiv mantığına bırakılır.
```

## Oluşturulacak Ana Kayıtlar

| Model | Amaç |
| --- | --- |
| `Factory` | Oyuncunun canlı fabrika kaydı |
| `FactoryProductionLine` | Başlangıç üretim hatları |
| `FactoryStaffAssignment` | Başlangıç çalışanları |
| `FactoryOperatingStageState` | Fabrikanın ilk faaliyet kademesi |
| `FactoryFinanceTransaction` veya snapshot | Başlangıç sermaye iz kaydı |
| `TutorialProgress` | İlk 3 gün tutorial hazırlığı |

## Idempotency

Oyuncu aynı sektörde tekrar tıklarsa ikinci fabrika oluşturulmamalıdır.

Kontrol:

```text
Factory @@unique([playerProfileId, sectorId])
```

Eğer fabrika zaten varsa:

```text
Mevcut factory'e yönlendir.
Onboarding completed değilse state'i tamamla.
```

---

# 11. Step 9 - İlk 3 Gün Tutorial Başlangıcı

Onboarding burada bitmelidir.
İlk 3 gün ayrı tutorial sistemi olarak başlamalıdır.

Önerilen tutorial:

| Gün | Tutorial Step | Oyuncu Hedefi |
| ---: | --- | --- |
| 1 | İlk Sipariş Seçimi | Oyuncu güvenli ilk siparişi seçer |
| 1 | Kesim Başladı | İlk üretim emri oluşur ve kesim ilerler |
| 2 | Dikim Başladı | Üretim rotası ikinci aşamaya geçer |
| 3 | Ütü / Paket Hazır | Ürün teslimata yaklaşır |
| 3 | İlk Teslimat | Oyuncu ilk döngüyü tamamlar |

Teknik karşılık mevcut enum ile uyumludur:

```text
ORDER_SELECTION
PRODUCTION_ORDER_CREATED
DAY_1_CUTTING_COMPLETED
DAY_2_SEWING_STARTED
DAY_3_PACKING_SHIPMENT_READY
COMPLETED
```

---

# 12. Ekran Tasarımına Geçmeden Önce Netleşecek Kararlar

Bu doküman üzerinde karar bekleyen noktalar:

1. Sektör seçimi sonrası `Factory` hemen mi oluşturulacak, yoksa review sonrası mı?
2. Fabrika adı zorunlu mu, yoksa sistem otomatik isim önerip oyuncuya değiştirme
   hakkı mı verecek?
3. Para etiketi seçimi onboarding içinde gösterilecek mi, yoksa varsayılan `EUR`
   ile mi başlanacak?
4. Başlangıç kadrosu oyuncuya toplam olarak mı, rol rol mü gösterilecek?
5. Fason departmanlar bu akışta görünmeli mi, yoksa ilk sipariş tutorial'ında mı
   anlatılmalı?
6. Kurulum transaction sonrası oyuncu direkt `/player` dashboard'a mı, yoksa
   `/shift` veya özel ilk gün ekranına mı yönlendirilecek?
7. Hat kurulumu modal/layer görselinde final motion süresi kaç saniye olacak?
8. Toplam gider ekranında kira, elektrik ve overhead ayrı mı, yoksa tek
   "sabit gider" toplamı olarak mı gösterilecek?

---

# 13. İlk Uygulama İçin Önerilen Minimal Kapsam

İlk implementation için önerilen dar kapsam:

1. Sektör seçiminde sadece aktif Textile gerçek seçim yaptırsın.
2. Seçim `PlayerOnboardingDraft` içine yazılsın.
3. Fabrika adı ve para etiketi ekranı eklensin.
4. Starter lines ekranı fabrika zemini + sırayla açılan modal/layer kurgusuyla
   gösterilsin.
5. Üç üretim hattı görsel olarak zemine yan yana yerleşsin.
6. Starter staff ve 22 günlük gider bilgilendirmesi gösterilsin.
7. Review ekranında `Fabrikayı Başlat` final action'ı çalışsın.
8. Transaction sonunda `Factory`, başlangıç hatları ve başlangıç kadrosu oluşsun.
9. Kullanıcı `/player` veya ilk tutorial başlangıcına yönlendirilsin.

Bu kapsam, görsel tasarım detaylarından önce sistem davranışını güvenli hale getirir.
