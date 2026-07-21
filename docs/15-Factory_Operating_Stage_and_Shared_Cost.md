# 15 - Factory Operating Stage and Shared Cost

Bu doküman fabrikanın oyun içindeki büyüme merdivenini, mevcut stage kaydını,
yönetim/depo/support kadrosunu ve ortak işletme giderlerini tanımlar.

Temel amaç:

> Oyuncu büyüdükçe yeni bir stage'e geçsin, yeni gereksinimleri açıkça görsün
> ve ortak giderlerini daha yüksek kapasiteye yayarak birim maliyetini düşürsün.

Bu sistem maliyet çarpanı zinciri kullanmaz.

---

# 1. Temel Kararlar

1. Fabrika gelişimi açık bir stage merdiveniyle yönetilir.
2. Her stage'in eşikleri, kadro gereksinimleri ve ortak giderleri config'tir.
3. Fabrikanın mevcut stage'i ayrı bir current state kaydında tutulur.
4. Stage geçişi oyuncuya bir defa bildirilir.
5. UI mevcut stage'i, sonraki stage'i ve eksik gereksinimleri gösterir.
6. Yönetim ve depo production line değildir.
7. Yönetim ve depo giderleri ProductRouteStep içine eklenmez.
8. `unitCostMultiplierBps` maliyet hesabında kullanılmaz.
9. Ölçek avantajı ortak giderin daha yüksek üretime yayılmasından doğar.
10. Doğrudan üretim hattı maliyeti 14 numaralı dokümana göre hesaplanır.

---

# 2. Stage Merdiveni

Textile başlangıç stage sırası:

| Sort | Stage Key | UI Name | Production Line Aralığı |
|---:|---|---|---:|
| 1 | `micro_workshop` | Micro Workshop | 1–2 |
| 2 | `small_workshop` | Small Workshop | 3–5 |
| 3 | `stable_workshop` | Stable Workshop | 6–9 |
| 4 | `growing_factory` | Growing Factory | 10–15 |
| 5 | `mass_factory` | Mass Factory | 16–22 |
| 6 | `large_factory` | Large Factory | 23–30 |
| 7 | `enterprise_factory` | Enterprise Factory | 31+ |

Textile başlangıç fabrikası:

```text
1 Cutting WORKSHOP
1 Sewing WORKSHOP
1 Ironing/Packing WORKSHOP
```

ile toplam 3 production line içerdiği için `small_workshop` stage'inde başlar.

---

# 3. Stage Geçiş Eşikleri

Stage geçişinde tek yapısal eşik kullanılır:

```text
Aktif production line adedi
```

Direkt personel ve günlük point kapasitesi ayrı operasyon göstergeleridir; stage kilidi değildir.
Bu karar yeni hat satın alma hamlesini oyuncu için açık ve tahmin edilebilir tutar.

Yeni stage aktif olduğunda o stage'in yönetim/depo/support gereksinimleri
devreye girer.

Oyuncu eksik kadroyu UI checklist üzerinden tamamlar.

---

# 4. SectorFactoryOperatingStage Config

Önerilen ana config:

```prisma
model SectorFactoryOperatingStage {
  id                          String        @id @default(cuid())
  sectorId                    String        @map("sector_id")
  key                         String
  sortOrder                   Int           @map("sort_order")

  minProductionLines          Int           @default(0) @map("min_production_lines")
  maxProductionLines          Int?          @map("max_production_lines")

  fabricWarehouseM2           Int           @default(0) @map("fabric_warehouse_m2")
  accessoryWarehouseM2        Int           @default(0) @map("accessory_warehouse_m2")
  productWarehouseM2          Int           @default(0) @map("product_warehouse_m2")
  officeSocialTechnicalM2     Int           @default(0) @map("office_social_technical_m2")
  commonAreaBps               Int           @default(1200) @map("common_area_bps")

  facilityElectricityCents    Int           @default(0) @map("facility_electricity_cents")
  staffElectricityExtraCents  Int           @default(0) @map("staff_electricity_extra_cents")
  dailySupportMealPerStaffCents Int         @default(0) @map("daily_support_meal_per_staff_cents")
  canteenFixedCents           Int           @default(0) @map("canteen_fixed_cents")
  overheadBaseCents           Int           @default(0) @map("overhead_base_cents")
  supportOverheadPerStaffCents Int          @default(0) @map("support_overhead_per_staff_cents")

  status                      ContentStatus @default(ACTIVE)
  metadata                    Json?
  createdAt                   DateTime      @default(now()) @map("created_at")
  updatedAt                   DateTime      @updatedAt @map("updated_at")

  sector                      Sector        @relation(fields: [sectorId], references: [id], onDelete: Cascade)
  translations                SectorFactoryOperatingStageTranslation[]
  staffRequirements           SectorFactoryOperatingStageStaffRequirement[]
  currentFactoryStates        FactoryOperatingStageState[] @relation("CurrentOperatingStage")
  highestFactoryStates        FactoryOperatingStageState[] @relation("HighestOperatingStage")

  @@unique([sectorId, key])
  @@unique([sectorId, sortOrder])
  @@index([sectorId, status])
  @@map("sector_factory_operating_stages")
}
```

