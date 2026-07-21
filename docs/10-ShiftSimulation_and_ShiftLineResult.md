# 10 - ShiftSimulation and ShiftLineResult

Bu doküman, Factory Runway içinde kilitlenmiş günlük üretim planının nasıl çalıştırılacağını, vardiya sonucunun nasıl hesaplanacağını, üretim kuyruklarının nasıl güncelleneceğini, fason dönüşlerinin nasıl yönetileceğini ve vardiya raporunun hangi verilerden oluşacağını tanımlar.

Bu bölümün temel amacı şudur:

> Oyuncunun önceliklendirdiği üretim planını 1 oyun günü için çalıştırmak, sonuçları aggregate kayıtlar halinde saklamak ve ertesi günün üretim kuyruklarını hazırlamak.

ShiftSimulation gerçek zamanlı üretim motoru değildir.
Backend vardiya sonucunu hesaplar, frontend bu sonucu kısa bir simülasyon animasyonu gibi oynatır.

---

# 1. Temel Karar

```text
1 ShiftSimulation = 1 fabrika günü = 1 vardiya
```

Fabrika tek vardiya çalışır.

| Konu | Karar |
|---|---:|
| Vardiya başlangıcı | 08:00 |
| Vardiya bitişi | 17:00 |
| Mola | 12:00 - 13:00 |
| Oyun günü simülasyon süresi | 45 saniye |
| Aynı gün departman transferi | Yok |
| currentDay artışı | Vardiya tamamlanınca |

Mola, kapasiteden ayrıca düşülmez.

`ProductionLineTemplate.dailyPointCapacity`, zaten 1 oyun günü / 1 vardiya için kullanılacak net günlük kapasite olarak kabul edilir.

---

# 2. Aynı Gün Transfer Kararı

Factory Runway içinde aynı gün departman transferi yapılmayacaktır.

Bu karar sadece beta için değil, ana oyun kuralı olarak kabul edilir.

Bir departmanda bugün tamamlanan ürünler, ürün rotasındaki sonraki departmanın kuyruğuna **ertesi oyun günü** hazır olarak girer.

Örnek:

```text
Day 1:
Cutting çalışır.
Gün sonunda Cutting çıktısı Sewing kuyruğuna aktarılır.

Day 2:
Sewing, Day 1'de kesilmiş ürünlerle çalışabilir.
Cutting aynı anda yeni iş kesebilir.

Day 3:
Ironing-Packing, Day 2'de dikilmiş ürünlerle çalışabilir.
```

Bu sistemin amacı oyuncuya kuyruk yönetimi stratejisini hissettirmektir.

Oyuncu her gün:

- Kesim kuyruğunu,
- Dikim kuyruğunu,
- Ütü-paket kuyruğunu,
- Fason bekleyen işleri,
- Gecikme riski olan siparişleri

ayrı ayrı değerlendirebilmelidir.

---

# 3. Vardiya Başlamadan Önce Gerekli Durum

Vardiya başlamadan önce sistemde şu yapılar hazır olmalıdır:

```text
MarketOrderOffer
  ↓ kabul
CustomerOrder
  ↓
CustomerOrderItem
  ↓
ProductionOrder
  ↓
ProductionOrderRouteProgress
  ↓
ProductionPlan
  ↓
ProductionAllocation
```

ShiftSimulation, iş dağıtımı yapmaz.

İş dağıtımı 09 - ProductionPlanning and Allocation dokümanındaki planlama sistemi tarafından yapılır.

ShiftSimulation yalnızca kilitlenmiş planı çalıştırır.

---

# 4. Vardiya Başlatma Akışı

Oyuncu `Vardiyayı Başlat` butonuna bastığında backend şu işlemleri yapar:

```text
1. Factory aktif mi kontrol edilir.
2. Aynı factoryId + currentDay için daha önce ShiftSimulation var mı kontrol edilir.
3. Günlük ProductionPlan var mı kontrol edilir.
4. ProductionPlan LOCKED durumuna alınır.
5. Günlük chaos event üretimi yapılır.
6. ShiftSimulation kaydı oluşturulur.
7. ProductionAllocation kayıtları okunur.
8. Her allocation için sonuç hesaplanır.
9. ShiftLineResult kayıtları oluşturulur.
10. RouteProgress kayıtları güncellenir.
11. Fason dönüşleri kontrol edilir.
12. Üretim emirleri ve sipariş durumları güncellenir.
13. ShiftSimulation COMPLETED olur.
14. Factory.currentDay + 1 yapılır.
15. Vardiya raporu UI’a hazır hale gelir.
```

Frontend tarafında bu sonuç 45 saniyelik simülasyon olarak oynatılır.

---

# 5. Çift Tıklama ve Çoklu Pencere Güvenliği

