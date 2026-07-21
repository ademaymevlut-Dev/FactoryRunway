# 07 - Customer Market and Order Generation

Bu doküman, Factory Runway içinde oyuncuya teklif olarak gelen siparişlerin nasıl üretileceğini tanımlar.

Bu aşama gerçek üretim simülasyonundan önce gelir.

Amaç:

- Oyuncuya her gün anlamlı sipariş teklifleri üretmek
- Sipariş adetlerini fabrikanın gerçek kapasitesine göre dengelemek
- Oyuncunun 20 gün boyunca tek model üretmesini engellemek
- Basic / Standard / Premium / Luxury stratejilerini farklılaştırmak
- Küçük atölye, büyüyen fabrika ve enterprise fabrika için farklı sipariş hacimleri oluşturmak
- Müşteri ve ürün eşleşmesini admin için tek tek tanımlama yüküne çevirmemek

---

# 1. Temel Karar

Sipariş üretimi doğrudan `FactoryScaleTier` üzerinden yapılmayacaktır.

Doğru ayrım:

```text
Factory Scale = hangi müşteri segmentlerine erişilebilir?
Factory Capacity = hangi adette sipariş mantıklı?
Customer Segment = hangi ürün tier ve fiyat davranışı?
Customer Volume Class = sipariş hacmi nasıl?
ProductTier = ürünün kalite / zorluk seviyesi
```

Final karar:

```text
Sipariş adedi, aktif üretim hatlarının departman bazlı kapasitesinden ve ürünün workload değerlerinden hesaplanır.
Factory scale yalnızca müşteri erişimi, teklif kalitesi, teklif tipi ve büyük müşteri ihtimalini etkiler.
```

Bu karar önceki üretim hattı mantığıyla uyumludur:

```text
ProductionLineTemplate.dailyPointCapacity = hattın günlük point kapasitesi
ProductRouteStep.workloadPointsPerUnit = ürünün departman bazlı iş yükü
FactoryProductionLine = oyuncunun sahip olduğu gerçek hat
```

---

# 2. Teslim Süresi ve Üretim Yükü Ayrımı

Her siparişin varsayılan teslim süresi:

```text
20 oyun günü
```

Ancak bu, siparişin fabrikanın 20 günlük kapasitesini doldurması anlamına gelmez.

Doğru tasarım:

```text
20 gün = teslim penceresi
Sipariş üretim yükü = genellikle 3 - 8 günlük fabrika yükü
```

Bu sayede:

- Kesim kuyruğu oluşur
- Dikim kuyruğu oluşur
- Ütü-paket kuyruğu oluşur
- Fason işlem gidiş-dönüş süresi yaşanır
- Oyuncu araya küçük ama kârlı siparişler alabilir
- Oyuncu fazla sipariş kabul ederse gecikme riski yaşar
- Tek ürünle 1 aylık simülasyon döngüsüne sıkışmaz

Önerilen başlangıç yük hedefi:

| Product Tier | Normal Sipariş Üretim Yükü | Oynanış Etkisi |
| --- | ---: | --- |
| BASIC | 5 - 8 gün | yüksek adet, düşük karmaşa |
| STANDARD | 4 - 6 gün | orta adet, dengeli zorluk |
| PREMIUM | 3 - 5 gün | düşük/orta adet, daha iyi kâr |
| LUXURY | 2 - 4 gün | küçük adet, yüksek fiyat, yüksek kalite riski |

Bu tablo sabit kanun değildir. `CustomerVolumeClass` büyüdükçe bu yük yukarı çıkabilir.

---

# 3. ProductTier ve CustomerVolumeClass Ayrımı

Önemli karar:

```text
Luxury ürün her zaman düşük adetli değildir.
Düşük adetli olan müşteri tipi olabilir.
```

Örnek:

| Durum | Sipariş Hissi |
| --- | --- |
| Luxury Boutique + LUXURY ürün | 80 - 300 adet |
| Luxury Retail Group + LUXURY ürün | 1.000 - 5.000 adet |
| Premium Brand + PREMIUM ürün | 500 - 2.500 adet |
| Mass Retailer + BASIC ürün | 5.000 - 20.000 adet |

Bu yüzden iki ayrı kavram gerekir:

## 3.1 CustomerSegment

Müşterinin kalite, fiyat ve ürün tier davranışını tanımlar.

