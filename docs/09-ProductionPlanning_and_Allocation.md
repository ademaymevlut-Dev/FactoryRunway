# 09 - ProductionPlanning and Allocation

Bu doküman, Factory Runway içinde kabul edilmiş üretim emirlerinin vardiya öncesinde üretim hatlarına nasıl dağıtılacağını tanımlar.

Bu aşama `CustomerOrder / ProductionOrder` ile `ShiftSimulation` arasında köprü görevi görür.

Akış:

```text
CustomerOrder
  ↓
CustomerOrderItem
  ↓
ProductionOrder
  ↓
ProductionOrderRouteProgress
  ↓
ProductionPlanning / Allocation
  ↓
ShiftSimulation
  ↓
ShiftLineResult
```

Amaç:

- Oyuncunun global sipariş önceliğini üretim planına yansıtmak
- Oyuncunun departman kuyruğu hamlelerini üretim planına yansıtmak
- Her aktif üretim hattına o gün hangi işi yapacağını belirlemek
- Aynı departmanda birden fazla hat varsa işi kapasiteye göre bölmek
- Küçük kârlı siparişleri araya alma stratejisini desteklemek
- ShiftSimulation için temiz ve kilitlenmiş bir günlük plan üretmek

---

# 1. Temel Karar

`ProductionPlanning`, üretimin kendisi değildir.

Bu sistem yalnızca şu soruya cevap verir:

```text
Bugün hangi üretim hattı, hangi departman kuyruğundaki hangi işi, kaç adet planlıyor?
```

Gerçek üretim sonucu sonraki dokümanda tanımlanacak `ShiftSimulation` ve `ShiftLineResult` tarafından hesaplanır.

Final karar:

```text
ProductionPlan = günlük vardiya planı
ProductionAllocation = bir üretim hattının o gün işleyeceği plan satırı
ShiftLineResult = vardiya sonunda gerçekleşen sonuç
```

Yani allocation planlanan üretimdir, kesin gerçekleşen üretim değildir.

---

# 2. Oyuncu Kontrolü

Oyuncu üretim hattına tek tek iş sürüklemek zorunda kalmamalıdır.

V1 oynanış kararı:

```text
Oyuncu sipariş ve departman kuyruğu önceliklerini değiştirir.
Sistem bu önceliklere göre üretim hatlarına otomatik allocation yapar.
```

Oyuncunun ana kontrol noktaları:

| Kontrol | Veri Alanı | Etki |
| --- | --- | --- |
| Kabul edilmiş sipariş listesi | `ProductionOrder.priority` | Global iş önceliği |
| Departman kuyruğu | `ProductionOrderRouteProgress.queuePriority` | Departman bazlı üretim sırası |
| Manuel departman override | `manualPriorityOverride` | Global değişikliklerden korunur |

Bu karar oyunu tamamen otomatikleştirmez.
Oyuncu planlama baskısını priority ve queue yönetimiyle yaşar.

---

# 3. Planlama Zamanı

Planlama iki durumda üretilebilir:

1. Oyuncu vardiya öncesinde plan önizlemesi istediğinde
2. Oyuncu `Vardiyayı Başlat` butonuna bastığında

Eğer oyuncu vardiyayı başlatırken güncel bir plan yoksa sistem otomatik plan üretir ve kilitler.

```text
No draft plan → generate plan → lock plan → start shift
Draft plan exists → validate → lock plan → start shift
Dirty draft plan → regenerate → lock plan → start shift
```

---

# 4. Aynı Gün İçinde Akış Kararı

V1 için önemli karar:

```text
Bir departmanda bugün üretilen çıktı, sonraki departmanda aynı gün kullanılmaz.
```

Yani kesimde bugün tamamlanan ürünler, dikim için bir sonraki oyun gününde `inputReadyQuantity` olur.

Bu kararın sebebi:

- Vardiya simülasyonunu sade tutmak
- Saatlik mikro planlama ihtiyacını kaldırmak
- Departman kuyruklarını daha görünür yapmak
- 20 günlük teslim penceresinde gerçekçi bekleme ve WIP yaratmak