Vardiya başlatma işlemi yalnızca frontend button disable ile korunmamalıdır.

Asıl güvenlik backend tarafında sağlanmalıdır.

Aynı factory ve aynı oyun günü için yalnızca bir shift kaydı oluşturulabilir.

Önerilen constraint:

```prisma
@@unique([factoryId, gameDay])
```

Backend kuralı:

```text
1. Transaction başlatılır.
2. Aynı factoryId + gameDay için shift var mı kontrol edilir.
3. Yoksa yeni ShiftSimulation oluşturulur.
4. Unique conflict oluşursa mevcut shift döndürülür.
5. Aynı gün ikinci vardiya oluşturulmaz.
```

Ek olarak isteğe bağlı `idempotencyKey` kullanılabilir.

Bu alan çift tıklama, sayfa yenileme veya iki ayrı tarayıcı penceresinden aynı anda başlatma riskini azaltır.

---

# 6. UI Simülasyon Süresi ve Progress Bar

Simülasyon UI süresi varsayılan olarak 45 saniye olmalıdır.

```prisma
simulationDurationSeconds Int @default(45) @map("simulation_duration_seconds")
```

Progress bar dağılımı:

| Oyun Zamanı | UI Süresi | Açıklama |
|---|---:|---|
| 08:00 - 12:00 | 20 sn | Sabah üretimi |
| 12:00 - 13:00 | 5 sn | Mola / iç kontrol hissi |
| 13:00 - 17:00 | 20 sn | Öğleden sonra üretimi |
| Toplam | 45 sn | 1 oyun günü |

Mola kapasiteden ayrıca düşülmez.

Progress bar yalnızca UI hissi için kullanılır.

Backend üretim sonucunu 45 saniye boyunca parça parça yazmaz.

---

# 7. Backend ve Frontend Ayrımı

Backend:

```text
- Vardiya sonucunu hesaplar.
- ShiftSimulation kaydı oluşturur.
- ShiftLineResult kayıtlarını oluşturur.
- RouteProgress / ProductionOrder / CustomerOrder durumlarını günceller.
```

Frontend:

```text
- 45 saniyelik progress bar oynatır.
- Hat kartlarında sayaçları animate eder.
- Chaos event bildirimlerini gösterir.
- Vardiya sonunda rapor ekranını açar.
```

Önemli karar:

```text
Simülasyon sırasında saniyelik DB update yapılmaz.
```

Yanlış yaklaşım:

```text
Her saniye üretilen adetleri DB’ye yazmak.
```

Doğru yaklaşım:

```text
Backend sonucu aggregate hesaplar.
UI sonucu animasyon olarak gösterir.
```

---

# 8. ShiftSimulation Modeli

Önerilen model:

```prisma
model ShiftSimulation {
  id                          String                @id @default(cuid())

  factoryId                   String                @map("factory_id")
  sectorId                    String                @map("sector_id")
  productionPlanId            String?               @map("production_plan_id")

  gameDay                     Int                   @map("game_day")

  status                      ShiftSimulationStatus @default(RUNNING)

  gameStartMinute             Int                   @default(480) @map("game_start_minute")
  gameEndMinute               Int                   @default(1020) @map("game_end_minute")
  breakStartMinute            Int                   @default(720) @map("break_start_minute")
  breakEndMinute              Int                   @default(780) @map("break_end_minute")

  simulationDurationSeconds   Int                   @default(45) @map("simulation_duration_seconds")

  startedAt                   DateTime              @default(now()) @map("started_at")
  completedAt                 DateTime?             @map("completed_at")

  idempotencyKey              String?               @map("idempotency_key")
  randomSeed                  String?               @map("random_seed")
  simulationVersion           String                @default("v1") @map("simulation_version")

  totalAvailablePoints        Int                   @default(0) @map("total_available_points")
  totalEffectivePoints        Int                   @default(0) @map("total_effective_points")
  totalUsedPoints             Int                   @default(0) @map("total_used_points")
  totalUnusedPoints           Int                   @default(0) @map("total_unused_points")
  totalProducedQuantity       Int                   @default(0) @map("total_produced_quantity")

  activeLineCount             Int                   @default(0) @map("active_line_count")
  blockedLineCount            Int                   @default(0) @map("blocked_line_count")
  averageUtilizationBps       Int                   @default(0) @map("average_utilization_bps")

  metadata                    Json?

  createdAt                   DateTime              @default(now()) @map("created_at")
  updatedAt                   DateTime              @updatedAt @map("updated_at")

  factory                     Factory               @relation(fields: [factoryId], references: [id], onDelete: Cascade)
  sector                      Sector                @relation(fields: [sectorId], references: [id], onDelete: Restrict)

  lineResults                 ShiftLineResult[]
  chaosEvents                 FactoryChaosEvent[]

  @@unique([factoryId, gameDay])
  @@unique([factoryId, idempotencyKey])
  @@index([factoryId, status])
  @@index([sectorId])
  @@index([gameDay])
  @@map("shift_simulations")
}
```