Örnekler:

| CustomerSegment | Ürün Eğilimi |
| --- | --- |
| budget_retailer | BASIC ağırlıklı |
| mass_brand | BASIC + STANDARD |
| fashion_brand | STANDARD + PREMIUM |
| premium_brand | PREMIUM ağırlıklı |
| luxury_boutique | LUXURY, düşük adet |
| luxury_retail_group | LUXURY, yüksek adet potansiyeli |
| export_buyer | büyük adet, yüksek disiplin |

## 3.2 CustomerVolumeClass

Müşterinin sipariş hacmi davranışını tanımlar.

Örnekler:

| CustomerVolumeClass | Anlamı |
| --- | --- |
| SMALL_BATCH | küçük butik işler |
| REGULAR | normal sipariş |
| LARGE_RETAIL | mağaza grubu / büyük retail |
| MASS_DISTRIBUTION | çok yüksek adet |
| CAPSULE_COLLECTION | çok ürünlü düşük/orta adet |

Bu ayrım sayesinde aynı LUXURY ürün hem küçük butik sipariş hem de büyük mağaza grubu siparişi olarak üretilebilir.

---

# 4. Admin Yükünü Azaltma Kararı

Admin her müşteri için tek tek ürün eşleştirmemelidir.

Yanlış yaklaşım:

```text
CustomerProductMatch
- Armani -> Product A
- Armani -> Product B
- Mass Retailer X -> Product C
- Mass Retailer X -> Product D
```

Bu yapı büyüdükçe admin panelini veri giriş mezarlığına çevirir.

Doğru yaklaşım:

```text
CustomerSegment.tierWeights
CustomerSegment.categoryWeights
CustomerVolumeClass.quantity rules
```

Sistem aktif ürün havuzundan uygun ürünleri otomatik seçer.

Örnek `tierWeights`:

```json
{
  "BASIC": 10,
  "STANDARD": 20,
  "PREMIUM": 35,
  "LUXURY": 35
}
```

Bu müşteri, Premium ve Luxury ürünlere daha yatkındır.

---

# 5. Veritabanı Yapısı

## 5.1 CustomerSegment

Müşteri davranış tipini tanımlar.

```prisma
model CustomerSegment {
  id                    String        @id @default(cuid())

  sectorId              String        @map("sector_id")

  key                   String
  sortOrder             Int           @default(0) @map("sort_order")
  status                ContentStatus @default(ACTIVE)

  tierWeights           Json?         @map("tier_weights")
  categoryWeights       Json?         @map("category_weights")

  priceMultiplierBps    Int           @default(10000) @map("price_multiplier_bps")
  qualityExpectationBps Int           @default(10000) @map("quality_expectation_bps")
  deliveryPressureBps   Int           @default(10000) @map("delivery_pressure_bps")

  metadata              Json?

  createdAt             DateTime      @default(now()) @map("created_at")
  updatedAt             DateTime      @updatedAt @map("updated_at")

  sector                Sector        @relation(fields: [sectorId], references: [id], onDelete: Cascade)

  @@unique([sectorId, key])
  @@index([sectorId, status])
  @@map("customer_segments")
}
```

### Alan Açıklamaları

| Alan | Açıklama |
| --- | --- |
| `tierWeights` | BASIC / STANDARD / PREMIUM / LUXURY seçim ağırlıkları |
| `categoryWeights` | Ürün kategori tercihleri |
| `priceMultiplierBps` | Müşterinin fiyat davranışı |
| `qualityExpectationBps` | Kalite beklentisi |
| `deliveryPressureBps` | Termin baskısı |

---

## 5.2 CustomerVolumeClass

Sipariş hacmi davranışını tanımlar.

```prisma
model CustomerVolumeClass {
  id                         String        @id @default(cuid())

  sectorId                   String        @map("sector_id")

  key                        String
  sortOrder                  Int           @default(0) @map("sort_order")
  status                     ContentStatus @default(ACTIVE)

  quantityMultiplierBps      Int           @default(10000) @map("quantity_multiplier_bps")

  targetProductionDayMin     Int           @default(3) @map("target_production_day_min")
  targetProductionDayMax     Int           @default(8) @map("target_production_day_max")

  itemCountMin               Int           @default(1) @map("item_count_min")
  itemCountMax               Int           @default(1) @map("item_count_max")

  maxOfferLoadBps            Int           @default(7000) @map("max_offer_load_bps")

  tierQuantityCaps           Json?         @map("tier_quantity_caps")

  metadata                   Json?

  createdAt                  DateTime      @default(now()) @map("created_at")
  updatedAt                  DateTime      @updatedAt @map("updated_at")

  sector                     Sector        @relation(fields: [sectorId], references: [id], onDelete: Cascade)

  @@unique([sectorId, key])
  @@index([sectorId, status])
  @@map("customer_volume_classes")
}
```

