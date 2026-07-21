# ProductionLineTemplate Veri Standartları

Bu bölüm, Factory Runway içinde üretim departmanlarına bağlı üretim hatlarının nasıl tanımlanacağını belirler.

Amaç; her üretim hattı için kapasite, personel, makine, m2, elektrik ve yatırım maliyetlerini standart hale getirmektir.

Bu tablo ürünün iş yükünü tutmaz.
Ürün iş yükleri `ProductRouteStep` veya ileride kullanılacak `ProductRouteStepStandard` yapısında tutulur.

ProductionLineTemplate şu soruya cevap verir:

> Bu departmandaki bu teknoloji seviyesine sahip üretim hattı bir günde kaç üretim puanı işler, kaç personel ister, kaç m2 kaplar, ne kadar elektrik yakar ve yatırım maliyeti nedir?

ProductRouteStep ise şu soruya cevap verir:

> Bu ürün bu departmanda 1 adet üretilebilmek için kaç iş yükü puanı ister?

Bu ayrım performans için önemlidir. Üretim simülasyonu sırasında sistem yalnızca şu basit hesabı yapar:

```ts
dailyProductionQty = Math.floor(line.dailyPointCapacity / productRouteStep.workloadPointsPerUnit)
```

---

## 1. ProductionLineTemplate Tablo Mantığı

Önerilen model:

```prisma
model ProductionLineTemplate {
  id                          String          @id @default(cuid())

  sectorId                    String          @map("sector_id")
  departmentId                String          @map("department_id")

  key                         String
  grade                       ProductionGrade

  machineCount                Int             @default(0) @map("machine_count")
  idealStaff                  Int             @map("ideal_staff")

  dailyPointCapacity          Int             @map("daily_point_capacity")
  directCostPer1000PointsCents Int            @default(0) @map("direct_cost_per_1000_points_cents")

  areaM2                      Int             @map("area_m2")
  monthlyElectricityBaseCents Int             @default(0) @map("monthly_electricity_base_cents")
  purchaseCostCents           Int             @default(0) @map("purchase_cost_cents")

  imageUrl                    String?         @map("image_url")
  imagePathname               String?         @map("image_pathname")

  sortOrder                   Int             @default(0) @map("sort_order")
  status                      ContentStatus   @default(ACTIVE)
  metadata                    Json?

  createdAt                   DateTime        @default(now()) @map("created_at")
  updatedAt                   DateTime        @updatedAt @map("updated_at")

  sector                      Sector          @relation(fields: [sectorId], references: [id], onDelete: Cascade)
  department                  Department      @relation(fields: [departmentId], references: [id], onDelete: Restrict)
  visualAssets               ProductionLineVisualAsset[]

  @@unique([sectorId, departmentId, key])
  @@unique([sectorId, departmentId, grade])
  @@index([sectorId, departmentId])
  @@index([grade])
  @@index([status])
  @@map("production_line_templates")
}
```

Production grade enum:

```prisma
enum ProductionGrade {
  WORKSHOP
  INDUSTRIAL
  PRECISION
  SMART
}
```

---

## 2. Kolon Açıklamaları

| Kolon                         | Açıklama                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `sectorId`                    | Üretim hattının ait olduğu sektör. Textile, chocolate, furniture gibi sektör ayrımı için kullanılır. |
| `departmentId`                | Üretim hattının bağlı olduğu departman. Örneğin cutting, sewing, ironing_packing.                    |
| `key`                         | Teknik tanımlayıcıdır. UI adı değildir. Örnek: `sewing_workshop`, `cutting_smart`.                   |
| `grade`                       | Üretim hattının teknoloji seviyesi. WORKSHOP, INDUSTRIAL, PRECISION, SMART.                          |
| `machineCount`                | Hattın kurulması için gereken ana makine / ekipman sayısı.                                           |
| `idealStaff`                  | Hattın tam verimli çalışması için gereken ideal direkt üretim personeli. Maksimum personel değildir. |
| `dailyPointCapacity`          | Hattın bir oyun gününde üretebildiği toplam iş gücü puanı.                                           |
| `directCostPer1000PointsCents`| Merkezi servis tarafından hesaplanan doğrudan 1000 point referans maliyeti.                          |
| `areaM2`                      | Hattın kapladığı üretim alanı. Kira ve fabrika büyüklüğü hesabında kullanılır.                       |
| `monthlyElectricityBaseCents` | Hattın aylık baz elektrik gideri. Kullanım oranı ile çarpılarak gerçek gider hesaplanır.             |
| `purchaseCostCents`           | Hattın satın alma yatırım maliyeti. Leasing ayrı sistemde yönetilecektir.                            |
| `imageUrl`                    | Hattın görsel URL adresi.                                                                            |
| `imagePathname`               | Storage/upload pathname bilgisi.                                                                     |
| `sortOrder`                   | Admin ve UI sıralaması.                                                                              |
| `status`                      | ACTIVE, DRAFT, PASSIVE gibi içerik durumu.                                                           |
| `metadata`                    | İleride ihtiyaç olabilecek ek bilgiler için esnek alan.                                              |

---

## 3. Bu Tabloda Tutulmayacak Alanlar

Aşağıdaki bilgiler ProductionLineTemplate içinde tutulmamalıdır:

| Alan                   | Neden Tutulmaz?                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------- |
| Ürün iş yükü puanı     | Ürüne aittir, `ProductRouteStep` içinde tutulur.                                      |
| Kira m2 fiyatı         | Genel gider config değeridir.                                                         |
| Yemek gideri           | Personel sayısına göre hesaplanır.                                                    |
| Genel gider baz tutarı | İşletme büyüklüğü config değeridir.                                                   |
| Personel maaşı         | StaffGroup / rol bazlı maaş sisteminde tutulur.                                       |
| Leasing vadesi         | Ayrı leasing sözleşme sistemiyle yönetilir.                                           |
| Arıza ve bakım geçmişi | FactoryProductionLine veya MaintenanceEvent tarafında tutulur.                        |
| Anlık verimlilik       | Oyuncunun sahip olduğu gerçek hatta, yani FactoryProductionLine tarafında hesaplanır. |

Bu tablo master data / seed verisidir.
Oyuncunun sahip olduğu gerçek üretim hattı ise ayrıca `FactoryProductionLine` olarak tutulur.

Görsel yönetiminde tek master PNG/WEBP yüklenir ve aşağıdaki WEBP varyantları
`ProductionLineVisualAsset` tablosunda tutulur:

```text
CARD       512 × 384
MAP        768 × 512
DETAIL    1024 × 768
THUMBNAIL  320 × 240
```

`ProductionLineTemplate.imageUrl` ve `imagePathname`, hızlı listeleme için
CARD varyantının bilinçli cache alanlarıdır.

---

# 4. Departmanlara Göre ProductionLineTemplate Seed Verileri

Aşağıdaki değerler Textile Beta v1 için başlangıç seed standardıdır.

Para değerleri EUR/USD etiketiyle aynı rakam üzerinden çalışır.
Veritabanında `purchaseCostCents` ve `monthlyElectricityBaseCents` olarak cent/kuruş karşılığı saklanır.

Admin formunda bu değerler EUR/USD ana para birimiyle girilir. Server Action
değeri 100 ile çarparak cent alanına yazar:

```text
Admin girişi: 45000
Database:      4.500.000 cent
```

Örnek:

```ts
purchaseCost = 45_000
purchaseCostCents = 4_500_000
```

---

## 4.0 Üretim Alanı M2 Standardı

`ProductionLineTemplate.areaM2`, üretim hattının fabrika içinde kapladığı
net operasyon alanıdır.

Bu alana dahil olanlar:

- Makine ve çalışma istasyonları
- Operatör çalışma mesafesi
- Hat içi güvenlik ve servis boşluğu
- Departman içi kısa süreli WIP/bundle alanı
- Hazırlık, kontrol ve hat içi malzeme akış alanı

Bu alana dahil olmayanlar:

- Kumaş, aksesuar ve ürün depoları
- Ofis, sosyal ve teknik alanlar
- Fabrika genel koridorları ve ortak alanlar
- Sevkiyat bekleme alanı

Hariç tutulan alanlar `Factory Operating Stage` ortak alan hesabında
yönetilir. Böylece aynı m2 iki kez maliyetlendirilmez.

WORKSHOP başlangıç standardı:

| Departman | Ana Makine / Ekipman | İdeal Personel | Area M2 | Alan Gerekçesi |
|---|---:|---:|---:|---|
| Cutting | 1 | 6 | 110 | Kesim makinesi, uzun serim masası, marker ve bundle hazırlık alanı |
| Sewing | 12 | 15 | 160 | 12 operatör istasyonu, hat lideri, yardımcı, inline QC ve ara ürün akışı |
| Ironing / Packing | 5 | 8 | 95 | Ütü/press, final kontrol, katlama, paketleme ve koli akışı |
| Embroidery | 1 | 3 | 80 | Nakış makinesi, kasnak hazırlama, iplik ve işlem bekleme alanı |
| Printing | 1 | 4 | 90 | Baskı makinesi, kalıp/boya hazırlama, kurutma ve kontrol alanı |

Grade bazlı onaylı alan merdiveni:

| Departman | WORKSHOP | INDUSTRIAL | PRECISION | SMART |
|---|---:|---:|---:|---:|
| Cutting | 110 | 130 | 150 | 170 |
| Sewing | 160 | 185 | 210 | 230 |
| Ironing / Packing | 95 | 115 | 135 | 150 |
| Embroidery | 80 | 100 | 120 | 140 |
| Printing | 90 | 120 | 150 | 180 |

`areaM2`, yalnızca makine sayısı × sabit katsayı şeklinde hesaplanmaz.
Kesim masası, kurutma alanı, paket akışı ve otomasyon ekipmanı gibi
departmana özel ihtiyaçlar nedeniyle Admin tarafından bu onaylı tablodan
girilir.

Grade yükseldikçe:

- otomasyon ve yardımcı ekipman,
- güvenlik/servis mesafesi,
- hat içi buffer,
- kalite ve akış istasyonları

artabildiği için aynı personel sayısında bile `areaM2` büyüyebilir.

---

## 4.1 Cutting / Kesim Hattı

Kesim hattı çok katlı kesim avantajına sahip olduğu için dikim gibi sadece kişi-dakika üzerinden hesaplanmaz. Bu yüzden kesim hattının kapasitesi grade arttıkça daha güçlü büyür.

1 Cutting Line için ideal personel: **6 kişi**

| Grade      | Key                  | Machine Count | Ideal Staff | Daily Point Capacity | Area M2 | Monthly Electricity | Purchase Cost |
| ---------- | -------------------- | ------------: | ----------: | -------------------: | ------: | ------------------: | ------------: |
| WORKSHOP   | `cutting_workshop`   |             1 |           6 |               13.500 |     110 |                 150 |        30.000 |
| INDUSTRIAL | `cutting_industrial` |             2 |           6 |               18.450 |     130 |                 210 |        60.000 |
| PRECISION  | `cutting_precision`  |             3 |           6 |               25.344 |     150 |                 290 |       140.000 |
| SMART      | `cutting_smart`      |             4 |           6 |               35.154 |     170 |                 380 |       280.000 |