Gelecekte batch transfer veya aynı gün transfer sistemi eklenebilir.
Ancak V1 için planlama yalnızca vardiya başlangıcındaki `inputReadyQuantity` değerlerini kullanır.

---

# 5. Allocation İçin Uygun İşler

Bir `ProductionOrderRouteProgress` kaydı allocation için uygunsa şu koşulları sağlamalıdır:

```text
status = READY, IN_PROGRESS veya iç hatta ayrılabilir miktarı bulunan WAITING_OUTSOURCE
inputReadyQuantity > 0
remainingQuantity > 0
ilgili department içinde aktif üretim hattı var
internalAvailableQuantity > 0
```

Buradaki miktar hesabı:

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

`ProductionAllocation` yalnızca `internalAvailableQuantity` içinden pay alır.
`inOutsourceQuantity` ile rezerve edilmiş adet allocation içine giremez.
`processingMode = OUTSOURCE` tek başına kaydı allocation dışında bırakmaz; çünkü
oyuncu aynı route step içinde kısmi fason ve kısmi iç üretim kullanabilir.

---

# 6. Allocation Sıralama Kuralı

Bir departmanda üretilecek işler şu sıraya göre seçilir:

```text
1. RouteProgress.status = READY
2. RouteProgress.queuePriority ASC
3. ProductionOrder.targetDeliveryDay ASC
4. ProductionOrder.priority ASC
5. ProductionOrder.createdAt ASC
```

Bu sıralama sayesinde:

- Oyuncunun departman kuyruğu hamlesi en güçlü etkiyi yapar
- Aynı priority durumunda teslim tarihi daha yakın olan iş öne geçer
- Global sipariş sırası hâlâ destekleyici etki yapar
- Eşitlikte eski sipariş önce işlenir

---

# 7. Üretim Hattı Seçim Kuralı

Her üretim hattı yalnızca kendi departmanındaki route progress kayıtlarını işleyebilir.

Örnek:

```text
Sewing Line → sadece sewing department queue
Cutting Line → sadece cutting department queue
Ironing-Packing Line → sadece ironing_packing department queue
```

Line seçimi:

```text
1. FactoryProductionLine.status = ACTIVE
2. Department eşleşmeli
3. Hat bakımda veya arızalı olmamalı
4. Hat günlük plan kapasitesine sahip olmalı
```

Line sıralaması:

```text
FactoryProductionLine.sortOrder ASC
FactoryProductionLine.lineNumber ASC
```

---

# 8. Bir Hat Birden Fazla İş Alabilir mi?

V1 için karar:

```text
Bir üretim hattı aynı vardiyada birden fazla allocation satırı alabilir.
```

Sebep:

- Küçük Premium / Luxury işleri araya alabilmek
- Küçük siparişlerin bütün hattı bir gün kilitlemesini önlemek
- Kapasite kullanımını daha gerçekçi yapmak
- Oyuncuya kuyruk yönetimiyle daha fazla strateji vermek

Bir hattın aynı vardiyada işleyebileceği farklı plan satırı için adet sınırı
yoktur. Hat, kullanılabilir point kapasitesi ve üretime hazır kuyruk kaydı
kaldığı sürece sıradaki işe geçer.

```text
while remainingPointCapacity > 0 and readyQueue is not empty:
  allocate next queue item
```

Bir kuyruk kaydı tamamen bittiğinde mesai devam ediyorsa sıradaki hazır kayıt
işlenir. İlk sıradaki kayıt kalan point ile en az 1 adet dahi üretilemiyorsa
kuyruk önceliği atlanmaz ve hat o vardiyayı kalan point ile kapatır.

---

# 9. Setup Points Kararı

Bir hat aynı vardiyada birden fazla iş alıyorsa her allocation satırı `setupPoints` tüketebilir.

`setupPoints`, `ProductionOrderRouteProgress` içinde snapshot olarak tutulur.

Basit hesap:

```ts
allocationUsedPoints = plannedQuantity * workloadPointsPerUnit + setupPoints
```

Eğer aynı hatta aynı product için ardışık allocation yapılırsa ileride setup azaltılabilir.
V1 için basit kural yeterlidir:

```text
Her allocation kendi setupPoints değerini kullanır.
```

