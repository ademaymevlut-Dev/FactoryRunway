# 06 - Factory and FactoryProductionLine

Bu doküman, Factory Runway içinde oyuncuya ait gerçek fabrika instance yapısını ve oyuncunun satın aldığı / kullandığı gerçek üretim hatlarını tanımlar.

Önceki dokümanlarda şu ayrım netleşmişti:

| Katman | Amaç |
| ------ | ---- |
| `Sector`, `DepartmentGroup`, `Department` | Sektör ve üretim akışının master data yapısı |
| `Product`, `ProductRouteStep` | Ürünün hangi departmanda ne kadar iş yükü istediği |
| `ProductionLineTemplate` | Bir üretim hattı tipinin katalog/seed kapasitesi |
| `SectorFactoryOperatingStage`, `FactoryOperatingStageState` | Fabrikanın açık büyüme kademesi ve mevcut kademe durumu |
| `Factory` | Oyuncunun gerçek fabrika kaydı |
| `FactoryProductionLine` | Oyuncunun sahip olduğu gerçek üretim hattı |

Bu dokümanda amaç, master data ile oyuncu verisini birbirinden temiz şekilde ayırmaktır.

`ProductionLineTemplate` admin tarafından tanımlanan katalog bilgisidir.

`FactoryProductionLine` ise oyuncunun sahip olduğu canlı üretim hattıdır.

---

# 1. Temel Karar

`Factory`, oyuncunun bir sektördeki aktif oyun kaydıdır.

Örnek:

```text
Player: Mevlüt
Sector: Textile
Factory: Mevlüt Garment Co.
Current Day: 1
Current Level: 1
Currency Label: EUR
Cash Balance: 1.000.000
Operating Stage: Small Workshop
```

`FactoryProductionLine`, bu fabrikanın sahip olduğu gerçek üretim hatlarını tutar.

Örnek:

```text
Factory: Mevlüt Garment Co.
Line: Sewing Line 1
Template: sewing_workshop
Department: sewing
Status: IDLE
Condition: 100%
```

---

# 2. Factory Tablosu Ne Tutar?

`Factory` tablosu oyuncunun sektöre bağlı oyun state bilgisini tutmalıdır.

Bu tabloya sadece fabrika instance için gerçekten gerekli alanlar eklenmelidir.

## 2.1 Factory İçinde Tutulması Gereken Alanlar

| Alan | Amaç |
| ---- | ---- |
| `playerId` | Fabrikanın hangi oyuncuya ait olduğunu gösterir |
| `sectorId` | Fabrikanın hangi sektörde çalıştığını gösterir |
| `name` | Oyuncunun fabrika adı |
| `currencyCode` | Sadece para etiketi. EUR / USD gibi |
| `cashBalanceCents` | Oyuncunun mevcut nakit bakiyesi |
| `currentDay` | Oyun günü |
| `currentLevel` | Oyuncunun bu sektördeki ilerleme seviyesi |
| `currentXp` | Level sistemi için deneyim puanı |
| `status` | Fabrika aktif mi, durmuş mu, batmış mı |
| `startedAt` | Fabrika oyun kaydının başlangıcı |
| `lastSimulatedAt` | Son vardiya simülasyon zamanı |
| `metadata` | İleride UI veya event bilgisi için esnek alan |

---

# 3. Factory İçinde Tutulmaması Gereken Alanlar

Aşağıdaki alanlar `Factory` içinde tutulmamalıdır:

| Alan | Neden Tutulmaz? |
| ---- | --------------- |
| Toplam üretim hattı sayısı | `FactoryProductionLine` üzerinden hesaplanır |
| Toplam günlük point kapasitesi | Aktif hatların template kapasitesinden hesaplanır |
| Toplam personel sayısı | Staff sistemi üzerinden hesaplanır |
| Ortalama utilization | Shift sonuçlarından hesaplanır |
| Faaliyet kademesi | `FactoryOperatingStageState` içinde tutulur |
| Üretim hattı kapasitesi | `ProductionLineTemplate` içindedir |
| Ürün iş yükü | `ProductRouteStep` içindedir |
| Depo stokları | Ayrı inventory/warehouse tablolarında tutulmalıdır |
| Her vardiya üretim sonucu | `ShiftLineResult` gibi aggregate tablolarda tutulmalıdır |
| Tek tek ürün kayıtları | Performans için tutulmamalıdır |

Bu ayrım önemlidir.

`Factory` ana oyun state tablosudur.
Her şeyi içine doldurmak ileride dashboard'u da simülasyonu da çamura çevirir. İnsanlık bunu ERP projelerinde binlerce kez yaptı, yine de her nesil aynı çukura heyecanla atlıyor.

---

# 4. Factory Prisma Model Önerisi

```prisma
model Factory {
  id                         String        @id @default(cuid())

  playerId                   String        @map("player_id")
  sectorId                   String        @map("sector_id")

  name                       String

  currencyCode               CurrencyCode  @default(EUR) @map("currency_code")
  cashBalanceCents           BigInt        @default(0) @map("cash_balance_cents")

  currentDay                 Int           @default(1) @map("current_day")
  currentLevel               Int           @default(1) @map("current_level")
  currentXp                  Int           @default(0) @map("current_xp")

  status                     FactoryStatus @default(ACTIVE)

  startedAt                  DateTime      @default(now()) @map("started_at")
  lastSimulatedAt            DateTime?     @map("last_simulated_at")

  metadata                   Json?

  createdAt                  DateTime      @default(now()) @map("created_at")
  updatedAt                  DateTime      @updatedAt @map("updated_at")

  player                     Player        @relation(fields: [playerId], references: [id], onDelete: Cascade)
  sector                     Sector        @relation(fields: [sectorId], references: [id], onDelete: Restrict)

  productionLines            FactoryProductionLine[]
  operatingStageState        FactoryOperatingStageState?

  @@unique([playerId, sectorId])
  @@index([sectorId])
  @@index([status])
  @@map("factories")
}
```

Not:

`Player` modeli projede farklı isimle kullanılacaksa `playerId` yerine mevcut kullanıcı/oyuncu modeline göre `userId`, `gameProfileId` veya `playerProfileId` kullanılabilir.

Ancak oyun mantığında en temiz isimlendirme:

```text
User = hesap / auth
Player = oyun profili
Factory = oyuncunun sektörel oyun kaydı
```

---

# 5. Factory Enum Önerileri

```prisma
enum CurrencyCode {
  EUR
  USD
}
```

Bu enum döviz sistemi değildir.

Oyunda rakam aynı kalır.
Sadece oyuncuya gösterilen para etiketi değişir.

```text
EUR seçerse: 1.000.000 EUR
USD seçerse: 1.000.000 USD
```

Kur çevirisi, parite, ülke bazlı enflasyon gibi detaylar bu oyunun beta sürümünde yoktur. Bir simülasyon oyunu yapıyoruz, IMF kriz simülatörü değil.

```prisma
enum FactoryStatus {
  ACTIVE
  PAUSED
  BANKRUPT
  ARCHIVED
}
```

