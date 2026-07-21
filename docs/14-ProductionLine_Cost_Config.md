# 14 - Production Line Direct Cost Config

Bu doküman yalnızca üretim hatlarının doğrudan operasyon maliyetini tanımlar.

Factory Operating Stage, yönetim, depo, destek personeli ve ortak tesis
giderleri bu dokümanın konusu değildir. Bu kararlar
`15-Factory_Operating_Stage_and_Shared_Cost.md` içinde tutulur.

---

# 1. Temel Kararlar

1. Textile Beta v1 fabrikaları CMT çalışır.
2. Kumaş ve aksesuar satın alma maliyeti oyuncuya ait değildir.
3. Depolar, sevkiyat, kalite ve yönetim production line değildir.
4. Ürün rotası yalnızca `Department.kind == PRODUCTION` kayıtlarını içerir.
5. Her `ProductionLineTemplate` kendi doğrudan maliyetini taşır.
6. Grade yükseldikçe kapasite artışı maliyeti doğal olarak düşürür.
7. Grade için ayrıca genel maliyet çarpanı uygulanmaz.
8. Hat maliyetine ayrıca factory scale multiplier uygulanmaz.
9. Ürün fiyatını sistem belirlemez; Admin baz CMT fiyatını kendisi girer.
10. Sistem Admin'e yalnızca tutarlı fiyatlandırma için maliyet rehberi verir.

---

# 2. Production Line ile İlgili Departmanlar

Hat maliyeti yalnızca aşağıdaki production departmanlarında kullanılır:

```text
cutting
sewing
ironing_packing
embroidery
printing
washing
dyeing
```

Aşağıdaki departmanlar bu maliyet modeline girmez:

```text
fabric_warehouse
accessory_warehouse
product_warehouse
shipping
quality
management
support
```

Depo ve sevkiyat ürün rotasına eklenmez.

---

# 3. Doğrudan Hat Maliyeti

Bir üretim hattının aylık doğrudan maliyeti:

```ts
monthlyDirectLineCost =
  monthlyDirectPayroll
  + monthlyLineElectricity
  + monthlyProductionAreaRent
  + monthlyDirectStaffMeal
  + monthlyDirectStaffOverhead
  + monthlyDepartmentLineOverhead
```

Bu hesapta bulunmayan giderler:

- Yönetim ve support maaşı
- Depo ve ofis alanı kirası
- Tesis sabit elektriği
- Personel eşiği ek elektriği
- Yemekhane sabit gideri
- İşletme baz genel gideri
- Leasing
- Finansman
- Ceza ve bonuslar

Bu kalemler Factory Operating Stage ortak gider hesabına aittir.

---

# 4. Doğrudan Personel Maaşı

Hat maaşı, template rol gereksinimleri üzerinden hesaplanır:

```ts
monthlyDirectPayrollCents =
  sum(
    ProductionLineTemplateStaffRequirement.requiredQuantity
    * StaffRole.monthlySalaryCents
  )
```

`ProductionLineTemplate.idealStaff` hızlı toplam kontroldür.

Rol adetlerinin toplamı `idealStaff` değerine eşit olmalıdır.

---

# 5. Diğer Doğrudan Hat Giderleri

## 5.1 Elektrik

Referans maliyette:

```ts
monthlyLineElectricity =
  ProductionLineTemplate.monthlyElectricityBaseCents
```

Oyuncunun gerçekleşen aylık elektrik giderinde kullanım oranı ayrıca uygulanır.

## 5.2 Üretim Alanı Kirası

```ts
monthlyProductionAreaRent =
  ProductionLineTemplate.areaM2
  * SectorOperatingCostConfig.rentPerM2Cents
```

Bu hesap yalnızca hattın üretim alanını kapsar.

Depo, ofis, sosyal ve ortak alanlar stage ortak gideridir.

## 5.3 Direkt Personel Yemeği

```ts
monthlyDirectStaffMeal =
  idealStaff
  * SectorOperatingCostConfig.dailyMealPerDirectStaffCents
  * SectorOperatingCostConfig.monthlyWorkDays
```

Yemekhane sabit gideri stage ortak giderinde hesaplanır.

## 5.4 Direkt Personel Genel Gideri

```ts
monthlyDirectStaffOverhead =
  idealStaff
  * SectorOperatingCostConfig.directStaffOverheadPerStaffCents
```

## 5.5 Departman Hat Genel Gideri

```ts
monthlyDepartmentLineOverhead =
  Department.monthlyOverheadPerLineCents
```

---

# 6. 1000 Puan Başına Hat Maliyeti

Referans aylık point kapasitesi:

```ts
monthlyReferencePointCapacity =
  ProductionLineTemplate.dailyPointCapacity
  * SectorOperatingCostConfig.monthlyWorkDays
```

1000 point maliyeti:

```ts
directCostPer1000PointsCents =
  round(
    monthlyDirectLineCostCents
    * 1000
    / monthlyReferencePointCapacity
  )
```

Hesap integer olarak yapılır.

