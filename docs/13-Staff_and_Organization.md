# 13 - Staff and Organization

Bu doküman, Factory Runway içinde personel, maaş, üretim hattı personel ihtiyacı, faaliyet kademesi kadro gereksinimi ve staff coverage yapısının nasıl çalışacağını tanımlar.

Bu yapı; üretim kapasitesi, vardiya simülasyonu, finans, Factory Operating Stage, chaos event ve ranking sistemleriyle doğrudan bağlantılıdır.

Ana amaç:

```text
Oyuncuya gerçekçi ama yönetilebilir bir personel sistemi vermek.
```

Bu yüzden V1'de tek tek çalışan kaydı tutulmayacaktır.

Yanlış yaklaşım:

```text
1 personel = 1 database kaydı
```

Doğru yaklaşım:

```text
1 fabrika + 1 rol + opsiyonel üretim hattı = aggregate personel kaydı
```

Örnek:

```text
Sewing Operator / Sewing Line 1 / quantity: 15
```

Bu sistem performanslıdır, yönetmesi kolaydır ve oyun için yeterli gerçekçilik sağlar.

---

# 1. Temel Karar

Personel sistemi üç ana katmandan oluşmalıdır:

| Katman | Amaç |
|---|---|
| `StaffRole` | Sektör bazlı personel rol master verisi |
| `ProductionLineTemplateStaffRequirement` | Bir üretim hattı template'inin hangi rollerden kaç kişi istediği |
| `FactoryStaffAssignment` | Oyuncunun gerçek fabrikasında sahip olduğu aggregate personel sayısı |

Bu ayrım önemlidir.

`ProductionLineTemplate.idealStaff` hızlı kapasite hesabı için özet sayı olarak kalır.

Detay rol dağılımı ise `ProductionLineTemplateStaffRequirement` içinde tutulur.

Oyuncunun gerçek personel sayısı ise `FactoryStaffAssignment` içinde tutulur.

---

# 2. Personel Sistemi Ne İşe Yarar?

Personel sistemi aşağıdaki alanlarda kullanılır:

1. Üretim hattı staff coverage hesabı
2. Vardiya simülasyonunda kapasite düşüşü
3. Maaş / payroll hesabı
4. Factory Operating Stage kadro gereksinimi
5. Eksik yönetim/support rolü uyarıları
6. Ortak gider payroll hesabı
7. Chaos event etkileri
8. Ranking ve organization score
9. Factory dashboard personel özeti
10. Başlangıç fabrikası kurulum wizard'ı

---

# 3. StaffType ve SupportCategory

Personeller üç ana tipe ayrılır:

```prisma
enum StaffType {
  DIRECT_PRODUCTION
  SUPPORT
  MANAGEMENT
}
```

| Tip | Açıklama |
|---|---|
| `DIRECT_PRODUCTION` | Doğrudan üretim hattında çalışan personel |
| `SUPPORT` | Üretimi destekleyen operasyonel kadro |
| `MANAGEMENT` | Yönetim, planlama ve organizasyon kadrosu |

Support kategorileri:

```prisma
enum SupportCategory {
  PLANNING
  QUALITY
  MAINTENANCE
  WAREHOUSE
  LOGISTICS
  HR_ADMIN
  FINANCE
  FACILITY
  OUTSOURCE_FOLLOWUP
  MANAGEMENT
}
```

| Kategori | Oyun rolü |
|---|---|
| `PLANNING` | Sipariş planlama ve allocation kalitesi |
| `QUALITY` | Fire, rework, müşteri şikayeti riski |
| `MAINTENANCE` | Makine arıza ve kondisyon riski |
| `WAREHOUSE` | Kumaş / aksesuar / ürün depo akışı |
| `LOGISTICS` | Sevkiyat ve dispatch organizasyonu |
| `HR_ADMIN` | Devamsızlık, işe alım, personel yönetimi |
| `FINANCE` | Finans ve idari işler |
| `FACILITY` | Tesis, temizlik, sosyal alan desteği |
| `OUTSOURCE_FOLLOWUP` | Fason takip ve ara işlem organizasyonu |
| `MANAGEMENT` | Genel fabrika yönetimi |

---

# 4. StaffRole Modeli

`StaffRole`, sektör bazlı personel rol master tablosudur.

Bu tabloda oyuncuya ait personel sayısı tutulmaz.