Enum:

```prisma
enum ShiftSimulationStatus {
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}
```

Not:

`@@unique([factoryId, idempotencyKey])` kullanılacaksa `idempotencyKey` null olmayan requestlerde atanmalıdır.
Eğer kullanılmayacaksa bu unique constraint eklenmeyebilir.

---

# 9. ShiftLineResult Mantığı

`ShiftLineResult`, vardiya sonunda her allocation satırının sonucunu tutar.

```text
1 ShiftSimulation + 1 ProductionAllocation = 1 ShiftLineResult
```

Çünkü bir üretim hattı aynı vardiyada birden fazla küçük işi işleyebilir.
Bu durumda her iş için ayrı sonuç satırı gerekir.

---

# 10. ShiftLineResult Modeli

Önerilen model:

```prisma
model ShiftLineResult {
  id                              String                @id @default(cuid())

  shiftSimulationId               String                @map("shift_simulation_id")
  factoryId                       String                @map("factory_id")

  productionAllocationId          String?               @map("production_allocation_id")

  factoryProductionLineId         String                @map("factory_production_line_id")
  productionLineTemplateId        String                @map("production_line_template_id")

  productionOrderId               String?               @map("production_order_id")
  productionOrderRouteProgressId  String?               @map("production_order_route_progress_id")
  productRouteStepId              String?               @map("product_route_step_id")

  departmentId                    String                @map("department_id")
  productId                       String?               @map("product_id")

  status                          ShiftLineResultStatus @default(IDLE)

  lineNumber                      Int                   @map("line_number")
  lineSortOrder                   Int                   @default(0) @map("line_sort_order")

  templateDailyPointCapacity      Int                   @map("template_daily_point_capacity")
  plannedPointCapacity            Int                   @default(0) @map("planned_point_capacity")
  effectivePointCapacity          Int                   @default(0) @map("effective_point_capacity")

  workloadPointsPerUnit           Int?                  @map("workload_points_per_unit")
  setupPointsUsed                 Int                   @default(0) @map("setup_points_used")

  inputReadyQuantity              Int                   @default(0) @map("input_ready_quantity")
  plannedQuantity                 Int                   @default(0) @map("planned_quantity")
  producedQuantity                Int                   @default(0) @map("produced_quantity")

  usedPoints                      Int                   @default(0) @map("used_points")
  unusedPoints                    Int                   @default(0) @map("unused_points")

  utilizationBps                  Int                   @default(0) @map("utilization_bps")

  staffCoverageBps                Int                   @default(10000) @map("staff_coverage_bps")
  conditionBps                    Int                   @default(10000) @map("condition_bps")
  eventPenaltyBps                 Int                   @default(10000) @map("event_penalty_bps")

  blockedReason                   String?               @map("blocked_reason")
  metadata                        Json?

  createdAt                       DateTime              @default(now()) @map("created_at")

  shiftSimulation                 ShiftSimulation       @relation(fields: [shiftSimulationId], references: [id], onDelete: Cascade)
  factory                         Factory               @relation(fields: [factoryId], references: [id], onDelete: Cascade)
  factoryProductionLine           FactoryProductionLine @relation(fields: [factoryProductionLineId], references: [id], onDelete: Restrict)
  productionLineTemplate          ProductionLineTemplate @relation(fields: [productionLineTemplateId], references: [id], onDelete: Restrict)
  department                      Department            @relation(fields: [departmentId], references: [id], onDelete: Restrict)

  @@index([shiftSimulationId])
  @@index([factoryId])
  @@index([factoryProductionLineId])
  @@index([departmentId])
  @@index([productionOrderId])
  @@index([productionOrderRouteProgressId])
  @@index([productionAllocationId])
  @@map("shift_line_results")
}
```

Enum:

```prisma
enum ShiftLineResultStatus {
  PRODUCED
  IDLE
  BLOCKED_NO_INPUT
  BLOCKED_NO_ORDER
  BLOCKED_NO_STAFF
  MAINTENANCE
  BROKEN
}
```

---

# 11. Üretim Sonucu Hesap Formülü

Her allocation için önce effective point capacity hesaplanır.

```ts
effectivePoints =
  plannedPointCapacity
  * staffCoverageBps / 10000
  * conditionBps / 10000
  * eventPenaltyBps / 10000
```

Setup point varsa üretimden önce düşülür.

```ts
usablePoints = Math.max(0, effectivePoints - setupPointsUsed)
```

Üretilebilir adet:

```ts
possibleQuantityByCapacity =
  Math.floor(usablePoints / workloadPointsPerUnit)
```

