# 08 - CustomerOrder and ProductionOrder

Bu doküman, Factory Runway içinde oyuncunun kabul ettiği tekliflerin gerçek siparişe ve üretim emirlerine nasıl dönüşeceğini tanımlar.

07 dokümanında teklif pazarı planlandı:

```text
MarketOrderOffer = oyuncuya sunulan teklif
MarketOrderOfferItem = teklif içindeki ürün satırları
```

Bu dokümanda teklif kabul edildikten sonraki yapı tanımlanır:

```text
MarketOrderOffer
  ↓ kabul edilirse
CustomerOrder
  ↓
CustomerOrderItem
  ↓
ProductionOrder
  ↓
ProductionOrderRouteProgress
```

Amaç:

- Ticari sipariş ile üretim emrini birbirinden ayırmak
- Tek ürünlü ve çok ürünlü siparişleri desteklemek
- Üretim simülasyonuna doğru WIP ve route progress verisi sağlamak
- Tek tek ürün kaydı oluşturmadan aggregate takip yapmak
- 20 günlük teslim süresi ile gerçek üretim yükünü ayrı yönetmek

---

# 1. Temel Ayrım

## 1.1 CustomerOrder

`CustomerOrder`, oyuncunun kabul ettiği ticari sipariş başlığıdır.

Bu tablo şu soruya cevap verir:

```text
Oyuncu hangi müşteriden, hangi teslim günüyle, toplam ne kadarlık sipariş aldı?
```

Örnek:

```text
Order No: CO-000128
Customer: Maison Liora
Target Delivery Day: 42
Total Quantity: 1.480 pcs
Total Revenue: 18.500
Status: IN_PRODUCTION
```

## 1.2 CustomerOrderItem

`CustomerOrderItem`, ticari sipariş içindeki ürün satırıdır.

Bu tablo şu soruya cevap verir:

```text
Bu siparişte hangi üründen kaç adet var ve birim fiyatı nedir?
```

Örnek:

```text
CustomerOrder: CO-000128
Item 1: Celia Dress / 180 pcs
Item 2: Veyra Coat / 90 pcs
Item 3: Fanfara Set / 75 pcs
```

## 1.3 ProductionOrder

`ProductionOrder`, üretim sisteminin takip ettiği iş emridir.

V1 kararı:

```text
1 CustomerOrderItem = 1 ProductionOrder
```

Böylece çok ürünlü siparişlerde her ürün kendi üretim akışına sahip olur.

## 1.4 ProductionOrderRouteProgress

`ProductionOrderRouteProgress`, bir üretim emrinin departman bazlı WIP ve tamamlanma durumunu tutar.

Bu tablo simülasyon motorunun ana yakıtıdır. Evet, sonunda motora yakıt koyuyoruz. İnsanlık ilerliyor.

---

# 2. 20 Gün Teslim ve Üretim Yükü Kararı

Teslim süresi ile üretim yükü aynı şey değildir.

Final karar:

```text
CustomerOrder.targetDeliveryDay = kabul gününden genellikle 20 oyun günü sonrası
ProductionOrder üretim yükü = genellikle 3 - 8 günlük fabrika yükü
```

Bu sayede oyuncu:

- Siparişi erken tamamlayabilir
- Ürünü hedef teslim gününe kadar ürün deposunda bekletebilir
- Araya küçük ve kârlı siparişler alabilir
- Fazla sipariş kabul ederse kuyruk ve gecikme yaşar

Erken biten sipariş otomatik olarak hemen sevk edilmez.

```text
Production tamamlandıysa: READY_TO_SHIP
Target delivery day geldiyse: SHIPPED / DELIVERED
```

Bu karar, daha önce belirlenen sevkiyat mantığıyla uyumludur: Sevkiyat ayrı production line değildir, ürün deposu altında dispatch fonksiyonu olarak çalışır.

---

# 3. Veritabanı Yapısı

## 3.1 CustomerOrder