### `tierQuantityCaps` Örneği

```json
{
  "BASIC": { "min": 1000, "max": 20000 },
  "STANDARD": { "min": 800, "max": 12000 },
  "PREMIUM": { "min": 300, "max": 8000 },
  "LUXURY": { "min": 100, "max": 5000 }
}
```

Bu alan sayesinde Luxury ürünler küçük müşteride 100 adet kalırken büyük mağaza grubunda 5.000 adede kadar çıkabilir.

---

## 5.3 VirtualCustomer

Sanal müşteri / marka bilgisidir.

```prisma
model VirtualCustomer {
  id                     String              @id @default(cuid())

  sectorId               String              @map("sector_id")
  customerSegmentId      String              @map("customer_segment_id")
  customerVolumeClassId  String              @map("customer_volume_class_id")

  key                    String
  countryCode            String?             @map("country_code")

  minSectorScaleTierId   String?             @map("min_sector_scale_tier_id")
  maxSectorScaleTierId   String?             @map("max_sector_scale_tier_id")

  trustRequirementBps    Int                 @default(0) @map("trust_requirement_bps")

  status                 ContentStatus       @default(ACTIVE)
  metadata               Json?

  createdAt              DateTime            @default(now()) @map("created_at")
  updatedAt              DateTime            @updatedAt @map("updated_at")

  sector                 Sector              @relation(fields: [sectorId], references: [id], onDelete: Cascade)
  customerSegment        CustomerSegment     @relation(fields: [customerSegmentId], references: [id], onDelete: Restrict)
  customerVolumeClass    CustomerVolumeClass @relation(fields: [customerVolumeClassId], references: [id], onDelete: Restrict)

  @@unique([sectorId, key])
  @@index([sectorId, customerSegmentId])
  @@index([sectorId, customerVolumeClassId])
  @@index([sectorId, status])
  @@map("virtual_customers")
}
```

Not:

`minSectorScaleTierId` büyük müşteri erişimi için kullanılır.

Örnek:

```text
Luxury Boutique -> Small Workshop seviyesinden itibaren gelebilir.
Luxury Retail Group -> Large Factory veya Enterprise seviyesinde açılabilir.
```

---

## 5.4 MarketOrderOffer

Oyuncuya sunulan ama henüz kabul edilmemiş sipariş teklifidir.

```prisma
model MarketOrderOffer {
  id                     String                 @id @default(cuid())

  factoryId              String                 @map("factory_id")
  sectorId               String                 @map("sector_id")
  virtualCustomerId      String                 @map("virtual_customer_id")
  customerSegmentId      String                 @map("customer_segment_id")
  customerVolumeClassId  String                 @map("customer_volume_class_id")

  offerNo                String                 @map("offer_no")

  offeredDay             Int                    @map("offered_day")
  expiresDay             Int                    @map("expires_day")

  targetDeliveryDays     Int                    @default(20) @map("target_delivery_days")
  targetDeliveryDay      Int                    @map("target_delivery_day")

  totalQuantity          Int                    @default(0) @map("total_quantity")
  totalRevenueCents      Int                    @default(0) @map("total_revenue_cents")
  estimatedProfitCents   Int?                   @map("estimated_profit_cents")

  requiredCuttingPoints  Int                    @default(0) @map("required_cutting_points")
  requiredSewingPoints   Int                    @default(0) @map("required_sewing_points")
  requiredFinishingPoints Int                   @default(0) @map("required_finishing_points")
  requiredTotalPoints    Int                    @default(0) @map("required_total_points")

  estimatedLoadDaysBps   Int                    @default(0) @map("estimated_load_days_bps")

  capacityRiskBps        Int                    @default(0) @map("capacity_risk_bps")
  deliveryRiskBps        Int                    @default(0) @map("delivery_risk_bps")
  complexityRiskBps      Int                    @default(0) @map("complexity_risk_bps")
  qualityRiskBps         Int                    @default(0) @map("quality_risk_bps")

  status                 MarketOrderOfferStatus @default(AVAILABLE)
  metadata               Json?

  createdAt              DateTime               @default(now()) @map("created_at")
  updatedAt              DateTime               @updatedAt @map("updated_at")

  factory                Factory                @relation(fields: [factoryId], references: [id], onDelete: Cascade)
  sector                 Sector                 @relation(fields: [sectorId], references: [id], onDelete: Restrict)
  virtualCustomer        VirtualCustomer        @relation(fields: [virtualCustomerId], references: [id], onDelete: Restrict)
  customerSegment        CustomerSegment        @relation(fields: [customerSegmentId], references: [id], onDelete: Restrict)
  customerVolumeClass    CustomerVolumeClass    @relation(fields: [customerVolumeClassId], references: [id], onDelete: Restrict)

  items                  MarketOrderOfferItem[]

  @@unique([factoryId, offerNo])
  @@index([factoryId, status])
  @@index([factoryId, expiresDay])
  @@index([virtualCustomerId])
  @@map("market_order_offers")
}
```