Rolün adı, tipi, departman bağlantısı ve maaş standardı burada tutulur.

```prisma
model StaffRole {
  id                    String           @id @default(cuid())

  sectorId              String           @map("sector_id")
  departmentId          String?          @map("department_id")

  key                   String
  staffType             StaffType        @map("staff_type")

  monthlySalaryCents    Int              @map("monthly_salary_cents")

  sortOrder             Int              @default(0) @map("sort_order")
  status                ContentStatus    @default(ACTIVE)
  metadata              Json?

  createdAt             DateTime         @default(now()) @map("created_at")
  updatedAt             DateTime         @updatedAt @map("updated_at")

  sector                Sector           @relation(fields: [sectorId], references: [id], onDelete: Cascade)
  department            Department?      @relation(fields: [departmentId], references: [id], onDelete: Restrict)

  translations          StaffRoleTranslation[]
  supportCategories     StaffRoleSupportCategory[]

  @@unique([sectorId, key])
  @@index([sectorId, staffType])
  @@index([sectorId, status])
  @@index([departmentId])
  @@map("staff_roles")
}
```

Bir rol birden fazla destek sorumluluğu taşıyabilir. Bu nedenle güncel modelde
tekil `supportCategory` kolonu yerine `StaffRoleSupportCategory` ilişki tablosu
kullanılır.

---

# 5. StaffRoleTranslation Modeli

Personel rol adları çok dilli gösterim için translation tablosunda tutulmalıdır.

```prisma
model StaffRoleTranslation {
  id          String    @id @default(cuid())

  staffRoleId String    @map("staff_role_id")
  locale      String

  name        String
  description String?

  staffRole   StaffRole @relation(fields: [staffRoleId], references: [id], onDelete: Cascade)

  @@unique([staffRoleId, locale])
  @@index([locale])
  @@map("staff_role_translations")
}
```

---

## 5.1 StaffRoleSupportCategory Modeli

```prisma
model StaffRoleSupportCategory {
  id              String          @id @default(cuid())
  staffRoleId     String          @map("staff_role_id")
  supportCategory SupportCategory @map("support_category")

  staffRole       StaffRole       @relation(fields: [staffRoleId], references: [id], onDelete: Cascade)

  @@unique([staffRoleId, supportCategory])
  @@index([supportCategory])
  @@map("staff_role_support_categories")
}
```

Bu yapı özellikle aşağıdaki birleşik roller için gereklidir:

```text
planning_outsource_coordinator -> PLANNING + OUTSOURCE_FOLLOWUP
admin_finance_hr               -> FINANCE + HR_ADMIN
factory_manager                -> MANAGEMENT
```

---

## 5.2 Textile Beta Personel Rol Kataloğu

Maaşlar aylık oyun dengesi değeridir ve `monthlySalaryCents` alanında cents
olarak saklanır. Örneğin `1.300` görünen maaş veritabanında `130000` olarak
tutulur.

### Direkt Üretim Personel Rolleri

| Key | TR Name | EN Name | Department | Monthly Salary | Cents |
|---|---|---|---|---:|---:|
| `cutting_operator` | Kesim Operatörü | Cutting Operator | `cutting` | 1.300 | 130000 |
| `fabric_spreading_staff` | Kumaş Serim Personeli | Fabric Spreading Staff | `cutting` | 850 | 85000 |
| `marker_staff` | Marker / Şablon Personeli | Marker Staff | `cutting` | 1.100 | 110000 |
| `bundling_staff` | Numaralama / Bundle Personeli | Bundling Staff | `cutting` | 750 | 75000 |
| `cutting_qc_staff` | Kesim Kalite Personeli | Cutting QC Staff | `cutting` | 950 | 95000 |
| `sewing_line_leader` | Dikim Hat Sorumlusu | Sewing Line Leader | `sewing` | 1.300 | 130000 |
| `sewing_operator` | Dikim Operatörü | Sewing Operator | `sewing` | 900 | 90000 |
| `sewing_helper` | Dikim Yardımcı Personeli | Sewing Helper | `sewing` | 750 | 75000 |
| `inline_qc_staff` | Hat İçi Kalite Personeli | Inline QC Staff | `sewing` | 950 | 95000 |
| `ironing_operator` | Ütü / Press Operatörü | Ironing Operator | `ironing_packing` | 850 | 85000 |
| `final_qc_staff` | Son Kontrol Personeli | Final QC Staff | `ironing_packing` | 950 | 95000 |
| `packing_staff` | Katlama / Paket Personeli | Packing Staff | `ironing_packing` | 750 | 75000 |
| `carton_flow_staff` | Koli / Akış Personeli | Carton Flow Staff | `ironing_packing` | 750 | 75000 |
| `embroidery_operator` | Nakış Operatörü | Embroidery Operator | `embroidery` | 1.000 | 100000 |
| `embroidery_helper` | Nakış Yardımcı Personeli | Embroidery Helper | `embroidery` | 750 | 75000 |
| `printing_operator` | Baskı Operatörü | Printing Operator | `printing` | 1.050 | 105000 |
| `printing_helper` | Baskı Yardımcı Personeli | Printing Helper | `printing` | 800 | 80000 |
| `washing_operator` | Yıkama Operatörü | Washing Operator | `washing` | 1.050 | 105000 |
| `washing_helper` | Yıkama Yardımcı Personeli | Washing Helper | `washing` | 850 | 85000 |
| `dyeing_operator` | Boyama Operatörü | Dyeing Operator | `dyeing` | 1.200 | 120000 |
| `dyeing_helper` | Boyama Yardımcı Personeli | Dyeing Helper | `dyeing` | 900 | 90000 |