```prisma
model CustomerOrder {
  id                    String              @id @default(cuid())

  factoryId             String              @map("factory_id")
  sectorId              String              @map("sector_id")

  marketOrderOfferId    String?             @unique @map("market_order_offer_id")
  virtualCustomerId     String?             @map("virtual_customer_id")
  customerSegmentId     String?             @map("customer_segment_id")

  orderNo               String              @map("order_no")

  acceptedDay           Int                 @map("accepted_day")
  targetDeliveryDay     Int                 @map("target_delivery_day")
  toleranceDays         Int                 @default(0) @map("tolerance_days")

  priority              Int                 @default(50)

  totalQuantity         Int                 @default(0) @map("total_quantity")
  totalRevenueCents     Int                 @default(0) @map("total_revenue_cents")

  completedQuantity     Int                 @default(0) @map("completed_quantity")
  shippedQuantity       Int                 @default(0) @map("shipped_quantity")

  status                CustomerOrderStatus @default(ACTIVE)

  completedDay          Int?                @map("completed_day")
  shippedDay            Int?                @map("shipped_day")
  lateDays              Int                 @default(0) @map("late_days")

  metadata              Json?

  createdAt             DateTime            @default(now()) @map("created_at")
  updatedAt             DateTime            @updatedAt @map("updated_at")

  factory               Factory             @relation(fields: [factoryId], references: [id], onDelete: Cascade)
  sector                Sector              @relation(fields: [sectorId], references: [id], onDelete: Restrict)

  items                 CustomerOrderItem[]
  productionOrders      ProductionOrder[]

  @@unique([factoryId, orderNo])
  @@index([factoryId, status])
  @@index([factoryId, targetDeliveryDay])
  @@index([sectorId])
  @@map("customer_orders")
}
```

### CustomerOrderStatus

```prisma
enum CustomerOrderStatus {
  ACTIVE
  IN_PRODUCTION
  READY_TO_SHIP
  PARTIALLY_SHIPPED
  SHIPPED
  DELIVERED
  LATE
  CANCELLED
  FAILED
}
```

---

## 3.2 CustomerOrderItem

```prisma
model CustomerOrderItem {
  id                    String                  @id @default(cuid())

  customerOrderId       String                  @map("customer_order_id")
  factoryId             String                  @map("factory_id")
  productId             String                  @map("product_id")

  quantity              Int
  unitPriceCents        Int                     @map("unit_price_cents")
  totalPriceCents       Int                     @map("total_price_cents")

  completedQuantity     Int                     @default(0) @map("completed_quantity")
  shippedQuantity       Int                     @default(0) @map("shipped_quantity")

  status                CustomerOrderItemStatus @default(ACTIVE)

  sortOrder             Int                     @default(0) @map("sort_order")

  productSnapshot       Json?                   @map("product_snapshot")
  pricingSnapshot       Json?                   @map("pricing_snapshot")
  metadata              Json?

  createdAt             DateTime                @default(now()) @map("created_at")
  updatedAt             DateTime                @updatedAt @map("updated_at")

  customerOrder         CustomerOrder           @relation(fields: [customerOrderId], references: [id], onDelete: Cascade)
  factory               Factory                 @relation(fields: [factoryId], references: [id], onDelete: Cascade)
  product               Product                 @relation(fields: [productId], references: [id], onDelete: Restrict)

  productionOrder       ProductionOrder?

  @@index([customerOrderId, sortOrder])
  @@index([factoryId, status])
  @@index([productId])
  @@map("customer_order_items")
}
```

### CustomerOrderItemStatus

```prisma
enum CustomerOrderItemStatus {
  ACTIVE
  IN_PRODUCTION
  READY_TO_SHIP
  SHIPPED
  CANCELLED
  FAILED
}
```

---

## 3.3 ProductionOrder