Kesim hattı rol dağılımı:

| Rol                             | Kişi |
| ------------------------------- | ---: |
| Kesim operatörü / kesim ustası  |    1 |
| Kumaş serim personeli           |    2 |
| Marker / şablon / masa hazırlık |    1 |
| Numaralama + bundle             |    1 |
| Kalite kontrol + sevk hazırlık  |    1 |
| Toplam                          |    6 |

Kesim için örnek ürün iş yükü puanları:

| Ürün Tipi                  | Cutting Point |
| -------------------------- | ------------: |
| Atlet / basit iç giyim     |             8 |
| Basic T-shirt              |            10 |
| S-shirt / sweatshirt basic |            14 |
| Gömlek / Bluz              |            18 |
| Pantolon                   |            18 |
| Elbise                     |            22 |
| Ceket                      |            40 |
| Mont / Kaban               |            50 |
| Takım Elbise               |            60 |

Örnek kapasite:

```ts
cutting_workshop.dailyPointCapacity = 13500
basicTshirt.cuttingPoint = 10

dailyQty = 13500 / 10 = 1350 adet
```

---

## 4.2 Sewing / Dikim Hattı

Dikim hattı tekstil beta içindeki ana darboğaz departmanıdır. Ürün zorluğuna göre kapasite ciddi şekilde değişir.

1 Sewing Line için ideal personel: **15 kişi**
1 Sewing Line için makine standardı: **12 makine**

| Grade      | Key                 | Machine Count | Ideal Staff | Daily Point Capacity | Area M2 | Monthly Electricity | Purchase Cost |
| ---------- | ------------------- | ------------: | ----------: | -------------------: | ------: | ------------------: | ------------: |
| WORKSHOP   | `sewing_workshop`   |            12 |          15 |               23.040 |     160 |                 200 |        45.000 |
| INDUSTRIAL | `sewing_industrial` |            12 |          15 |               24.480 |     185 |                 270 |        70.000 |
| PRECISION  | `sewing_precision`  |            12 |          15 |               25.920 |     210 |                 360 |        90.000 |
| SMART      | `sewing_smart`      |            12 |          15 |               27.360 |     230 |                 500 |       120.000 |

Dikim için örnek ürün iş yükü puanları:

| Türkçe Ürün Tipi          |              İngilizce Karşılığı | Sewing Point |
| ------------------------- | -------------------------------: | -----------: |
| Atlet                     | Tank Top / Sleeveless Undershirt |           12 |
| T-shirt                   |                          T-shirt |           20 |
| S-shirt                   |          S-shirt / Shirt Variant |           30 |
| Sweatshirt / Eşofman üstü |       Sweatshirt / Tracksuit Top |           30 |
| Pijama Takımı             |                       Pajama Set |           60 |
| Gömlek / Bluz             |                   Shirt / Blouse |           80 |
| Pantolon                  |                 Pants / Trousers |           80 |
| Etek                      |                            Skirt |           80 |
| Ceket                     |                  Jacket / Blazer |          240 |
| Mont                      |          Coat / Outerwear Jacket |          300 |
| Takım Elbise              |                             Suit |          400 |


| Ürün Tipi   | English Name | Sewing Point |
| ----------- | -----------: | -----------: |
| Mini Elbise |   Mini Dress |           80 |
| Midi Elbise |   Midi Dress |          100 |
| Uzun Elbise |   Maxi Dress |          120 |




Örnek kapasite:

```ts
sewing_workshop.dailyPointCapacity = 23040
basicTshirt.sewingPoint = 20

dailyQty = 23040 / 20 = 1152 adet
```

```ts
sewing_workshop.dailyPointCapacity = 23040
shirt.sewingPoint = 80

dailyQty = 23040 / 80 = 288 adet
```

---

## 4.3 Ironing & Packing / Ütü Paket Hattı

Ütü Paket hattı sadece ütüden oluşmaz. Son kontrol, iplik temizleme, katlama, etiket, poşetleme ve koli organizasyonunu da temsil eder.

1 Ironing & Packing Line için ideal personel: **8 kişi**

| Grade      | Key                          | Machine Count | Ideal Staff | Daily Point Capacity | Area M2 | Monthly Electricity | Purchase Cost |
| ---------- | ---------------------------- | ------------: | ----------: | -------------------: | ------: | ------------------: | ------------: |
| WORKSHOP   | `ironing_packing_workshop`   |             5 |           8 |               14.400 |      95 |                 260 |        25.000 |
| INDUSTRIAL | `ironing_packing_industrial` |             6 |           8 |               15.744 |     115 |                 360 |        45.000 |
| PRECISION  | `ironing_packing_precision`  |             7 |           8 |               16.896 |     135 |                 500 |        60.000 |
| SMART      | `ironing_packing_smart`      |             8 |           8 |               18.048 |     150 |                 700 |        80.000 |

Ütü Paket rol dağılımı:

| Rol                            | Kişi |
| ------------------------------ | ---: |
| Ütü / press operator           |    3 |
| Son kontrol / iplik temizleme  |    2 |
| Katlama / etiket / poşetleme   |    2 |
| Koli / ürün akış organizasyonu |    1 |
| Toplam                         |    8 |

Ütü Paket için örnek ürün iş yükü puanları:

| Ürün Tipi     | Finishing Point |
| ------------- | --------------: |
| Basic T-shirt |              10 |
| Sweatshirt    |              15 |
| Gömlek / Bluz |              25 |
| Pantolon      |              25 |
| Elbise        |              35 |
| Ceket         |              60 |
| Mont / Kaban  |              75 |
| Takım Elbise  |              90 |

Örnek kapasite:

```ts
ironing_packing_workshop.dailyPointCapacity = 14400
basicTshirt.finishingPoint = 10

dailyQty = 14400 / 10 = 1440 adet
```

---

## 4.4 Embroidery / Nakış Hattı

Nakış başlangıçta fason çalışır. Oyuncu ilerleyen seviyelerde yatırım yaparak kendi nakış hattını kurabilir.

1 Embroidery Line için ideal personel: **3 kişi**

| Grade      | Key                     | Machine Count | Ideal Staff | Daily Point Capacity | Area M2 | Monthly Electricity | Purchase Cost |
| ---------- | ----------------------- | ------------: | ----------: | -------------------: | ------: | ------------------: | ------------: |
| WORKSHOP   | `embroidery_workshop`   |             1 |           3 |                6.000 |      80 |                 180 |        20.000 |
| INDUSTRIAL | `embroidery_industrial` |             2 |           3 |                9.000 |     100 |                 260 |        45.000 |
| PRECISION  | `embroidery_precision`  |             3 |           3 |               12.000 |     120 |                 370 |        95.000 |
| SMART      | `embroidery_smart`      |             4 |           3 |               15.000 |     140 |                 520 |       180.000 |

Nakış point standardı:

```ts
1 embroidery point = 1000 stitches
```

Örnek nakış iş yükü puanları:

| Nakış Tipi            | Ortalama Stitch | Embroidery Point |
| --------------------- | --------------: | ---------------: |
| Küçük logo            |           5.000 |                5 |
| Göğüs logo            |           8.000 |                8 |
| Büyük arka logo       |          20.000 |               20 |
| Yoğun dekoratif nakış |          40.000 |               40 |

Örnek kapasite:

```ts
embroidery_smart.dailyPointCapacity = 15000
chestLogo.embroideryPoint = 8

dailyQty = 15000 / 8 = 1875 adet
```

---

## 4.5 Printing / Baskı Hattı

Baskı başlangıçta fason çalışır. Oyuncu ilerleyen seviyelerde yatırım yaparak kendi baskı hattını kurabilir.

1 Printing Line için ideal personel: **4 kişi**

| Grade      | Key                   | Machine Count | Ideal Staff | Daily Point Capacity | Area M2 | Monthly Electricity | Purchase Cost |
| ---------- | --------------------- | ------------: | ----------: | -------------------: | ------: | ------------------: | ------------: |
| WORKSHOP   | `printing_workshop`   |             1 |           4 |                8.000 |      90 |                 250 |        25.000 |
| INDUSTRIAL | `printing_industrial` |             2 |           4 |               12.000 |     120 |                 380 |        65.000 |
| PRECISION  | `printing_precision`  |             2 |           4 |               16.000 |     150 |                 550 |       130.000 |
| SMART      | `printing_smart`      |             3 |           4 |               20.000 |     180 |                 760 |       240.000 |

Baskı iş yükü puanları:

| Baskı Tipi              | Print Point |
| ----------------------- | ----------: |
| Küçük logo              |           5 |
| Tek renk göğüs baskı    |          10 |
| Büyük ön baskı          |          20 |
| Ön + arka baskı         |          35 |
| Çok renkli / özel efekt |          50 |

Örnek kapasite:

```ts
printing_smart.dailyPointCapacity = 20000
bigFrontPrint.printPoint = 20

dailyQty = 20000 / 20 = 1000 adet
```

---

## 4.6 Washing / Yıkama Hattı

Yıkama başlangıçta fason çalışır. Oyuncu yatırım yaparsa iç üretime alınabilir.

Final karar:
Yıkama kg bazlı hesaplanmayacak. Diğer departmanlar gibi doğrudan iş yükü puanı ile çalışacak.

Admin ürün route step oluştururken sistem önerilen point değerini gösterecek, fakat admin bu değeri değiştirebilecek.

1 Washing Line standardı: **3 makine + 4 personel**
1 Washing Line yaklaşık **2 dikim hattını** destekleyecek kapasitede olmalıdır.

| Grade      | Key                  | Machine Count | Ideal Staff | Daily Point Capacity | Area M2 | Monthly Electricity | Purchase Cost |
| ---------- | -------------------- | ------------: | ----------: | -------------------: | ------: | ------------------: | ------------: |
| WORKSHOP   | `washing_workshop`   |             3 |           4 |               24.000 |     120 |                 450 |        40.000 |
| INDUSTRIAL | `washing_industrial` |             3 |           4 |               30.000 |     160 |                 700 |        85.000 |
| PRECISION  | `washing_precision`  |             3 |           4 |               36.000 |     190 |               1.000 |       160.000 |
| SMART      | `washing_smart`      |             3 |           4 |               44.000 |     220 |               1.350 |       300.000 |

Yıkama için önerilen ürün iş yükü puanları:

| Ürün Tipi                | Washing Point |
| ------------------------ | ------------: |
| Basic T-shirt            |            10 |
| Gömlek                   |            14 |
| Sweatshirt               |            23 |
| Pantolon                 |            28 |
| Hoodie                   |            35 |
| Ağır / özel işlemli ürün |         45-60 |

Örnek kapasite:

```ts
washing_workshop.dailyPointCapacity = 24000
basicTshirt.washingPoint = 10

dailyQty = 24000 / 10 = 2400 adet
```