---

## 5.5 MarketOrderOfferItem

Teklif içindeki ürün satırlarıdır.

```prisma
model MarketOrderOfferItem {
  id                         String           @id @default(cuid())

  marketOrderOfferId         String           @map("market_order_offer_id")
  productId                  String           @map("product_id")

  productTier                ProductTier      @map("product_tier")

  quantity                   Int
  unitPriceCents             Int              @map("unit_price_cents")
  totalPriceCents            Int              @map("total_price_cents")

  estimatedUnitCostCents     Int?             @map("estimated_unit_cost_cents")
  estimatedProfitCents       Int?             @map("estimated_profit_cents")

  requiredTotalPoints        Int              @default(0) @map("required_total_points")
  bottleneckDepartmentId     String?          @map("bottleneck_department_id")
  estimatedLoadDaysBps       Int              @default(0) @map("estimated_load_days_bps")

  sortOrder                  Int              @default(0) @map("sort_order")
  metadata                   Json?

  marketOrderOffer           MarketOrderOffer @relation(fields: [marketOrderOfferId], references: [id], onDelete: Cascade)
  product                    Product          @relation(fields: [productId], references: [id], onDelete: Restrict)
  bottleneckDepartment       Department?      @relation(fields: [bottleneckDepartmentId], references: [id], onDelete: SetNull)

  @@index([marketOrderOfferId])
  @@index([productId])
  @@index([productTier])
  @@map("market_order_offer_items")
}
```

---

## 5.6 Enum

```prisma
enum MarketOrderOfferStatus {
  AVAILABLE
  ACCEPTED
  EXPIRED
  REJECTED
}
```

---

# 6. Sipariş Adedi Hesaplama Mantığı

## 6.1 Departman Günlük Kapasitesi

Önce oyuncunun aktif hatlarından departman kapasitesi hesaplanır.

```ts
const departmentDailyPointCapacity = sum(
  activeFactoryProductionLines
    .filter(line => line.departmentId === department.id)
    .map(line => line.productionLineTemplate.dailyPointCapacity)
)
```

Örnek başlangıç fabrikası:

| Departman | Günlük Point |
| --- | ---: |
| Cutting Workshop | 13.500 |
| Sewing Workshop | 23.040 |
| Ironing-Packing Workshop | 14.400 |

---

## 6.2 Ürün Günlük Kapasitesi

Her ürün için route step workload değerleri okunur.

```ts
const productDailyQtyByDepartment = Math.floor(
  departmentDailyPointCapacity / productRouteStep.workloadPointsPerUnit
)
```

Sonra darboğaz bulunur.

```ts
const productBottleneckDailyQty = min(productDailyQtyByDepartment)
```

---

## 6.3 Teklif Adedi Formülü

```ts
const rawOfferQty =
  productBottleneckDailyQty
  * targetProductionDays
  * safetyLoadBps / 10000
  * customerVolumeMultiplierBps / 10000
  * randomDemandBps / 10000
```

Sonra minimum / maksimum tavan uygulanır.

```ts
const offerQty = clamp(rawOfferQty, minQty, maxQty)
```

Bu formülün anlamı:

```text
Ürün ne kadar zor?
Fabrika bu üründen günde kaç adet üretebilir?
Bu müşteri küçük mü, büyük mü?
Bu teklif kaç üretim günü yük bindirmeli?
Mevcut kapasite güvenlik payı ne kadar?
```

---

# 7. Tier ve Volume Class Tavanları

Önerilen başlangıç tavan matrisi:

| ProductTier | SMALL_BATCH | REGULAR | LARGE_RETAIL | MASS_DISTRIBUTION |
| --- | ---: | ---: | ---: | ---: |
| BASIC | 1.500 | 5.000 | 20.000 | 50.000 |
| STANDARD | 1.000 | 4.000 | 12.000 | 30.000 |
| PREMIUM | 500 | 2.500 | 8.000 | 15.000 |
| LUXURY | 250 | 1.200 | 5.000 | 8.000 |

Bu tablo sayesinde:

```text
Luxury ürün küçük müşteride düşük adet kalır.
Luxury ürün büyük retail müşteride 4.000 - 5.000 adet seviyesine çıkabilir.
```

---

# 8. Factory Scale Ne İşe Yarar?

Factory Scale doğrudan sipariş adedini çarpmaz.

Factory Scale şunları etkiler:

| Etki | Factory Scale Kullanımı |
| --- | --- |
| Hangi müşteri segmentleri açılır | Evet |
| Büyük retail müşterileri gelir mi | Evet |
| Luxury retail veya export buyer açılır mı | Evet |
| Tekliflerin prestij seviyesi | Evet |
| Sipariş adedinin doğrudan çarpılması | Hayır |
| Gerçek üretim kapasitesi | Hayır |

Final kural:

```text
Factory Scale müşteri erişimini açar.
Sipariş miktarı aktif üretim kapasitesinden hesaplanır.
```

---

# 9. Mevcut Sipariş Yükü Kontrolü

Sistem oyuncuya yalnızca boş kapasiteye göre güvenli teklifler üretmemelidir.

Çünkü oyuncunun hata yapma, risk alma ve fazla sipariş kabul edip gecikme yaşama ihtimali oyunun önemli parçasıdır.

Ancak teklifin risk seviyesi hesaplanmalıdır.

```ts
const reservedLoadPoints = sum(activeOrders.remainingRequiredPoints)
const offerRequiredPoints = sum(offer.items.requiredTotalPoints)
const twentyDayCapacityPoints = sum(factoryDepartmentDailyPointCapacity) * 20

const loadAfterAcceptBps =
  (reservedLoadPoints + offerRequiredPoints) * 10000 / twentyDayCapacityPoints
```

Risk sınıfları:

| Risk Class | Load After Accept | Anlamı |
| --- | ---: | --- |
| SAFE | 0 - 50% | rahat iş |
| NORMAL | 51 - 70% | dikkatli planlama gerekir |
| STRETCH | 71 - 90% | araya iş alırsa gecikir |
| RISKY | 91 - 110% | kaos olursa patlar |
| CRITICAL | 111%+ | bilinçli kumar |

Oyuncuya teklif kartında gösterilebilir:

```text
Capacity Risk: STRETCH
Sewing Load: 82%
Delivery Risk: Medium
Quality Risk: High
```

---

# 10. Koleksiyon Siparişleri

Koleksiyon siparişi birden fazla ürün satırı içerir.

Ancak şu kural uygulanmalıdır:

```text
Koleksiyonun toplam üretim yükü, tek sipariş için ayrılan yük bütçesini aşmamalıdır.
```

Yani 6 ürün varsa her ürün büyük adetli olamaz.

Önerilen koleksiyon yükleri:

| Koleksiyon Tipi | Ürün Sayısı | Toplam Üretim Yükü |
| --- | ---: | ---: |
| Premium Capsule | 3 - 5 ürün | 4 - 7 gün |
| Luxury Boutique | 4 - 6 ürün | 3 - 6 gün |
| Luxury Retail Group | 2 - 4 ürün | 8 - 12 gün |
| Export Collection | 4 - 8 ürün | 10 - 15 gün |

Koleksiyon item dağıtımı:

```ts
const collectionLoadBudgetPoints = bottleneckDailyPoints * targetProductionDays

for each selectedProduct:
  itemLoadShare = collectionLoadBudgetPoints * itemWeight / totalWeight
  itemQty = Math.floor(itemLoadShare / productBottleneckPointPerUnit)
```