Gerçek üretim:

```ts
producedQuantity = Math.min(
  plannedQuantity,
  availableInputQuantity,
  possibleQuantityByCapacity
)
```

Kullanılan point:

```ts
usedPoints = producedQuantity * workloadPointsPerUnit + setupPointsUsed
```

Boş kalan point:

```ts
unusedPoints = Math.max(0, effectivePoints - usedPoints)
```

Utilization:

```ts
utilizationBps =
  effectivePoints > 0
    ? Math.round(usedPoints * 10000 / effectivePoints)
    : 0
```

---

# 12. ProductionOrderRouteProgress Kuyruk Mantığı

Yeni bir route queue tablosu açılmayacaktır.

Kuyruk, `ProductionOrderRouteProgress` kayıtlarının departman bazlı sıralanmış halidir.

```text
Department Queue = ProductionOrderRouteProgress
where departmentId = selectedDepartment
and status = READY
and inputReadyQuantity > completedQuantity
order by queuePriority ASC
```

Bu yapı hem route ilerlemesini hem de departman kuyruğunu yönetir.

---

# 13. ProductRouteStep Sırasına Göre Transfer

Sistem hiçbir zaman rotayı hardcode etmemelidir.

Yanlış yaklaşım:

```text
Cutting → Sewing → Ironing-Packing her ürün için sabittir.
```

Doğru yaklaşım:

```text
ProductRouteStep.sequence sırası okunur.
Tamamlanan step’ten sonraki step bulunur.
Ürün o step’in departman kuyruğuna gönderilir.
```

Örnek:

```text
Manama:
1. Cutting
2. Printing
3. Sewing
4. Ironing-Packing
```

Cutting tamamlanınca ürün Sewing kuyruğuna değil, Printing kuyruğuna gider.

Eğer oyuncunun Printing hattı yoksa ve step outsource edilebilir ise iş fason
kuyruğuna düşer. Printing hattı varsa iş iç hat kuyruğuna girer; oyuncu isterse
hazır miktarın bir bölümünü yine fasona ayırabilir.

---

# 14. ProductionOrderRouteProgress Alanları

`ProductionOrderRouteProgress` içinde şu alanlar bulunmalıdır:

```prisma
model ProductionOrderRouteProgress {
  id                       String              @id @default(cuid())

  factoryId                String              @map("factory_id")
  productionOrderId        String              @map("production_order_id")
  productRouteStepId       String              @map("product_route_step_id")
  departmentId             String              @map("department_id")

  sequence                 Int

  plannedQuantity          Int                 @map("planned_quantity")
  inputReadyQuantity       Int                 @default(0) @map("input_ready_quantity")
  completedQuantity        Int                 @default(0) @map("completed_quantity")
  inOutsourceQuantity      Int                 @default(0) @map("in_outsource_quantity")

  queuePriority            Int                 @default(100) @map("queue_priority")
  queueEnteredDay          Int?                @map("queue_entered_day")
  manualPriorityOverride   Boolean             @default(false) @map("manual_priority_override")

  status                   RouteProgressStatus @default(WAITING_INPUT)

  metadata                 Json?

  createdAt                DateTime            @default(now()) @map("created_at")
  updatedAt                DateTime            @updatedAt @map("updated_at")

  @@unique([productionOrderId, productRouteStepId])
  @@index([factoryId, departmentId, status])
  @@index([productionOrderId, sequence])
  @@index([departmentId, queuePriority])
  @@map("production_order_route_progress")
}
```

Enum:

```prisma
enum RouteProgressStatus {
  WAITING_INPUT
  READY
  WAITING_OUTSOURCE
  IN_PROGRESS
  COMPLETED
  BLOCKED
}
```

---

# 15. Kuyrukta Üretilebilir Miktar

Bir route step için üretilebilir miktar:

```ts
availableQuantity =
  inputReadyQuantity
  - completedQuantity
  - inOutsourceQuantity
```

Örnek:

```text
Sewing inputReadyQuantity = 1.142
Sewing completedQuantity = 300
Sewing inOutsourceQuantity = 0

availableQuantity = 842
```

Allocation bu miktarı aşamaz.

---

# 16. Gün Sonu RouteProgress Güncellemesi

Vardiya sonunda her `ShiftLineResult` için şu işlem yapılır:

```ts
currentRouteProgress.completedQuantity += producedQuantity
```

Sonra ürünün bir sonraki route step’i bulunur.

```ts
nextStep = productRouteSteps.find(step.sequence > currentStep.sequence)
```

Eğer sonraki step varsa:

```ts
nextRouteProgress.inputReadyQuantity += producedQuantity
```

Eğer ilgili step ilk kez input alıyorsa:

```ts
nextRouteProgress.queueEnteredDay = factory.currentDay + 1
nextRouteProgress.queuePriority = maxQueuePriority(nextDepartment) + 100
```

Status belirleme:

```text
Oyuncuda ilgili department için aktif üretim hattı varsa:
  nextRouteProgress.status = READY

Oyuncuda aktif hat yoksa ve step canOutsource = true ise:
  nextRouteProgress.status = WAITING_OUTSOURCE

Oyuncuda aktif hat yoksa ve outsource edilemiyorsa:
  nextRouteProgress.status = BLOCKED
```

Eğer sonraki step yoksa:

```ts
productionOrder.completedQuantity += producedQuantity
```

Bu durumda ürün üretimden çıkmış ve ürün deposu / sevkiyat bekleme durumuna geçmiş olur.

---

# 17. Varsayılan Kuyruk Sırası

Departman kuyruğuna giren iş varsayılan olarak kuyruğun en altına eklenir.

Varsayılan sıralama:

```text
1. queuePriority ASC
2. queueEnteredDay ASC
3. targetDeliveryDay ASC
4. createdAt ASC
```

Oyuncu departman kuyruğunu drag-drop ile değiştirirse:

```text
manualPriorityOverride = true
```

Bu durumda sistem oyuncunun verdiği `queuePriority` değerini otomatik olarak ezmemelidir.

---

# 18. Fason İşlem Ana Kararı

Fason işlemler production line gibi çalışmaz.

Fason işi vardiya içinde kısmi üretim yapmaz.

Ana kural:

```text
Fason = seçilen hizmet tipine göre X gün sonra toplu dönüş
```

Yani:

```text
Bugün 300 adet bitti, yarın 200 adet bitti
```

şeklinde çalışmaz.

Seçilen fason lead time tamamlandığında ürün toplu olarak sonraki route step kuyruğuna girer.

---

# 19. Fason Akışı

Örnek rota:

```text
Manama:
1. Cutting
2. Printing
3. Sewing
4. Ironing-Packing
```

Oyuncuda Printing hattı yoksa:

```text
Cutting tamamlandı
↓
Printing RouteProgress = WAITING_OUTSOURCE
↓
Oyuncuya 3 fason seçeneği gösterilir
↓
Oyuncu birini seçer
↓
ProductionOutsourceJob oluşur
↓
Lead time tamamlanınca ürün Sewing kuyruğuna girer
```

Oyuncuda Printing hattı varsa karma akış mümkündür:

```text
Printing için 1.000 adet hazır
↓
Oyuncu 600 adedi STANDARD fasona ayırır
↓
inOutsourceQuantity = 600
internalAvailableQuantity = 400
↓
400 adet otomatik iç hat allocation sistemine girer
600 adet fason dönüş gününü bekler
```

Bu karar ayrı bir rota veya `MIXED` enum değeri üretmez. Aynı route progress
aggregate kaydı ve miktarlı `ProductionOutsourceJob` kayıtları kullanılır.

---

# 20. Fason Seçenekleri

Oyuncuya her fason işi için 3 seçenek sunulur.

| Seçenek | Süre | Başlangıç Maliyet Çarpanı | Risk |
|---|---:|---:|---|
| FAST | 2 gün | 12.000 bps | Hızlı, daha yüksek fiyat |
| STANDARD | 3 gün | 10.000 bps | Standart süre ve fiyat |
| SAFE | 4 gün | 8.500 bps | Uzun teslim, daha uygun fiyat |

Bu seçenekler oyuncuya strateji verir.

Örnek:

```text
Acil sipariş → FAST
Normal sipariş → STANDARD
Luxury / hassas müşteri → SAFE
```

Fason birim maliyeti:

```ts
baseUnitCostCents = Math.ceil(
  workloadPointsPerUnit
  * departmentReferenceCostPer1000PointsCents
  / 1000
)

outsourceUnitCostCents = Math.ceil(
  baseUnitCostCents
  * costMultiplierBps
  / 10000
)
```

Referans point maliyeti ilgili departmanın aktif production line template
değerinden okunur. Oyuncunun o departmanda iç hattının bulunması gerekmez.

---

# 21. OutsourceOptionConfig Modeli

Fason seçenekleri config üzerinden yönetilmelidir.

```prisma
model OutsourceOptionConfig {
  id                    String              @id @default(cuid())

  sectorId              String              @map("sector_id")
  departmentId          String              @map("department_id")

  optionType            OutsourceOptionType @map("option_type")

  leadTimeDays          Int                 @map("lead_time_days")
  costMultiplierBps     Int                 @default(10000) @map("cost_multiplier_bps")

  qualityRiskBps        Int                 @default(0) @map("quality_risk_bps")
  delayRiskBps          Int                 @default(0) @map("delay_risk_bps")

  status                ContentStatus       @default(ACTIVE)
  metadata              Json?

  createdAt             DateTime            @default(now()) @map("created_at")
  updatedAt             DateTime            @updatedAt @map("updated_at")

  sector                Sector              @relation(fields: [sectorId], references: [id], onDelete: Cascade)
  department            Department          @relation(fields: [departmentId], references: [id], onDelete: Restrict)

  @@unique([sectorId, departmentId, optionType])
  @@index([sectorId, departmentId, status])
  @@map("outsource_option_configs")
}
```

