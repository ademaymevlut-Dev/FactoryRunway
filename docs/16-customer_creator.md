# Factory Runway - Sipariş Üretim Sistemi İçerik Planı

## 1. Amaç

Bu dokümanın amacı, oyun içinde otomatik veya manuel olarak üretilecek siparişlerin hangi müşteri tiplerinden, hangi sipariş hacimlerinden ve hangi sanal markalardan geleceğini planlamaktır.

Sipariş üretimi üç ana veri yapısına ayrılır:

1. **Müşteri Segmentleri**
2. **Hacim Sınıfları**
3. **Sanal Müşteriler / Markalar**

Bu üç yapı ayrı tutulmalıdır. Çünkü segment müşterinin davranışını, hacim sınıfı siparişin büyüklüğünü, sanal müşteri ise oyuncunun gördüğü marka kimliğini temsil eder.

---

# 2. Genel Mantık

## 2.1. Müşteri Segmenti Nedir?

Müşteri segmenti, bir müşterinin nasıl sipariş verdiğini belirler.

Segment şunları etkiler:

* Hangi kalite tier ürünleri tercih eder?
* Hangi ürün kategorilerine daha çok sipariş verir?
* Fiyat konusunda ne kadar hassastır?
* Kalite beklentisi ne kadar yüksektir?
* Termin baskısı ne kadar güçlüdür?
* Oyuncudan ne kadar güven bekler?
* Siparişlerde risk ve ödül dengesi nasıldır?

Örnek:

`budget_retailer` müşterisi daha çok BASIC ürün ister, fiyat hassastır, kalite beklentisi orta-düşüktür.

`premium_brand` müşterisi daha az adetli ama daha kârlı, daha kaliteli ve daha zor siparişler verir.

---

## 2.2. Hacim Sınıfı Nedir?

Hacim sınıfı, siparişin büyüklüğünü belirler.

Şunları etkiler:

* Sipariş adedi
* Sipariş satır sayısı
* Siparişin fabrika kapasitesinden ne kadar yer kullanabileceği
* Toplu alım nedeniyle fiyat indirimi olup olmayacağı
* Siparişin küçük, orta, büyük ya da koleksiyon tipi olup olmayacağı

Örnek:

`small_batch` küçük adetli butik sipariş üretir.

`large_retail` daha yüksek adetli, daha planlama isteyen siparişler üretir.

`capsule_collection` birden fazla ürün satırından oluşan koleksiyon siparişleri üretir.

---

## 2.3. Sanal Müşteri / Marka Nedir?

Sanal müşteri, oyuncunun gördüğü gerçek müşteri kimliğidir.

Örnek:

* Northline Fashion
* UrbanNest Retail
* Maison Valeo
* BlueRiver Outfitters

Bu müşteriler arkada bir müşteri segmentine ve bir hacim sınıfına bağlıdır.

Örnek:

| Müşteri           | Segment         | Hacim        |
| ----------------- | --------------- | ------------ |
| Northline Fashion | fashion_brand   | regular      |
| UrbanNest Retail  | mass_brand      | large_retail |
| Maison Valeo      | luxury_boutique | small_batch  |

---

# 3. Ortak Teknik Kurallar

## 3.1. Ağırlık Sistemi

Tier ve kategori ağırlıkları yüzde mantığıyla tutulmalıdır.

Toplam değer tercihen `100` olmalıdır.

Örnek:

```json
{
  "BASIC": 10,
  "STANDARD": 30,
  "PREMIUM": 40,
  "LUXURY": 20
}
```

Bu, sipariş üretimi sırasında ürün tier seçiminin hangi ihtimalle yapılacağını belirler.

---

## 3.2. BPS Sistemi

Bazı değerler `bps` yani basis point mantığıyla tutulmalıdır.

| Değer | Anlam           |
| ----: | --------------- |
| 10000 | Normal değer    |
|  9000 | Normalin %90'ı  |
| 11000 | Normalin %110'u |
| 12500 | Normalin %125'i |

Örnek:

`priceMultiplierBps = 12000` ise fiyat normalin 1.20 katı olur.

`maxOfferLoadBps = 7000` ise sipariş, fabrikanın hesaplanan kapasitesinin en fazla %70'ini kullanabilir.

---

# 4. Müşteri Segmentleri

## 4.1. Segmentlerde Tutulacak Alanlar

