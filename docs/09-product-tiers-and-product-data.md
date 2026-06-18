# Ürün Katmanları ve Ürün Verisi

## Amaç

Bu doküman Factory Runway'de ürünlerin hangi temel verileri taşıyacağını ve bu verilerin üretim, fiyat, kalite, sertifika, risk ve fabrika gelişimini nasıl etkileyeceğini tanımlar.

Ürün sistemi sektör bağımsız core yapının önemli bir parçasıdır. Tekstil, çikolata, oyuncak, mobilya veya elektronik fark etmeksizin ürünler üç ana katmanda düşünülmelidir:

```text
Basic -> Premium -> Luxury
```

## Temel Kararlar

Her sektör kendi ürünlerini tanımlar, fakat ürün kalite/karlılık katmanları tüm sektörlerde ortak kalır.

- `Basic`: Hızlı üretilen, uygun fiyatlı, başlangıç seviyesi ürünler.
- `Premium`: Daha karlı, daha yüksek fiyatlı, kalite kontrol ve sertifika isteyen ürünler.
- `Luxury`: En yüksek karlılık potansiyeline sahip, uzun üretim süreli, yoğun kalite güvence ve gelişmiş tesis gerektiren ürünler.

Başlangıç seviyesinde oyuncunun fabrikasında temel departmanlar bulunur:

```text
Kumaş Depo -> Kesim -> Dikim -> Ütü/Paket -> Sevkiyat
```

Premium ve Luxury ürünler oyuncuya daha fazla kar fırsatı verir, fakat üretim rotasını uzatır, kalite kontrol ihtiyacını artırır ve fabrika gelişimi için yeni hedefler oluşturur.

Ürün katmanı ile operasyon karmaşıklığı ayrı düşünülmelidir. Basic ürünler genelde basit rota kullanır, fakat baskı veya nakış gibi katma değerli ara işlemler içeren Basic ürünler de olabilir.

Bu ayrım için `ProductTier` ve `valueAddCategory` ayrı alanlar olmalıdır. `ProductTier` ürünün pazar / kalite seviyesini, `valueAddCategory` ise ürünün katma değer kaynağını anlatır.

Varyant modeli kullanılmaz. Her farklı ürün, görsel, reçete ve fiyat kombinasyonu ayrı ürün kodu olarak tanımlanır.

## Ürün Verisi

Bir ürün en az şu verileri taşımalıdır:

- Ürün kodu.
- Ürün adı.
- Front image.
- Back image.
- Sektör anahtarı.
- Ürün katmanı: `Basic`, `Premium`, `Luxury`.
- Katma değer kategorisi: `valueAddCategory`.
- Siparişlerde kullanılacak temel fiyat.
- Tahmini kar katsayısı.
- Üretim zorluğu.
- Progression / XP puan katsayısı.
- Temel üretim rotası.
- Gerekli operasyonlar.
- Operasyonların fabrika içinde mi yoksa fasonla mı yapılabileceği.
- İşlem süreleri.
- Gerekli departmanlar.
- Gerekli kalite kontrol seviyesi.
- Gerekli sertifikalar.
- Gerekli fabrika level seviyesi.
- Gerekli upgrade veya tesis koşulları.
- Teslimat risk katsayısı.
- Fason maliyeti / fason süre etkisi.

Renk bilgisi ürün üzerinde tutulmaz. Renk dağılımı sipariş üzerinde tanımlanır.

## Value Add Category

`valueAddCategory`, oyuncunun ne kadar katma değerli ve üretim açısından daha zorlayıcı ürünlere yöneldiğini takip etmek için kullanılır.

Önerilen başlangıç değerleri:

```text
plain
printed
embroidered
washed
dyed
accessory_heavy
certified
luxury_detail
```

Örnek:

```text
Tier: Basic
valueAddCategory: printed
```

Bu ürün hala Basic sınıfındadır, fakat düz Basic üründen daha karlı, daha riskli ve daha fazla progression puanı veren bir ürün olabilir.

Kullanım alanları:

- Sipariş karlılığı.
- Üretim zorluğu.
- Fason ihtiyacı.
- Capability unlock hedefleri.
- Tavsiye motoru.
- Player level XP ağırlıkları.
- Oyuncu strateji profili.

## Veriler Neleri Etkiler?

Ürün katmanı şu sistemleri doğrudan etkiler:

- Üretim rotası: Premium ve Luxury ürünler kalite kontrol adımları ekleyebilir.
- Ara işlemler: Baskı ve nakış kesimden sonra dikimden önce rota içine girebilir.
- Terbiye işlemleri: Boya ve yıkama dikimden sonra ütü/paket öncesi rota içine girebilir.
- Üretim süresi: Daha yüksek katmanlar daha uzun işlem süreleri kullanır.
- Line kapasitesi: Zor ürünler aynı line ile daha az adet çıkarabilir.
- Fiyat ve karlılık: Premium ve Luxury ürünler daha yüksek gelir sağlar.
- Sipariş erişimi: Oyuncu gerekli level, tesis veya sertifika olmadan bazı siparişleri alamaz.
- Teslimat riski: Uzun rota ve kalite adımları riski artırır.
- Darboğaz türü: Basic ürünlerde kapasite, Premium ve Luxury ürünlerde kalite kontrol darboğazı öne çıkabilir.
- Upgrade hedefi: Oyuncu daha karlı ürünlere geçmek için sertifika, kalite güvence veya tesis yatırımı yapar.
- Entegrasyon hedefi: Oyuncu sık kullandığı fason operasyonları kendi fabrikasına alabilir.
- Player level puanı: Ürün zorluğu ve `valueAddCategory` daha yüksek progression puanı üretebilir.
- Tavsiye motoru: Oyuncu hep `plain Basic` ürünlere yöneliyorsa daha katma değerli ürünlere geçmesi önerilebilir.

## Ürün Katmanları

### Basic

Basic ürünler başlangıç fabrikası için uygundur.

- Hızlı üretim.
- Daha düşük satış fiyatı.
- Daha düşük kar.
- Basit rota.
- Genelde basit rota, fakat baskı veya nakış gibi isteğe bağlı ara işlem içerebilir.
- Minimum kalite kontrol.
- Sertifika zorunluluğu yok veya çok düşük.
- Başlangıç line ve departmanlarıyla üretilebilir.

Tekstil örneği:

```text
Basic T-Shirt
Rota: Kumaş Depo -> Kesim -> Dikim -> Ütü/Paket -> Sevkiyat
```

Baskılı Basic tekstil örneği:

```text
Printed Basic T-Shirt
Rota: Kumaş Depo -> Kesim -> Baskı -> Dikim -> Ütü/Paket -> Sevkiyat
Baskı: Fabrikada yoksa fason yapılabilir
```

Yıkamalı Basic tekstil örneği:

```text
Washed Basic T-Shirt
Rota: Kumaş Depo -> Kesim -> Dikim -> Yıkama -> Ütü/Paket -> Sevkiyat
Yıkama: Fabrikada yoksa fason yapılabilir
```

### Premium

Premium ürünler daha karlı siparişlerdir, fakat kalite ve sertifika ister.

- Daha yüksek fiyat.
- Daha iyi kar marjı.
- Üretim aşamaları arasına kalite kontrol eklenir.
- BSCI veya ISO 9000 gibi sertifikalar gerekebilir.
- Oyuncunun kalite kontrol kapasitesi yetersizse darboğaz oluşur.
- Sipariş almadan önce fabrika koşulları kontrol edilmelidir.

Tekstil örneği:

```text
Premium Hoodie
Rota: Kumaş Depo -> Kesim -> Kesim Kontrol -> Nakış -> Dikim -> Dikim Kontrol -> Yıkama -> Ütü/Paket -> Final Kontrol -> Sevkiyat
Gereksinim: ISO 9000 veya BSCI
```

### Luxury

Luxury ürünler oyunun en özel ve en karlı ürün grubudur.