| Status | Açıklama |
| ------ | -------- |
| `ACTIVE` | Fabrika normal çalışıyor |
| `PAUSED` | Oyuncu veya sistem tarafından geçici durdurulmuş |
| `BANKRUPT` | Finansal olarak batmış / oyun sonu riski |
| `ARCHIVED` | Eski veya kapatılmış oyun kaydı |

---

# 6. FactoryProductionLine Tablosu Ne Tutar?

`FactoryProductionLine`, oyuncunun sahip olduğu gerçek üretim hattıdır.

Bu tablo şunları tutar:

1. Hangi fabrikaya ait?
2. Hangi template üzerinden oluştu?
3. Hangi departmanda çalışıyor?
4. Bu departmanda kaçıncı hat?
5. Hattın operasyonel durumu ne?
6. Hattın kondisyonu ne?
7. Oyuncu bu hattı nasıl elde etti?
8. UI’da nasıl sıralanacak?

---

# 7. ProductionLineTemplate ile FactoryProductionLine İlişkisi

İlişki şu şekilde kurulmalıdır:

```text
ProductionLineTemplate 1 ---- n FactoryProductionLine
```

Yani bir template birçok oyuncu hattına kaynak olabilir.

Örnek:

```text
Template:
sewing_workshop

Oyuncu hatları:
Factory A / Sewing Line 1 / sewing_workshop
Factory B / Sewing Line 1 / sewing_workshop
Factory B / Sewing Line 2 / sewing_workshop
Factory C / Sewing Line 1 / sewing_workshop
```

`ProductionLineTemplate` şunları verir:

| Template Alanı | Kullanım |
| -------------- | -------- |
| `departmentId` | Hattın bağlı olduğu departman |
| `grade` | WORKSHOP / INDUSTRIAL / PRECISION / SMART |
| `machineCount` | Makine sayısı |
| `idealStaff` | İdeal direkt üretim personeli |
| `dailyPointCapacity` | Günlük point kapasitesi |
| `areaM2` | Kapladığı alan |
| `monthlyElectricityBaseCents` | Baz elektrik gideri |
| `purchaseCostCents` | Satın alma maliyeti |
| `imageUrl` / `imagePathname` | UI görseli |

`FactoryProductionLine` ise şunları verir:

| Oyuncu Hattı Alanı | Kullanım |
| ------------------ | -------- |
| `factoryId` | Hattın hangi oyuncu fabrikasına ait olduğu |
| `productionLineTemplateId` | Hattın hangi template'e bağlı olduğu |
| `departmentId` | Departmana göre hızlı filtreleme ve UI gruplama |
| `lineNumber` | Aynı departmandaki hat sırası |
| `customName` | Oyuncu isterse hat adı |
| `conditionBps` | Hattın bakım/kondisyon durumu |
| `status` | IDLE / RUNNING / BROKEN gibi operasyon durumu |
| `acquisitionType` | Starter, satın alma, leasing gibi edinim türü |
| `purchasePriceCents` | Oyuncunun bu hat için ödediği tutar |
| `installedDay` | Hattın oyunda hangi gün kurulduğu |
| `sortOrder` | UI sırası |

---

# 8. FactoryProductionLine Prisma Model Önerisi

```prisma
model FactoryProductionLine {
  id                        String                      @id @default(cuid())

  factoryId                 String                      @map("factory_id")
  productionLineTemplateId  String                      @map("production_line_template_id")
  departmentId              String                      @map("department_id")

  lineNumber                Int                         @map("line_number")
  customName                String?                     @map("custom_name")

  acquisitionType           LineAcquisitionType         @default(PURCHASED) @map("acquisition_type")
  purchasePriceCents        Int                         @default(0) @map("purchase_price_cents")

  conditionBps              Int                         @default(10000) @map("condition_bps")

  status                    FactoryProductionLineStatus @default(IDLE)

  installedDay              Int                         @default(1) @map("installed_day")
  lastMaintenanceDay        Int?                        @map("last_maintenance_day")
  lastBreakdownDay          Int?                        @map("last_breakdown_day")

  sortOrder                 Int                         @default(0) @map("sort_order")
  metadata                  Json?

  createdAt                 DateTime                    @default(now()) @map("created_at")
  updatedAt                 DateTime                    @updatedAt @map("updated_at")

  factory                   Factory                     @relation(fields: [factoryId], references: [id], onDelete: Cascade)
  productionLineTemplate    ProductionLineTemplate      @relation(fields: [productionLineTemplateId], references: [id], onDelete: Restrict)
  department                Department                  @relation(fields: [departmentId], references: [id], onDelete: Restrict)

  @@unique([factoryId, departmentId, lineNumber])
  @@index([factoryId, status])
  @@index([factoryId, departmentId, status])
  @@index([factoryId, departmentId, sortOrder])
  @@index([productionLineTemplateId])
  @@index([departmentId])
  @@map("factory_production_lines")
}
```

---

# 9. FactoryProductionLine Enum Önerileri

```prisma
enum FactoryProductionLineStatus {
  IDLE
  RUNNING
  BLOCKED
  MAINTENANCE
  BROKEN
  DISABLED
  SOLD
}
```

| Status | Açıklama |
| ------ | -------- |
| `IDLE` | Hat çalışmaya hazır ama şu an üretimde değil |
| `RUNNING` | Hat vardiya simülasyonu içinde üretimde |
| `BLOCKED` | Hatta iş atanmış ama malzeme/WIP/personel sorunu var |
| `MAINTENANCE` | Planlı bakımda |
| `BROKEN` | Arıza nedeniyle üretim yapamıyor |
| `DISABLED` | Oyuncu hattı geçici olarak kapatmış |
| `SOLD` | Hat satılmış, geçmiş kayıtlar için tutuluyor |

```prisma
enum LineAcquisitionType {
  STARTER
  PURCHASED
  LEASED
  REWARD
}
```

| Type | Açıklama |
| ---- | -------- |
| `STARTER` | Başlangıç fabrikasıyla ücretsiz verilen hat |
| `PURCHASED` | Oyuncunun peşin satın aldığı hat |
| `LEASED` | Leasing sözleşmesiyle alınan hat |
| `REWARD` | Görev, event veya özel ödül ile verilen hat |

---

# 10. Neden departmentId FactoryProductionLine İçinde de Var?

`ProductionLineTemplate` zaten `departmentId` tutar.

Normalde buradan join ile okunabilir.

Ancak `FactoryProductionLine.departmentId` alanı bilinçli küçük bir denormalizasyondur.

Sebep:

1. Fabrika haritasında hatlar sürekli departmana göre gruplanacak.
2. Simülasyon sırasında departmana göre aktif hatlar sık okunacak.
3. Department bazlı line count hızlı hesaplanacak.
4. Aynı departmandaki `lineNumber` unique kontrolü kolaylaşacak.

Bu alan template oluşturulurken değil, oyuncuya gerçek hat açılırken template üzerinden kopyalanmalıdır.

Servis kuralı:

```ts
departmentId = productionLineTemplate.departmentId
```

Bu değer kullanıcıdan alınmamalıdır.

---

# 11. FactoryProductionLine İçinde Tutulmaması Gereken Alanlar

Aşağıdaki alanlar `FactoryProductionLine` içinde tutulmamalıdır:

| Alan | Neden Tutulmaz? |
| ---- | --------------- |
| `grade` | Template üzerinden gelir |
| `machineCount` | Template üzerinden gelir |
| `idealStaff` | Template üzerinden gelir |
| `dailyPointCapacity` | Template üzerinden gelir |
| `areaM2` | Template üzerinden gelir |
| `monthlyElectricityBaseCents` | Template üzerinden gelir |
| `imageUrl` | Template üzerinden gelir |
| `currentOrderId` | Üretim planlama/allocation sistemi ayrı olmalı |
| `todayProducedQty` | Shift result aggregate kayıtlarında tutulmalı |
| `currentProductId` | Vardiya planı/allocation içinde tutulmalı |
| `assignedStaffCount` | Staff assignment veya shift plan içinde tutulmalı |

Kısa karar:

```text
FactoryProductionLine = gerçek hat varlığı + operasyonel durum
ProductionLineTemplate = kapasite ve teknik özellikler
ShiftPlan / Allocation = bugün ne üretecek?
ShiftLineResult = vardiya sonunda ne üretti?
```

---

# 12. Hattın Kapasitesi Nasıl Hesaplanır?

MVP için temel kapasite template üzerinden gelir:

```ts
baseDailyPointCapacity =
  factoryProductionLine.productionLineTemplate.dailyPointCapacity
```

Hattın kondisyonu kapasiteyi etkileyebilir:

```ts
conditionAdjustedCapacity =
  baseDailyPointCapacity * conditionBps / 10000
```

Personel eksikliği ileride staff sistemiyle uygulanır:

```ts
staffCoverageBps =
  assignedDirectStaff / template.idealStaff * 10000
```

Final hesap MVP sonrası şu hale gelebilir:

```ts
effectiveDailyPointCapacity =
  template.dailyPointCapacity
  * conditionBps / 10000
  * staffCoverageBps / 10000
  * shiftEfficiencyBps / 10000
```

Ancak ilk MVP'de çok karmaşık başlamaya gerek yoktur.

Minimum MVP:

```ts
effectiveDailyPointCapacity =
  template.dailyPointCapacity * conditionBps / 10000
```

Personel sistemi tamamlandığında staff coverage eklenir.

---

# 13. Upgrade Mantığı

Oyuncu bir hattı upgrade ettiğinde yeni `FactoryProductionLine` kaydı açmak yerine mevcut hattın `productionLineTemplateId` değeri değiştirilebilir.

Örnek:

```text
Sewing Line 1
Old Template: sewing_workshop
New Template: sewing_industrial
```

Bu sayede:

1. Hat kimliği korunur.
2. UI sırası korunur.
3. Geçmiş vardiya sonuçları aynı line id ile ilişkilendirilebilir.
4. Oyuncu “Line 1” geçmişini kaybetmez.

Ancak vardiya geçmişinde hangi template ile üretim yapıldığını bilmek gerekirse `ShiftLineResult` içinde ayrıca snapshot tutulmalıdır:

```prisma
productionLineTemplateId String
dailyPointCapacitySnapshot Int
```

Bu 06 dokümanının ana konusu değildir, ama ileride simülasyon kayıtları için önemlidir.

---

# 14. FactoryDepartment Gerekli mi?

MVP kararı:

```text
İlk aşamada FactoryDepartment tablosu açılmayacak.
```

Sebep:

1. Üretim yapan departmanlar zaten `FactoryProductionLine` üzerinden temsil ediliyor.
2. Üretim yapmayan depolar production line değil.
3. Sevkiyat production line değil, product warehouse altında dispatch fonksiyonu.
4. Kalite kontrol V1'de production line değil, support/risk sistemi.
5. Fason başlayan departmanlar için boş department instance satırları açmaya gerek yok.
6. Gereksiz tablo, gereksiz ilişki, gereksiz migration demektir.

İlk aşamada fabrika departman görünümü şöyle oluşturulmalıdır:

```ts
factoryMapDepartments =
  sector.departments.map(department => ({
    department,
    productionLines: factory.productionLines.filter(line =>
      line.departmentId === department.id
    )
  }))
```

Eğer departmanda oyuncunun hattı yoksa:

```text
Embroidery: Internal Line yok / Outsource available
Printing: Internal Line yok / Outsource available
Washing: Internal Line yok / Outsource available
Dyeing: Internal Line yok / Outsource available
```

Yani fason departmanlar için `FactoryDepartment` kaydı açmaya gerek yoktur.

---

# 15. FactoryDepartment Ne Zaman Gerekir?

Aşağıdaki ihtiyaçlar ortaya çıkarsa ileride `FactoryDepartment` eklenebilir:

| İhtiyaç | FactoryDepartment Gerekir mi? |
| ------- | ----------------------------- |
| Departman bazlı aç/kapat sistemi | Evet |
| Departman bazlı manager atama | Evet |
| Departman bazlı support score | Evet |
| Departman bazlı kalite riski | Evet |
| Departman bazlı bakım bütçesi | Evet |
| Departman bazlı outsourcing policy | Evet |
| Depo m2 değerini oyuncu yatırımıyla büyütme | Evet |
| Department-level KPI dashboard | Evet |
| Şimdiki MVP üretim hattı yönetimi | Hayır |

İleride gerekirse model şu şekilde olabilir:

```prisma
model FactoryDepartment {
  id              String   @id @default(cuid())

  factoryId       String   @map("factory_id")
  departmentId    String   @map("department_id")

  isUnlocked      Boolean  @default(true) @map("is_unlocked")
  isInternal      Boolean  @default(false) @map("is_internal")
  canOutsource    Boolean  @default(true) @map("can_outsource")

  managerStaffId  String?  @map("manager_staff_id")

  metadata        Json?

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  factory         Factory    @relation(fields: [factoryId], references: [id], onDelete: Cascade)
  department      Department @relation(fields: [departmentId], references: [id], onDelete: Restrict)

  @@unique([factoryId, departmentId])
  @@index([factoryId])
  @@index([departmentId])
  @@map("factory_departments")
}
```

Ama bu model V1 için açılmamalıdır.

Önce üretim hattı, sipariş, vardiya simülasyonu ve finans sistemi oturmalıdır.

---

# 16. Başlangıç Fabrikası Nasıl Oluşturulmalı?

Oyuncu sektör seçtiğinde sistem transaction içinde başlangıç fabrikasını oluşturmalıdır.

Textile Beta başlangıç altyapısı:

| Departman | Template Key | Grade | Acquisition |
| --------- | ------------ | ----- | ----------- |
| Cutting | `cutting_workshop` | WORKSHOP | STARTER |
| Sewing | `sewing_workshop` | WORKSHOP | STARTER |
| Ironing-Packing | `ironing_packing_workshop` | WORKSHOP | STARTER |

Başlangıçta iç üretim hattı olmayan fason departmanlar:

| Departman | Başlangıç Durumu |
| --------- | ---------------- |
| Embroidery | Outsource |
| Printing | Outsource |
| Washing | Outsource |
| Dyeing | Outsource |

Bu fason departmanlar için `FactoryProductionLine` kaydı oluşturulmaz.