Enum:

```prisma
enum OutsourceOptionType {
  FAST
  STANDARD
  SAFE
}
```

---

# 22. ProductionOutsourceJob Modeli

Oyuncu fason seçeneğini seçtiğinde gerçek fason işi oluşur.

```prisma
model ProductionOutsourceJob {
  id                                String              @id @default(cuid())

  factoryId                         String              @map("factory_id")
  productionOrderId                 String              @map("production_order_id")
  productionOrderRouteProgressId    String              @map("production_order_route_progress_id")

  departmentId                      String              @map("department_id")
  productId                         String              @map("product_id")

  quantity                          Int

  optionType                        OutsourceOptionType @map("option_type")

  sentDay                           Int                 @map("sent_day")
  readyDay                          Int                 @map("ready_day")
  actualReadyDay                    Int?                @map("actual_ready_day")

  costPerUnitCents                  Int                 @map("cost_per_unit_cents")
  totalCostCents                    Int                 @map("total_cost_cents")

  qualityRiskBps                    Int                 @default(0) @map("quality_risk_bps")
  delayRiskBps                      Int                 @default(0) @map("delay_risk_bps")

  status                            OutsourceJobStatus  @default(IN_PROGRESS)

  metadata                          Json?

  createdAt                         DateTime            @default(now()) @map("created_at")
  updatedAt                         DateTime            @updatedAt @map("updated_at")

  factory                           Factory             @relation(fields: [factoryId], references: [id], onDelete: Cascade)
  department                        Department          @relation(fields: [departmentId], references: [id], onDelete: Restrict)

  @@index([factoryId, status])
  @@index([factoryId, readyDay])
  @@index([productionOrderRouteProgressId])
  @@map("production_outsource_jobs")
}
```

Enum:

```prisma
enum OutsourceJobStatus {
  IN_PROGRESS
  COMPLETED
  DELAYED
  CANCELLED
}
```

---

# 23. Fasona Gönderilebilir Miktar

Aynı ürünün aynı miktarı iki kere fasona gönderilmemelidir.

Bu yüzden `ProductionOrderRouteProgress.inOutsourceQuantity` kullanılır.

```ts
availableToOutsource =
  min(
    plannedQuantity - completedQuantity,
    inputReadyQuantity - completedQuantity
  )
  - inOutsourceQuantity
```

Oyuncu fason işi başlattığında:

```ts
routeProgress.inOutsourceQuantity += outsourceJob.quantity
```

Bu rezervasyon serializable transaction içinde koşullu yapılır. İstek miktarı
`availableToOutsource` değerini aşamaz. UI her karar için sabit bir `requestId`
gönderir ve aynı istek ikinci bir fason işi oluşturamaz.

Fason iş tamamlanınca:

```ts
routeProgress.inOutsourceQuantity -= outsourceJob.quantity
routeProgress.completedQuantity += outsourceJob.quantity
```

Sonra ürün route üzerindeki sonraki step kuyruğuna gönderilir.

---

# 24. Fason Dönüş Zamanı

Fason dönüşü vardiya içinde parça parça gerçekleşmez.

`readyDay` geldiğinde, ilgili günün kapanışında job tamamlanır ve ürün sonraki route step kuyruğuna aktarılır.

Örnek:

```text
Day 2:
Manama Printing fasona gönderildi.
Option: FAST
leadTimeDays = 2
readyDay = 4

Day 4 vardiya kapanışı:
Printing outsource job tamamlanır.
Manama Sewing kuyruğuna aktarılır.

Day 5:
Sewing bu ürünü işleyebilir.
```

Bu karar, aynı gün transfer yapılmaması kuralı ile uyumludur.

---

# 25. Chaos Event Sistemi

Kaos olayları vardiya başladığında üretilir.

Kaos olayları:

- Üretim sonucuna etki eder.
- UI’da simülasyon sırasında gösterilir.
- DB’ye event olarak yazılır.
- Sınırsız geçmiş olarak tutulmaz.

Örnek olaylar:

```text
- Personel devamsızlığı
- Makine arızası
- Grip salgını
- Kötü hava şartları
- Elektrik sorunu
- Malzeme gecikmesi
```

---

# 26. ChaosEventConfig Modeli

Kaos olayları config üzerinden yönetilir.