Bu rollerin tamamı `DIRECT_PRODUCTION` tipindedir ve support category
bağlantısı taşımaz.

### Yönetim ve Support Personel Rolleri

| Key | TR Name | EN Name | Staff Type | Support Categories | Monthly Salary | Cents |
|---|---|---|---|---|---:|---:|
| `factory_manager` | Fabrika / Üretim Müdürü | Factory / Production Manager | `MANAGEMENT` | `MANAGEMENT` | 2.200 | 220000 |
| `planning_outsource_coordinator` | Planlama + Fason Takip Sorumlusu | Planning + Outsource Coordinator | `SUPPORT` | `PLANNING`, `OUTSOURCE_FOLLOWUP` | 1.400 | 140000 |
| `warehouse_supervisor` | Depo Sorumlusu | Warehouse Supervisor | `SUPPORT` | `WAREHOUSE` | 1.100 | 110000 |
| `material_flow_staff` | Malzeme Akış Personeli | Material Flow Staff | `SUPPORT` | `WAREHOUSE` | 800 | 80000 |
| `dispatch_staff` | Ürün Deposu / Sevkiyat Personeli | Product Warehouse / Dispatch Staff | `SUPPORT` | `LOGISTICS` | 850 | 85000 |
| `maintenance_technician` | Bakım Teknisyeni | Maintenance Technician | `SUPPORT` | `MAINTENANCE` | 1.300 | 130000 |
| `quality_supervisor` | Kalite Sorumlusu | Quality Supervisor | `SUPPORT` | `QUALITY` | 1.300 | 130000 |
| `admin_finance_hr` | Admin / Finans / HR Personeli | Admin / Finance / HR Staff | `SUPPORT` | `FINANCE`, `HR_ADMIN` | 1.200 | 120000 |
| `facility_support_staff` | Temizlik / Tesis Destek Personeli | Facility Support Staff | `SUPPORT` | `FACILITY` | 700 | 70000 |

Support ve management rolleri fabrika kapsamındadır; bu nedenle
`departmentId = null` ve personel atamasında `scopeKey = "FACTORY"` kullanılır.

Seed ve diğer master data işlemlerinde kullanılacak canonical departman
anahtarları:

```text
fabric_warehouse
accessory_warehouse
product_warehouse
cutting
printing
embroidery
sewing
washing
dyeing
ironing_packing
```

---

# 6. ProductionLineTemplateStaffRequirement Modeli

Bu tablo, bir üretim hattı template'inin ideal çalışması için hangi rollerden kaç kişi gerektiğini tanımlar.

`ProductionLineTemplate.idealStaff` hızlı özet kapasite hesabı için kalır.

Bu tablo ise detay rol dağılımını verir.