```ts
washing_workshop.dailyPointCapacity = 24000
hoodie.washingPoint = 35

dailyQty = 24000 / 35 = 685 adet
```

---

## 4.7 Dyeing / Boyama Hattı

Boyama başlangıçta fason çalışır. Oyuncu yatırım yaparsa iç üretime alınabilir.

Final karar:
Boyama da kg bazlı hesaplanmayacak. Diğer departmanlar gibi doğrudan iş yükü puanı ile çalışacak.

1 Dyeing Line standardı: **3 makine + 5 personel**
1 Dyeing Line yaklaşık **2 dikim hattını** destekleyecek kapasitede olmalıdır.

| Grade      | Key                 | Machine Count | Ideal Staff | Daily Point Capacity | Area M2 | Monthly Electricity | Purchase Cost |
| ---------- | ------------------- | ------------: | ----------: | -------------------: | ------: | ------------------: | ------------: |
| WORKSHOP   | `dyeing_workshop`   |             3 |           5 |               33.750 |     160 |                 900 |        80.000 |
| INDUSTRIAL | `dyeing_industrial` |             3 |           5 |               40.000 |     220 |               1.350 |       170.000 |
| PRECISION  | `dyeing_precision`  |             3 |           5 |               48.000 |     280 |               1.900 |       320.000 |
| SMART      | `dyeing_smart`      |             3 |           5 |               58.000 |     350 |               2.600 |       600.000 |

Boyama için önerilen ürün iş yükü puanları:

| Ürün Tipi                    | Dyeing Point |
| ---------------------------- | -----------: |
| Basic T-shirt                |           15 |
| Gömlek                       |           21 |
| Sweatshirt                   |           34 |
| Pantolon                     |           41 |
| Hoodie                       |           53 |
| Ağır / koyu / özel renk ürün |        60-80 |

Örnek kapasite:

```ts
dyeing_workshop.dailyPointCapacity = 33750
basicTshirt.dyeingPoint = 15

dailyQty = 33750 / 15 = 2250 adet
```

```ts
dyeing_workshop.dailyPointCapacity = 33750
hoodie.dyeingPoint = 53

dailyQty = 33750 / 53 = 636 adet
```

---

# 5. Üretim Yapmayan Departmanlar

Aşağıdaki departmanlar ProductionLineTemplate kullanmaz.

Bunlar üretim puanı üretmez.
Bunun yerine stok, akış, gecikme riski, ürün karışıklığı ve sevkiyat organizasyonu üzerinde etki eder.

| Departman                             | Production Line Var mı? | Oyun Rolü                                          |
| ------------------------------------- | ----------------------: | -------------------------------------------------- |
| Fabric Warehouse / Kumaş Deposu       |                   Hayır | Kumaş stok, bekleme, malzeme eksikliği riski       |
| Accessory Warehouse / Aksesuar Deposu |                   Hayır | Aksesuar stok, eksik malzeme, üretim blokajı riski |
| Product Warehouse / Ürün Deposu       |                   Hayır | Bitmiş ürün stok, sevk hazırlığı                   |
| Shipment / Sevkiyat                   |                   Hayır | Ürün deposu altında dispatch fonksiyonu            |
| Quality Control / Kalite Kontrol      |           V1 için hayır | Personel ve risk sistemi olarak çalışır            |

Sevkiyat ayrı üretim hattı değildir.
Ürün Deposu altında logistics / dispatch fonksiyonu olarak yönetilir.

Kalite Kontrol v1 için ayrı üretim hattı değildir.
Kalite personeli ve destek kadrosu üzerinden fire, rework ve müşteri şikayeti risklerini etkiler.

---

# 6. ProductRouteStep İş Yükü Standartları

ProductionLineTemplate hattın günlük kapasitesini tutar.
ProductRouteStep ise ürünün departman bazlı iş yükünü tutar.

Örnek model:

```prisma
model ProductRouteStep {
  id                    String   @id @default(cuid())
  productId             String   @map("product_id")
  departmentId          String   @map("department_id")

  sequence              Int
  isRequired            Boolean  @default(true) @map("is_required")
  canOutsource          Boolean  @default(false) @map("can_outsource")

  workloadPointsPerUnit Int      @map("workload_points_per_unit")
  setupPoints           Int      @default(0) @map("setup_points")

  metadata              Json?

  product               Product    @relation(fields: [productId], references: [id], onDelete: Cascade)
  department            Department @relation(fields: [departmentId], references: [id], onDelete: Restrict)

  @@unique([productId, departmentId])
  @@index([productId, sequence])
  @@index([departmentId])
  @@map("product_route_steps")
}
```

---

## 6.1 Ana Ürün İş Yükü Standart Tablosu

Bu tablo admin panelinde öneri olarak kullanılmalıdır.
Admin isterse ürüne özel olarak bu puanları değiştirebilir.

| Ürün Tipi                  | Cutting | Sewing | Ironing-Packing |
| -------------------------- | ------: | -----: | --------------: |
| Atlet                      |       8 |     12 |               8 |
| Basic T-shirt              |      10 |     20 |              10 |
| S-shirt / Basic Sweatshirt |      14 |     30 |              15 |
| Sweatshirt / Hoodie        |      16 |     40 |              18 |
| Pijama Takımı              |      18 |     60 |              22 |
| Gömlek / Bluz              |      18 |     80 |              25 |
| Pantolon                   |      18 |     80 |              25 |
| Etek                       |      18 |     80 |              20 |
| Elbise                     |      22 |    100 |              35 |
| Ceket                      |      40 |    240 |              60 |
| Mont / Kaban               |      50 |    300 |              75 |
| Takım Elbise               |      60 |    400 |              90 |