Bu sayede:

```text
Çok ürünlü sipariş = daha az ürün başı adet
Az ürünlü büyük retail sipariş = daha yüksek ürün başı adet
```

---

# 11. Senaryo Hesapları

## 11.1 Başlangıç Fabrikası - Basic T-shirt

Başlangıç hatları:

| Departman | Point/Gün |
| --- | ---: |
| Cutting | 13.500 |
| Sewing | 23.040 |
| Ironing-Packing | 14.400 |

Basic T-shirt workload:

| Departman | Point/Adet | Günlük Adet |
| --- | ---: | ---: |
| Cutting | 10 | 1.350 |
| Sewing | 20 | 1.152 |
| Ironing-Packing | 10 | 1.440 |

Darboğaz:

```text
Sewing = 1.152 adet/gün
```

Teklif:

```ts
targetProductionDays = 5
safetyLoadBps = 6000

offerQty = 1152 * 5 * 0.60 = 3.456 adet
```

Sonuç:

```text
Başlangıç Basic T-shirt siparişi yaklaşık 3.000 - 3.500 adet olmalıdır.
Teslim süresi 20 gündür ama üretim yükü yaklaşık 5 gün civarındadır.
```

---

## 11.2 Oyuncu Sadece 2. Dikim Hattını Açarsa

Yeni kapasite:

| Departman | Günlük Adet |
| --- | ---: |
| Cutting | 1.350 |
| Sewing | 2.304 |
| Ironing-Packing | 1.440 |

Darboğaz artık Cutting olur.

```ts
offerQty = 1350 * 5 * 0.60 = 4.050 adet
```

Sonuç:

```text
Sadece dikim hattı eklemek sipariş adedini iki katına çıkarmaz.
Kesim ve ütü-paket dengelemesi gerekir.
```

Bu, oyuncuya dengeli büyüme baskısı verir.

---

## 11.3 Dengeli 2 Cutting + 2 Sewing + 2 Ironing-Packing

Basic T-shirt günlük kapasite:

| Departman | Günlük Adet |
| --- | ---: |
| Cutting | 2.700 |
| Sewing | 2.304 |
| Ironing-Packing | 2.880 |

Darboğaz yine Sewing olur.

```ts
offerQty = 2304 * 5 * 0.60 = 6.912 adet
```

Sonuç:

```text
Dengeli büyüyen fabrika daha büyük teklif görür.
```

---

## 11.4 Luxury Jacket - Küçük Atölye

Luxury jacket workload örneği:

| Departman | Point/Adet |
| --- | ---: |
| Cutting | 40 |
| Sewing | 240 |
| Ironing-Packing | 60 |

Başlangıç fabrika günlük kapasitesi:

| Departman | Günlük Adet |
| --- | ---: |
| Cutting | 337 |
| Sewing | 96 |
| Ironing-Packing | 240 |

Darboğaz:

```text
Sewing = 96 adet/gün
```

Luxury Boutique teklif:

```ts
targetProductionDays = 3
safetyLoadBps = 6000

offerQty = 96 * 3 * 0.60 = 172 adet
```

Sonuç:

```text
Küçük atölye luxury işi alabilir ama düşük adetli alır.
```

---

## 11.5 Luxury Jacket - Büyük Retail / Enterprise Fabrika

Varsayım:

```text
8 Cutting Workshop eşdeğeri
10 Sewing Workshop eşdeğeri
8 Ironing-Packing Workshop eşdeğeri
```

Günlük adet kapasitesi:

| Departman | Günlük Adet |
| --- | ---: |
| Cutting | 2.700 |
| Sewing | 960 |
| Ironing-Packing | 1.920 |

Darboğaz:

```text
Sewing = 960 adet/gün
```

Luxury Retail Group teklif:

```ts
targetProductionDays = 8
safetyLoadBps = 6500

offerQty = 960 * 8 * 0.65 = 4.992 adet
```

Sonuç:

```text
Büyük fabrika luxury üründe 4.000 - 5.000 adetlik teklif görebilir.
Ancak kalite riski ve termin cezası daha ağır olmalıdır.
```

---

# 12. Teklif Üretim Akışı