| Alan                   | Açıklama                                         |
| ---------------------- | ------------------------------------------------ |
| key                    | Teknik anahtar                                   |
| displayName            | Oyuncuya veya admin’e görünen ad                 |
| description            | Segment açıklaması                               |
| sortOrder              | Sıralama                                         |
| isActive               | Aktif/pasif durumu                               |
| tierWeights            | Ürün kalite tier ağırlıkları                     |
| categoryWeights        | Ürün kategori ağırlıkları                        |
| priceMultiplierBps     | Fiyat çarpanı                                    |
| qualityExpectationBps  | Kalite beklentisi                                |
| deadlinePressureBps    | Termin baskısı                                   |
| complaintRiskBps       | Şikayet riski                                    |
| repeatOrderChanceBps   | Başarılı sipariş sonrası tekrar sipariş ihtimali |
| trustGainMultiplierBps | Başarılı teslimatta güven kazanımı               |
| trustLossMultiplierBps | Gecikme/kalite sorununda güven kaybı             |

---

## 4.2. Önerilen Segment Listesi

## 4.2.1. budget_retailer

**Tanım:**
Fiyat hassasiyeti yüksek, BASIC ürün ağırlıklı çalışan düşük bütçeli perakende müşterisi.

**Oyun içi rolü:**
Başlangıç seviyesinde oyuncuya düzenli sipariş sağlar. Kâr oranı düşük ama üretim basittir.

| Alan                   | Önerilen Değer |
| ---------------------- | -------------: |
| priceMultiplierBps     |           9000 |
| qualityExpectationBps  |           6000 |
| deadlinePressureBps    |           7000 |
| complaintRiskBps       |           6000 |
| repeatOrderChanceBps   |           7500 |
| trustGainMultiplierBps |           8000 |
| trustLossMultiplierBps |           9000 |

Tier ağırlıkları:

```json
{
  "BASIC": 75,
  "STANDARD": 25,
  "PREMIUM": 0,
  "LUXURY": 0
}
```

Kategori ağırlıkları:

```json
{
  "tshirt": 45,
  "hoodie": 20,
  "pants": 20,
  "dress": 10,
  "jacket": 5
}
```

---

## 4.2.2. mass_brand

**Tanım:**
Düzenli ve orta-büyük hacimli sipariş veren, BASIC ve STANDARD ürünleri birlikte kullanan ana akım marka.

**Oyun içi rolü:**
Küçük fabrikadan büyüyen işletmeye geçişte ana müşteri grubu olur.

| Alan                   | Önerilen Değer |
| ---------------------- | -------------: |
| priceMultiplierBps     |          10000 |
| qualityExpectationBps  |           7000 |
| deadlinePressureBps    |           8000 |
| complaintRiskBps       |           7000 |
| repeatOrderChanceBps   |           8000 |
| trustGainMultiplierBps |          10000 |
| trustLossMultiplierBps |          10000 |

Tier ağırlıkları:

```json
{
  "BASIC": 45,
  "STANDARD": 45,
  "PREMIUM": 10,
  "LUXURY": 0
}
```

Kategori ağırlıkları:

```json
{
  "tshirt": 35,
  "hoodie": 25,
  "pants": 20,
  "dress": 10,
  "jacket": 10
}
```

---

## 4.2.3. fashion_brand

**Tanım:**
STANDARD ve PREMIUM ürünlere yönelen, sezonluk ve koleksiyon mantığıyla çalışan moda markası.

**Oyun içi rolü:**
Oyuncuya daha kârlı ama daha dikkatli planlama isteyen siparişler verir.

| Alan                   | Önerilen Değer |
| ---------------------- | -------------: |
| priceMultiplierBps     |          11250 |
| qualityExpectationBps  |           8000 |
| deadlinePressureBps    |           8500 |
| complaintRiskBps       |           8000 |
| repeatOrderChanceBps   |           7000 |
| trustGainMultiplierBps |          12000 |
| trustLossMultiplierBps |          11500 |

Tier ağırlıkları:

```json
{
  "BASIC": 10,
  "STANDARD": 45,
  "PREMIUM": 40,
  "LUXURY": 5
}
```

Kategori ağırlıkları:

```json
{
  "tshirt": 20,
  "hoodie": 20,
  "pants": 20,
  "dress": 25,
  "jacket": 15
}
```

---

## 4.2.4. premium_brand

**Tanım:**
PREMIUM ürün ağırlıklı, kalite beklentisi yüksek, sipariş adedi orta seviyede olan marka.

**Oyun içi rolü:**
Oyuncu kalite, personel, makineler ve hat verimliliğini geliştirmeden bu müşterilerden tam verim alamaz.

| Alan                   | Önerilen Değer |
| ---------------------- | -------------: |
| priceMultiplierBps     |          13000 |
| qualityExpectationBps  |           9000 |
| deadlinePressureBps    |           8500 |
| complaintRiskBps       |           9000 |
| repeatOrderChanceBps   |           6500 |
| trustGainMultiplierBps |          13500 |
| trustLossMultiplierBps |          13000 |

Tier ağırlıkları:

```json
{
  "BASIC": 0,
  "STANDARD": 20,
  "PREMIUM": 60,
  "LUXURY": 20
}
```