---

# 17. Başlangıç Transaction Akışı

```ts
async function createStarterFactory({
  playerId,
  sectorKey,
  factoryName,
  currencyCode,
}: CreateStarterFactoryInput) {
  return await prisma.$transaction(async (tx) => {
    const sector = await tx.sector.findUniqueOrThrow({
      where: { key: sectorKey },
    })

    const factory = await tx.factory.create({
      data: {
        playerId,
        sectorId: sector.id,
        name: factoryName,
        currencyCode,
        cashBalanceCents: 100_000_000n,
        currentDay: 1,
        currentLevel: 1,
        currentXp: 0,
        status: "ACTIVE",
      },
    })

    const starterTemplateKeys = [
      "cutting_workshop",
      "sewing_workshop",
      "ironing_packing_workshop",
    ]

    const templates = await tx.productionLineTemplate.findMany({
      where: {
        sectorId: sector.id,
        key: { in: starterTemplateKeys },
        status: "ACTIVE",
      },
    })

    for (const template of templates) {
      const lineNumber = await getNextLineNumber({
        tx,
        factoryId: factory.id,
        departmentId: template.departmentId,
      })

      await tx.factoryProductionLine.create({
        data: {
          factoryId: factory.id,
          productionLineTemplateId: template.id,
          departmentId: template.departmentId,
          lineNumber,
          acquisitionType: "STARTER",
          purchasePriceCents: 0,
          conditionBps: 10000,
          status: "IDLE",
          installedDay: 1,
          sortOrder: lineNumber,
        },
      })
    }

    // Başlangıç direkt üretim ve small_workshop destek kadrosu burada oluşturulur.

    await recalculateFactoryOperatingStage({
      tx,
      factoryId: factory.id,
    })

    return factory
  })
}
```

---

# 18. Başlangıç Sermayesi Nerede Tutulmalı?

Başlangıç sermayesi doğrudan `Factory.cashBalanceCents` içinde tutulmalıdır.

Textile Beta için başlangıç:

```ts
startingCapitalCents = 100_000_000n
```

Bu değer oyuncuya şu şekilde gösterilir:

```text
1.000.000 EUR
```

veya

```text
1.000.000 USD
```

Oyuncu sadece para etiketi seçer.
Veritabanında tüm hesaplar cent/kuruş mantığıyla saklanır.

---

# 19. Başlangıç Sermayesi Config Olmalı mı?

MVP için iki seçenek var.

## Seçenek 1: Kod Sabiti

```ts
const TEXTILE_STARTING_CAPITAL_CENTS = 100_000_000n
```

Bu hızlıdır ama uzun vadede esnek değildir.

## Seçenek 2: SectorSimulationConfig İçinde Tutmak

Önerilen uzun vadeli yaklaşım:

```prisma
model SectorSimulationConfig {
  id                    String   @id @default(cuid())
  sectorId              String   @unique @map("sector_id")

  startingCapitalCents  BigInt   @default(0) @map("starting_capital_cents")
  defaultCurrencyCode   CurrencyCode @default(EUR) @map("default_currency_code")

  startingDay           Int      @default(1) @map("starting_day")
  startingLevel         Int      @default(1) @map("starting_level")

  metadata              Json?

  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  sector                Sector   @relation(fields: [sectorId], references: [id], onDelete: Cascade)

  @@map("sector_simulation_configs")
}
```

Ancak bu tablo daha önce schema içinde zaten planlandıysa aynı model genişletilmelidir.
Yeni ayrı tablo açılmamalıdır.

MVP kararı:

```text
Eğer SectorSimulationConfig zaten varsa başlangıç sermayesi orada tutulmalı.
Yoksa ilk aşamada servis sabiti kullanılabilir.
Factory içinde sadece oyuncunun canlı cashBalanceCents değeri tutulur.
```

---

# 20. currentDay Nerede Tutulmalı?

`currentDay`, `Factory` üzerinde tutulmalıdır.

Sebep:

1. Her fabrika kendi oyun gününe sahiptir.
2. Vardiya başlatma ve gün ilerletme fabrika state'idir.
3. Sektörler ileride ayrı oyun kaydı gibi çalışabilir.
4. Çoklu sektör paketlerinde oyuncunun textile günü ile chocolate günü farklı olabilir.

Örnek:

```text
Textile Factory currentDay: 42
Chocolate Factory currentDay: 8
```

Bu yüzden `Player` üzerinde global `currentDay` tutmak doğru değildir.

---

# 21. currentLevel Nerede Tutulmalı?

MVP kararı:

```text
currentLevel ve currentXp Factory üzerinde tutulmalı.
```

Sebep:

Factory Runway'de ilerleme sektöre ve fabrika gelişimine bağlıdır.

Textile sektöründe Level 18 olan oyuncu, Chocolate sektörüne yeni başladığında Level 1 olabilir.

İleride global oyuncu seviyesi istenirse ayrıca `PlayerProfile.globalLevel` eklenebilir.

Ancak bu dokümandaki `Factory.currentLevel` sektör bazlı ilerleme seviyesidir.

---

# 22. Current Operating Stage Nerede Tutulmalı?

Faaliyet kademesi açık bir oyun durumudur; yalnızca dashboard için türetilmiş bir etiket değildir.

MVP kararı:

```text
FactoryOperatingStageState
  factoryId
  currentStageId
  highestReachedStageId
  enteredGameDay
```

`currentStageId` mevcut aktif hat sayısına karşılık gelen kademedir.
`highestReachedStageId`, oyuncunun ulaştığı en yüksek kademeyi ve bildirim geçmişini korur.

Kademe şu olaylarda yeniden değerlendirilir:

1. Başlangıç fabrikası oluşturulduğunda
2. Yeni üretim hattı alındığında
3. Üretim hattı satıldığında veya devre dışı bırakıldığında

Hat grade yükseltmesi kapasite ve doğrudan maliyeti değiştirir; hat adedini değiştirmediği için faaliyet kademesini değiştirmez.

---

# 23. Başlangıç Operating Stage Ne Olmalı?

Textile başlangıç fabrikasında:

| Alan | Değer |
| ---- | ----: |
| Cutting Workshop | 1 |
| Sewing Workshop | 1 |
| Ironing-Packing Workshop | 1 |
| Toplam üretim hattı | 3 |
| Başlangıç direkt üretim personeli | 29 |
| Başlangıç support personeli | 9 |
| Toplam personel | 38 |
| Toplam günlük point kapasitesi | 50.940 |

Bu yapı Textile faaliyet merdivenine göre `small_workshop` kademesine denk gelir.

Görünen textile label önerisi:

```text
Small Garment Workshop
Class E
```

Kademe aktif hat sayısından belirlenir. Başlangıç kademe personeli de aynı transaction içinde oluşturulmalıdır.

---

# 24. Factory Operating Stage Recalculation Servisi