```prisma
model ChaosEventConfig {
  id                    String          @id @default(cuid())

  sectorId              String          @map("sector_id")

  key                   String
  eventType             ChaosEventType  @map("event_type")
  severity              ChaosSeverity
  scope                 ChaosScope

  minTotalStaff         Int?            @map("min_total_staff")
  maxTotalStaff         Int?            @map("max_total_staff")

  dailyChanceBps        Int             @default(0) @map("daily_chance_bps")
  minPenaltyBps         Int             @default(10000) @map("min_penalty_bps")
  maxPenaltyBps         Int             @default(10000) @map("max_penalty_bps")

  cooldownDays          Int             @default(0) @map("cooldown_days")
  maxOccurrencesPerDay  Int             @default(1) @map("max_occurrences_per_day")

  status                ContentStatus   @default(ACTIVE)
  metadata              Json?

  createdAt             DateTime        @default(now()) @map("created_at")
  updatedAt             DateTime        @updatedAt @map("updated_at")

  sector                Sector          @relation(fields: [sectorId], references: [id], onDelete: Cascade)

  @@unique([sectorId, key])
  @@index([sectorId, status])
  @@map("chaos_event_configs")
}
```

Enums:

```prisma
enum ChaosEventType {
  STAFF_ABSENCE
  MACHINE_BREAKDOWN
  FLU_WAVE
  BAD_WEATHER
  POWER_ISSUE
  MATERIAL_DELAY
}

enum ChaosSeverity {
  MINOR
  MODERATE
  MAJOR
}

enum ChaosScope {
  FACTORY
  DEPARTMENT
  PRODUCTION_LINE
}
```

---

# 27. FactoryChaosEvent Modeli

Gerçekleşen kaos olayları bu tabloda tutulur.

```prisma
model FactoryChaosEvent {
  id                        String          @id @default(cuid())

  factoryId                 String          @map("factory_id")
  shiftSimulationId         String?         @map("shift_simulation_id")
  chaosEventConfigId        String?         @map("chaos_event_config_id")

  gameDay                   Int             @map("game_day")

  eventType                 ChaosEventType  @map("event_type")
  severity                  ChaosSeverity
  scope                     ChaosScope

  departmentId              String?         @map("department_id")
  factoryProductionLineId   String?         @map("factory_production_line_id")

  penaltyBps                Int             @default(10000) @map("penalty_bps")
  affectedStaffCount        Int?            @map("affected_staff_count")

  messageKey                String?         @map("message_key")
  metadata                  Json?

  createdAt                 DateTime        @default(now()) @map("created_at")

  factory                   Factory         @relation(fields: [factoryId], references: [id], onDelete: Cascade)
  shiftSimulation           ShiftSimulation? @relation(fields: [shiftSimulationId], references: [id], onDelete: Cascade)

  @@index([factoryId, gameDay])
  @@index([shiftSimulationId])
  @@index([factoryProductionLineId])
  @@map("factory_chaos_events")
}
```

---

# 28. Kaos Olasılığı Mantığı

Kaos ihtimali fabrika büyüklüğüne göre dengelenmelidir.

| Firma Büyüklüğü | Kaos Mantığı |
|---|---|
| 20 kişi | Her gün eksik personel olmamalı |
| 50 kişi | Ara sıra 1-2 kişi eksik olabilir |
| 200 kişi | Neredeyse her gün birkaç kişi eksik olabilir |
| Büyük fabrika | Küçük olaylar sık, major olaylar nadir |

Basit denge:

```text
Küçük fabrikada olay ihtimali düşük ama etkisi daha hissedilir.
Büyük fabrikada küçük olaylar daha sık ama toplam kapasiteye etkisi daha kontrollü olur.
Major event nadir gerçekleşir.
```

Örnek config:

| Event | Staff Aralığı | Günlük Şans | Etki |
|---|---:|---:|---|
| minor_staff_absence | 1-50 | %15 | ilgili hatta %95-%98 kapasite |
| staff_absence_regular | 51-150 | %45 | 1-3 kişi eksik |
| staff_absence_large | 151+ | %75 | 2-6 kişi eksik |
| machine_minor_issue | her ölçek | hat başı %4 | %90-%97 kapasite |
| flu_wave | 50+ | %2 | fabrika geneli %80-%92 |
| bad_weather | her ölçek | %1 | attendance / dispatch etkisi |

---

# 29. Chaos Event Geçmişi Sınırlama

`FactoryChaosEvent` geçmişi sınırsız büyümemelidir.

Her vardiya sonunda eski kaos kayıtları temizlenebilir.

Önerilen retention:

```text
Son 20 oyun günü saklanır.
currentDay - 20’den eski FactoryChaosEvent kayıtları silinir.
```

Örnek servis:

```ts
deleteOldChaosEvents(factoryId, currentDay - 20)
```