SetupPoints düşük tutulmalıdır.
Aksi halde küçük siparişleri araya alma sistemi cezaya dönüşür. İnsanlar zaten gerçek hayatta yeterince cezalandırılıyor.

---

# 10. Kapasite Hesaplama Mantığı

Planning aşamasında random kaos uygulanmaz.

Planlama, oyuncunun vardiya başındaki görünen kapasitesine göre yapılır.

```ts
plannedAvailablePoints =
  templateDailyPointCapacity
  * staffCoverageBps / 10000
  * conditionBps / 10000
```

Burada:

| Alan | Kaynak |
| --- | --- |
| `templateDailyPointCapacity` | ProductionLineTemplate |
| `staffCoverageBps` | hat / departman personel durumu |
| `conditionBps` | FactoryProductionLine.conditionBps |

Random devamsızlık, arıza ve olay cezaları planlama aşamasında uygulanmaz.
Bunlar `ShiftSimulation` aşamasında uygulanır.

---

# 11. Allocation Quantity Hesabı

Bir route progress için allocation yapılırken önce allocate edilebilir adet bulunur:

```ts
allocatableQuantity =
  min(inputReadyQuantity, remainingQuantity)
  - alreadyPlannedQuantityForThisRouteProgress
```

Hat üzerinde kalan point:

```ts
remainingLinePoints = plannedAvailablePoints - usedLinePoints
```

Setup sonrası üretilebilir adet:

```ts
availableForProductionPoints = remainingLinePoints - setupPoints

possibleQuantity = Math.floor(
  availableForProductionPoints / workloadPointsPerUnit
)
```

Planlanan adet:

```ts
plannedQuantity = min(allocatableQuantity, possibleQuantity)
```

Planlanan point:

```ts
plannedPoints = plannedQuantity * workloadPointsPerUnit + setupPoints
```

Eğer `plannedQuantity <= 0` ise allocation oluşturulmaz.

---

# 12. Büyük Siparişin Birden Fazla Hatta Bölünmesi

Aynı departmanda birden fazla aktif hat varsa, aynı route progress birden fazla hatta bölünebilir.

Örnek:

```text
Manama Sewing inputReadyQuantity = 3.000
Sewing Line 1 kapasite = 1.152 adet
Sewing Line 2 kapasite = 1.152 adet
Sewing Line 3 kapasite = 1.152 adet
```

Plan:

| Line | Planned Qty |
| --- | ---: |
| Sewing Line 1 | 1.152 |
| Sewing Line 2 | 1.152 |
| Sewing Line 3 | 696 |

Bu sayede büyük siparişler fabrika büyüdükçe doğal olarak daha hızlı işlenir.
Fabrika scale doğrudan kapasite çarpanı vermez; gerçek kapasite aktif hatlardan gelir.

---

# 13. Küçük Siparişlerin Araya Alınması

Oyuncu departman kuyruğunda küçük ve kârlı bir işi öne alırsa allocation bunu dikkate alır.

Örnek:

```text
Sewing queue:
1. Celia Premium / 300 pcs
2. Manama Basic / 3.000 pcs
```

Allocation önce Celia Premium için kapasite ayırır.
Kalan kapasite varsa Manama Basic devam eder.

Bu oyun açısından önemlidir:

```text
Oyuncu her zaman en büyük işi üretmek zorunda değildir.
Kâr, termin ve kapasite arasında strateji kurar.
```

---

# 14. Plan Dirty Durumu

Bir günlük plan oluşturulduktan sonra aşağıdaki olaylar olursa plan `DIRTY` sayılmalıdır:

- Oyuncu yeni sipariş kabul eder
- Oyuncu global ProductionOrder priority değiştirir
- Oyuncu departman queuePriority değiştirir
- Üretim hattı eklenir / kapatılır
- Hat bakım / arıza durumuna geçer
- Personel coverage ciddi değişir

Dirty plan vardiya başlatılırken tekrar oluşturulmalıdır.

```text
DIRTY plan lock edilmez.
Önce regenerate edilir.
Sonra lock edilir.
```

---

# 15. ProductionPlan Modeli

`ProductionPlan`, bir fabrika için bir oyun gününe ait plan başlığıdır.