```prisma
model ProductionOrder {
  id                    String                @id @default(cuid())

  factoryId             String                @map("factory_id")
  sectorId              String                @map("sector_id")

  customerOrderId       String                @map("customer_order_id")
  customerOrderItemId   String                @unique @map("customer_order_item_id")
  productId             String                @map("product_id")

  productionNo          String                @map("production_no")

  plannedQuantity       Int                   @map("planned_quantity")
  completedQuantity     Int                   @default(0) @map("completed_quantity")
  remainingQuantity     Int                   @map("remaining_quantity")

  priority              Int                   @default(50)

  acceptedDay           Int                   @map("accepted_day")
  targetDeliveryDay     Int                   @map("target_delivery_day")

  releasedDay           Int?                  @map("released_day")
  startedDay            Int?                  @map("started_day")
  completedDay          Int?                  @map("completed_day")

  status                ProductionOrderStatus @default(PLANNED)

  metadata              Json?

  createdAt             DateTime              @default(now()) @map("created_at")
  updatedAt             DateTime              @updatedAt @map("updated_at")

  factory               Factory               @relation(fields: [factoryId], references: [id], onDelete: Cascade)
  sector                Sector                @relation(fields: [sectorId], references: [id], onDelete: Restrict)
  customerOrder         CustomerOrder         @relation(fields: [customerOrderId], references: [id], onDelete: Cascade)
  customerOrderItem     CustomerOrderItem     @relation(fields: [customerOrderItemId], references: [id], onDelete: Cascade)
  product               Product               @relation(fields: [productId], references: [id], onDelete: Restrict)

  routeProgress         ProductionOrderRouteProgress[]

  @@unique([factoryId, productionNo])
  @@index([factoryId, status])
  @@index([factoryId, priority])
  @@index([factoryId, targetDeliveryDay])
  @@index([customerOrderId])
  @@index([productId])
  @@map("production_orders")
}
```

### ProductionOrderStatus

```prisma
enum ProductionOrderStatus {
  PLANNED
  RELEASED
  IN_PROGRESS
  WAITING_INPUT
  WAITING_OUTSOURCE
  READY_TO_SHIP
  COMPLETED
  CANCELLED
  FAILED
}
```

---

## 3.4 ProductionOrderRouteProgress

```prisma
model ProductionOrderRouteProgress {
  id                    String              @id @default(cuid())

  factoryId             String              @map("factory_id")
  productionOrderId     String              @map("production_order_id")

  productRouteStepId    String              @map("product_route_step_id")
  departmentId          String              @map("department_id")

  sequence              Int
  isRequired            Boolean             @default(true) @map("is_required")
  canOutsource          Boolean             @default(false) @map("can_outsource")

  processingMode        RouteProcessingMode @default(INTERNAL) @map("processing_mode")

  queuePriority         Int                 @default(50) @map("queue_priority")
  manualPriorityOverride Boolean            @default(false) @map("manual_priority_override")

  plannedQuantity       Int                 @map("planned_quantity")
  inputReadyQuantity    Int                 @default(0) @map("input_ready_quantity")
  completedQuantity     Int                 @default(0) @map("completed_quantity")
  remainingQuantity     Int                 @map("remaining_quantity")

  outsourcedQuantity    Int                 @default(0) @map("outsourced_quantity")
  outsourceReadyDay     Int?                @map("outsource_ready_day")

  workloadPointsPerUnit Int                 @map("workload_points_per_unit")
  setupPoints           Int                 @default(0) @map("setup_points")

  status                RouteProgressStatus @default(WAITING_INPUT)

  metadata              Json?

  createdAt             DateTime            @default(now()) @map("created_at")
  updatedAt             DateTime            @updatedAt @map("updated_at")

  factory               Factory             @relation(fields: [factoryId], references: [id], onDelete: Cascade)
  productionOrder       ProductionOrder     @relation(fields: [productionOrderId], references: [id], onDelete: Cascade)
  productRouteStep      ProductRouteStep    @relation(fields: [productRouteStepId], references: [id], onDelete: Restrict)
  department            Department          @relation(fields: [departmentId], references: [id], onDelete: Restrict)

  @@unique([productionOrderId, departmentId])
  @@index([factoryId, departmentId, status])
  @@index([factoryId, departmentId, status, queuePriority])
  @@index([productionOrderId, sequence])
  @@index([departmentId, status])
  @@map("production_order_route_progress")
}
```