Kategori ağırlıkları:

```json
{
  "tshirt": 10,
  "hoodie": 20,
  "pants": 20,
  "dress": 25,
  "jacket": 25
}
```

---

## 4.2.5. luxury_boutique

**Tanım:**
Az adetli, yüksek fiyatlı, LUXURY ürünlere odaklanan seçici butik müşteri.

**Oyun içi rolü:**
Az üretimle yüksek kâr sağlar ama hata toleransı düşüktür. Oyuncuya kalite yönetimini öğretir. Çünkü tabii ki az adetli ürün de insanı mahvedebilir, tekstilin küçük hediyesi.

| Alan                   | Önerilen Değer |
| ---------------------- | -------------: |
| priceMultiplierBps     |          16000 |
| qualityExpectationBps  |           9800 |
| deadlinePressureBps    |           7500 |
| complaintRiskBps       |           9500 |
| repeatOrderChanceBps   |           5500 |
| trustGainMultiplierBps |          16000 |
| trustLossMultiplierBps |          16000 |

Tier ağırlıkları:

```json
{
  "BASIC": 0,
  "STANDARD": 0,
  "PREMIUM": 25,
  "LUXURY": 75
}
```

Kategori ağırlıkları:

```json
{
  "tshirt": 5,
  "hoodie": 10,
  "pants": 15,
  "dress": 35,
  "jacket": 35
}
```

---

## 4.2.6. luxury_retail_group

**Tanım:**
LUXURY ürün isteyen ama butik müşteriden farklı olarak daha yüksek sipariş potansiyeline sahip büyük perakende grubu.

**Oyun içi rolü:**
İleri seviye fabrikalara büyük ödül ve büyük risk sunar.

| Alan                   | Önerilen Değer |
| ---------------------- | -------------: |
| priceMultiplierBps     |          14500 |
| qualityExpectationBps  |           9500 |
| deadlinePressureBps    |           9000 |
| complaintRiskBps       |           9500 |
| repeatOrderChanceBps   |           6000 |
| trustGainMultiplierBps |          15000 |
| trustLossMultiplierBps |          15500 |

Tier ağırlıkları:

```json
{
  "BASIC": 0,
  "STANDARD": 10,
  "PREMIUM": 35,
  "LUXURY": 55
}
```

Kategori ağırlıkları:

```json
{
  "tshirt": 5,
  "hoodie": 15,
  "pants": 20,
  "dress": 30,
  "jacket": 30
}
```

---

## 4.2.7. export_buyer

**Tanım:**
Termin, kalite, evrak ve üretim disiplini yüksek ihracat müşterisi.

**Oyun içi rolü:**
Oyuncu büyüdükçe daha istikrarlı ama baskılı siparişler sağlar. Erken teslim, doğru planlama ve kalite bu segmentte önemlidir.

| Alan                   | Önerilen Değer |
| ---------------------- | -------------: |
| priceMultiplierBps     |          11000 |
| qualityExpectationBps  |           8800 |
| deadlinePressureBps    |           9500 |
| complaintRiskBps       |           8500 |
| repeatOrderChanceBps   |           8500 |
| trustGainMultiplierBps |          13000 |
| trustLossMultiplierBps |          14000 |

Tier ağırlıkları:

```json
{
  "BASIC": 20,
  "STANDARD": 50,
  "PREMIUM": 25,
  "LUXURY": 5
}
```

Kategori ağırlıkları:

```json
{
  "tshirt": 30,
  "hoodie": 25,
  "pants": 20,
  "dress": 10,
  "jacket": 15
}
```

---

# 5. Hacim Sınıfları

## 5.1. Hacim Sınıflarında Tutulacak Alanlar

| Alan                  | Açıklama                                       |
| --------------------- | ---------------------------------------------- |
| key                   | Teknik anahtar                                 |
| displayName           | Görünen ad                                     |
| description           | Açıklama                                       |
| sortOrder             | Sıralama                                       |
| isActive              | Aktif/pasif durumu                             |
| quantityMultiplierBps | Genel adet çarpanı                             |
| priceMultiplierBps    | Hacme göre fiyat çarpanı                       |
| minWorkloadDays       | Minimum üretim yükü günü                       |
| maxWorkloadDays       | Maksimum üretim yükü günü                      |
| minLineItems          | Minimum ürün satırı                            |
| maxLineItems          | Maksimum ürün satırı                           |
| maxOfferLoadBps       | Fabrika kapasitesinden maksimum kullanım oranı |
| tierQuantityLimits    | Tier bazlı adet sınırları                      |