Bu tabloda multiplier bulunmaz.

Her gider açık değer olarak saklanır.

---

# 5. Stage Translation

```prisma
model SectorFactoryOperatingStageTranslation {
  id                              String                      @id @default(cuid())
  sectorFactoryOperatingStageId   String                      @map("sector_factory_operating_stage_id")
  locale                          String
  name                            String
  description                     String?
  unlockMessage                   String?                     @map("unlock_message")

  sectorFactoryOperatingStage     SectorFactoryOperatingStage @relation(fields: [sectorFactoryOperatingStageId], references: [id], onDelete: Cascade)

  @@unique([sectorFactoryOperatingStageId, locale])
  @@index([locale])
  @@map("sector_factory_operating_stage_translations")
}
```

---

# 6. Stage Staff Requirement

Yönetim, depo ve support ihtiyaçları role göre açık adetlerle tutulur.

```prisma
model SectorFactoryOperatingStageStaffRequirement {
  id                              String                      @id @default(cuid())
  sectorFactoryOperatingStageId   String                      @map("sector_factory_operating_stage_id")
  staffRoleId                     String                      @map("staff_role_id")
  requiredQuantity                Int                         @map("required_quantity")
  sortOrder                       Int                         @default(0) @map("sort_order")
  metadata                        Json?

  sectorFactoryOperatingStage     SectorFactoryOperatingStage @relation(fields: [sectorFactoryOperatingStageId], references: [id], onDelete: Cascade)
  staffRole                       StaffRole                   @relation(fields: [staffRoleId], references: [id], onDelete: Restrict)

  @@unique([sectorFactoryOperatingStageId, staffRoleId])
  @@index([staffRoleId])
  @@map("sector_factory_operating_stage_staff_requirements")
}
```

Bu yapı:

- BPS,
- hat başına support çarpanı,
- toplam personele göre support formülü

kullanmaz.

Her stage için hangi rolden kaç kişi gerektiği doğrudan görünür.

---

# 7. Başlangıç Small Workshop Kadrosu

Mevcut onaylı başlangıç support kadrosu:

| Staff Role | Quantity | Monthly Unit Salary | Monthly Total |
|---|---:|---:|---:|
| Factory Manager | 1 | 2.200 | 2.200 |
| Planning + Outsource Coordinator | 1 | 1.400 | 1.400 |
| Warehouse Supervisor | 1 | 1.100 | 1.100 |
| Material Flow Staff | 1 | 800 | 800 |
| Dispatch Staff | 1 | 850 | 850 |
| Maintenance Technician | 1 | 1.300 | 1.300 |
| Quality Supervisor | 1 | 1.300 | 1.300 |
| Admin / Finance / HR | 1 | 1.200 | 1.200 |
| Facility Support Staff | 1 | 700 | 700 |
| **Toplam** | **9** | | **10.850** |

Bu tablo `small_workshop` stage staff requirement seed'inin başlangıç
kaydıdır.

İlk test seed'indeki toplam yönetim/support personel merdiveni:

| Stage | Active Line | Required Staff | Monthly Support Payroll |
|---|---:|---:|---:|
| Micro Workshop | 1–2 | 8 | 9.550 |
| Small Workshop | 3–5 | 9 | 10.850 |
| Stable Workshop | 6–9 | 12 | 13.200 |
| Growing Factory | 10–15 | 19 | 20.750 |
| Mass Factory | 16–22 | 29 | 31.050 |
| Large Factory | 23–30 | 40 | 43.150 |
| Enterprise Factory | 31+ | 57 | 61.000 |

