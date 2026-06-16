# Factory Expansion Math

## Amaç

Bu doküman fabrikanın büyüme matematiğini tanımlar.

Oyuncu sadece daha fazla hat açarak değil; slot, departman alanı, yeni kabiliyet, verimlilik, bakım güvenliği, kalite ve entegre tesis yatırımlarıyla büyümelidir. Her yatırım haritada görünür, üretim matematiğinde hissedilir ve sipariş pazarını etkiler.

## Temel Kararlar

- Büyüme line, slot, zone, capability ve factory level üzerinden ilerler.
- Maliyetler line sayısı arttıkça yükselmelidir.
- Yeni hat her zaman doğru yatırım olmamalıdır; darboğaz hangi departmandaysa yatırım oraya yönlenmelidir.
- Verimlilik artışları sınırsız büyümemeli; diminishing return uygulanmalıdır.
- Fabrika büyüdükçe sipariş adetleri ve müşteri beklentileri artmalıdır.
- Expansion math config / database üzerinden yönetilebilir olmalıdır.

## Büyüme Katmanları

```text
Factory Level
Department Zone Level
Line Slot Unlock
Production Line Install
Line Upgrade
Capability Unlock
Infrastructure Upgrade
Quality / Certification Upgrade
```

Her katman farklı soruya cevap verir:

```text
Factory Level:
Fabrika ne kadar büyük olabilir?

Department Zone Level:
Bu departman kaç slot taşıyabilir?

Line Slot Unlock:
Bu departmanda yeni hat kuracak alan var mı?

Production Line Install:
Boş alana hangi hat kurulacak?

Line Upgrade:
Var olan hat daha iyi çalışacak mı?

Capability Unlock:
Fason yapılan iş artık içeride yapılabilecek mi?

Infrastructure Upgrade:
Daha büyük üretim yükü taşınabilecek mi?
```

## Factory Level Etkileri

Factory Level fiziksel büyüme sınırlarını belirler.

Örnek:

```text
Factory Level 1 - Atölye
- Dikim max slot: 2
- Kesim max slot: 1
- Ütü/Paket max slot: 1
- Ara işlem zone'u kilitli

Factory Level 2 - Gelişen Atölye
- Dikim max slot: 4
- Kesim max slot: 2
- Ütü/Paket max slot: 2
- Ara işlem zone'u açılabilir

Factory Level 3 - Küçük Fabrika
- Dikim max slot: 8
- Baskı / Nakış açılabilir
- Kalite Kontrol açılabilir

Factory Level 4 - Fabrika
- Yıkama / Boya açılabilir
- Büyük sevkiyat alanı
- Premium siparişler daha güvenli

Factory Level 5 - Entegre Tesis
- Kumaş üretim açılabilir
- Luxury hazırlık yatırımları
- Çok büyük adetli siparişlere uygun altyapı
```

## Slot Açma Matematiği

Her departmanda slot sayısı arttıkça yeni slot maliyeti yükselmelidir.

Önerilen formül:

```text
slotUnlockCost =
baseSlotCost
* departmentCostMultiplier
* pow(nextSlotIndex, slotGrowthFactor)
```

Örnek:

```text
baseSlotCost: 4.000
departmentCostMultiplier: Dikim 1.2
nextSlotIndex: 4
slotGrowthFactor: 1.35

slotUnlockCost = 4.000 * 1.2 * 4^1.35
```

Bu sayede ilk slotlar ulaşılabilir, sonraki büyümeler daha stratejik hale gelir.

## Line Kurulum Maliyeti

Slot açmak alan yaratır; line kurmak üretim gücü yaratır.

Önerilen formül:

```text
lineInstallCost =
lineTypeBaseCost
* qualityTierMultiplier
* factoryScaleMultiplier
```

Örnek line base maliyetleri:

```text
Cutting Line: 5.000
Sewing Line: 12.000
Ironing / Packing Line: 9.000
Basic Print Line: 25.000
Embroidery Line: 30.000
Shipping Line: 8.000
```

## Verimlilik Upgrade Matematiği

Verimlilik upgrade'leri güçlü ama kontrollü olmalıdır.

Önerilen maliyet:

```text
upgradeCost =
baseUpgradeCost
* pow(nextUpgradeLevel, 1.6)
* departmentCostMultiplier
```

Önerilen etki:

```text
Level 1 -> +5%
Level 2 -> +4%
Level 3 -> +3%
Level 4 -> +2%
Level 5 -> +1%
```