```prisma
model ProductionPlan {
  id                    String               @id @default(cuid())

  factoryId             String               @map("factory_id")
  sectorId              String               @map("sector_id")

  gameDay               Int                  @map("game_day")
  status                ProductionPlanStatus @default(DRAFT)

  generatedAt           DateTime             @default(now()) @map("generated_at")
  lockedAt              DateTime?            @map("locked_at")
  executedAt            DateTime?            @map("executed_at")

  activeLineCount        Int                  @default(0) @map("active_line_count")
  plannedLineCount       Int                  @default(0) @map("planned_line_count")
  idleLineCount          Int                  @default(0) @map("idle_line_count")

  totalPlannedQuantity   Int                  @default(0) @map("total_planned_quantity")
  totalPlannedPoints     Int                  @default(0) @map("total_planned_points")
  averagePlannedUtilizationBps Int            @default(0) @map("average_planned_utilization_bps")

  metadata              Json?

  createdAt             DateTime             @default(now()) @map("created_at")
  updatedAt             DateTime             @updatedAt @map("updated_at")

  factory               Factory              @relation(fields: [factoryId], references: [id], onDelete: Cascade)
  sector                Sector               @relation(fields: [sectorId], references: [id], onDelete: Restrict)

  allocations           ProductionAllocation[]

  @@unique([factoryId, gameDay])
  @@index([factoryId, status])
  @@index([sectorId])
  @@map("production_plans")
}
```

## ProductionPlanStatus

```prisma
enum ProductionPlanStatus {
  DRAFT
  DIRTY
  LOCKED
  EXECUTED
  CANCELLED
}
```

---

# 16. ProductionAllocation Modeli

`ProductionAllocation`, günlük plan içinde bir üretim hattının işleyeceği plan satırıdır.

Bir üretim hattının aynı gün birden fazla allocation satırı olabilir.

```prisma
model ProductionAllocation {
  id                              String                     @id @default(cuid())

  productionPlanId                String                     @map("production_plan_id")

  factoryId                       String                     @map("factory_id")
  sectorId                        String                     @map("sector_id")
  gameDay                         Int                        @map("game_day")

  factoryProductionLineId         String                     @map("factory_production_line_id")
  productionLineTemplateId        String                     @map("production_line_template_id")

  productionOrderRouteProgressId  String                     @map("production_order_route_progress_id")
  productionOrderId               String                     @map("production_order_id")
  customerOrderId                 String                     @map("customer_order_id")
  customerOrderItemId             String                     @map("customer_order_item_id")

  productId                       String                     @map("product_id")
  departmentId                    String                     @map("department_id")
  productRouteStepId              String                     @map("product_route_step_id")

  lineSequence                    Int                        @default(0) @map("line_sequence")
  planSortOrder                   Int                        @default(0) @map("plan_sort_order")

  plannedQuantity                 Int                        @map("planned_quantity")
  plannedWorkloadPoints           Int                        @map("planned_workload_points")
  plannedSetupPoints              Int                        @default(0) @map("planned_setup_points")
  plannedTotalPoints              Int                        @map("planned_total_points")

  workloadPointsPerUnit           Int                        @map("workload_points_per_unit")

  lineDailyPointCapacitySnapshot  Int                        @map("line_daily_point_capacity_snapshot")
  lineConditionBpsSnapshot        Int                        @default(10000) @map("line_condition_bps_snapshot")
  staffCoverageBpsSnapshot        Int                        @default(10000) @map("staff_coverage_bps_snapshot")
  plannedAvailablePointsSnapshot  Int                        @map("planned_available_points_snapshot")

  status                          ProductionAllocationStatus @default(PLANNED)
  source                          ProductionAllocationSource @default(AUTO)

  lockedAt                        DateTime?                  @map("locked_at")

  metadata                        Json?

  createdAt                       DateTime                   @default(now()) @map("created_at")
  updatedAt                       DateTime                   @updatedAt @map("updated_at")

  productionPlan                  ProductionPlan             @relation(fields: [productionPlanId], references: [id], onDelete: Cascade)

  factory                         Factory                    @relation(fields: [factoryId], references: [id], onDelete: Cascade)
  sector                          Sector                     @relation(fields: [sectorId], references: [id], onDelete: Restrict)
  factoryProductionLine           FactoryProductionLine      @relation(fields: [factoryProductionLineId], references: [id], onDelete: Restrict)
  productionLineTemplate          ProductionLineTemplate     @relation(fields: [productionLineTemplateId], references: [id], onDelete: Restrict)

  productionOrderRouteProgress    ProductionOrderRouteProgress @relation(fields: [productionOrderRouteProgressId], references: [id], onDelete: Restrict)
  productionOrder                 ProductionOrder            @relation(fields: [productionOrderId], references: [id], onDelete: Restrict)
  customerOrder                   CustomerOrder              @relation(fields: [customerOrderId], references: [id], onDelete: Restrict)
  customerOrderItem               CustomerOrderItem          @relation(fields: [customerOrderItemId], references: [id], onDelete: Restrict)
  product                         Product                    @relation(fields: [productId], references: [id], onDelete: Restrict)
  department                      Department                 @relation(fields: [departmentId], references: [id], onDelete: Restrict)
  productRouteStep                ProductRouteStep           @relation(fields: [productRouteStepId], references: [id], onDelete: Restrict)

  @@unique([productionPlanId, factoryProductionLineId, lineSequence])
  @@index([factoryId, gameDay])
  @@index([factoryId, departmentId, gameDay])
  @@index([factoryProductionLineId, gameDay])
  @@index([productionOrderRouteProgressId])
  @@index([productionOrderId])
  @@index([status])
  @@map("production_allocations")
}
```