```ts
async function recalculateFactoryOperatingStage({
  tx,
  factoryId,
}: {
  tx: Prisma.TransactionClient
  factoryId: string
}) {
  const factory = await tx.factory.findUniqueOrThrow({
    where: { id: factoryId },
    select: { id: true, sectorId: true },
  })

  const activeProductionLineCount = await tx.factoryProductionLine.count({
    where: {
      factoryId,
      status: { notIn: ["SOLD", "DISABLED"] },
    },
  })

  const currentStage = await tx.sectorFactoryOperatingStage.findFirstOrThrow({
    where: {
      sectorId: factory.sectorId,
      minProductionLines: { lte: activeProductionLineCount },
      OR: [
        { maxProductionLines: null },
        { maxProductionLines: { gte: activeProductionLineCount } },
      ],
      status: "ACTIVE",
    },
    orderBy: { sortOrder: "desc" },
  })

  await upsertFactoryOperatingStageState({
    tx,
    factoryId,
    currentStage,
  })

  return currentStage
}
```

Kademe geçişinde history kaydı ve oyuncu bildirimi aynı transaction içinde oluşturulur.
Kademenin paylaşılan gideri herhangi bir maliyet çarpanı değildir; açık rol/adet ve gider satırlarından hesaplanır.

---

# 25. Factory Dashboard İçin Minimum Query

Factory dashboard açıldığında şu veri yeterlidir:

```ts
const factory = await prisma.factory.findUnique({
  where: { id: factoryId },
  include: {
    sector: true,
    operatingStageState: {
      include: {
        currentStage: {
          include: { translations: true },
        },
      },
    },
    productionLines: {
      where: {
        status: {
          not: "SOLD",
        },
      },
      include: {
        productionLineTemplate: true,
        department: true,
      },
      orderBy: [
        { sortOrder: "asc" },
        { lineNumber: "asc" },
      ],
    },
  },
})
```

Dashboard'da hesaplanacak özetler:

```ts
activeProductionLineCount =
  productionLines.filter(line => line.status !== "SOLD").length

totalDailyPointCapacity =
  sum(productionLines.map(line =>
    line.productionLineTemplate.dailyPointCapacity
  ))

productionAreaM2 =
  sum(productionLines.map(line =>
    line.productionLineTemplate.areaM2
  ))
```

Bu yapı sayesinde `Factory` tablosunda gereksiz toplam kolonları tutulmaz.

---

# 26. Factory Map Gösterimi ve Slot Yerleşim Kuralı

Factory map UI mevcut üç satırlı grid düzenini korumalıdır.

Bu yüzden veritabanında aşağıdaki alanlar açılmayacaktır:

| Alan | Karar | Neden |
| ---- | ----- | ----- |
| `row` | Yok | CSS grid otomatik yerleştirir |
| `column` | Yok | CSS grid otomatik yerleştirir |
| `x` / `y` | Yok | Harita koordinatı veritabanına taşınmayacak |
| `slotId` | Yok | Slot pozisyonu sıralı listeden türetilir |

Yerleşim veritabanında koordinatla değil, sıralama ile yönetilir.

Temel UI kuralı:

```text
Hat 1 -> Sütun 1 / Satır 1
Hat 2 -> Sütun 1 / Satır 2
Hat 3 -> Sütun 1 / Satır 3
Hat 4 -> Sütun 2 / Satır 1
Hat 5 -> Sütun 2 / Satır 2
Hat 6 -> Sütun 2 / Satır 3
```

Bu davranış CSS tarafında `grid-auto-flow: column` ve 3 satırlı grid ile çözülmelidir.
Veritabanı yalnızca kartların hangi sırayla render edileceğini söyler.

---

## 26.1 Görsel Blok Mantığı

Factory map üzerindeki yatay bloklar `DepartmentGroup` üzerinden gelmelidir.

Örnek görsel bloklar:

| Görsel Blok | DepartmentGroup | İçindeki Department |
| ----------- | --------------- | ------------------- |
| Warehouse | `warehouse` | `fabric_warehouse`, `accessory_warehouse`, `product_warehouse` |
| Cutting | `cutting` | `cutting` |
| Pre-Sewing | `pre_sewing` | `embroidery`, `printing` |
| Sewing | `sewing` | `sewing` |
| Post-Sewing | `post_sewing` | `washing`, `dyeing`, `ironing_packing` veya ilgili final süreçleri |

Bu nedenle yeni bir `FactoryMapSection` tablosu açılmayacaktır.

Doğru ayrım:

```text
DepartmentGroup = haritadaki görsel blok
Department      = gerçek operasyon / route step / outsourcing noktası
FactoryProductionLine = grid içindeki gerçek üretim hattı kartı
```

Bu yapı mevcut UI düzenini korur ve ileride sektör değiştiğinde de aynı harita mantığını kullanabilir.

---

## 26.2 Nihai Sıralama Kuralı

Harita render edilirken üst seviye sıralama şöyledir:

```text
DepartmentGroup.sortOrder
  -> FactoryProductionLine.sortOrder
  -> FactoryProductionLine.lineNumber
```

`Department.routeOrder` üretim akışı, admin sıralaması ve route step mantığı için kullanılmalıdır.
Ancak karışık görsel bloklarda kart yerleşimini doğrudan `Department.routeOrder` belirlememelidir.

Sebep:

`Pre-Sewing` gibi bir blokta `embroidery` ve `printing` aynı görsel grid içinde birlikte durur.
Eğer önce `Department.routeOrder`, sonra line sıralanırsa yeni eklenen bir nakış hattı daha önce eklenmiş baskı hatlarının önüne zıplayabilir.
Bu da oyuncunun gördüğü slot düzenini bozar.

Bu yüzden `FactoryProductionLine.sortOrder`, görsel blok içindeki kesin kart sırasıdır.

`lineNumber` ise departman içindeki numaradır.

Örnek:

```text
PRS-01 -> embroidery, sortOrder 10, lineNumber 1
PRS-02 -> printing,   sortOrder 20, lineNumber 1
PRS-03 -> printing,   sortOrder 30, lineNumber 2
PRS-04 -> embroidery, sortOrder 40, lineNumber 2
PRS-05 -> printing,   sortOrder 50, lineNumber 3
```

Grid bu sırayı kullanır ve kartları otomatik yerleştirir.
Böylece veri tarafında `row`, `column`, `x`, `y` veya `slotId` gerekmez.

---

## 26.3 FactoryProductionLine.sortOrder Scope Kararı

`FactoryProductionLine.sortOrder` şu anlama gelir:

```text
Aynı factory içindeki aynı DepartmentGroup görsel bloğunda kart render sırası
```

Tabloda ayrıca `departmentGroupId` tutulmayacaktır.
Bu bilgi `Department` üzerinden türetilir.

Yeni hat eklenirken backend şu scope ile sıradaki sort değerini bulmalıdır:

```ts
factoryId + department.departmentGroupId
```

Yani sadece `factoryId + departmentId` bazında `maxSortOrder` almak yeterli değildir.
Çünkü aynı görsel blok içinde birden fazla department bulunabilir.

Bu özellikle şu bloklar için önemlidir:

| Blok | Department'lar |
| ---- | -------------- |
| Pre-Sewing | Embroidery + Printing |
| Post-Sewing | Washing + Dyeing + Finishing varyasyonları |
| Warehouse | Fabric + Accessory + Product Warehouse |