Bu kayıtlar uzun dönem finans veya ranking hesapları için kullanılmayacaktır.

Kalıcı analiz gerekiyorsa ileride günlük snapshot içinde özet değer tutulabilir.

---

# 30. Kaos Etkisinin ShiftLineResult’a Yansıması

Kaos event detayları event tablosunda tutulur.

Ancak üretim sonucu için kullanılan etki değerleri `ShiftLineResult` içine snapshot olarak yazılır.

Örnek:

```text
Sewing Line 1:
staffCoverageBps = 9300
conditionBps = 10000
eventPenaltyBps = 9500
```

Böylece vardiya raporu daha sonra event kaydı temizlense bile üretim sonucunun neden düşük olduğu anlaşılabilir.

---

# 31. Vardiya Sonu Sipariş Durum Güncellemesi

RouteProgress güncellemelerinden sonra ProductionOrder status kontrol edilir.

Önerilen durum mantığı:

```text
Tüm route step completedQuantity >= plannedQuantity ise:
  ProductionOrder.status = COMPLETED

Son route tamamlandı ancak targetDeliveryDay gelmediyse:
  CustomerOrderItem / CustomerOrder READY_TO_SHIP durumunda bekleyebilir.

Teslim günü geldiğinde:
  Sevkiyat / delivery sistemi siparişi tamamlar.
```

Erken biten sipariş hemen sevk edilmez.

Önceki karar korunur:

```text
Sipariş erken tamamlanırsa 20. günü / hedef teslim gününü bekler.
```

---

# 32. Vardiya Raporu

Vardiya sonunda oyuncuya rapor gösterilmelidir.

Minimum rapor alanları:

| Alan | Açıklama |
|---|---|
| Total Produced Quantity | Toplam üretilen adet |
| Department Output | Kesim / dikim / ütü-paket çıktı özeti |
| Line Utilization | Hat bazlı kullanım oranı |
| Blocked Lines | Input yok / personel yok / arıza |
| Delayed Orders | Gecikme riski artan işler |
| Completed Production Orders | Üretimi tamamlanan emirler |
| Outsource Updates | Fasona giden / dönen işler |
| Chaos Events | Günlük devamsızlık / arıza / major olaylar |
| Bottleneck Warning | En sıkışan departman |

Rapor oyuncunun ertesi gün kuyrukları yeniden düzenlemesine yardımcı olmalıdır.

---

# 33. Performans Kararları

| Konu | Karar |
|---|---|
| Ürün başına kayıt | Yok |
| Saniyelik üretim DB update | Yok |
| Shift sonucu | Aggregate kayıt |
| Kuyruk tablosu | Ayrı tablo yok, RouteProgress kullanılır |
| Fason üretim sonucu | Günlük parça parça değil, lead time sonunda toplu |
| Chaos geçmişi | Sınırsız değil, son 20 oyun günü |
| Üretim sonucu | ShiftLineResult snapshot |
| Scale kapasite etkisi | Yok |

Doğru yaklaşım:

```text
1 vardiya + 1 allocation + 1 hat + 1 ürün step = 1 ShiftLineResult
```

Yanlış yaklaşım:

```text
Her ürün adedi için ayrı kayıt üretmek.
```

---

# 34. Final Karar Özeti

| Konu | Karar |
|---|---|
| Simülasyon tipi | 1 vardiya = 1 oyun günü |
| UI süresi | 45 saniye |
| Çalışma saati | 08:00 - 17:00 |
| Mola | 12:00 - 13:00 |
| Mola kapasiteyi düşürür mü? | Hayır |
| Aynı gün transfer | Hayır, hiçbir aşamada yok |
| Shift girdisi | Kilitlenmiş ProductionPlan / ProductionAllocation |
| Shift çıktısı | ShiftLineResult |
| Kuyruk yapısı | ProductionOrderRouteProgress |
| Route sırası | ProductRouteStep.sequence |
| Fason | Lead time sonunda toplu dönüş |
| Fason seçenekleri | FAST / STANDARD / SAFE |
| Kaos olayları | Vardiya başında üretilir |
| Kaos kayıtları | FactoryChaosEvent, son 20 gün |
| currentDay | Vardiya tamamlanınca artar |
| Çift tıklama güvenliği | Unique constraint + transaction |
| UI animasyon | Backend sonucunu oynatır, DB’ye sürekli yazmaz |

Bu yapı ile oyuncu her gün üretim kuyruklarını yönetir, vardiyayı başlatır, 45 saniyede sonuçları izler, rapordan sonra ertesi gün için yeni kararlar alır.

Oyunun stratejik tarafı günlük kuyruk yönetimi, fason seçimi, riskli sipariş kabulü ve gecikme baskısı üzerinden oluşur.