## ProductionAllocationStatus

```prisma
enum ProductionAllocationStatus {
  PLANNED
  LOCKED
  EXECUTED
  PARTIALLY_EXECUTED
  SKIPPED
  CANCELLED
}
```

## ProductionAllocationSource

```prisma
enum ProductionAllocationSource {
  AUTO
  QUEUE_PRIORITY
  SYSTEM_REPLAN
}
```

---

# 17. Neden Snapshot Alanları Var?

Allocation oluştuğu anda bazı değerler snapshot olarak tutulur.

Amaç:

- Plan ekranında oyuncunun gördüğü değerlerin sonradan değişmemesi
- Vardiya raporunda planlanan ile gerçekleşenin karşılaştırılabilmesi
- Admin seed değişikliği sonrası eski planların bozulmaması

Snapshot tutulacak değerler:

| Alan | Sebep |
| --- | --- |
| `workloadPointsPerUnit` | Ürün route değişirse eski plan bozulmasın |
| `lineDailyPointCapacitySnapshot` | Hat template kapasitesi değişirse eski plan bozulmasın |
| `lineConditionBpsSnapshot` | Plan anındaki hat kondisyonu görülsün |
| `staffCoverageBpsSnapshot` | Plan anındaki personel durumu görülsün |
| `plannedAvailablePointsSnapshot` | Planlanan kapasite raporlanabilsin |

---

# 18. Plan Oluşturma Akışı

Backend servis önerisi:

```ts
generateProductionPlan(factoryId, gameDay)
```

Akış:

```text
1. Factory bilgisi okunur.
2. Mevcut gün için LOCKED / EXECUTED plan var mı kontrol edilir.
3. Eski DRAFT / DIRTY plan varsa allocations silinir veya iptal edilir.
4. Aktif FactoryProductionLine kayıtları alınır.
5. Her hattın ProductionLineTemplate kapasitesi alınır.
6. READY durumdaki ProductionOrderRouteProgress kayıtları departmanlara göre gruplanır.
7. Her departmanda queuePriority sırasına göre işler hazırlanır.
8. Her aktif hat için kapasite dolana kadar allocation satırları oluşturulur.
9. Plan özetleri hesaplanır.
10. ProductionPlan.status = DRAFT olarak kaydedilir.
```

---

# 19. Plan Kilitleme Akışı

Backend servis önerisi:

```ts
lockProductionPlan(factoryId, gameDay)
```

Akış:

```text
1. ProductionPlan bulunur.
2. Plan DIRTY ise yeniden oluşturulur.
3. READY route progress değerleri tekrar doğrulanır.
4. Allocation toplamları inputReadyQuantity değerlerini aşıyor mu kontrol edilir.
5. ProductionPlan.status = LOCKED yapılır.
6. Bağlı ProductionAllocation.status = LOCKED yapılır.
7. lockedAt atanır.
8. ShiftSimulation başlatılabilir hale gelir.
```

Kilitlenmiş plan üzerinde oyuncu priority değiştiremez.
Priority değişikliği bir sonraki oyun günü planını etkiler.

---

# 20. Vardiya Başlatma ile İlişki

`Vardiyayı Başlat` butonu şu işlemi yapmalıdır:

```text
1. Bugünün planı var mı kontrol edilir.
2. Yoksa generateProductionPlan çağrılır.
3. Plan DIRTY ise regenerate edilir.
4. Plan lock edilir.
5. ShiftSimulation başlatılır.
```

ShiftSimulation yalnızca LOCKED plan üzerinden çalışmalıdır.

```text
DRAFT plan ile shift başlatılmaz.
```

---

# 21. Allocation Sonrası RouteProgress Hemen Düşülmeli mi?

Hayır.

Plan oluşturulunca `ProductionOrderRouteProgress.inputReadyQuantity` azaltılmamalıdır.

Çünkü allocation yalnızca plandır.
Gerçek düşüm ShiftSimulation tamamlandığında yapılır.

Doğru akış:

```text
ProductionPlan oluşturulur → route progress değişmez
ProductionPlan lock edilir → route progress hâlâ değişmez
ShiftSimulation tamamlanır → gerçekleşen adet kadar route progress güncellenir
```

Bu karar oyuncunun planı iptal etmesini veya yeniden oluşturmasını kolaylaştırır.

---

# 22. UI Planlama Ekranı

Oyuncuya üç ana bölüm gösterilebilir:

## 22.1 Global Order List

Draggable kabul edilmiş üretim emirleri.

```text
1. Manama Basic / 3.000 pcs
2. Celia Premium / 400 pcs
3. Fanfara Hoodie / 1.000 pcs
```

Bu liste `ProductionOrder.priority` günceller.

## 22.2 Department Queues

Departman bazlı draggable kuyruklar.

```text
Cutting Queue
Sewing Queue
Ironing-Packing Queue
```

Bu liste `ProductionOrderRouteProgress.queuePriority` günceller.

## 22.3 Daily Plan Preview

Sistem tarafından oluşturulan günlük hat planı.

Örnek:

```text
Sewing Line 1
- Celia Premium / 300 pcs
- Manama Basic / 620 pcs

Sewing Line 2
- Manama Basic / 1.152 pcs
```

Oyuncu V1’de doğrudan line assignment yapmaz.
Sadece queue değiştirir, sistem planı yeniden üretir.

---

# 23. Plan Preview Metrikleri

Plan önizleme ekranında gösterilebilecek metrikler:

| Metrik | Açıklama |
| --- | --- |
| Planned Qty | Bugün planlanan toplam adet |
| Planned Points | Bugün kullanılacak toplam point |
| Planned Utilization | Hat kapasitesinin planlanan kullanım oranı |
| Idle Lines | İş alamayan hat sayısı |
| Blocked Queues | Input bekleyen departman işleri |
| Delivery Risk | Termin riski yüksek production order sayısı |
| Queue Pressure | Departman kuyruğu yoğunluğu |

Bu metrikler oyuncuya vardiya başlamadan önce karar hissi verir.

---

# 24. RouteProgress Durum Güncelleme Hazırlığı

Planlama öncesinde route progress durumları normalize edilmelidir.

Basit kural:

```ts
if completedQuantity >= plannedQuantity:
  status = COMPLETED
else if internalAvailableQuantity > 0 and activeInternalLineExists:
  status = completedQuantity > 0 ? IN_PROGRESS : READY
else if inOutsourceQuantity > 0:
  status = WAITING_OUTSOURCE
else if internalAvailableQuantity > 0 and canOutsource:
  status = WAITING_OUTSOURCE
else if inputReadyQuantity <= completedQuantity:
  status = completedQuantity > 0 ? IN_PROGRESS : WAITING_INPUT
else:
  status = BLOCKED
```

Bu normalize işlemi allocation öncesi yapılır.