Ara adımlarda yuvarlama yapılmaz; final `costPer1000PointsCents` değerinde
yuvarlama yapılır.

---

# 7. Neden Grade Multiplier Kullanılmıyor?

Her grade için aşağıdaki değerler zaten farklıdır:

- `dailyPointCapacity`
- `areaM2`
- `monthlyElectricityBaseCents`
- gerekirse rol gereksinimleri

Grade yükseldiğinde aynı aylık personel gideri daha fazla point kapasitesine
yayılır.

Bu nedenle point maliyeti doğal olarak düşer:

```text
WORKSHOP  → düşük kapasite → yüksek point maliyeti
INDUSTRIAL → daha yüksek kapasite → daha düşük point maliyeti
PRECISION → daha yüksek kapasite → daha düşük point maliyeti
SMART → en yüksek kapasite → en düşük point maliyeti
```

Ayrıca `0.88 / 0.78 / 0.68` gibi ikinci bir grade multiplier uygulanması aynı
avantajı iki kez sayar.

---

# 8. Onaylanan Personel Dağılımları

## 8.1 Cutting

| Rol | Adet | Aylık Birim Maaş | Toplam |
|---|---:|---:|---:|
| Cutting Operator | 1 | 1.300 | 1.300 |
| Fabric Spreading Staff | 2 | 850 | 1.700 |
| Marker Staff | 1 | 1.100 | 1.100 |
| Bundling Staff | 1 | 750 | 750 |
| Cutting QC Staff | 1 | 950 | 950 |
| **Toplam** | **6** | | **5.800** |

## 8.2 Sewing

| Rol | Adet | Aylık Birim Maaş | Toplam |
|---|---:|---:|---:|
| Sewing Line Leader | 1 | 1.300 | 1.300 |
| Sewing Operator | 12 | 900 | 10.800 |
| Sewing Helper | 1 | 750 | 750 |
| Inline QC Staff | 1 | 950 | 950 |
| **Toplam** | **15** | | **13.800** |

## 8.3 Ironing / Packing

| Rol | Adet | Aylık Birim Maaş | Toplam |
|---|---:|---:|---:|
| Ironing Operator | 3 | 850 | 2.550 |
| Final QC Staff | 2 | 950 | 1.900 |
| Packing Staff | 2 | 750 | 1.500 |
| Carton Flow Staff | 1 | 750 | 750 |
| **Toplam** | **8** | | **6.700** |

## 8.4 Opsiyonel Üretim Departmanları

Aşağıdaki dağılımlar başlangıç balansı olarak onaylanmıştır:

| Departman | Operatör | Yardımcı | Toplam Personel | Aylık Maaş |
|---|---:|---:|---:|---:|
| Embroidery | 1 | 2 | 3 | 2.500 |
| Printing | 1 | 3 | 4 | 3.450 |
| Washing | 3 | 1 | 4 | 4.000 |
| Dyeing | 3 | 2 | 5 | 5.400 |

---

# 9. Onaylanan Başlangıç Hat Maliyetleri

Aşağıdaki değerler:

- 22 çalışma günü,
- dokümandaki area ve electricity değerleri,
- onaylanan personel maaşları,
- mevcut yemek ve personel genel gider girdileri

üzerinden hesaplanmıştır.

Birim:

```text
cent / 1000 production point
```

| Department | WORKSHOP | INDUSTRIAL | PRECISION | SMART |
|---|---:|---:|---:|---:|
| Cutting | 2.217 | 1.647 | 1.220 | 897 |
| Sewing | 3.019 | 2.863 | 2.729 | 2.615 |
| Ironing / Packing | 2.427 | 2.261 | 2.155 | 2.075 |
| Embroidery | 2.329 | 1.613 | 1.267 | 1.071 |
| Printing | 2.379 | 1.658 | 1.309 | 1.109 |
| Washing | 950 | 810 | 721 | 632 |
| Dyeing | 948 | 864 | 784 | 714 |

Örnek:

```text
Sewing WORKSHOP
3.019 cent / 1000 point
= 30,19 para birimi / 1000 point
= 0,03019 para birimi / point
```

Bu değerler ilk seed/balans değerleridir. Gerçek oyun testlerinden sonra
ProductionLineTemplate girdileri üzerinden yeniden hesaplanabilir.

---

# 10. ProductionLineTemplate Maliyet Alanı

Hesaplanan değer template üzerinde cache olarak tutulabilir:

```prisma
directCostPer1000PointsCents Int
  @default(0)
  @map("direct_cost_per_1000_points_cents")
```

Bu alan Admin tarafından doğrudan yazılmaz.

Yalnızca merkezi maliyet servisi günceller.

Kaynak alanlardan biri değiştiğinde yeniden hesaplanır:

- Template kapasitesi
- Template alanı
- Template elektriği
- Template rol gereksinimleri
- StaffRole maaşı
- Kira config
- Çalışma günü
- Direkt personel yemek/genel gider configi
- Departman hat genel gideri

---

# 11. Ürün Katalog Referans Maliyeti

Ürün kataloğu referans hesapta WORKSHOP hatlarını kullanır.