> Önemli: Oyunda sipariş teslim süresi genel karar olarak **20 oyun günü / 20 iş günü** olacaksa, `minWorkloadDays` ve `maxWorkloadDays` teslim tarihini değil, siparişin fabrikaya bindireceği üretim yükünü temsil etmelidir. Yani sistem “bu sipariş 20 gün içinde yapılabilir mi?” sorusunu buradan kontrol eder.

---

## 5.2. Önerilen Hacim Sınıfları

## 5.2.1. small_batch

**Tanım:**
Küçük adetli butik veya deneme siparişleri.

**Kullanım:**
Başlangıç, butik ve premium müşteriler için uygundur.

| Alan                  | Değer |
| --------------------- | ----: |
| quantityMultiplierBps |  6000 |
| priceMultiplierBps    | 11500 |
| minWorkloadDays       |     2 |
| maxWorkloadDays       |     6 |
| minLineItems          |     1 |
| maxLineItems          |     2 |
| maxOfferLoadBps       |  3000 |

Tier bazlı adet sınırları:

```json
{
  "BASIC": { "min": 300, "max": 3000 },
  "STANDARD": { "min": 200, "max": 2000 },
  "PREMIUM": { "min": 100, "max": 1200 },
  "LUXURY": { "min": 50, "max": 600 }
}
```

---

## 5.2.2. regular

**Tanım:**
Normal fabrika siparişleri.

**Kullanım:**
Oyuncunun ana sipariş havuzunu oluşturur.

| Alan                  | Değer |
| --------------------- | ----: |
| quantityMultiplierBps | 10000 |
| priceMultiplierBps    | 10000 |
| minWorkloadDays       |     4 |
| maxWorkloadDays       |    10 |
| minLineItems          |     1 |
| maxLineItems          |     3 |
| maxOfferLoadBps       |  5000 |

Tier bazlı adet sınırları:

```json
{
  "BASIC": { "min": 1000, "max": 12000 },
  "STANDARD": { "min": 800, "max": 8000 },
  "PREMIUM": { "min": 300, "max": 4000 },
  "LUXURY": { "min": 100, "max": 2000 }
}
```

---

## 5.2.3. large_retail

**Tanım:**
Büyük perakende zincirleri veya geniş dağıtım siparişleri.

**Kullanım:**
Orta ve ileri seviye fabrikalar için uygundur.

| Alan                  | Değer |
| --------------------- | ----: |
| quantityMultiplierBps | 17000 |
| priceMultiplierBps    |  9300 |
| minWorkloadDays       |     8 |
| maxWorkloadDays       |    16 |
| minLineItems          |     2 |
| maxLineItems          |     4 |
| maxOfferLoadBps       |  7000 |

Tier bazlı adet sınırları:

```json
{
  "BASIC": { "min": 5000, "max": 30000 },
  "STANDARD": { "min": 3000, "max": 20000 },
  "PREMIUM": { "min": 1000, "max": 10000 },
  "LUXURY": { "min": 300, "max": 5000 }
}
```

---

## 5.2.4. mass_distribution

**Tanım:**
Çok yüksek adetli, düşük marjlı, üretim kapasitesini ciddi şekilde dolduran siparişler.

**Kullanım:**
İleri seviye üretim kapasitesi olan fabrikalara açılmalıdır.

| Alan                  | Değer |
| --------------------- | ----: |
| quantityMultiplierBps | 25000 |
| priceMultiplierBps    |  8500 |
| minWorkloadDays       |    12 |
| maxWorkloadDays       |    20 |
| minLineItems          |     1 |
| maxLineItems          |     3 |
| maxOfferLoadBps       |  8500 |

Tier bazlı adet sınırları:

```json
{
  "BASIC": { "min": 15000, "max": 60000 },
  "STANDARD": { "min": 8000, "max": 40000 },
  "PREMIUM": { "min": 3000, "max": 15000 },
  "LUXURY": { "min": 1000, "max": 8000 }
}
```

---

## 5.2.5. capsule_collection

**Tanım:**
Birden fazla üründen oluşan koleksiyon siparişleri.

**Kullanım:**
Moda markaları, premium markalar ve butik müşteriler için uygundur.

| Alan                  | Değer |
| --------------------- | ----: |
| quantityMultiplierBps |  9000 |
| priceMultiplierBps    | 12000 |
| minWorkloadDays       |     6 |
| maxWorkloadDays       |    14 |
| minLineItems          |     3 |
| maxLineItems          |     6 |
| maxOfferLoadBps       |  6500 |

Tier bazlı adet sınırları:

```json
{
  "BASIC": { "min": 500, "max": 8000 },
  "STANDARD": { "min": 400, "max": 6000 },
  "PREMIUM": { "min": 200, "max": 3000 },
  "LUXURY": { "min": 80, "max": 1500 }
}
```

---

# 6. Sanal Müşteriler / Markalar

## 6.1. Müşteri Alanları