Bu değerler ilk test balansıdır. Personel adedi ve stage giderleri seed
dosyası üzerinden değiştirilerek yeniden uygulanabilir.

---

# 8. FactoryOperatingStageState

Her fabrika için tek current stage state kaydı tutulur:

```prisma
model FactoryOperatingStageState {
  id                      String                       @id @default(cuid())
  factoryId               String                       @unique @map("factory_id")
  currentStageId          String                       @map("current_stage_id")
  highestReachedStageId   String                       @map("highest_reached_stage_id")
  enteredGameDay          Int                          @map("entered_game_day")
  lastNotifiedStageId     String?                      @map("last_notified_stage_id")
  requirementsMet         Boolean                      @default(false) @map("requirements_met")
  progressSnapshot        Json?                        @map("progress_snapshot")
  createdAt               DateTime                     @default(now()) @map("created_at")
  updatedAt               DateTime                     @updatedAt @map("updated_at")

  factory                 Factory                      @relation(fields: [factoryId], references: [id], onDelete: Cascade)
  currentStage            SectorFactoryOperatingStage  @relation("CurrentOperatingStage", fields: [currentStageId], references: [id], onDelete: Restrict)
  highestReachedStage     SectorFactoryOperatingStage  @relation("HighestOperatingStage", fields: [highestReachedStageId], references: [id], onDelete: Restrict)

  @@index([currentStageId])
  @@index([highestReachedStageId])
  @@map("factory_operating_stage_states")
}
```

Servis invariant:

```text
Bir Factory için yalnızca bir FactoryOperatingStageState olabilir.
```

`progressSnapshot` yalnızca stage recalculation servisiyle güncellenir.

---

# 9. Current ve Highest Stage Ayrımı

`currentStageId` fabrikanın bugünkü operasyon büyüklüğünü gösterir.

Hat satılır veya devre dışı kalırsa current stage düşebilir.

`highestReachedStageId` oyuncunun şimdiye kadar ulaştığı en yüksek stage'i
gösterir ve geriye düşmez.

Bu ayrım:

- başarı,
- ranking,
- unlock,
- oyuncu geçmişi

için gereklidir.

---

# 10. Stage History

Stage geçişlerini ve bildirim idempotency güvenliğini saklamak için:

```prisma
model FactoryOperatingStageHistory {
  id              String                      @id @default(cuid())
  factoryId       String                      @map("factory_id")
  stageId         String                      @map("stage_id")
  enteredGameDay  Int                         @map("entered_game_day")
  exitedGameDay   Int?                        @map("exited_game_day")
  notifiedAt      DateTime?                   @map("notified_at")
  snapshot        Json?
  createdAt       DateTime                    @default(now()) @map("created_at")

  factory         Factory                     @relation(fields: [factoryId], references: [id], onDelete: Cascade)
  stage           SectorFactoryOperatingStage @relation(fields: [stageId], references: [id], onDelete: Restrict)

  @@unique([factoryId, stageId, enteredGameDay])
  @@index([factoryId, enteredGameDay])
  @@map("factory_operating_stage_history")
}
```

---

# 11. Stage Recalculation

```ts
eligibleStages =
  activeStages.filter(stage =>
    activeProductionLineCount >= stage.minProductionLines
    && (
      stage.maxProductionLines == null
      || activeProductionLineCount <= stage.maxProductionLines
    )
  )

currentStage =
  eligibleStages.sortByDescending(sortOrder).first()
```

Stage recalculation şu işlemlerden sonra çalışır:

- Production line satın alma
- Production line satma
- Production line enable/disable
- Başlangıç fabrikası oluşturma

Grade upgrade veya personel değişikliği hat adedini değiştirmediği için stage
recalculation çalıştırmaz.

---

# 12. Stage Geçiş Akışı

```text
Factory active line adedi değişti
↓
recalculateFactoryOperatingStage()
↓
En yüksek uygun stage bulundu
↓
FactoryOperatingStageState transaction içinde güncellendi
↓
History kaydı oluşturuldu
↓
Stage gereksinimleri kontrol edildi
↓
Bir defalık oyuncu bildirimi oluşturuldu
```

Notification idempotency:

```text
factoryId + stageId + enteredGameDay
```