Her route step:

```ts
routeStepReferenceCostCents =
  workloadPointsPerUnit
  * workshopTemplate.directCostPer1000PointsCents
  / 1000
```

Toplam doğrudan rota maliyeti:

```ts
referenceDirectRouteCostCents =
  sum(routeStepReferenceCostCents)
```

Basic T-Shirt:

| Departman | Point / Unit | WORKSHOP Cost / 1000 | Unit Cost |
|---|---:|---:|---:|
| Cutting | 10 | 2.217 | 22,17 cent |
| Sewing | 20 | 3.019 | 60,38 cent |
| Ironing / Packing | 10 | 2.427 | 24,27 cent |
| **Toplam** | **40** | | **106,82 cent** |

```text
Basic T-Shirt doğrudan rota maliyeti ≈ 1,07
```

Bu henüz tam CMT maliyeti değildir.

Tam CMT maliyeti:

```text
Doğrudan rota maliyeti
+ Factory Operating Stage ortak gider payı
```

olarak 15 numaralı dokümana göre hesaplanır.

---

# 12. Admin Baz CMT Fiyatı

Admin ürün fiyatını kendisi belirler:

```text
Product.baseUnitPriceCents
```

Sistem Admin'e salt okunur rehber değerler gösterir:

```text
Doğrudan rota maliyeti
Starter Workshop tam ortalama CMT maliyeti
Admin baz CMT fiyatı
Referans fark
Referans marj
```

Referans maliyet değiştiğinde `baseUnitPriceCents` otomatik değiştirilmez.

---

# 13. Oyuncunun Fabrikaya Özel Maliyeti

Oyuncunun maliyeti:

```text
Gerçek kullanılan ProductionLineTemplate direct point maliyeti
+ Factory current operating stage ortak gider payı
```

üzerinden hesaplanır.

Oyuncu:

1. Daha fazla hat kurarak kapasitesini artırır.
2. Grade yükselterek point kapasitesini artırır.
3. Aynı ortak gideri daha fazla üretime yayar.
4. Birim maliyetini düşürür.
5. Aynı sipariş fiyatında kârlılığını artırır.

Doğrudan line cost üzerine ayrıca scale veya grade multiplier uygulanmaz.

---

# 14. Setup Point

`ProductRouteStep.setupPoints` adet başına değildir.

Katalog birim maliyetine eklenmez.

Sipariş tahmininde:

```ts
routeTotalPoints =
  quantity * workloadPointsPerUnit
  + setupPoints
```

Setup maliyeti sipariş toplamına eklenir ve sipariş adedine bölünür.

---

# 15. İç Üretim ve Fason

```text
INTERNAL  → ProductionLineTemplate direct cost
OUTSOURCE → OutsourceOptionConfig cost
```

Aynı rota adımı için iki maliyet birlikte eklenmez.

---

# 16. Servisler

## recalculateProductionLineTemplateCost

Template kaynak giderlerini okur ve
`directCostPer1000PointsCents` alanını günceller.

## calculateProductDirectRouteCost

Ürün route step kayıtlarını ve WORKSHOP template maliyetlerini okuyarak Admin
referans doğrudan rota maliyetini hesaplar.

## estimateFactoryDirectRouteCost

Oyuncunun gerçekten kullanacağı hat template maliyetlerine göre sipariş
doğrudan üretim maliyetini hesaplar.

Bu servisler Server Action veya UI component içinde tekrar yazılmaz.

---

# 17. Validasyonlar

1. Yalnızca PRODUCTION departmanı line template taşıyabilir.
2. Rol gereksinimleri toplamı `idealStaff` ile eşit olmalıdır.
3. Daily point capacity `0` olamaz.
4. ACTIVE template hesaplanan maliyeti `0` olamaz.
5. Depo ve sevkiyat ürün rotasına eklenmez.
6. Kumaş ve aksesuar maliyeti CMT Beta v1 hesabına girmez.
7. Hesaplanan maliyet yalnızca merkezi servisle güncellenir.
8. Admin baz CMT fiyatı yalnızca yetkili Admin işlemiyle değişir.
9. Referans maliyet Admin fiyatını otomatik değiştirmez.

---

# 18. Final Karar

| Konu | Karar |
|---|---|
| Hat maliyet kaynağı | Template kapasitesi ve doğrudan giderleri |
| Grade maliyet çarpanı | Kullanılmayacak |
| Scale maliyet çarpanı | Doğrudan hat maliyetine uygulanmayacak |
| Maliyet birimi | Cent / 1000 point |
| Personel maliyeti | Template rol gereksinimi × rol maaşı |
| Depo/yönetim gideri | 15 numaralı Operating Stage dokümanı |
| Katalog referansı | WORKSHOP doğrudan rota maliyeti |
| Tam CMT maliyeti | Doğrudan rota + stage ortak gider payı |
| Admin fiyatı | Manuel `Product.baseUnitPriceCents` |
| Oyuncu avantajı | Daha yüksek kapasite ve ortak gider yayılımı |
| Cache güncelleme | Merkezi maliyet servisi |