| Alan                | Açıklama                               |
| ------------------- | -------------------------------------- |
| key                 | Teknik anahtar                         |
| displayName         | Oyuncunun göreceği marka adı           |
| countryCode         | Ülke kodu                              |
| segmentKey          | Bağlı olduğu müşteri segmenti          |
| volumeClassKey      | Bağlı olduğu hacim sınıfı              |
| minFactoryScaleTier | Açılacağı minimum işletme aşaması      |
| maxFactoryScaleTier | Varsa erişimin biteceği maksimum aşama |
| minTrustScore       | Gerekli minimum güven puanı            |
| offerWeight         | Sipariş havuzunda görünme ağırlığı     |
| isActive            | Aktif/pasif durumu                     |
| description         | Marka açıklaması                       |

---

## 6.2. Fabrika Aşaması Önerisi

Mevcut enum isimlerine göre uyarlanabilir. İçerik planı için önerilen aşamalar:

| Aşama               | Açıklama                     |
| ------------------- | ---------------------------- |
| WORKSHOP            | İlk küçük atölye             |
| SMALL_FACTORY       | Küçük fabrika                |
| GROWING_FACTORY     | Büyüyen fabrika              |
| ESTABLISHED_FACTORY | Oturmuş üretim yapısı        |
| INDUSTRIAL_FACTORY  | Büyük endüstriyel fabrika    |
| EXPORT_FACTORY      | İhracat odaklı ileri fabrika |

---

# 7. İlk Beta İçin Önerilen Müşteri Listesi

## 7.1. Başlangıç Müşterileri

| Marka            | Ülke | Segment         | Hacim       | Min Aşama | Güven |
| ---------------- | ---- | --------------- | ----------- | --------- | ----: |
| EasyWear Market  | PL   | budget_retailer | regular     | WORKSHOP  |     0 |
| CottonBay Outlet | RO   | budget_retailer | small_batch | WORKSHOP  |     0 |
| DailyFit Stores  | BG   | budget_retailer | regular     | WORKSHOP  |   500 |

Bu müşteriler oyuncunun oyuna alışması için düşük riskli siparişler üretmelidir.

---

## 7.2. Küçük Fabrika Müşterileri

| Marka                | Ülke | Segment    | Hacim        | Min Aşama     | Güven |
| -------------------- | ---- | ---------- | ------------ | ------------- | ----: |
| UrbanNest Retail     | DE   | mass_brand | regular      | SMALL_FACTORY |  1000 |
| BlueRiver Outfitters | NL   | mass_brand | large_retail | SMALL_FACTORY |  1800 |
| ModaLane Basics      | IT   | mass_brand | regular      | SMALL_FACTORY |  1200 |

Bu müşteriler BASIC ve STANDARD ürünlerin dengeli kullanılmasını sağlar.

---

## 7.3. Moda Markaları

| Marka             | Ülke | Segment       | Hacim              | Min Aşama       | Güven |
| ----------------- | ---- | ------------- | ------------------ | --------------- | ----: |
| Northline Fashion | DE   | fashion_brand | regular            | SMALL_FACTORY   |  2500 |
| Vela Studio       | IT   | fashion_brand | capsule_collection | GROWING_FACTORY |  3500 |
| Aure Streetwear   | FR   | fashion_brand | capsule_collection | GROWING_FACTORY |  4000 |

Bu müşteriler oyuncuyu ürün çeşitliliği, koleksiyon mantığı ve daha dengeli kapasite yönetimine taşır.

---

## 7.4. Premium Müşteriler

| Marka            | Ülke | Segment       | Hacim              | Min Aşama           | Güven |
| ---------------- | ---- | ------------- | ------------------ | ------------------- | ----: |
| Elara Mode       | FR   | premium_brand | small_batch        | GROWING_FACTORY     |  5000 |
| NordVale Apparel | SE   | premium_brand | regular            | ESTABLISHED_FACTORY |  6500 |
| Casa Miren       | ES   | premium_brand | capsule_collection | ESTABLISHED_FACTORY |  7000 |

Bu müşterilerde kalite beklentisi ve fire riski daha görünür hale gelmelidir.

---

## 7.5. Luxury Müşteriler

| Marka           | Ülke | Segment             | Hacim              | Min Aşama           | Güven |
| --------------- | ---- | ------------------- | ------------------ | ------------------- | ----: |
| Maison Valeo    | FR   | luxury_boutique     | small_batch        | ESTABLISHED_FACTORY |  8500 |
| Bellora Atelier | IT   | luxury_boutique     | small_batch        | ESTABLISHED_FACTORY |  9000 |
| Élanor Group    | FR   | luxury_retail_group | capsule_collection | INDUSTRIAL_FACTORY  | 12000 |
| Crown & Loom    | UK   | luxury_retail_group | regular            | INDUSTRIAL_FACTORY  | 13000 |