---

# 25. Performans Kararları

Planlama sistemi aggregate çalışmalıdır.

Yanlış yaklaşım:

```text
Her ürün adedi için ayrı plan satırı
```

Doğru yaklaşım:

```text
1 hat + 1 route progress + 1 gün = 1 allocation satırı
```

Eğer aynı hat aynı gün üç farklı işi yapıyorsa üç allocation satırı oluşur.
Bu kabul edilebilir ve performans açısından güvenlidir.

---

# 26. Transaction ve Güvenlik

Plan oluşturma ve kilitleme transaction içinde yapılmalıdır.

Kontroller:

- Aynı factory + gameDay için birden fazla LOCKED plan olmamalı
- Allocation toplamları route progress input değerini aşmamalı
- Aynı line + lineSequence çakışmamalı
- LOCKED plan üzerinde değişiklik yapılmamalı
- Shift başladıktan sonra plan iptal edilmemeli

Önemli constraint:

```prisma
@@unique([factoryId, gameDay])
```

Bu constraint `ProductionPlan` üzerinde aynı güne ikinci plan açılmasını engeller.

---

# 27. Basit Allocation Örneği

Başlangıç fabrikası:

```text
1 Cutting Workshop
1 Sewing Workshop
1 Ironing-Packing Workshop
```

Sewing kapasitesi örnek:

```text
23.040 point / gün
```

Hazır sewing kuyruğu:

| Queue | Product | Qty Ready | Sewing Point |
| --- | --- | ---: | ---: |
| 1 | Celia Premium Blouse | 300 | 80 |
| 2 | Manama Basic T-shirt | 3.000 | 20 |

Plan:

```text
Celia Premium:
300 * 80 = 24.000 point
```

Bu iş tek başına hattı aşıyorsa plan şöyle olur:

```text
Celia Premium plannedQty = floor(23.040 / 80) = 288 pcs
```

Manama aynı gün sewing hattına giremez.

Oyuncu bu durumu görür ve karar verir:

- Premium işi önde tutabilir
- Basic işi öne alabilir
- Yeni sewing hattı yatırımı düşünebilir
- Siparişi gecikme riskine sokabilir

İşte oyun burada oyun olur. Yoksa Excel tablosuna ışık efekti eklemiş oluruz.

---

# 28. İki Hatlı Örnek

Oyuncu ikinci sewing hattını açtıysa:

```text
Sewing Line 1 → Celia Premium / 288 pcs
Sewing Line 2 → Celia Premium / 12 pcs + Manama Basic / kalan kapasite
```

Celia kalan:

```text
300 - 288 = 12 pcs
12 * 80 = 960 point
```

Line 2 kalan point:

```text
23.040 - 960 = 22.080 point
```

Manama Basic:

```text
22.080 / 20 = 1.104 pcs
```

Plan:

| Line | Allocation |
| --- | --- |
| Sewing Line 1 | Celia Premium 288 pcs |
| Sewing Line 2 | Celia Premium 12 pcs + Manama Basic 1.104 pcs |

Bu örnek ikinci hattın oyunda neden değerli olduğunu gösterir.

---

# 29. Final Karar Özeti

| Konu | Karar |
| --- | --- |
| Planlama amacı | Günlük hat allocation üretmek |
| Oyuncu kontrolü | Global priority + departman queue priority |
| Manuel line assignment | V1 için yok |
| Allocation zamanı | Vardiya öncesi |
| Shift başlangıcı | LOCKED plan üzerinden olur |
| Aynı gün transfer | V1 için yok |
| Bir hat birden fazla iş alabilir mi? | Evet, config limitli |
| Önerilen max allocation | 3 iş / hat / vardiya |
| Fason işler | Allocation içine girmez |
| Plan route progress’i düşer mi? | Hayır |
| Route progress ne zaman güncellenir? | ShiftSimulation sonrası |
| Büyük sipariş birden fazla hatta bölünür mü? | Evet |
| Küçük işler araya alınabilir mi? | Evet, queuePriority ile |
| Dirty plan | Priority / line / order değişince regenerate edilir |
| ShiftSimulation ilişkisi | 10. dokümanda LOCKED plan sonuçlandırılır |