- En yüksek fiyat ve kar potansiyeli.
- En uzun üretim süreleri.
- Daha detaylı üretim adımları.
- Yoğun kalite kontrol.
- Daha entegre tesis gereksinimi.
- Daha yüksek kalite güvence ve sertifikasyon seviyesi.
- Yanlış planlanırsa teslimat riski ve line bekleme maliyeti yüksektir.

Tekstil örneği:

```text
Luxury Coat
Rota: Kumaş Üretim -> Kumaş Depo -> Malzeme Kontrol -> Kesim -> Kesim Kontrol -> Nakış -> Dikim -> Ara Kontrol -> Boya/Yıkama -> Detay İşçilik -> Final Kalite -> Özel Paket -> Sevkiyat
Gereksinim: Yüksek kalite güvence seviyesi, gelişmiş tesis, ileri sertifikalar
```

## MVP Kapsamı

İlk beta içinde Basic ürünler oynanabilir ana içerik olmalıdır.

Premium ve Luxury sistemleri için MVP'de en azından tasarım ve veri alanları hazır düşünülmelidir. Oynanabilir hale getirme sırası daha sonra belirlenebilir.

MVP için öneri:

- Basic ürünler aktif.
- Premium ve Luxury ürün katmanları veri modelinde tanımlı.
- Premium / Luxury siparişler kilitli veya "ileride açılacak" mantığında gösterilebilir.
- Sertifika sistemi ilk beta içinde derin çalışmak zorunda değildir.
- Kalite kontrol adımı ilk beta için basit bir route step olarak modellenebilir.
- Basic ürünlerde en az bir basit ara işlem fasonla modellenebilir.

## İleride Genişletilecek Alanlar

- Sertifika edinme sistemi.
- BSCI, ISO 9000 ve sektöre özel kalite belgeleri.
- Kalite kontrol departmanı kapasitesi.
- Hatalı üretim / yeniden işleme.
- Ürün zorluğuna göre fire riski.
- Premium müşteri beklentileri.
- Luxury ürünlerde özel paketleme veya özel işçilik.
- Ürün katmanına göre sipariş marketi filtreleri.
- Fason operasyonları fabrika içine alma.
- Boya / yıkama operasyonlarını reçete bazlı departman olarak açma.
- Kumaş üretimini entegre tesise dahil etme.

## Örnekler

Ürün tanımı örneği:

```text
Product Code: MDL-TSHIRT-001
Name: Basic T-Shirt
Front Image: tshirt-front.png
Back Image: tshirt-back.png
Sector: Textile
Tier: Basic
valueAddCategory: plain
Base Route: Textile Basic Route
Required Level: 1
Required Certifications: None
Profit Level: Low
Production Difficulty: Easy
Progression Multiplier: 1.0x
Required Operations: Cutting, Sewing, Ironing, Packing, Shipping
```

Baskılı ürün tanımı örneği:

```text
Product Code: MDL-VNECK-PRINT-001
Name: V Yaka Basic Bayan T-Shirt - Çiçek Baskı
Sector: Textile
Tier: Basic
valueAddCategory: printed
Required Operations: Cutting, Printing, Sewing, Ironing, Packing, Shipping
Printing Mode: In-house if available, otherwise subcontractor
Subcontractor Lead Time: 4 gün
Subcontractor Cost: 1.20 USD / adet
Progression Multiplier: 1.3x
```

Ürün kodu ayrımı örneği:

```text
Product Code: FW.TSH.57
Product Name: Manama
Tanım: Basic düz t-shirt

Product Code: FW.BSH.21
Product Name: Cameo
Tanım: Baskılı t-shirt
```

Premium sipariş kilidi örneği:

```text
Bu sipariş daha yüksek kalite standardı istiyor.
ISO 9000 sertifikası almadan Premium siparişleri kabul edemezsin.
```

Luxury uyarı örneği:

```text
Luxury ürünler yüksek kar getirir, ancak üretim süresi uzun ve kalite kontrol yükü fazladır.
Bu sipariş için gelişmiş kalite güvence kapasitesi gerekir.
```