`lineNumber` ise departman bazında kalmalıdır:

```ts
factoryId + departmentId -> lineNumber
```

Böylece hem kart yerleşimi düzgün kalır hem de departman bazlı isimlendirme çakışmaz.

---

## 26.4 Yeni Hat Eklenirken Backend Akışı

Oyuncu modal üzerinden yeni üretim hattı seçtiğinde backend şu işlemleri yapmalıdır:

1. `ProductionLineTemplate` seçilir.
2. Template'in `departmentId` değeri okunur.
3. Department kaydından `departmentGroupId` ve `kind` bilgisi okunur.
4. Department `PRODUCTION` değilse işlem reddedilir.
5. Aynı `factoryId + departmentId` içinde en büyük `lineNumber` bulunur.
6. `lineNumber = maxLineNumber + 1` atanır.
7. Aynı `factoryId + departmentGroupId` görsel bloğu içinde en büyük `sortOrder` bulunur.
8. `sortOrder = maxSortOrder + 10` atanır.
9. `FactoryProductionLine` oluşturulur.
10. UI listeyi yeniden çeker ve CSS grid kartı otomatik yerleştirir.

Önemli karar:

```text
departments.slots.length + 1 kullanılmayacak.
```

Çünkü satılmış hatlar, gizlenen hatlar veya eşzamanlı satın almalar numara çakışmasına yol açabilir.

Doğru yaklaşım:

```ts
lineNumber = MAX(lineNumber) + 1
sortOrder = MAX(sortOrder) + 10
```

`MAX(lineNumber)` hesabında `SOLD` kayıtlar da dahil edilmelidir.
Böylece eski hat numaraları tekrar kullanılmaz.

Unique constraint güvenlik ağı olarak kalır:

```prisma
@@unique([factoryId, departmentId, lineNumber])
```

Eşzamanlı iki satın alma ihtimalinde transaction içinde unique conflict retry uygulanmalıdır.
Evet, veritabanı bile insanların aynı anda aynı butona basabileceğini hesaba katmak zorunda. Medeniyet dediğin şey çoğu zaman retry mekanizmasıdır.

---

## 26.5 Önerilen Map Query

Factory map için production line verisi şu şekilde çekilmelidir:

```ts
const productionLines = await prisma.factoryProductionLine.findMany({
  where: {
    factoryId,
    status: {
      not: "SOLD",
    },
  },
  include: {
    productionLineTemplate: true,
    department: {
      include: {
        departmentGroup: true,
      },
    },
  },
  orderBy: [
    { sortOrder: "asc" },
    { lineNumber: "asc" },
  ],
})
```

DepartmentGroup ve Department master data ayrı çekilmelidir:

```ts
const departmentGroups = await prisma.departmentGroup.findMany({
  where: {
    sectorId,
    status: "ACTIVE",
  },
  include: {
    departments: {
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        routeOrder: "asc",
      },
    },
  },
  orderBy: {
    sortOrder: "asc",
  },
})
```

UI tarafında map şu şekilde oluşturulur:

```ts
const linesByGroupId = groupBy(
  productionLines,
  line => line.department.departmentGroupId,
)

const factoryMapSections = departmentGroups.map(group => ({
  group,
  departments: group.departments,
  lines: linesByGroupId[group.id] ?? [],
}))
```

Bu yapı ile:

1. Görsel blok sırası `DepartmentGroup.sortOrder` ile belirlenir.
2. Blok içindeki üretim kartları `FactoryProductionLine.sortOrder` ile belirlenir.
3. Boş slotlar UI tarafında hesaplanır.
4. Veritabanında koordinat tutulmaz.
5. Harita genişliği hat sayısına göre CSS ile büyür.

---

## 26.6 Warehouse, Logistics ve Quality Blokları

Warehouse, Shipping/Dispatch ve Quality Control v1'de production line değildir.

Bu bloklar factory map üzerinde görsel olarak gösterilebilir.
Ancak `FactoryProductionLine` kaydı üretmemelidir.

Bu ayrımı temiz yapmak için `Department` master data tarafında şu enum önerilir:

```prisma
enum DepartmentKind {
  PRODUCTION
  WAREHOUSE
  LOGISTICS
  QUALITY
  SUPPORT
}
```

Department modelinde:

```prisma
kind DepartmentKind @default(PRODUCTION)
```

Kullanım kuralı:

| DepartmentKind | FactoryProductionLine oluşturur mu? | Slot Ekle gösterilir mi? |
| -------------- | -----------------------------------: | -----------------------: |
| `PRODUCTION` | Evet | Evet |
| `WAREHOUSE` | Hayır | Hayır |
| `LOGISTICS` | Hayır | Hayır |
| `QUALITY` | V1 için hayır | Hayır |
| `SUPPORT` | Hayır | Hayır |

Warehouse büyütme ileride istenirse `FactoryProductionLine` kullanılmamalıdır.
Bunun için ayrıca `FactoryFacilityModule`, `FactoryAreaModule` veya depo kapasite sistemi tasarlanabilir.

V1 kararı:

```text
Warehouse görsel blok olabilir.
Warehouse production line değildir.
Warehouse için Hat Ekle modalı açılmaz.
```

---

## 26.7 FactoryDepartment Neden Hâlâ Gerekli Değil?

Bu UI kararı `FactoryDepartment` ihtiyacı doğurmaz.

Çünkü:

1. Görsel bloklar `DepartmentGroup` üzerinden gelir.
2. Operasyon departmanları `Department` üzerinden gelir.
3. Oyuncuya ait gerçek üretim kartları `FactoryProductionLine` üzerinden gelir.
4. Boş slotlar UI tarafından hesaplanır.
5. Fason departmanlar için sahte oyuncu kaydı açılmaz.
6. Warehouse/logistics/quality blokları üretim hattı olmadığı için `FactoryProductionLine` kullanmaz.

Yani mevcut üç katman yeterlidir:

```text
DepartmentGroup -> Department -> FactoryProductionLine
```

Yeni tablo açmadan mevcut UI korunur.
Bu da güzel, çünkü her UI problemi için tablo açmak veritabanına mobilya taşır gibi davranmaktır.

---

## 26.8 Factory Map İçin Güncellenmiş Index Önerisi

`FactoryProductionLine` modelinde mevcut index'lere ek olarak şu index faydalıdır:

```prisma
@@index([factoryId, departmentId, sortOrder])
```

Bu index şu işlemleri hızlandırır:

1. Departman bazlı hat listeleme
2. Yeni line eklerken departman içi sıralama kontrolleri
3. Factory map render sırasında stable ordering
4. Admin/debug ekranında department bazlı filtreleme

Factory map tüm hatları tek seferde çekeceği için `factoryId + sortOrder` da ileride eklenebilir.
MVP için `factoryId + departmentId + sortOrder` yeterlidir.

---

# 27. Satın Alma Akışı

Oyuncu yeni production line satın aldığında:

1. `ProductionLineTemplate` seçilir.
2. Oyuncunun yeterli nakdi var mı kontrol edilir.
3. Aynı sector içinde mi kontrol edilir.
4. `Factory.cashBalanceCents` düşülür.
5. `lineNumber` departmana göre sıradaki numara olur.
6. `sortOrder` görsel `DepartmentGroup` bloğuna göre sıradaki değer olur.
7. Yeni `FactoryProductionLine` oluşturulur.
8. Factory operating stage yeniden hesaplanır.
9. Finance ledger varsa transaction kaydı oluşturulur.

Örnek:

```ts
async function purchaseProductionLine({
  factoryId,
  productionLineTemplateId,
}: PurchaseProductionLineInput) {
  return await prisma.$transaction(async (tx) => {
    const factory = await tx.factory.findUniqueOrThrow({
      where: { id: factoryId },
    })

    const template = await tx.productionLineTemplate.findUniqueOrThrow({
      where: { id: productionLineTemplateId },
      include: {
        department: true,
      },
    })

    if (template.sectorId !== factory.sectorId) {
      throw new Error("Template sector does not match factory sector.")
    }

    if (template.department.kind !== "PRODUCTION") {
      throw new Error("Selected department does not support production lines.")
    }

    if (factory.cashBalanceCents < BigInt(template.purchaseCostCents)) {
      throw new Error("Insufficient cash balance.")
    }

    const lineNumber = await getNextLineNumber({
      tx,
      factoryId,
      departmentId: template.departmentId,
    })

    const sortOrder = await getNextFactoryMapSortOrder({
      tx,
      factoryId,
      departmentGroupId: template.department.departmentGroupId,
    })

    await tx.factory.update({
      where: { id: factoryId },
      data: {
        cashBalanceCents: {
          decrement: BigInt(template.purchaseCostCents),
        },
      },
    })

    const line = await tx.factoryProductionLine.create({
      data: {
        factoryId,
        productionLineTemplateId: template.id,
        departmentId: template.departmentId,
        lineNumber,
        acquisitionType: "PURCHASED",
        purchasePriceCents: template.purchaseCostCents,
        conditionBps: 10000,
        status: "IDLE",
        installedDay: factory.currentDay,
        sortOrder,
      },
    })

    await recalculateFactoryOperatingStage({ tx, factoryId })

    return line
  })
}
```

Örnek helper mantığı:

```ts
async function getNextLineNumber({
  tx,
  factoryId,
  departmentId,
}: GetNextLineNumberInput) {
  const result = await tx.factoryProductionLine.aggregate({
    where: {
      factoryId,
      departmentId,
      // SOLD kayıtlar özellikle filtrelenmez.
      // Eski hat numaraları tekrar kullanılmamalıdır.
    },
    _max: {
      lineNumber: true,
    },
  })

  return (result._max.lineNumber ?? 0) + 1
}

async function getNextFactoryMapSortOrder({
  tx,
  factoryId,
  departmentGroupId,
}: GetNextFactoryMapSortOrderInput) {
  const departments = await tx.department.findMany({
    where: {
      departmentGroupId,
    },
    select: {
      id: true,
    },
  })

  const result = await tx.factoryProductionLine.aggregate({
    where: {
      factoryId,
      departmentId: {
        in: departments.map(department => department.id),
      },
      // SOLD kayıtlar filtrelenmez.
      // Yeni kart eski görsel sırayı bozmadan sona eklenir.
    },
    _max: {
      sortOrder: true,
    },
  })

  return (result._max.sortOrder ?? 0) + 10
}
```

---

# 28. Leasing Akışı

Leasing ilk aşamada `FactoryProductionLine` içine gömülmemelidir.

Doğru ayrım:

```text
FactoryProductionLine = üretim hattı varlığı
FactoryLeasingContract = finansman sözleşmesi
```

`FactoryProductionLine.acquisitionType = LEASED` olabilir.

Ama vade, faiz, aylık ödeme gibi detaylar ayrı tabloda tutulmalıdır.

Öneri:

```prisma
model FactoryLeasingContract {
  id                    String   @id @default(cuid())

  factoryId             String   @map("factory_id")
  productionLineId      String   @map("production_line_id")

  principalCents        Int      @map("principal_cents")
  downPaymentCents      Int      @default(0) @map("down_payment_cents")
  monthlyPaymentCents   Int      @map("monthly_payment_cents")

  durationMonths        Int      @map("duration_months")
  remainingMonths       Int      @map("remaining_months")

  interestRateBps       Int      @default(0) @map("interest_rate_bps")
  earlyExitPenaltyCents Int      @default(0) @map("early_exit_penalty_cents")

  ownershipTransfer     Boolean  @default(true) @map("ownership_transfer")

  status                LeasingContractStatus @default(ACTIVE)

  startedDay            Int      @map("started_day")
  endedDay              Int?     @map("ended_day")

  metadata              Json?

  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  factory               Factory @relation(fields: [factoryId], references: [id], onDelete: Cascade)
  productionLine        FactoryProductionLine @relation(fields: [productionLineId], references: [id], onDelete: Restrict)

  @@index([factoryId, status])
  @@index([productionLineId])
  @@map("factory_leasing_contracts")
}
```

Bu model 06 için zorunlu değildir.
Ama leasing ileride eklenecekse doğru yer burasıdır.

---

# 29. Performans Kararları

## 29.1 Tek Tek Ürün Kaydı Tutulmayacak

Yanlış:

```text
1 ürün = 1 database row
```

Doğru:

```text
1 vardiya + 1 üretim hattı + 1 ürün + 1 departman = 1 aggregate result row
```

Bu karar özellikle binlerce oyuncu olduğunda kritik olur.

Örnek aggregate:

```prisma
model ShiftLineResult {
  id                       String   @id @default(cuid())

  factoryId                String   @map("factory_id")
  productionLineId         String   @map("production_line_id")
  productionLineTemplateId String   @map("production_line_template_id")
  departmentId             String   @map("department_id")
  productId                String   @map("product_id")
  orderId                  String?  @map("order_id")

  gameDay                  Int      @map("game_day")

  availablePoint           Int      @map("available_point")
  usedPoint                Int      @map("used_point")
  unusedPoint              Int      @map("unused_point")

  producedQty              Int      @map("produced_qty")
  defectQty                Int      @default(0) @map("defect_qty")
  reworkQty                Int      @default(0) @map("rework_qty")

  metadata                 Json?

  createdAt                DateTime @default(now()) @map("created_at")

  @@index([factoryId, gameDay])
  @@index([productionLineId, gameDay])
  @@index([departmentId])
  @@index([productId])
  @@map("shift_line_results")
}
```

Bu tablo 06'nın ana konusu değildir ama `FactoryProductionLine` modelinin neden sade tutulduğunu açıklar.

---

## 29.2 Toplam Alanlar Cache Olarak Tutulmayacak

Aşağıdaki değerler ilk aşamada hesaplanmalıdır:

| Değer | Kaynak |
| ----- | ------ |
| `activeProductionLineCount` | `FactoryProductionLine` |
| `totalDailyPointCapacity` | Aktif line template toplamı |
| `productionAreaM2` | Aktif line template area toplamı |
| `directProductionStaffNeed` | Aktif line template idealStaff toplamı |
| `monthlyLineElectricityBase` | Aktif line template elektrik toplamı |