Bu yaklaşım oyuncuyu tek bir hattı sonsuza kadar güçlendirmek yerine doğru yerde yeni kapasite açmaya iter.

## Günlük Kapasite Hesabı

Departman kapasitesi line kapasitelerinin toplamıdır.

```text
lineDailyCapacity =
floor(540 * currentEfficiency / operationMinutesPerUnit)

departmentDailyCapacity =
sum(activeLineDailyCapacity)
```

Kuyruk gün karşılığı:

```text
queueDays =
queueQuantity / nextDepartmentDailyCapacity
```

Darboğaz sinyali:

```text
departmentLoadRate =
plannedOperationMinutes / availableDepartmentMinutes
```

Yorum:

```text
0-70%: Rahat
70-95%: Sağlıklı yoğun
95-110%: Dikkat
110%+: Kapasite aşımı
```

## Capability Unlock Matematiği

Capability unlock, dışarıda yapılan işi içeride yapmayı sağlar.

Etki alanları:

- Fason maliyetini azaltır.
- Fason teslim riskini azaltır.
- İç operasyon süresi ekler.
- Yeni line ve personel ihtiyacı doğurur.
- Daha katma değerli ürünleri açar.

Örnek:

```text
Baskı Capability Unlock
Unlock Cost: 35.000
Required Factory Level: 2
Required Area: Ara İşlemler Zone
First Line Cost: 25.000
Operation Time: 1.2 dk / adet
Fason bağımlılığı: azalır
```

## Bakım ve Yedek Makine Etkisi

Yedek makine ve bakım yatırımları kapasiteyi doğrudan büyütmekten çok riski azaltmalıdır.

Örnek:

```text
Spare Machine Pack
Cost: 8.000
Effect:
- Makine arızasında duruş süresi -35%
- Maintenance risk -10%
```

Bakım yatırımı olmayan fabrikada:

```text
Line sayısı arttıkça arıza olaylarının toplam görülme ihtimali artar.
```

Bu, büyük fabrikalarda bakım sistemini doğal ihtiyaç yapar.

## Order Market ile Bağlantı

Fabrika büyüdükçe pazar da büyümelidir.

```text
offerQuantityRange =
baseRange
* reputationMultiplier
* factoryLevelMultiplier
* customerTierMultiplier
```

Fakat sistem oyuncuyu kapasitesinin çok üstüne sürekli zorlamamalıdır.

Teklif üretirken şu kontrol yapılmalıdır:

```text
estimatedLoad <= factoryReasonableLoadLimit
```

Yüksek riskli ama karlı teklifler istisna olarak gelebilir.

## MVP Kapsamı

- Factory level bazlı slot sınırı.
- Departman bazlı max slot.
- Slot unlock maliyeti.
- Line install maliyeti.
- Basit verimlilik upgrade'i.
- Capability unlock için ilk örnek: Baskı veya Nakış.
- Günlük kapasite ve kuyruk gün hesabı.
- Harita üzerinde yeni hat görsel açılımı.

## İleride Genişletilecek Alanlar

- Gelişmiş bakım ekonomisi.
- Enerji / altyapı kapasitesi.
- Bina genişletme animasyonları.
- Makine kalite sınıfları.
- Bölgesel layout bonusları.
- Departman komşuluk etkileri.
- Otomatik yatırım önerisi.

## Config Taslağı

```text
FactoryLevelConfig
- level
- title
- maxMapAreaLevel
- maxTotalSlots
- departmentSlotCaps
- unlockableCapabilities
- requiredReputation
- upgradeCost

DepartmentZoneConfig
- departmentType
- baseSlotCount
- maxSlotCountByFactoryLevel
- departmentCostMultiplier
- visualZoneKey

LineTypeConfig
- lineType
- baseInstallCost
- requiredStaff
- supportedOperations
- baseEfficiency
- visualPrefabKey

UpgradeConfig
- upgradeType
- targetType
- baseCost
- growthFactor
- effectValue
- maxLevel
```

## Örnek

```text
Oyuncu 5. dikim hattını açmak istiyor.

Kontrol:
- Factory Level 2 max dikim slotu: 4
- Oyuncuda aktif dikim slotu: 4
- Sonuç: Yeni hat için önce Factory Level 3 veya Dikim Zone Genişletme gerekir.

Mesaj:
Dikim alanın dolu.
Yeni dikim hattı için fabrikanı genişletmen gerekiyor.
```