### RouteProcessingMode

```prisma
enum RouteProcessingMode {
  INTERNAL
  OUTSOURCE
}
```

### RouteProgressStatus

```prisma
enum RouteProgressStatus {
  WAITING_INPUT
  READY
  IN_PROGRESS
  WAITING_OUTSOURCE
  COMPLETED
  BLOCKED
  SKIPPED
}
```

---

# 4. Teklif Kabul Akışı

Oyuncu `MarketOrderOffer` kabul ettiğinde işlem tek transaction içinde yapılmalıdır.

Akış:

```text
1. MarketOrderOffer bulunur ve AVAILABLE mı kontrol edilir.
2. Teklif süresi dolmuş mu kontrol edilir.
3. MarketOrderOffer.status = ACCEPTED yapılır.
4. CustomerOrder oluşturulur.
5. Her MarketOrderOfferItem için CustomerOrderItem oluşturulur.
6. Her CustomerOrderItem için ProductionOrder oluşturulur.
7. ProductRouteStep kayıtları sequence sırasıyla okunur.
8. Her route step için ProductionOrderRouteProgress oluşturulur.
9. İlk route step inputReadyQuantity = plannedQuantity olur.
10. Diğer route step kayıtları inputReadyQuantity = 0 başlar.
11. CustomerOrder.status = IN_PRODUCTION olur.
```

Bu işlem sırasında toplam değerler snapshot olarak kaydedilir.

```text
Offer fiyatı değişse bile kabul edilen siparişin fiyatı değişmez.
Product route ileride admin tarafından değişse bile mevcut üretim emri kabul anındaki workload değerleriyle devam eder.
```

Bu yüzden `ProductionOrderRouteProgress.workloadPointsPerUnit` alanı snapshot olarak tutulur.

---

# 5. Route Progress Başlangıç Örneği

Basic T-shirt siparişi:

```text
Quantity: 3.000 pcs
Route:
1. Cutting
2. Sewing
3. Ironing-Packing
```

Sipariş kabul edildiğinde:

| Department | Planned | Input Ready | Completed | Remaining | Status |
| --- | ---: | ---: | ---: | ---: | --- |
| Cutting | 3.000 | 3.000 | 0 | 3.000 | READY |
| Sewing | 3.000 | 0 | 0 | 3.000 | WAITING_INPUT |
| Ironing-Packing | 3.000 | 0 | 0 | 3.000 | WAITING_INPUT |

Kesim 1.000 adet tamamlayınca:

| Department | Input Ready | Completed | Remaining |
| --- | ---: | ---: | ---: |
| Cutting | 2.000 | 1.000 | 2.000 |
| Sewing | 1.000 | 0 | 3.000 |

Dikim 800 adet tamamlayınca:

| Department | Input Ready | Completed | Remaining |
| --- | ---: | ---: | ---: |
| Sewing | 200 | 800 | 2.200 |
| Ironing-Packing | 800 | 0 | 3.000 |

Son route step tamamlandıkça:

```text
ProductionOrder.completedQuantity artar.
CustomerOrderItem.completedQuantity artar.
CustomerOrder.completedQuantity aggregate olarak güncellenir.
```

---

# 6. Fason Route Step Kararı

Başlangıçta şu departmanlar genellikle fason çalışır:

```text
Embroidery
Printing
Washing
Dyeing
```

Eğer ürün route içinde bu departmanlardan birine geldiyse oyuncu iki karar verebilir:

```text
Aktif iç hat varsa hazır miktarın tamamını veya bir bölümünü iç hatta bırakmak
Hazır miktarın tamamını veya bir bölümünü FAST / STANDARD / SAFE fason işine ayırmak
```

İç hat ve fason birbirini dışlayan iki ayrı rota değildir. Aynı
`ProductionOrderRouteProgress` kaydının miktarı iki kanalda eşzamanlı ilerleyebilir.