```prisma
model ProductionLineTemplateStaffRequirement {
  id                       String @id @default(cuid())

  productionLineTemplateId String @map("production_line_template_id")
  staffRoleId              String @map("staff_role_id")

  requiredQuantity         Int    @map("required_quantity")
  sortOrder                Int    @default(0) @map("sort_order")

  metadata                 Json?

  productionLineTemplate   ProductionLineTemplate @relation(fields: [productionLineTemplateId], references: [id], onDelete: Cascade)
  staffRole                StaffRole              @relation(fields: [staffRoleId], references: [id], onDelete: Restrict)

  @@unique([productionLineTemplateId, staffRoleId])
  @@index([staffRoleId])
  @@map("production_line_template_staff_requirements")
}
```

Örnek Cutting Workshop personel gereksinimi:

| Rol | Adet |
|---|---:|
| Cutting Operator | 1 |
| Fabric Spreading Staff | 2 |
| Marker / Pattern Staff | 1 |
| Bundling Staff | 1 |
| Cutting Quality Staff | 1 |
| **Toplam** | **6** |

Örnek Sewing Workshop personel gereksinimi:

| Rol | Adet |
|---|---:|
| Sewing Operator | 12 |
| Line Chief / Supervisor | 1 |
| Inline Quality Staff | 1 |
| Helper / Material Flow | 1 |
| **Toplam** | **15** |

Örnek Ironing-Packing Workshop personel gereksinimi:

| Rol | Adet |
|---|---:|
| Ironing / Press Operator | 3 |
| Final Control Staff | 2 |
| Folding / Label / Bagging Staff | 2 |
| Packing Flow Staff | 1 |
| **Toplam** | **8** |

---

# 7. FactoryStaffAssignment Modeli

Bu tablo, oyuncunun gerçek fabrikasındaki aggregate personel sayısını tutar.

Tek tek personel kaydı tutulmaz.

```prisma
model FactoryStaffAssignment {
  id                      String                @id @default(cuid())

  factoryId               String                @map("factory_id")
  staffRoleId             String                @map("staff_role_id")

  factoryProductionLineId String?               @map("factory_production_line_id")

  quantity                Int                   @default(0)
  status                  StaffAssignmentStatus @default(ACTIVE)

  createdAt               DateTime              @default(now()) @map("created_at")
  updatedAt               DateTime              @updatedAt @map("updated_at")

  factory                 Factory               @relation(fields: [factoryId], references: [id], onDelete: Cascade)
  staffRole               StaffRole             @relation(fields: [staffRoleId], references: [id], onDelete: Restrict)
  factoryProductionLine   FactoryProductionLine? @relation(fields: [factoryProductionLineId], references: [id], onDelete: Cascade)

  @@unique([factoryId, staffRoleId, factoryProductionLineId])
  @@index([factoryId])
  @@index([factoryProductionLineId])
  @@index([staffRoleId])
  @@map("factory_staff_assignments")
}
```

Enum:

```prisma
enum StaffAssignmentStatus {
  ACTIVE
  PASSIVE
}
```

Kural:

```text
factoryProductionLineId doluysa -> direkt üretim personeli
factoryProductionLineId boşsa -> destek / yönetim personeli
```

---

# 8. Direkt Üretim Personeli ve Line Staff Coverage

Her üretim hattının vardiya kapasitesi, o hatta atanmış personel sayısına göre etkilenir.

Hesap:

```ts
assignedStaff = sum(
  FactoryStaffAssignment.quantity
  where factoryProductionLineId = line.id
)

idealStaff = line.productionLineTemplate.idealStaff

lineStaffCoverageBps = min(10000, assignedStaff * 10000 / idealStaff)
```

Örnek:

| Hat | Ideal Staff | Assigned Staff | Coverage |
|---|---:|---:|---:|
| Sewing Line 1 | 15 | 15 | 10000 |
| Sewing Line 2 | 15 | 12 | 8000 |
| Cutting Line 1 | 6 | 5 | 8333 |

Shift simulation içinde:

```ts
effectivePoints =
  plannedPoints
  * lineStaffCoverageBps / 10000
  * conditionBps / 10000
  * eventPenaltyBps / 10000
```

Kural:

```text
Eksik direkt personel üretim kapasitesini düşürür.
Fazla personel V1'de kapasiteyi 100%'ün üzerine çıkarmaz.
```

Bu önemlidir.
Oyuncu üretim hattına gereğinden fazla personel yığarak kapasiteyi bedava artırmamalıdır.

İleride eğitim, uzmanlık veya premium organizasyon sistemleri eklenirse fazla personelin kalite veya esneklik etkisi ayrıca değerlendirilebilir.

---

# 9. Yönetim ve Destek Kadrosu Neden Gerekli?