---

## 6.2 Ara İşlem İş Yükü Standart Tablosu

Ara işlemler ürünün tasarımına göre opsiyonel olarak eklenir.

| İşlem Tipi                    | Department | Suggested Point |
| ----------------------------- | ---------- | --------------: |
| Küçük logo nakış              | Embroidery |               5 |
| Göğüs logo nakış              | Embroidery |               8 |
| Büyük arka nakış              | Embroidery |              20 |
| Yoğun dekoratif nakış         | Embroidery |              40 |
| Küçük logo baskı              | Printing   |               5 |
| Tek renk göğüs baskı          | Printing   |              10 |
| Büyük ön baskı                | Printing   |              20 |
| Ön + arka baskı               | Printing   |              35 |
| Çok renkli / özel efekt baskı | Printing   |              50 |
| Basic wash                    | Washing    |              10 |
| Soft / enzyme wash            | Washing    |           15-25 |
| Heavy wash                    | Washing    |           28-40 |
| Special effect wash           | Washing    |           45-60 |
| Basic dye                     | Dyeing     |              15 |
| Dark dye                      | Dyeing     |           30-45 |
| Premium / special color dye   | Dyeing     |           50-80 |

---

## 6.3 Product Type Workload Standard Config

Admin ürün rotası oluştururken ürün türü ve seçilen üretim departmanına göre
önerilen iş yükü puanı gösterilmelidir. Bu değer yalnızca öneridir; ürüne
kaydedilen nihai değer `ProductRouteStep.workloadPointsPerUnit` içinde tutulur.

```prisma
model ProductTypeWorkloadStandard {
  id                    String      @id @default(cuid())
  productTypeId         String      @map("product_type_id")
  departmentId          String      @map("department_id")
  workloadPointsPerUnit Int         @map("workload_points_per_unit")
  metadata              Json?
  createdAt             DateTime    @default(now()) @map("created_at")
  updatedAt             DateTime    @updatedAt @map("updated_at")

  productType           ProductType @relation(fields: [productTypeId], references: [id], onDelete: Cascade)
  department            Department  @relation(fields: [departmentId], references: [id], onDelete: Restrict)

  @@unique([productTypeId, departmentId])
  @@index([departmentId])
  @@map("product_type_workload_standards")
}
```

Textile beta ana üretim standartları:

| Product Type | Cutting | Sewing | Ironing-Packing |
|---|---:|---:|---:|
| `tank_top` | 8 | 12 | 8 |
| `t_shirt` | 10 | 20 | 10 |
| `sweatshirt` | 16 | 40 | 18 |
| `shirt` | 18 | 80 | 25 |
| `blouse` | 18 | 80 | 25 |
| `jacket` | 40 | 240 | 60 |
| `blazer` | 45 | 280 | 70 |
| `coat` | 50 | 300 | 75 |
| `pants` | 18 | 80 | 25 |
| `skirt` | 18 | 80 | 20 |
| `shorts` | 14 | 45 | 15 |
| `mini_dress` | 20 | 80 | 28 |
| `midi_dress` | 22 | 100 | 35 |
| `long_dress` | 26 | 130 | 42 |

Opsiyonel ara işlemler için V1 başlangıç önerileri:

| Department | Suggested Point |
|---|---:|
| `embroidery` | 8 |
| `printing` | 10 |
| `washing` | 15 |
| `dyeing` | 15 |

Bu dört değer ilk beta aşamasında bütün ürün türleri için aynı seed edilebilir.
Admin ürünün tasarımına göre değeri artırabilir veya azaltabilir.

Admin ekranı davranışı:

```text
Standart değer = ProductTypeWorkloadStandard.workloadPointsPerUnit
Nihai değer    = ProductRouteStep.workloadPointsPerUnit
Fark           = Nihai değer - Standart değer
```

Standart config sonradan değiştirildiğinde mevcut ürün rotaları otomatik
değişmemelidir.

---

# 7. Gider Alanlarının Hesaplanma Mantığı

Bu bölümdeki alan ve gider değerleri ilk balans çalışmasının kaynak verileridir.
Nihai uygulama ayrımı:

```text
Doğrudan production line maliyeti → 14-ProductionLine_Cost_Config.md
Kademe yönetim/depo/tesis gideri → 15-Factory_Operating_Stage_and_Shared_Cost.md
```

ProductionLineTemplate içinde yalnızca hatta özel gider girdileri ve merkezi
servisin hesapladığı doğrudan maliyet cache'i tutulur:

| Alan                    | Nerede Tutulur?                                    |
| ----------------------- | -------------------------------------------------- |
| Hat m2 değeri           | ProductionLineTemplate.areaM2                      |
| Hat baz elektrik değeri | ProductionLineTemplate.monthlyElectricityBaseCents |
| Hat satın alma maliyeti | ProductionLineTemplate.purchaseCostCents           |
| Hat personel ihtiyacı   | ProductionLineTemplate.idealStaff                  |
| 1000 point doğrudan maliyeti | ProductionLineTemplate.directCostPer1000PointsCents |

Yönetim, depo, support ve ortak tesis giderleri line template içine yazılmaz;
faaliyet kademesi configinden okunur.

---

## 7.1 Kira Hesabı

Üretim hattının doğrudan alan kirası:

```ts
monthlyProductionAreaRent =
  ProductionLineTemplate.areaM2
  * SectorOperatingCostConfig.rentPerM2Cents
```