Kaynak miktar hesabı:

```text
readyQuantity = min(
  plannedQuantity - completedQuantity,
  inputReadyQuantity - completedQuantity
)

internalAvailableQuantity = max(
  0,
  readyQuantity - inOutsourceQuantity
)
```

`processingMode` geriye dönük uyumluluk ve sunum için korunur; allocation
uygunluğunun tek kaynağı değildir. Gerçek iç üretim uygunluğu yukarıdaki miktar,
aktif departman hattı ve rota durumu üzerinden belirlenir.

Her fason rezervasyonu miktarıyla birlikte `ProductionOutsourceJob` kaydı olur.
Oyuncu daha sonra iç hat yatırımı yaparsa devam eden fason işi değişmez; yalnızca
fasona ayrılmamış hazır miktar yeni iç hatta açılır.

---

# 7. Priority ve Departman Kuyruğu Mantığı

Bu sistem oyunun ana karar noktalarından biridir.

Oyuncuya kabul edilmiş üretim emirleri draggable liste olarak gösterilecektir.
Listenin en üstündeki kayıt en yüksek önceliğe sahiptir.

```text
1 = en yüksek öncelik
2 = ikinci öncelik
3 = üçüncü öncelik
```

## 7.1 Global üretim önceliği

Global sipariş listesi `ProductionOrder.priority` alanı ile yönetilir.

```text
ProductionOrder.priority düşük değer = daha yüksek öncelik
```

Oyuncu sipariş listesini drag/drop ile değiştirdiğinde backend ilgili `ProductionOrder.priority` değerlerini günceller.

`CustomerOrder.priority` ticari siparişin genel önceliğidir.
Çok ürünlü siparişlerde bu değer bağlı tamamlanmamış `ProductionOrder` kayıtlarına varsayılan olarak yansıtılabilir.

## 7.2 Departman kuyruğu önceliği

Oyuncu yalnızca genel sipariş sırasını değil, departmanlar arası kuyruklarda bekleyen işleri de stratejik olarak değiştirebilmelidir.

Bu yüzden her route progress kaydında departman bazlı ayrı kuyruk önceliği tutulur:

```text
ProductionOrderRouteProgress.queuePriority
```

Örnek:

```text
Global sipariş sırası:
1. Manama Basic
2. Celia Premium
3. Fanfara Standard

Sewing kuyruğu:
1. Celia Premium
2. Manama Basic
3. Fanfara Standard
```

Bu oyuncuya araya kârlı küçük sipariş alma, gecikme riski yüksek işi öne çekme veya fason dönüşünü bekleyen işi arkaya atma gibi gerçek planlama kararları verir.

## 7.3 Varsayılan kural

Üretim emri oluştuğunda bütün route step kayıtları başlangıçta aynı önceliği alır:

```text
ProductionOrderRouteProgress.queuePriority = ProductionOrder.priority
manualPriorityOverride = false
```

Oyuncu departman kuyruğunda manuel sıralama değiştirirse:

```text
queuePriority güncellenir
manualPriorityOverride = true
```

Daha sonra global `ProductionOrder.priority` değişirse yalnızca `manualPriorityOverride = false` olan route progress kayıtları otomatik güncellenir.
Manuel değiştirilen departman kuyrukları korunur.

## 7.4 Allocation sıralaması

Vardiya planlama sistemi bir departmanda üretilecek işleri şu sıraya göre seçecektir:

```text
1. RouteProgress.status = READY
2. RouteProgress.queuePriority ASC
3. ProductionOrder.targetDeliveryDay ASC
4. ProductionOrder.createdAt ASC
```

Bu yapı UI tarafında kolaydır, çünkü oyuncu listeyi sürükler ve backend sadece sıra değerlerini günceller.
Simülasyon tarafında da temizdir, çünkü üretim hattı hangi işi önce alacağını net şekilde bilir.

## 7.5 CustomerOrderItem priority kararı