Büyük fabrika yönetim, planlama, kalite, bakım, depo ve finans desteği olmadan sağlıklı çalışamaz.

Bu ihtiyaç bir yüzde çarpanı ile hesaplanmaz. Her fabrika faaliyet kademesinin açık bir rol ve adet listesi vardır.

Destek kadrosu şu sistemlerde kullanılır:

1. Kademe gereksinim kontrolü
2. Chaos event etkileri
3. Kalite ve gecikme riski
4. Ranking organization score
5. Vardiya ve aylık rapor uyarıları
6. Aylık ortak gider hesabı

---

# 10. Kademe Bazlı Personel Gereksinimi

Nihai model `SectorFactoryOperatingStageStaffRequirement` olmalıdır.

Her satır bir sektör faaliyet kademesinde gerekli rolü ve kesin adedi tanımlar:

```prisma
model SectorFactoryOperatingStageStaffRequirement {
  id                       String @id @default(cuid())
  sectorFactoryOperatingStageId String @map("sector_factory_operating_stage_id")
  staffRoleId              String @map("staff_role_id")
  requiredQuantity         Int    @map("required_quantity")

  sectorFactoryOperatingStage SectorFactoryOperatingStage @relation(...)
  staffRole                  StaffRole @relation(...)

  @@unique([sectorFactoryOperatingStageId, staffRoleId])
  @@map("sector_factory_operating_stage_staff_requirements")
}
```

Bu tablo formül değil, oyun tasarımcısının yönettiği merdivendir.

```text
Small Workshop / Factory Manager / 1
Small Workshop / Planning Coordinator / 1
Growing Factory / Planning Coordinator / 2
```

Faaliyet kademesinin tam modeli ve geçiş kuralları `15-Factory_Operating_Stage_and_Shared_Cost.md` içindedir.

---

# 11. Eksik Personel Hesabı

Mevcut kademenin her rolü ayrı kontrol edilir:

```ts
actualQuantity = sum(
  FactoryStaffAssignment.quantity
  where staffRoleId = requirement.staffRoleId
  and status = ACTIVE
)

missingQuantity = Math.max(
  0,
  requirement.requiredQuantity - actualQuantity
)
```

Kademe personel gereksinimi:

```ts
requirementsMet = every(requirement.missingQuantity === 0)
```

Bu kontrol oyuncuya doğrudan anlaşılır bir görev listesi verir:

```text
Planning Coordinator: 1 / 2
Maintenance Technician: 1 / 1
Warehouse Supervisor: 1 / 1
```

---

# 12. Eksik Destek Personelinin Etkisi

Ortak gider veya ölçek avantajı için genel bir `supportCoverageBps` kullanılmaz.

Eksik rol doğrudan kendi alanında uyarı ve risk üretir:

| Eksik kategori | Etki |
|---|---|
| Planning | Allocation hatası, gecikme riski |
| Quality | Fire, rework, müşteri şikayeti |
| Maintenance | Makine arıza sıklığı |
| Warehouse | Malzeme akış ve stok karışıklığı |
| HR/Admin | Devamsızlık ve personel turnover |
| Finance | Rapor gecikmesi, finans yönetim zorluğu |
| Logistics | Sevkiyat riski |

Vardiya veya olay sistemi ihtiyaç duyarsa kategori bazlı bir oran çalışma anında türetilebilir. Bu oran faaliyet kademesinin maliyetini indiren veya artıran genel bir çarpan değildir.

---

# 13. Başlangıç Support Kadrosu

Textile Beta başlangıç fabrikasının `small_workshop` kademe gereksinimi şu şekilde tanımlanmalıdır:

| Rol | Adet | Category |
|---|---:|---|
| Factory / Production Manager | 1 | MANAGEMENT |
| Planning + Outsource Follow-up | 1 | PLANNING / OUTSOURCE_FOLLOWUP |
| Warehouse Responsible | 1 | WAREHOUSE |
| Material Flow Staff | 1 | WAREHOUSE |
| Product Warehouse / Dispatch Staff | 1 | LOGISTICS |
| Maintenance Technician | 1 | MAINTENANCE |
| Quality Responsible | 1 | QUALITY |
| Admin / Finance / HR | 1 | HR_ADMIN / FINANCE |
| Cleaning / Facility Support | 1 | FACILITY |
| **Toplam** | **9** | |