Depo, ofis, sosyal ve ortak alan kirası faaliyet kademesinin ortak gideridir.

---

## 7.2 Depo Alanı Hesabı

Depolar üretim hattı değildir.

Kumaş, aksesuar ve ürün deposu alanları her faaliyet kademesinde açık M2
değerleriyle tanımlanır. Hat adedine göre ayrı bir depo formülü çalıştırılmaz.

---

## 7.3 Ofis / Sosyal / Teknik Alan

Ofis, sosyal ve teknik alan personel aralığından tekrar hesaplanmaz.
Her faaliyet kademesinde açık M2 değeri olarak tanımlanır.

---

## 7.4 Elektrik Hesabı

Hat elektriği doğrudan production line maliyetidir.

Hat elektrik çarpanı:

```ts
lineElectricMultiplier = 0.55 + (0.45 * utilizationRate)
```

Örnek kullanım oranları:

| Hat Kullanımı | Çarpan |
| ------------: | -----: |
|            %0 |   0.55 |
|           %50 |  0.775 |
|           %80 |   0.91 |
|          %100 |   1.00 |

Hat elektrik hesabı:

```ts
lineElectricity =
  sum(lineTemplate.monthlyElectricityBase * lineElectricMultiplier)
```

Tesis sabit elektriği ve support kaynaklı ek elektrik faaliyet kademesinde
açık gider değeridir.

---

## 7.5 Yemek Gideri

Direkt production line personelinin yemek gideri:

```ts
monthlyDirectStaffMeal =
  idealStaff
  * SectorOperatingCostConfig.dailyMealPerDirectStaffCents
  * SectorOperatingCostConfig.monthlyWorkDays
```

Support personel yemeği ve yemekhane sabit gideri faaliyet kademesinin ortak
gideridir.

---

## 7.6 Doğrudan Hat ve Kademe Genel Gideri Ayrımı

Hat bazlı departman gideri doğrudan maliyete girer:

| Departman | Hat Başına Aylık Genel Gider |
| --------- | ---------------------------: |
| Kesim     |                           35 |
| Dikim     |                           35 |
| Ütü Paket |                           35 |
| Nakış     |                           45 |
| Baskı     |                           55 |
| Yıkama    |                           75 |
| Boyama    |                          100 |

Bu değer `Department.monthlyOverheadPerLineCents` üzerinden merkezi doğrudan
hat maliyet servisine girer.

İşletme baz genel gideri ve support personel genel gideri ise hat veya personel
çarpanı formülüyle türetilmez. Her faaliyet kademesinde açık değer olarak
tanımlanır. Canonical karar `15-Factory_Operating_Stage_and_Shared_Cost.md`
içindedir.

---

# 8. Personel Hesabı

Direkt üretim personeli line template üzerinden hesaplanır.

```ts
directProductionStaff =
  sum(activeProductionLines.idealStaff)
```

Başlangıç iç üretim hatları:

| Departman            | Line | Ideal Staff |
| -------------------- | ---: | ----------: |
| Kesim                |    1 |           6 |
| Dikim                |    1 |          15 |
| Ütü Paket            |    1 |           8 |
| Toplam Direkt Üretim |    3 |          29 |

Başlangıç destek kadrosu:

| Rol                              | Kişi |
| -------------------------------- | ---: |
| Fabrika / Üretim Müdürü          |    1 |
| Planlama + Fason Takip Sorumlusu |    1 |
| Depo Sorumlusu                   |    1 |
| Malzeme Akış Personeli           |    1 |
| Ürün Deposu / Sevkiyat Personeli |    1 |
| Bakım Teknisyeni                 |    1 |
| Kalite Sorumlusu                 |    1 |
| Admin / Finans / HR              |    1 |
| Temizlik / Tesis Destek          |    1 |
| Toplam Destek                    |    9 |

Başlangıç toplam personel:

```ts
startingStaff = 29 + 9 = 38
```

---

# 9. Başlangıç Fabrikası Örneği

Başlangıçta oyuncuya verilecek üretim altyapısı:

| Departman | Line | Grade    |
| --------- | ---: | -------- |
| Kesim     |    1 | WORKSHOP |
| Dikim     |    1 | WORKSHOP |
| Ütü Paket |    1 | WORKSHOP |
| Nakış     |    0 | Fason    |
| Baskı     |    0 | Fason    |
| Yıkama    |    0 | Fason    |
| Boyama    |    0 | Fason    |

Başlangıç üretim hattı kapasiteleri:

| Departman          | Daily Point Capacity |
| ------------------ | -------------------: |
| Kesim Workshop     |               13.500 |
| Dikim Workshop     |               23.040 |
| Ütü Paket Workshop |               14.400 |

Basic T-shirt için örnek route step:

| Departman | Workload Point |
| --------- | -------------: |
| Kesim     |             10 |
| Dikim     |             20 |
| Ütü Paket |             10 |

Günlük teorik kapasite:

| Departman | Hesap       |   Kapasite |
| --------- | ----------- | ---------: |
| Kesim     | 13.500 / 10 | 1.350 adet |
| Dikim     | 23.040 / 20 | 1.152 adet |
| Ütü Paket | 14.400 / 10 | 1.440 adet |

Bu durumda Basic T-shirt için başlangıç darboğazı dikim hattıdır.

---

# 10. Small Workshop İlk Balans Örneği

Bu bölümdeki hesap ilk `small_workshop` stage seed değerlerinin nasıl
kalibre edildiğini gösterir. Runtime sırasında personel/M2 aralıkları yeniden
çalıştırılmaz; onaylanmış stage config değerleri okunur.