V1 için `CustomerOrderItem` seviyesinde ayrıca priority tutulmaz.

Çünkü gerçek planlama kararı şu iki seviyede yeterlidir:

```text
ProductionOrder.priority = global iş sırası
ProductionOrderRouteProgress.queuePriority = departman kuyruğu sırası
```

CustomerOrderItem içine üçüncü bir priority katmanı eklemek V1 için gereksiz karmaşa üretir. Zaten yeterince tablo var, küçük bir veritabanı apartmanı kurduk.

---

# 8. Sipariş Durumu Güncelleme Kuralları

## 8.1 ProductionOrder

| Durum | Kural |
| --- | --- |
| PLANNED | Sipariş üretim emri oluşturuldu ama henüz planlamaya girmedi |
| RELEASED | Üretime açıldı |
| IN_PROGRESS | En az bir route step başladı |
| WAITING_INPUT | Sonraki departman önceki çıktıyı bekliyor |
| WAITING_OUTSOURCE | Fason işlem bekleniyor |
| READY_TO_SHIP | Son route step tamamlandı |
| COMPLETED | Ürün sipariş adedi tamamen üretildi |

## 8.2 CustomerOrderItem

```text
CustomerOrderItem.completedQuantity = bağlı ProductionOrder.completedQuantity
```

Tüm adet tamamlanınca:

```text
CustomerOrderItem.status = READY_TO_SHIP
```

## 8.3 CustomerOrder

Tüm itemlar tamamlanınca:

```text
CustomerOrder.status = READY_TO_SHIP
completedDay = factory.currentDay
```

Target delivery day geldiğinde:

```text
CustomerOrder.status = SHIPPED
shippedDay = factory.currentDay
```

Eğer target delivery day geçtiği halde tamamlanmadıysa:

```text
CustomerOrder.status = LATE
lateDays = currentDay - targetDeliveryDay
```

---

# 9. Neden Ürün Başına Kayıt Yok?

Yanlış yaklaşım:

```text
3.000 adet sipariş = 3.000 ayrı ürün kaydı
```

Doğru yaklaşım:

```text
3.000 adet sipariş = aggregate quantity alanları
```

Bu yüzden sistem şu kayıtları tutar:

```text
CustomerOrderItem.quantity
ProductionOrder.plannedQuantity
ProductionOrderRouteProgress.inputReadyQuantity
ProductionOrderRouteProgress.completedQuantity
```

Bu karar performans için kritiktir.

Simülasyon ve raporlama şu mantıkla çalışacaktır:

```text
1 vardiya + 1 hat + 1 production order + 1 department = 1 aggregate sonuç
```

---

# 10. 09 ve 10 Dokümanlarına Hazırlık

Bu doküman yalnızca kabul edilmiş siparişin üretim yapısını hazırlar.

Sonraki adımlar:

```text
09 - ProductionPlanning and Allocation
10 - ShiftSimulation and ShiftLineResult
```

09 dokümanı şu soruya cevap verecek:

```text
Bugün hangi üretim hattı hangi ProductionOrderRouteProgress kaydını işleyecek?
```

10 dokümanı şu soruya cevap verecek:

```text
Vardiya çalıştığında hangi hat kaç adet üretti, hangi WIP nereye aktı?
```

---

# 11. Final Karar Özeti

| Konu | Karar |
| --- | --- |
| Teklif kabul öncesi yapı | MarketOrderOffer |
| Kabul sonrası ticari sipariş | CustomerOrder |
| Sipariş ürün satırları | CustomerOrderItem |
| Üretim emri | ProductionOrder |
| V1 ilişki kuralı | 1 CustomerOrderItem = 1 ProductionOrder |
| Departman bazlı WIP | ProductionOrderRouteProgress |
| İlk route step input | plannedQuantity kadar READY |
| Sonraki route step input | 0 başlar |
| Workload snapshot | ProductionOrderRouteProgress içinde tutulur |
| Ürün başına kayıt | Yok |
| Erken tamamlanan sipariş | READY_TO_SHIP olarak bekler |
| Sevkiyat | Target delivery day geldiğinde dispatch |
| Global priority | CustomerOrder ve ProductionOrder seviyesinde |
| Departman kuyruk priority | ProductionOrderRouteProgress.queuePriority |
| Draggable order list | ProductionOrder.priority değerini günceller |
| Draggable department queue | ProductionOrderRouteProgress.queuePriority değerini günceller |
| Fason detayları | Ayrı dokümanda derinleştirilecek |