Luxury müşteriler oyuncuya yüksek kâr sağlar ama kalite yönetimi zayıfsa ciddi güven kaybı yaratmalıdır.

---

## 7.6. Export Buyer Müşterileri

| Marka               | Ülke | Segment      | Hacim             | Min Aşama           | Güven |
| ------------------- | ---- | ------------ | ----------------- | ------------------- | ----: |
| EuroTrade Apparel   | DE   | export_buyer | large_retail      | GROWING_FACTORY     |  5000 |
| Baltic Sourcing Co. | LT   | export_buyer | regular           | ESTABLISHED_FACTORY |  7500 |
| Continental Buyers  | AT   | export_buyer | mass_distribution | INDUSTRIAL_FACTORY  | 11000 |

Export müşteriler termin ve kalite disiplini yüksek siparişler üretmelidir.

---

# 8. Önerilen Başlangıç Dataset Özeti

İlk beta için önerilen veri büyüklüğü:

| Veri Tipi                    | Önerilen Adet |
| ---------------------------- | ------------: |
| Müşteri segmenti             |             7 |
| Hacim sınıfı                 |             5 |
| Sanal müşteri / marka        |            18 |
| Başlangıçta açık müşteri     |           2-3 |
| Küçük fabrikada açık müşteri |           5-6 |
| İleri seviyede açık müşteri  |           15+ |

Başlangıç için çok fazla müşteri açılmamalıdır. Oyuncu ilk aşamada sipariş ekranında boğulmamalı. İnsan beyni zaten dropdown görünce hafifçe emeklilik dilekçesi yazıyor.

---

# 9. Sipariş Üretim Akışı

Sipariş oluşturma sistemi aşağıdaki sırayla çalışmalıdır:

## 9.1. Uygun Müşterileri Bul

Filtreler:

* Müşteri aktif mi?
* Oyuncunun fabrika aşaması yeterli mi?
* Oyuncunun güven puanı yeterli mi?
* Müşterinin maksimum aşama sınırı varsa oyuncu hâlâ bu aralıkta mı?

Örnek:

```ts
eligibleCustomers = customers.filter(customer =>
  customer.isActive &&
  factoryScale >= customer.minFactoryScaleTier &&
  trustScore >= customer.minTrustScore
)
```

---

## 9.2. Müşteri Seç

Uygun müşteriler arasından `offerWeight` değerine göre seçim yapılır.

Başlangıç müşterilerinin offerWeight değeri yüksek olabilir.

Örnek:

| Müşteri           | offerWeight |
| ----------------- | ----------: |
| EasyWear Market   |         100 |
| CottonBay Outlet  |          80 |
| Northline Fashion |          30 |
| Maison Valeo      |          10 |

---

## 9.3. Segmentten Tier Seç

Seçilen müşterinin segmentindeki `tierWeights` kullanılır.

Örnek:

```json
{
  "BASIC": 10,
  "STANDARD": 45,
  "PREMIUM": 40,
  "LUXURY": 5
}
```

Bu müşteri çoğunlukla STANDARD ve PREMIUM ürün ister.

---

## 9.4. Segmentten Kategori Seç

Seçilen müşterinin kategori ağırlıkları kullanılır.

Örnek:

```json
{
  "tshirt": 20,
  "hoodie": 20,
  "pants": 20,
  "dress": 25,
  "jacket": 15
}
```

Sistem bu ağırlıklara göre ürün kategorisini seçer.

---

## 9.5. Hacim Sınıfından Sipariş Büyüklüğünü Belirle

Seçilen müşterinin bağlı olduğu hacim sınıfı kullanılır.

Örnek:

`regular` hacim sınıfı:

```json
{
  "BASIC": { "min": 1000, "max": 12000 },
  "STANDARD": { "min": 800, "max": 8000 },
  "PREMIUM": { "min": 300, "max": 4000 },
  "LUXURY": { "min": 100, "max": 2000 }
}
```

Seçilen tier `STANDARD` ise adet bu aralıkta üretilir.

---

## 9.6. Sipariş Satırlarını Oluştur

Hacim sınıfındaki `minLineItems` ve `maxLineItems` değerlerine göre ürün satırı sayısı belirlenir.

Örnek:

`capsule_collection` için:

```json
{
  "minLineItems": 3,
  "maxLineItems": 6
}
```

Bu durumda sistem 3-6 farklı ürün satırı oluşturabilir.

---

## 9.7. Kapasite Kontrolü Yap

Siparişin toplam üretim yükü hesaplanır.

Kontrol:

```ts
orderLoad <= factoryCapacityFor20Days * maxOfferLoadBps / 10000
```

Örnek:

* Fabrikanın 20 günlük üretim kapasitesi: 100.000 üretim puanı
* Hacim sınıfı maxOfferLoadBps: 7000
* Maksimum sipariş yükü: 70.000 üretim puanı

Sipariş 70.000 puanı geçerse sistem adedi düşürmeli veya başka sipariş oluşturmalıdır.

---

# 10. Fiyat Hesaplama Mantığı

Sipariş fiyatı şu çarpanlarla hesaplanabilir:

```ts
finalUnitPrice =
  baseProductPrice *
  segment.priceMultiplierBps / 10000 *
  volumeClass.priceMultiplierBps / 10000 *
  tierDifficultyMultiplierBps / 10000
```

Örnek:

| Çarpan                | Değer |
| --------------------- | ----: |
| Ürün baz fiyatı       |  8.00 |
| Segment fiyat çarpanı | 11250 |
| Hacim fiyat çarpanı   | 10000 |
| Tier zorluk çarpanı   | 12000 |

Hesap:

```ts
8.00 * 1.125 * 1.00 * 1.20 = 10.80
```

Final birim fiyat: **10.80**

---

# 11. Termin Mantığı

Genel oyun kararı:

* Her sipariş için teslim süresi: **20 oyun günü**
* Sipariş erken tamamlanırsa 20. gün sevk edilir
* Sipariş geç tamamlanırsa gecikme cezası uygulanır
* Tamamlanmayan sipariş sevk edilmez

Bu yüzden sipariş üretiminde ana kontrol şu olmalıdır:

```ts
estimatedProductionDays <= 20
```

Ancak segmentin `deadlinePressureBps` değeri gecikme cezasını ve güven kaybını etkileyebilir.

Örnek:

| Segment             | Termin Baskısı | Gecikme Etkisi |
| ------------------- | -------------: | -------------- |
| budget_retailer     |           7000 | Düşük-Orta     |
| fashion_brand       |           8500 | Orta-Yüksek    |
| export_buyer        |           9500 | Çok yüksek     |
| luxury_retail_group |           9000 | Çok yüksek     |

---

# 12. Kalite ve Güven Etkisi

Kalite beklentisi yüksek segmentlerde fire, rework ve kalite kontrol daha önemli olmalıdır.

Örnek kalite etkisi:

```ts
qualityRisk =
  segment.qualityExpectationBps *
  productTierDifficultyBps *
  factoryQualityWeaknessBps
```

Başarılı sipariş sonucu:

* Güven artar
* Müşterinin tekrar sipariş ihtimali artar
* Daha iyi müşteriler açılır

Başarısız sipariş sonucu:

* Güven düşer
* Müşteri geçici olarak sipariş vermeyebilir
* Yüksek segmentlerde daha ağır ceza oluşur

---

# 13. Segment ve Hacim Uyumluluk Kuralları

Her segment her hacim sınıfıyla eşleşmemelidir.

## 13.1. Önerilen Uyum Tablosu

| Segment             | small_batch | regular | large_retail | mass_distribution | capsule_collection |
| ------------------- | ----------: | ------: | -----------: | ----------------: | -----------------: |
| budget_retailer     |        Evet |    Evet |      Kısıtlı |             Hayır |              Hayır |
| mass_brand          |     Kısıtlı |    Evet |         Evet |              Evet |            Kısıtlı |
| fashion_brand       |        Evet |    Evet |      Kısıtlı |             Hayır |               Evet |
| premium_brand       |        Evet |    Evet |      Kısıtlı |             Hayır |               Evet |
| luxury_boutique     |        Evet |   Hayır |        Hayır |             Hayır |               Evet |
| luxury_retail_group |     Kısıtlı |    Evet |         Evet |             Hayır |               Evet |
| export_buyer        |       Hayır |    Evet |         Evet |              Evet |            Kısıtlı |

Bu uyum tablosu Admin tarafında doğrudan tutulmak zorunda değil, ama veri girişinde bu mantık korunmalıdır.

---

# 14. Veri Girişi Sırası

Veriler şu sırayla girilmelidir:

## 14.1. Önce Segmentler

Önce müşteri segmentleri tanımlanmalıdır.

Girilmesi gereken ilk segmentler:

1. `budget_retailer`
2. `mass_brand`
3. `fashion_brand`
4. `premium_brand`
5. `luxury_boutique`
6. `luxury_retail_group`
7. `export_buyer`

---

## 14.2. Sonra Hacim Sınıfları

Girilmesi gereken hacim sınıfları:

1. `small_batch`
2. `regular`
3. `large_retail`
4. `mass_distribution`
5. `capsule_collection`

---

## 14.3. En Son Sanal Müşteriler

Müşteriler segment ve hacim sınıfına bağlanarak girilmelidir.

Başlangıç için önerilen müşteri sayısı:

* 3 budget müşterisi
* 3 mass brand müşterisi
* 3 fashion brand müşterisi
* 3 premium müşterisi
* 4 luxury müşterisi
* 3 export buyer müşterisi

Toplam: **19 müşteri**

Beta için 15-20 müşteri yeterlidir.

---

# 15. Admin Validasyon Kuralları

Admin veri girişinde şu kontroller yapılmalıdır:

## 15.1. Segment Validasyonları

* `key` boş olmamalı
* `key` benzersiz olmalı
* `tierWeights` toplamı tercihen 100 olmalı
* `categoryWeights` toplamı tercihen 100 olmalı
* `priceMultiplierBps` 5000-20000 aralığında olmalı
* `qualityExpectationBps` 1000-10000 aralığında olmalı
* `deadlinePressureBps` 1000-10000 aralığında olmalı

---

## 15.2. Hacim Validasyonları

* `minLineItems`, `maxLineItems` değerinden büyük olmamalı
* `minWorkloadDays`, `maxWorkloadDays` değerinden büyük olmamalı
* `maxOfferLoadBps` 10000 üzerinde olmamalı
* Tier adet sınırlarında `min`, `max` değerinden büyük olmamalı
* LUXURY adetleri BASIC adetlerinden düşük olmalı

---

## 15.3. Müşteri Validasyonları

* `segmentKey` mevcut bir segmente bağlanmalı
* `volumeClassKey` mevcut bir hacim sınıfına bağlanmalı
* `countryCode` 2 harfli ülke kodu olmalı
* `minTrustScore` negatif olmamalı
* `maxFactoryScaleTier` varsa `minFactoryScaleTier` değerinden önce olmamalı
* Luxury müşteriler başlangıç aşamasında açılmamalı

---

# 16. İlk Beta İçin Önerilen Denge

## 16.1. Başlangıç Oyuncusu

Başlangıçta oyuncuya açık müşteriler:

1. EasyWear Market
2. CottonBay Outlet
3. DailyFit Stores

Başlangıçta üretilen siparişler:

* BASIC ağırlıklı
* 1-2 ürün satırlı
* 20 gün içinde rahat yetiştirilebilir
* Düşük kârlı ama öğretici
* Çok sert kalite cezası olmayan siparişler

---

## 16.2. Küçük Fabrika Aşaması

Yeni açılacak müşteriler:

1. UrbanNest Retail
2. ModaLane Basics
3. Northline Fashion

Bu aşamada oyuncu:

* Daha yüksek adet görmeye başlar
* STANDARD ürünlere geçer
* Dikim darboğazını daha net hisseder
* Ütü-paket ve sevkiyat planlamasını ciddiye almak zorunda kalır

---

## 16.3. Büyüyen Fabrika Aşaması

Yeni açılacak müşteriler:

1. BlueRiver Outfitters
2. Vela Studio
3. Aure Streetwear
4. EuroTrade Apparel

Bu aşamada oyuncu:

* Koleksiyon siparişleri alır
* Birden fazla ürün satırı yönetir
* Kapasiteyi hatlar arasında bölüştürür
* Termin riskiyle daha fazla karşılaşır

---

## 16.4. Oturmuş Fabrika Aşaması

Yeni açılacak müşteriler:

1. Elara Mode
2. NordVale Apparel
3. Casa Miren
4. Baltic Sourcing Co.
5. Maison Valeo

Bu aşamada oyuncu:

* PREMIUM siparişlere ağırlık verir
* Kalite kontrolün önemini hisseder
* Güven puanı daha stratejik hale gelir

---

## 16.5. Endüstriyel Fabrika Aşaması

Yeni açılacak müşteriler:

1. Élanor Group
2. Crown & Loom
3. Continental Buyers

Bu aşamada oyuncu:

* Büyük hacimli siparişlerle kapasite yönetir
* Luxury ve export riskini taşır
* Yanlış sipariş kabul ederse fabrikanın bütün üretim planını kilitleyebilir

---

# 17. Sonuç

Sipariş üretim sistemi şu mantıkla kurulmalıdır:

```txt
Müşteri Segmenti = Müşterinin davranışı
Hacim Sınıfı = Siparişin büyüklüğü
Sanal Müşteri = Oyuncunun gördüğü marka kimliği
```

Bu yapı sayesinde sistem hem kontrollü hem de genişletilebilir olur.

İlk beta için ideal yapı:

```txt
7 segment
5 hacim sınıfı
18-20 sanal müşteri
20 gün teslim sistemi
Güven puanı ile müşteri açılımı
Fabrika aşamasına göre müşteri havuzu
```

Bu sistem ileride yeni sektörlere de uyarlanabilir. Tekstil için kullanılan segmentlerin bazıları oyuncak, çikolata veya mobilya sektöründe farklı kategori ağırlıklarıyla yeniden kullanılabilir.