Onaylanan başlangıç referansı:

| Kalem | Değer |
|---|---:|
| Production line | 3 WORKSHOP hat |
| Direkt personel | 29 |
| Yönetim/support personeli | 9 |
| Toplam personel | 38 |
| Maaş dışı toplam operasyon gideri | 5.680 |

Bu `5.680` tek bir stage gider alanına yazılmaz. Merkezi maliyet servisi
değeri:

- doğrudan hat giderleri,
- `small_workshop` ortak giderleri

olarak 14 ve 15 numaralı dokümanlara göre ayırır. Eski personel/M2 eşik
formülleri runtime kuralı değildir.

---

# 11. Finansman ve Yatırım Notu

ProductionLineTemplate içinde yalnızca satın alma maliyeti tutulur:

```ts
purchaseCostCents
```

Leasing bu tabloda tutulmaz.

Leasing ileride ayrı sözleşme sistemiyle yönetilmelidir:

```ts
FactoryLeasingContract
```

Leasing sisteminde tutulabilecek bilgiler:

| Alan                  | Açıklama                                   |
| --------------------- | ------------------------------------------ |
| factoryId             | Hangi oyuncu fabrikasına ait olduğu        |
| productionLineId      | Hangi hat için leasing yapıldığı           |
| principalCents        | Ana yatırım tutarı                         |
| downPaymentCents      | Peşinat                                    |
| monthlyPaymentCents   | Aylık leasing ödemesi                      |
| durationMonths        | Vade                                       |
| remainingMonths       | Kalan süre                                 |
| interestRateBps       | Finansman oranı                            |
| earlyExitPenaltyCents | Erken kapama cezası                        |
| ownershipTransfer     | Süre sonunda mülkiyet oyuncuya geçiyor mu? |

Bu ayrım önemlidir. Çünkü ProductionLineTemplate katalog bilgisidir; leasing ise oyuncuya özel finansman sözleşmesidir.

---

# 12. Admin Panel Kullanımı

Admin üretim hattı tanımlarken şu alanları girer:

| Alan                     | Admin Girişi            |
| ------------------------ | ----------------------- |
| Sector                   | Textile                 |
| Department               | Sewing                  |
| Grade                    | WORKSHOP                |
| Key                      | `sewing_workshop`       |
| Machine Count            | 12                      |
| Ideal Staff              | 15                      |
| Daily Point Capacity     | 23.040                  |
| Area M2                  | 160                     |
| Monthly Electricity Base | 200                     |
| Purchase Cost            | 45.000                  |
| Status                   | ACTIVE                  |
| Image                    | Sewing Workshop görseli |

Admin ürün route step tanımlarken şu alanları girer:

| Alan                 | Admin Girişi                       |
| -------------------- | ---------------------------------- |
| Product              | Manama                             |
| Department           | Sewing                             |
| Suggested Point      | 20                                 |
| Final Workload Point | 20 veya adminin değiştirdiği değer |
| Can Outsource        | Hayır / Evet                       |
| Required             | Evet                               |

---

# 13. Performans Kararı

Üretim simülasyonu sırasında sistem şu verileri okumalıdır:

1. Oyuncunun aktif üretim hatları
2. Bu hatların ProductionLineTemplate değerleri
3. Sipariş ürününün ProductRouteStep değerleri
4. Mevcut WIP / departman ilerleme değerleri

Simülasyon sırasında yapılacak temel hesap:

```ts
availablePoint = lineTemplate.dailyPointCapacity
workloadPoint = productRouteStep.workloadPointsPerUnit

producedQty = Math.floor(availablePoint / workloadPoint)
usedPoint = producedQty * workloadPoint
unusedPoint = availablePoint - usedPoint
```

Sistemde adet başına ayrı kayıt tutulmamalıdır.

Yanlış yaklaşım:

```ts
1 ürün = 1 kayıt
```

Doğru yaklaşım:

```ts
1 vardiya + 1 hat + 1 ürün + 1 departman = 1 özet kayıt
```

Bu yüzden vardiya sonucu için aggregate kayıt kullanılmalıdır:

```ts
ShiftLineResult
```

Bu sistem binlerce oyuncu aynı anda oynadığında veritabanını gereksiz satır yükünden korur.

---

# 14. Final Karar Özeti

| Konu                    | Karar                                                             |
| ----------------------- | ----------------------------------------------------------------- |
| Üretim hattı kapasitesi | `ProductionLineTemplate.dailyPointCapacity` içinde tutulur        |
| Ürün iş yükü            | `ProductRouteStep.workloadPointsPerUnit` içinde tutulur           |
| Kg bazlı yıkama/boyama  | Kullanılmayacak                                                   |
| Yıkama/boyama           | Diğer departmanlar gibi point sistemiyle çalışacak                |
| Personel                | Line başına `idealStaff` ile hesaplanacak                         |
| Doğrudan hat maliyeti   | 14 numaralı dokümana göre hesaplanacak                            |
| Ortak işletme gideri    | 15 numaralı faaliyet kademesi configinden okunacak                 |
| Maliyet multiplier      | Kullanılmayacak                                                    |
| Satın alma maliyeti     | ProductionLineTemplate içinde tutulacak                           |
| Leasing                 | Ayrı finansman sözleşmesi olarak yönetilecek                      |
| Sevkiyat                | Production line olmayacak                                         |
| Depolar                 | Production line olmayacak                                         |
| Kalite                  | V1’de production line değil, destek/risk sistemi olacak           |
| Simülasyon              | Aggregate hesap yapacak, tek tek ürün kaydı üretmeyecek           |