---

# 08’e Eklenecek Kararlar  
## CustomerOrder and ProductionOrder Ek Kararları

```md
# Ek Karar: Kabul Edilmiş Siparişte Renk Dağılımı

Teklif kabul edildiğinde `MarketOrderOfferItemColor` kayıtları `CustomerOrderItemColor` kayıtlarına kopyalanır.

Renk dağılımı kabul edilmiş siparişin görsel ve ticari detayıdır.
V1’de üretim kapasitesini, workload hesaplarını ve departman bazlı WIP akışını etkilemez.

Üretim sistemi toplam adet üzerinden çalışır.

Örnek:

CustomerOrderItem:
- Product: Manama
- Quantity: 1.600

CustomerOrderItemColor:
- Black: 500
- Camel: 300
- Grey Melange: 300
- Burgundy: 300
- White: 200

ProductionOrder:
- Product: Manama
- Planned Quantity: 1.600

Renk dağılımı UI, sipariş detayı ve rapor ekranlarında gösterilir.



# Önerilen Model: CustomerOrderItemColor

```prisma
model CustomerOrderItemColor {
  id                  String @id @default(cuid())

  customerOrderItemId String @map("customer_order_item_id")
  colorVariantId      String @map("color_variant_id")

  quantity            Int
  completedQuantity   Int    @default(0) @map("completed_quantity")

  sortOrder           Int    @default(0) @map("sort_order")

  metadata            Json?

  customerOrderItem   CustomerOrderItem  @relation(fields: [customerOrderItemId], references: [id], onDelete: Cascade)
  colorVariant        ProductColorVariant @relation(fields: [colorVariantId], references: [id], onDelete: Restrict)

  @@unique([customerOrderItemId, colorVariantId])
  @@index([customerOrderItemId])
  @@index([colorVariantId])
  @@map("customer_order_item_colors")
}

completedQuantity V1’de zorunlu üretim hesabı için kullanılmaz.
Ancak ileride sevkiyat raporu ve sipariş tamamlama ekranında kullanılabilir.
Örnek UI:
Black: 500 / 500 hazır
Camel: 260 / 300 hazır
Grey Melange: 300 / 300 hazır

---

```md
# Ek Karar: Pricing Snapshot

`CustomerOrderItem` içinde fiyat kabul anında kilitlenmelidir.

Admin daha sonra ürün referans fiyatını değiştirirse kabul edilmiş sipariş etkilenmemelidir.

Önerilen alanlar:

```prisma
unitPriceCents          Int  @map("unit_price_cents")
totalPriceCents         Int  @map("total_price_cents")
estimatedUnitCostCents  Int? @map("estimated_unit_cost_cents")
estimatedProfitCents    Int? @map("estimated_profit_cents")
pricingSnapshot         Json? @map("pricing_snapshot")
pricingSnapshot, teklif fiyatının nasıl oluştuğunu saklar.
Örnek:
{
  "baseUnitPriceCents": 400,
  "finalUnitPriceCents": 478,
  "productTier": "PREMIUM",
  "customerSegment": "premium_brand",
  "volumeClass": "regular",
  "tierMultiplierBps": 13500,
  "customerMultiplierBps": 11800,
  "volumeMultiplierBps": 9400,
  "deliveryPressureMultiplierBps": 10500,
  "marketRandomBps": 10200
}
Bu yapı hem finans raporları hem de debug için kullanılabilir.
Oyuncuya bu detayların tamamı gösterilmek zorunda değildir.

---