Bu 9 kişi V1 için `small_workshop` faaliyet kademesinin yönetim ve destek kadrosudur.

Başlangıç direkt üretim personeli:

| Departman | Hat | Ideal Staff |
|---|---:|---:|
| Cutting | 1 Workshop | 6 |
| Sewing | 1 Workshop | 15 |
| Ironing-Packing | 1 Workshop | 8 |
| **Toplam Direkt Üretim** | **3 hat** | **29** |

Başlangıç toplam personel:

```ts
startingStaff = 29 + 9
startingStaff = 38
```

---

# 14. Başlangıç Fabrikası Personel Oluşturma Akışı

Oyuncu sektörü seçip başlangıç fabrikası oluşturduğunda:

```text
1. Factory oluşturulur.
2. Başlangıç production line kayıtları oluşturulur.
3. Her production line için ProductionLineTemplateStaffRequirement okunur.
4. FactoryStaffAssignment ile direkt üretim personeli oluşturulur.
5. FactoryOperatingStageState oluşturulur ve `small_workshop` seçilir.
6. Kademe personel gereksinimleri okunur.
7. Başlangıç yönetim ve destek kadrosu oluşturulur.
8. totalStaffCount ve monthlyPayrollCents hesaplanır.
```

Bu işlem transaction içinde yapılmalıdır.

---

# 15. Personel ve Maaş / Payroll Bağlantısı

Maaş hesabı `StaffRole.monthlySalaryCents` ve `FactoryStaffAssignment.quantity` üzerinden yapılır.

```ts
monthlyPayrollCents = sum(
  factoryStaffAssignment.quantity
  * staffRole.monthlySalaryCents
)
```

Finans dokümanındaki 22 oyun günü sonunda `PAYROLL` gideri oluşturulur.

```text
FactoryFinanceDue veya FactoryFinanceTransaction
category = PAYROLL
amount = monthlyPayrollCents
```

Kural:

```text
Maaş her personel için ayrı kayıt oluşturmaz.
Rol bazlı aggregate olarak hesaplanır.
```

---

# 16. Personel ve Chaos Event Bağlantısı

Personel eksikliği chaos event sistemiyle birlikte çalışır.

Örnek olaylar:

| Event | Etki |
|---|---|
| Staff Absence | İlgili line staff coverage düşer |
| Flu Wave | Factory veya department genelinde staff coverage düşer |
| Bad Weather | Devamsızlık ve lojistik riski yaratır |

Shift başında chaos event üretildiğinde:

```ts
finalLineStaffCoverageBps =
  baseLineStaffCoverageBps
  * chaosStaffPenaltyBps / 10000
```

Shift result içine snapshot olarak yazılmalıdır:

```text
staffCoverageBps
chaosPenaltyBps
finalEffectiveCapacity
```

Bu sayede vardiya raporu şu soruya cevap verebilir:

```text
Bugün neden üretim düştü?
```

---

# 17. Personel ve Factory Operating Stage Bağlantısı

Faaliyet kademesi aktif üretim hattı sayısına göre belirlenir. Personel, o kademenin açık gereksinim listesine göre ayrıca kontrol edilir.

`totalStaffCount` hesabı:

```ts
totalStaffCount = sum(
  FactoryStaffAssignment.quantity
  where status = ACTIVE
)
```

Kural:

```text
Yeni hat sayısı fabrikayı yeni faaliyet kademesine taşır.
Yeni kademenin yönetim ve destek kadrosu oyuncuya görev listesi olarak gösterilir.
Eksik roller ilgili operasyon risklerini ve uyarıları oluşturur.
```

---

# 18. Personel ve Ranking Bağlantısı

Ranking sistemi içinde personel doğrudan skorun küçük bir parçası olabilir.

Kullanılabilecek metrikler:

| Metrik | Açıklama |
|---|---|
| totalStaffCount | Fabrika organizasyon büyüklüğü |
| stageRequirementsMet | Faaliyet kademesi kadro yeterliliği |
| staffEfficiency | Üretim / personel oranı |
| payrollPressure | Maaş giderinin gelire oranı |
| organizationScore | Support + utilization + delivery dengesi |

Ranking sadece personel sayısına göre verilmemelidir.

Büyük kadro her zaman iyi değildir.

```text
Çok personel + düşük üretim = düşük verimlilik
Yeterli personel + yüksek utilization = iyi organizasyon
```

