# Factory Runway Sector Detayları 
- Oyun içerisinde birden fazla sektör kullanılacak. ilk beta sürümde TEXTILE ile başlayacağız fakat sonrasında aşağıdaki sektörlerde eklenecek. 
- Chocolate , Food - Furniture - Toy - Corrugated Packaging Industry


Sektör User Oyuncu için Ana seçim aşamalarından ilk olanıdır. Oyuncu Sektör'e karar verir .. 
Bunula ilgili planladığım veritabanı model yapısı aşağıdaki gibidir. 

model Sector {
  id                String              @id @default(cuid())
  key               String              @unique
  status            SectorStatus        @default(IN_DEVELOPMENT)
  sortOrder         Int                 @default(0) @map("sort_order")
  photoUrl          String?             @map("photo_url")
  photoPathname     String?             @map("photo_pathname")
  metadata          Json?
  createdAt         DateTime            @default(now()) @map("created_at")
  updatedAt         DateTime            @updatedAt @map("updated_at")

  translations      SectorTranslation[]

  departmentGroups  DepartmentGroup[]
  departments       Department[]
  productCategories ProductCategory[]
  productTypes      ProductType[]
  products          Product[]

  @@index([status, sortOrder])
  @@map("sectors")
}

model SectorTranslation {
  id          String   @id @default(cuid())
  sectorId    String   @map("sector_id")
  locale      String
  name        String
  description String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  sector      Sector   @relation(fields: [sectorId], references: [id], onDelete: Cascade)

  @@unique([sectorId, locale])
  @@index([locale])
  @@map("sector_translations")
}


# Sektörün Sahip olduğu Departman detayları aşağıdaki gibidir. 

DepartmentGroup
Bunu şunlar için kullanacaksın:
- Fabrika haritasında görsel gruplama
- Admin panelde departmanları düzenli gösterme
- Ana üretim / ara işlem / depo / kalite gibi bölümler
- Factory standard requirement gibi toplu gereksinimler
Örnek:
Ana Üretim
Ara İşlemler
Depo & Lojistik
Kalite Kontrol
Department
Bunu ise gerçek oyun sistemi için kullanacaksın:

- Kesim
- Dikim
- Ütü Paket
- Nakış
- Baskı
- Yıkama
- Boyama
- Kumaş Deposu
- Ürün Deposu

Yani DepartmentGroup tabela, Department çalışan yapı.


Veritabanı Planlamasını aşağıdaki gibi oluşturdum. 

model DepartmentGroup {
  id                   String                       @id @default(cuid())
  sectorId             String                       @map("sector_id")
  key                  String
  sortOrder            Int                          @default(0) @map("sort_order")
  status               ContentStatus                @default(ACTIVE)
  metadata             Json?

  sector               Sector                       @relation(fields: [sectorId], references: [id], onDelete: Cascade)
  translations         DepartmentGroupTranslation[]
  departments          Department[]
  standardRequirements FactoryStandardRequirement[]

  @@unique([sectorId, key])
  @@index([sectorId, sortOrder])
  @@map("department_groups")
}

model DepartmentGroupTranslation {
  id                String          @id @default(cuid())
  departmentGroupId String          @map("department_group_id")
  locale            String
  name              String
  description       String?

  departmentGroup   DepartmentGroup @relation(fields: [departmentGroupId], references: [id], onDelete: Cascade)

  @@unique([departmentGroupId, locale])
  @@index([locale])
  @@map("department_group_translations")
}

model Department {
  id                         String                       @id @default(cuid())
  sectorId                   String                       @map("sector_id")
  departmentGroupId          String?                      @map("department_group_id")
  key                        String
  routeOrder                 Int                          @default(0) @map("route_order")
  isStarter                  Boolean                      @default(false) @map("is_starter")
  supportsOutsource          Boolean                      @default(false) @map("supports_outsource")
  recommendedMinWorkload     Int?                         @map("recommended_min_workload")
  recommendedMaxWorkload     Int?                         @map("recommended_max_workload")
  status                     ContentStatus                @default(ACTIVE)
  metadata                   Json?
  createdAt                  DateTime                     @default(now()) @map("created_at")
  updatedAt                  DateTime                     @updatedAt @map("updated_at")

  sector                     Sector                       @relation(fields: [sectorId], references: [id], onDelete: Cascade)
  departmentGroup            DepartmentGroup?             @relation(fields: [departmentGroupId], references: [id], onDelete: SetNull)
  translations               DepartmentTranslation[]


  @@unique([sectorId, key])
  @@index([sectorId, routeOrder])
  @@index([departmentGroupId])
  @@map("departments")
}

model DepartmentTranslation {
  id           String     @id @default(cuid())
  departmentId String     @map("department_id")
  locale       String
  name         String
  description  String?

  department   Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)

  @@unique([departmentId, locale])
  @@index([locale])
  @@map("department_translations")
}


Tekstil beta için örnek seed mantığı

DepartmentGroup:
- main_production
- value_added_processes
- warehouse_logistics
- quality_control


Department:
- cutting              → main_production
- sewing               → main_production
- ironing_packing      → main_production

- embroidery           → value_added_processes
- printing             → value_added_processes
- washing              → value_added_processes
- dyeing               → value_added_processes

- fabric_warehouse     → warehouse_logistics
- accessory_warehouse  → warehouse_logistics
- product_warehouse    → warehouse_logistics

- quality_control      → quality_control