```md
# Ek Karar: Draggable Ana Sipariş Önceliği

Oyuncu kabul edilmiş üretim siparişlerini draggable liste olarak görebilmelidir.

Ana liste sırası `ProductionOrder.priority` alanı ile yönetilir.

Örnek:

```text
1. Manama Basic T-shirt / 3.000 adet
2. Celia Premium Blouse / 400 adet
3. Fanfara Hoodie / 1.000 adet
Oyuncu listedeki sıralamayı değiştirdiğinde sistem ProductionOrder.priority değerlerini günceller.
Önerilen alan:
priority Int @default(100)
Bu alan global üretim önceliğidir.
Yani siparişin genel olarak fabrikada ne kadar öncelikli olduğunu gösterir.
Kural:
Daha küçük priority değeri daha yüksek önceliktir.
Drag-drop sonrası priority değerleri yeniden normalize edilebilir.
Örneğin 100, 200, 300 gibi boşluklu değerler kullanılabilir.
Böylece ara eklemelerde tüm listeyi her zaman yeniden yazmak gerekmez.
Örnek:
priority = 100 → en üst sıra
priority = 200 → ikinci sıra
priority = 300 → üçüncü sıra

---

```md
# Ek Karar: Departman Kuyruğu Önceliği

Oyuncu yalnızca ana sipariş listesini değil, departmanlar arası üretim kuyruklarını da yönetebilmelidir.

Bu nedenle `ProductionOrderRouteProgress` içinde departman bazlı ayrı kuyruk önceliği tutulmalıdır.

Önerilen alanlar:

```prisma
queuePriority          Int     @default(100) @map("queue_priority")
manualPriorityOverride Boolean @default(false) @map("manual_priority_override")
ProductionOrder.priority global sipariş sırasıdır.
ProductionOrderRouteProgress.queuePriority ise ilgili departmandaki kuyruk sırasıdır.
Örnek:
Bir sipariş global listede 3. sırada olabilir.
Ancak oyuncu bu siparişin dikim aşamasını öne almak isteyebilir.
Bu durumda:
ProductionOrder.priority = 300
Sewing RouteProgress.queuePriority = 100
manualPriorityOverride = true
Bu oyun açısından önemlidir.
Oyuncu kârlı küçük siparişleri araya alabilir, gecikme riski olan işleri öne çekebilir veya fason dönüşünü bekleyen işleri arkaya atabilir.

---

```md
# Allocation Sıralama Kuralı

Vardiya planlaması yapılırken sistem departman kuyruğunu şu sıraya göre okumalıdır:

```text
1. RouteProgress.status = READY
2. queuePriority ASC
3. targetDeliveryDay ASC
4. ProductionOrder.priority ASC
5. createdAt ASC
Bu sayede oyuncunun manuel kuyruk hamleleri simülasyonu gerçekten etkiler.
Eğer manualPriorityOverride = false ise sistem queuePriority değerini global ProductionOrder priority’den türetebilir.
Örnek:
if (!manualPriorityOverride) {
  queuePriority = productionOrder.priority
}
Oyuncu departman kuyruğunu manuel değiştirdiyse sistem bu değeri otomatik ezmemelidir.

---

```md
# Final Karar: Oyuncu Planlama Kontrolü

Factory Runway içinde oyuncunun temel strateji alanlarından biri sipariş ve departman kuyruğu önceliği olacaktır.

Oyuncu:

- Kabul edilmiş siparişlerin ana üretim sırasını değiştirebilir.
- Kesim kuyruğunda bekleyen işleri öne / arkaya alabilir.
- Dikim kuyruğunda kârlı veya acil işleri öne çekebilir.
- Ütü-paket kuyruğunda sevkiyata yakın işleri hızlandırabilir.
- Fason dönüşü bekleyen işleri planlamaya göre yeniden sıralayabilir.

Bu sistem oyunun sadece otomatik üretim simülasyonu gibi hissettirmesini engeller.
Oyuncuya gerçek planlama baskısı ve stratejik kontrol verir.