---

# 13. Stage UI

Factory Dashboard kartı:

```text
Current Stage
Small Workshop

Next Stage
Stable Workshop

Production Lines       4 / 6
Direct Production Staff 48
Daily Point Capacity   72.000
```

Stage requirement checklist:

```text
Management             1 / 1
Planning               1 / 1
Warehouse Supervisor   1 / 1
Material Flow          1 / 2
Dispatch                1 / 2
Maintenance            1 / 2
Quality                1 / 2
Facility               1 / 2
```

Next stage preview:

```text
Yeni depo alanı
Yeni support rol ihtiyaçları
Yeni tesis sabit giderleri
Beklenen aylık ortak gider
Beklenen kapasite yayılımı
```

---

# 14. Stage Notification

Örnek:

```text
Stable Workshop aşamasına ulaştın.

Fabrikan artık daha yüksek üretim kapasitesine sahip.

Yeni organizasyon ihtiyaçları:
- Material Flow Staff +1
- Dispatch Staff +1
- Maintenance Technician +1

Bu kadroları tamamlayarak operasyonunu dengede tut.
```

Stage geçiş bildirimi yalnızca bir defa gösterilir.

Eksik requirement uyarıları tekrar gösterilebilir ancak stage unlock mesajı
tekrarlanmaz.

---

# 15. Shared Factory Cost

Stage ortak aylık gideri:

```ts
monthlySharedFactoryCost =
  monthlyManagementAndSupportPayroll
  + monthlyNonProductionAreaRent
  + facilityElectricityCents
  + staffElectricityExtraCents
  + supportStaffMealCents
  + canteenFixedCents
  + overheadBaseCents
  + supportStaffOverheadCents
```

Bu formül doğrudan production line maliyetinde bulunan kalemleri tekrar
eklemez.

---

# 16. Ortak Gider Alanı

```ts
nonProductionAreaM2 =
  stage.fabricWarehouseM2
  + stage.accessoryWarehouseM2
  + stage.productWarehouseM2
  + stage.officeSocialTechnicalM2
  + commonAreaM2
```

```ts
commonAreaM2 =
  round(
    (
      totalProductionLineAreaM2
      + stage.fabricWarehouseM2
      + stage.accessoryWarehouseM2
      + stage.productWarehouseM2
    )
    * stage.commonAreaBps
    / 10000
  )
```

Production line area rent 14 numaralı doğrudan hat maliyetinde bulunur.

Burada yalnızca production dışı alan kirası hesaplanır.

---

# 17. Ortak Giderin Üretime Yayılması

```ts
sharedCostPerProducedUnitCents =
  monthlySharedFactoryCostCents
  / monthlyProducedQuantity
```

Ürün bazında daha doğru referans:

```ts
referenceMonthlyQuantity =
  minimum(
    monthly capacity of every required route department
  )
```

```ts
referenceSharedCostPerUnitCents =
  monthlySharedFactoryCostCents
  / referenceMonthlyQuantity
```

Tam CMT maliyeti:

```ts
fullReferenceCmtCostCents =
  directRouteCostCents
  + referenceSharedCostPerUnitCents
```

---

# 18. Neden Birim Maliyet Doğal Olarak Düşer?

Yeni production line:

- doğrudan personel,
- elektrik,
- üretim alanı

giderini artırır.

Yönetim, depo ve tesis giderleri ise her yeni line ile bire bir artmaz; stage
eşiklerinde kademeli artar.

Bu nedenle:

```text
Üretim kapasitesi hızlı artar.
Ortak gider kademeli artar.
Ortak gider / ürün düşer.
```

Ekstra cost multiplier gerekmez.

Yeni stage'e ilk geçildiğinde ortak gider artabilir. Oyuncunun yeni kapasiteyi
doldurması gerekir.

Bu stage geçişinin stratejik baskısıdır.

---

# 19. Başlangıç Small Workshop Örneği

Başlangıç:

```text
3 WORKSHOP production line
29 direct production staff
9 management/support staff
38 total staff
```

Maaş:

```text
Direct production payroll = 26.300
Management/support payroll = 10.850
Total payroll = 37.150
```

Diğer giderler:

```text
Rent        = 1.506
Electricity = 1.106
Meal        = 2.085
Overhead    =   983
Total       = 5.680
```

Toplam aylık fabrika gideri:

```text
37.150 + 5.680 = 42.830
```

Basic T-Shirt için %80 kullanımda:

```text
Monthly production ≈ 20.275
Fully loaded CMT cost ≈ 42.830 / 20.275
Fully loaded CMT cost ≈ 2,11 / unit
```

Admin Product Detail ekranı:

```text
Direct Route Cost:                  1,07
Starter Workshop Full CMT Cost:     2,11
Admin Base CMT Price:              [2,40]
Reference Difference:               0,29
Reference Margin:                  %12,1
```

Admin fiyatı sistem tarafından değiştirilmez.

---

# 20. Gerçekleşen Finansal Gider

Stage config planlanan gider rehberidir.

Gerçekleşen gider:

- gerçek staff assignment,
- gerçek active line,
- gerçek utilization,
- gerçekleşen bakım ve olaylar

üzerinden finans kapanışında hesaplanır.

Kasa yalnızca finance transaction servisiyle değişir.

Stage maliyet hesabı doğrudan cash balance güncellemez.

---

# 21. Eski Modellerin Durumu

Aşağıdaki multiplier tabanlı alan maliyet hesabından çıkarılacaktır:

```text
SectorFactoryScaleTier.unitCostMultiplierBps
```

Aşağıdaki formül tabanlı support modeli stage role requirement ile
değiştirilecektir:

```text
SectorSupportStaffRequirement
perProductionLineBps
perTotalStaffBps
```

Aşağıdaki cache yaklaşımı current state tablosuyla değiştirilecektir:

```text
Factory.currentSectorScaleTierId
→ FactoryOperatingStageState.currentStageId
```

Schema değişikliği kodlama aşamasında ayrıca uygulanacaktır.

---

# 22. Servisler

## recalculateFactoryOperatingStage

Stage eşiklerini kontrol eder, current/highest stage değerlerini transaction
içinde günceller ve history oluşturur.

## calculateStageRequirements

Current stage için role bazlı required/actual personel karşılaştırmasını
döndürür.

## calculateMonthlySharedFactoryCost

Yönetim, depo, support ve production dışı tesis giderlerini hesaplar.

## calculateFullyLoadedCmtCost

14 numaralı doğrudan route maliyetini stage ortak gider payıyla birleştirir.

---

# 23. Validasyonlar

1. Her sektör ve stage key benzersizdir.
2. Her sektör ve sortOrder benzersizdir.
3. Stage eşikleri sortOrder arttıkça düşemez.
4. Her stage/role için tek requirement olabilir.
5. Factory başına tek current state kaydı olabilir.
6. Highest reached stage geriye düşemez.
7. Stage bildirimi aynı giriş için iki kez oluşturulamaz.
8. Stage cost config negatif olamaz.
9. Ortak gider ProductRouteStep içine yazılamaz.
10. Current state yalnızca stage recalculation servisiyle güncellenir.
11. Para hareketi yalnızca finance transaction servisiyle yapılır.

---

# 24. Kodlama Sırası

1. Eski multiplier alanlarının kullanımını kaldır.
2. `SectorFactoryOperatingStage` modelini ekle.
3. Stage translation modelini ekle.
4. Stage staff requirement modelini ekle.
5. `FactoryOperatingStageState` modelini ekle.
6. Stage history modelini ekle.
7. Textile stage seed verilerini hazırla.
8. Stage recalculation servisini yaz.
9. Shared cost servisini yaz.
10. Factory Dashboard stage UI oluştur.
11. Notification akışını bağla.
12. Product Detail tam CMT maliyet rehberini bağla.

---

# 25. Final Karar

| Konu | Karar |
|---|---|
| Büyüme modeli | Açık stage merdiveni |
| Cost multiplier | Kullanılmayacak |
| Support hesabı | Stage + role + açık adet |
| Current stage | Factory başına ayrı state kaydı |
| Highest stage | State içinde kalıcı tutulur |
| Stage history | Bildirim ve audit için tutulur |
| Depo/yönetim | Production line değildir |
| Ortak gider | Stage config ve gerçek kadrodan hesaplanır |
| Ölçek avantajı | Ortak giderin kapasiteye yayılması |
| Oyuncu bildirimi | Stage girişinde bir defa |
| UI | Current, next, progress ve effects |
| Tam CMT maliyeti | Direct route cost + shared stage cost |