```text
1. Factory aktif kapasitesi hesaplanır.
2. Factory scale ve oyuncu güvenine göre uygun VirtualCustomer listesi bulunur.
3. CustomerSegment üzerinden ProductTier ağırlığı seçilir.
4. CustomerVolumeClass üzerinden ürün sayısı ve sipariş hacmi belirlenir.
5. Aktif ürün havuzundan uygun ürünler seçilir.
6. Her ürün için bottleneckDailyQty hesaplanır.
7. Teklif adedi hesaplanır.
8. Min/max quantity cap uygulanır.
9. Toplam workload ve risk skorları hesaplanır.
10. MarketOrderOffer ve MarketOrderOfferItem kayıtları oluşturulur.
```

---

# 13. Oyuncu Teklifi Kabul Ederse

Teklif kabul edilince sonraki dokümanda detaylandırılacak süreç başlar.

Özet akış:

```text
MarketOrderOffer.status = ACCEPTED
CustomerOrder oluşturulur
CustomerOrderItem kayıtları oluşturulur
Her item için ProductionOrder oluşturulur
Her ProductionOrder için ProductRouteStep bazlı ProductionOrderRouteProgress oluşturulur
```

Bu konu bir sonraki dokümanda ele alınmalıdır:

```text
08 - CustomerOrder and ProductionOrder
```

---

# 14. Performans Kararları

| Konu | Karar |
| --- | --- |
| Teklifler gerçek sipariş değildir | `MarketOrderOffer` olarak tutulur |
| Kabul edilmeden üretim emri oluşmaz | Evet |
| Ürün başına tek tek adet kayıtları tutulmaz | Hayır |
| Workload aggregate hesaplanır | Evet |
| Customer-product manuel eşleştirme | V1 için yok |
| Ürün seçimi | segment ağırlıkları + aktif ürün havuzu |
| Sipariş adedi | aktif kapasite + bottleneck + volume class |
| Factory scale | müşteri erişimi ve teklif tipi |
| Mevcut sipariş yoğunluğu | risk skoru üretir |
| Riskli teklif tamamen engellenir mi? | Hayır, oyuncu karar verir |

---

# 15. Final Karar Özeti

| Konu | Karar |
| --- | --- |
| 07 doküman konusu | Customer Market and Order Generation |
| Sipariş teslim süresi | Varsayılan 20 oyun günü |
| Sipariş üretim yükü | Normalde 3 - 8 gün arası |
| Tek modelle 1 ay oynama | Engellenmeli |
| Sipariş adedi kaynağı | Aktif hat kapasitesi + ürün workload |
| Factory Scale etkisi | Müşteri erişimi / teklif tipi |
| ProductTier etkisi | Ürün zorluğu, fiyat, kalite riski |
| CustomerVolumeClass etkisi | Sipariş adet tavanı ve yük büyüklüğü |
| Luxury adetleri | Müşteri tipine göre 100 - 5.000+ olabilir |
| Koleksiyon siparişi | Toplam yük bütçesiyle sınırlandırılır |
| Risk sistemi | SAFE / NORMAL / STRETCH / RISKY / CRITICAL |
| Kabul sonrası süreç | 08 dokümanda CustomerOrder / ProductionOrder |



# Ek Karar: Teklif Fiyatı Product Fiyatından Direkt Gösterilmez

Teklif fiyatı `Product` tablosundaki admin referans fiyatının doğrudan oyuncuya gösterilmesiyle oluşmamalıdır.

`Product` üzerindeki fiyat bilgisi yalnızca fiyat üretim motoru için referans değer olarak kullanılmalıdır.

Doğru akış:

Product / ProductRouteStep / ProductTier
↓
MarketOrderOfferItem final fiyat üretir
↓ kabul edilirse
CustomerOrderItem içine fiyat snapshot olarak kopyalanır

Bu sayede admin daha sonra ürün referans fiyatını değiştirse bile kabul edilmiş eski siparişlerin fiyatı değişmez.

Final teklif fiyatı şu etkilerle oluşturulabilir:

- Product referans fiyatı
- ProductTier
- CustomerSegment
- CustomerVolumeClass
- Sipariş adedi
- Teslim baskısı
- Piyasa random etkisi

Örnek mantık:

```ts
finalUnitPrice =
  productBasePrice
  * productTierMultiplierBps / 10000
  * customerSegmentPriceMultiplierBps / 10000
  * volumeClassPriceMultiplierBps / 10000
  * deliveryPressureMultiplierBps / 10000
  * marketRandomBps / 10000

Random fiyat etkisi kontrollü olmalıdır.
Öneri:
Normal siparişlerde: ±3%
Premium / Luxury siparişlerde: ±5%
Riskli / hızlı terminli siparişlerde: +3% ile +10%
Fiyat oyuncuya teklif aşamasında kilitlenmiş şekilde gösterilir.
Oyuncu teklifi kabul ettiğinde bu fiyat CustomerOrderItem.pricingSnapshot içine kopyalanır.

---

```md
# Ek Karar: Teklifte Renk Dağılımı

Sipariş teklifleri ürün bazlı oluşturulmaya devam eder.
Ancak UI gerçekçiliği için teklif satırlarının altında renk dağılımı gösterilebilir.

Örnek:

Manama - 1.600 adet

- Siyah: 500
- Camel: 300
- Gri Melanj: 300
- Bordo: 300
- Beyaz: 200

Renk dağılımı V1’de üretim kapasitesini, workload puanını ve fiyatı etkilemez.
Üretim hesabı toplam adet üzerinden yapılır.

Örnek:

```ts
productionQty = sum(colorQuantities)
Yanlış yaklaşım:
Siyah ayrı üretim emri
Camel ayrı üretim emri
Bordo ayrı üretim emri
Doğru yaklaşım:
Manama toplam 1.600 adet üretim emri
Renk dağılımı yalnızca sipariş detayı / UI bilgisi
Renkler için ayrı master data kullanılmalıdır.
Bu master yapı 02 - Product Details dokümanında ayrıca tanımlanabilir.
Örnek renk havuzu:
black / #111111
white / #F8F8F2
camel / #B8875B
grey_melange / #9B9B9B
burgundy / #6E1F2F
navy / #1D2B53
olive / #6D7452
ecru / #E8DDC8
İlk beta için 15-25 renk yeterlidir.

---

```md
# Önerilen Model: MarketOrderOfferItemColor

Teklif kabul edilmeden önce renk dağılımı `MarketOrderOfferItemColor` tablosunda tutulabilir.

```prisma
model MarketOrderOfferItemColor {
  id                     String @id @default(cuid())

  marketOrderOfferItemId String @map("market_order_offer_item_id")
  colorVariantId         String @map("color_variant_id")

  quantity               Int
  sortOrder              Int    @default(0) @map("sort_order")

  metadata               Json?

  marketOrderOfferItem   MarketOrderOfferItem @relation(fields: [marketOrderOfferItemId], references: [id], onDelete: Cascade)
  colorVariant           ProductColorVariant  @relation(fields: [colorVariantId], references: [id], onDelete: Restrict)

  @@unique([marketOrderOfferItemId, colorVariantId])
  @@index([marketOrderOfferItemId])
  @@index([colorVariantId])
  @@map("market_order_offer_item_colors")
}
Teklif kabul edildiğinde bu kayıtlar CustomerOrderItemColor tablosuna kopyalanır.

---

```md
# Ek Karar: Otomatik Renk Dağılımı

Otomatik sipariş üretiminde sistem önce toplam ürün adedini belirler.
Sonra bu toplam adedi aktif renk havuzundan seçilen renklere dağıtır.

Renk sayısı şu kriterlere göre belirlenmelidir:

- ProductTier
- CustomerSegment
- CustomerVolumeClass
- Toplam sipariş adedi

Önerilen renk sayısı:

| Sipariş Tipi | Renk Sayısı |
|---|---:|
| Basic yüksek adet | 2 - 5 |
| Standard | 2 - 4 |
| Premium | 3 - 6 |
| Luxury Boutique | 2 - 5 |
| Luxury Retail Group | 4 - 8 |

Küçük adetli siparişlerde renk sayısı otomatik düşürülmelidir.

Önerilen minimum adet:

| ProductTier | Min Qty Per Color |
|---|---:|
| BASIC | 200 |
| STANDARD | 150 |
| PREMIUM | 80 |
| LUXURY | 40 |

Örnek kontrol:

```ts
maxColorCount = Math.floor(totalQuantity / minQtyPerColor)
finalColorCount = Math.min(requestedColorCount, maxColorCount)
Renk dağılımı toplamı her zaman teklif satırının toplam adedine eşit olmalıdır.
sum(colorQuantities) === marketOrderOfferItem.quantity