Bunlar `Factory` üzerinde kolon olarak tutulmayacak.

Eğer dashboard büyür ve performans sorunu oluşursa ileride `FactoryMonthlySnapshot` veya `FactoryMetricSnapshot` eklenebilir.

---

## 29.3 Para Alanları Cent Olarak Tutulacak

Para değerleri decimal olarak saklanmamalıdır.

Doğru:

```text
1.000.000 = 100.000.000 cents
```

Factory canlı nakit değeri büyüyebileceği için:

```prisma
cashBalanceCents BigInt
```

Katalog maliyetleri daha küçük ve sabit olduğu için mevcut dokümanlarda `Int` kalabilir.

---

## 29.4 Oranlar BPS Olarak Tutulacak

Oranlar decimal yerine BPS ile tutulmalıdır.

| Gerçek Değer | BPS |
| ------------ | --: |
| 100% | 10000 |
| 80% | 8000 |
| 50% | 5000 |
| 1.18 | 11800 |
| 0.94 | 9400 |

Örnek:

```ts
adjustedCapacity =
  baseCapacity * conditionBps / 10000
```

---

## 29.5 Operating Stage Her Request'te Hesaplanmayacak

Mevcut kademe `FactoryOperatingStageState` içinde tutulur.

Bu durum başlangıç fabrikası oluşturma, yeni hat satın alma ve hat satma/devre dışı bırakma işlemlerinde transaction içinde güncellenir.
Dashboard mevcut durumu doğrudan okur; her request'te yeniden eşik hesabı yapmaz.

---

# 30. Minimum MVP Tablo Seti

Bu aşamada kesin gerekli tablolar:

| Tablo | Gerekli mi? | Açıklama |
| ----- | ----------: | -------- |
| `Factory` | Evet | Oyuncunun gerçek fabrika kaydı |
| `FactoryProductionLine` | Evet | Oyuncunun sahip olduğu gerçek üretim hatları |
| `FactoryDepartment` | Hayır | MVP için gereksiz |
| `FactoryLeasingContract` | Hayır | Leasing eklendiğinde gerekli |
| `ShiftLineResult` | Sonraki adım | Vardiya simülasyon sonucu için gerekli |
| `FactoryMetricSnapshot` | Hayır | Dashboard performansı gerekirse |
| `FactoryFinancialTransaction` | Sonraki finans adımı | Nakit hareket geçmişi için gerekli |

---

# 31. Başlangıç Factory Seed / Service Kararı

Textile beta başlangıç factory creation için seed/service şu değerleri kullanmalıdır:

| Alan | Değer |
| ---- | ----- |
| `sectorKey` | `textile` |
| `currencyCode` | Oyuncu seçer, default `EUR` |
| `cashBalanceCents` | `100_000_000n` |
| `currentDay` | `1` |
| `currentLevel` | `1` |
| `currentXp` | `0` |
| `status` | `ACTIVE` |
| Starter Line 1 | `cutting_workshop` |
| Starter Line 2 | `sewing_workshop` |
| Starter Line 3 | `ironing_packing_workshop` |
| Starter Line Acquisition | `STARTER` |
| Starter Line Condition | `10000` |
| Starter Line Status | `IDLE` |
| Starting Operating Stage | `small_workshop` |

---

# 32. Final Karar Özeti

| Konu | Karar |
| ---- | ----- |
| Oyuncunun gerçek fabrikası hangi tablo? | `Factory` |
| Oyuncunun gerçek üretim hattı hangi tablo? | `FactoryProductionLine` |
| Template ve gerçek hat ayrılacak mı? | Evet |
| `ProductionLineTemplate` oyuncuya özel veri tutacak mı? | Hayır |
| `FactoryProductionLine` kapasite değerlerini kopyalayacak mı? | Hayır |
| `FactoryProductionLine.departmentId` tutulacak mı? | Evet, performans ve UI için bilinçli denormalizasyon |
| Harita için `row`, `column`, `x`, `y`, `slotId` tutulacak mı? | Hayır |
| Harita blok sırası nereden gelir? | `DepartmentGroup.sortOrder` |
| Kart sırası nereden gelir? | `FactoryProductionLine.sortOrder`, sonra `lineNumber` |
| `DepartmentKind` gerekli mi? | Evet, master data tarafında production/warehouse/logistics ayrımı için |
| FactoryDepartment V1'de gerekli mi? | Hayır |
| Fason departmanlar için line kaydı açılacak mı? | Hayır |
| Sevkiyat production line olacak mı? | Hayır |
| Kalite kontrol V1'de production line olacak mı? | Hayır |
| Başlangıç fabrika kaç line ile başlar? | 3 line |
| Başlangıç line'ları | Cutting Workshop, Sewing Workshop, Ironing-Packing Workshop |
| Başlangıç fason departmanlar | Embroidery, Printing, Washing, Dyeing |
| Başlangıç sermayesi nerede tutulur? | `Factory.cashBalanceCents` |
| Para etiketi nerede tutulur? | `Factory.currencyCode` |
| `currentDay` nerede tutulur? | `Factory.currentDay` |
| `currentLevel` nerede tutulur? | `Factory.currentLevel` |
| Faaliyet kademesi nerede tutulur? | `FactoryOperatingStageState` |
| Faaliyet kademesi nasıl belirlenir? | Aktif üretim hattı adedi |
| Ölçek avantajı nasıl oluşur? | Kademe ortak giderinin artan üretime bölünmesiyle doğal olarak |
| Tek tek ürün kaydı tutulacak mı? | Hayır |
| Vardiya sonucu nasıl tutulacak? | Aggregate `ShiftLineResult` ile |
| Leasing bilgisi line tablosuna gömülecek mi? | Hayır, ayrı sözleşme tablosu |
| Gereksiz toplam kolonlar Factory içinde tutulacak mı? | Hayır |

---

# 33. Kodlamaya Geçerken Minimum Uygulama Sırası

Kodlama tarafında önerilen sıra:

1. `Factory` modelini ekle.
2. `FactoryProductionLine` modelini ekle.
3. `CurrencyCode`, `FactoryStatus`, `FactoryProductionLineStatus`, `LineAcquisitionType` enumlarını ekle.
4. `DepartmentKind` enumunu ve `Department.kind` alanını ekle.
5. Sadece `DepartmentKind.PRODUCTION` için line purchase modalını aktif et.
6. `ProductionLineTemplate` içine `factoryProductionLines` relation alanı ekle.
7. `Department` içine `factoryProductionLines` relation alanı ekle.
8. `Factory` creation service yaz.
9. Textile starter template key'leri ile 3 başlangıç line oluştur.
10. `recalculateFactoryOperatingStage(factoryId)` servisinin MVP versiyonunu yaz.
11. Factory dashboard için aktif line + template + department query'sini oluştur.
12. Factory map üzerinde `DepartmentGroup` bloklarını master data'dan, line'ları `FactoryProductionLine` üzerinden göster.

Bu sırayla ilerlemek gereksiz migration karmaşasını azaltır.

Önce gerçek fabrika ve gerçek hatlar kurulur.
Sonra shift simulation, allocation, staff assignment ve finans kayıtları bunun üzerine oturtulur.