---

# 19. Personel UI Kararları

V1 için personel ekranı basit olmalıdır.

Oyuncu şu bilgileri görmelidir:

```text
Total Staff
Direct Production Staff
Support Staff
Monthly Payroll
Line Staff Coverage
Missing Staff Warning
```

Line detayında:

```text
Sewing Line 1
Ideal Staff: 15
Assigned Staff: 14
Coverage: 93%
```

Kademe personel paneli:

```text
Small Workshop
Required Roles: 9 / 9 complete
Planning Coordinator: 1 / 1
Maintenance Technician: 1 / 1
```

Oyuncu personeli aggregate olarak artırıp azaltabilir.

```text
+1 Sewing Operator
-1 Warehouse Staff
Hire Maintenance Technician
```

Tek tek isimli personel listesi V1 için yoktur.

---

# 20. Staff Hiring ve Firing Basit Kuralı

V1 için işe alma anında gerçekleşebilir.

```text
Oyuncu personel sayısını artırır.
FactoryStaffAssignment.quantity artar.
Payroll artar.
Coverage artar.
```

İşten çıkarma da anında yapılabilir, fakat basit bir maliyet eklenebilir.

Öneri:

```text
V1'de işten çıkarma cezası yok.
V2'de severance cost / morale etkisi eklenebilir.
```

V1 için ana amaç sistemi çalışır hale getirmektir.
İnsan kaynakları trajedisine daha sonra döneriz.

---

# 21. Performans Kararları

Personel sistemi performans için aggregate tutulmalıdır.

Yanlış yaklaşım:

```text
FactoryStaffMember tablosunda 300 çalışan = 300 kayıt
```

Doğru yaklaşım:

```text
FactoryStaffAssignment:
Sewing Operator / Line 1 / quantity 15
```

Personel kaynaklı hesaplar vardiya öncesi snapshot olarak alınabilir:

```text
lineStaffCoverageBps
totalStaffCount
monthlyPayrollCents
missingStageStaffRequirements
```

Shift sırasında tekrar tekrar staff query yapılmamalıdır.

---

# 22. MVP İçin Minimum Gerekli Kapsam

MVP için gerekli modeller:

1. `StaffRole`
2. `StaffRoleTranslation`
3. `ProductionLineTemplateStaffRequirement`
4. `FactoryStaffAssignment`
5. `SectorFactoryOperatingStage`
6. `SectorFactoryOperatingStageStaffRequirement`
7. `FactoryOperatingStageState`

MVP için gerekli hesaplar:

1. totalStaffCount
2. lineStaffCoverageBps
3. current operating stage
4. stage staff requirement checklist
5. monthlyPayrollCents
6. starting staff creation

MVP'de ertelenebilecek konular:

| Konu | Neden ertelenebilir? |
|---|---|
| Tek tek personel isimleri | Performans ve UI karmaşası |
| Personel deneyim seviyesi | İlk beta için gereksiz |
| Morale sistemi | Denge sonrası eklenebilir |
| Turnover | Kaos sistemiyle sonra bağlanabilir |
| Eğitim sistemi | Player level / academy modülünde açılabilir |
| Severance cost | V2 finans detayına bırakılabilir |

---

# 23. Final Karar Özeti

| Konu | Karar |
|---|---|
| Tek tek personel kaydı | Yok |
| Aggregate personel | Evet |
| Personel rol master | `StaffRole` |
| Rol çevirileri | `StaffRoleTranslation` |
| Hat personel ihtiyacı | `ProductionLineTemplateStaffRequirement` |
| Oyuncunun gerçek personeli | `FactoryStaffAssignment` |
| Support ihtiyacı | `SectorFactoryOperatingStageStaffRequirement` |
| Direkt personel etkisi | Line staff coverage |
| Support personel etkisi | Rol bazlı uyarı ve operasyon riski |
| Maaş hesabı | Role salary × quantity |
| Payroll | 22 oyun günü finans kapanışı |
| Staff coverage üretimi etkiler mi? | Evet |
| Genel support coverage çarpanı var mı? | Hayır |
| Fazla personel kapasiteyi artırır mı? | V1'de hayır |
| Personel chaos ile bağlantılı mı? | Evet |
| Başlangıç toplam personel | 38 |
| Başlangıç direkt personel | 29 |
| Başlangıç support personel | 9 |
