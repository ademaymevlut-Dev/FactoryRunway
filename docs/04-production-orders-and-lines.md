# Üretim Emirleri ve Line Sistemi

## Amaç

Bu doküman üretim emirleri, line sistemi ve oyuncunun kapasite atama kararlarını tanımlar.

## Temel Kararlar

Üretim emri temel alanları:

- Ürün kodu.
- Ürün adı.
- Ürün katmanı: Basic, Premium veya Luxury.
- Sipariş adedi.
- Renk dağılımı.
- Teslim tarihi.
- Kalan adet.
- Öncelik.
- Üretim durumu.
- Ürün operasyon gereksinimleri.
- Fason işlem gereksinimleri.
- Tahmini bitiş tarihi.
- Teslimat riski.

Örnek:

```text
Production Order: MDL-FW-1254
Product Name: Cameo
Product Tier: Basic
Order Quantity: 500
Colors: Siyah 300, Kırmızı 200
Remaining Quantity: 380
Due Date: Day 5
Priority: High
```

Line sistemi:

- Üretim line mantığıyla çalışır.
- Bir sewing line açmak minimum 10 personel gerektirir.
- Bir sewing line aynı anda sadece tek ürün modelini çalışabilir.
- İkinci farklı ürün için ikinci line gerekir.
- Oyuncu level yükselttikçe yeni line paketleri açar.
- Her line belirli sürede ürün çıkarır.

Örnek kapasite:

```text
10 personelli bir sewing line her 8 dakikada 1 ürün tamamlar.
```

## Risk ve Tahmin

Sistem line ataması yapılırken oyuncuya tahmin göstermelidir:

- Bu sipariş tahmini hangi gün biter?
- Teslim tarihi güvenli mi, riskli mi?
- Line boşta kalacak mı?
- Ara kuyruk yetersizliği line bekletecek mi?
- Bir line daha verilirse risk düşer mi?
- Ürün katmanı üretim süresini ve kalite kontrol ihtiyacını artırıyor mu?
- Bu sipariş için gerekli sertifika veya fabrika seviyesi var mı?
- Bu siparişte oyuncunun fabrikasında olmayan ara işlem var mı?
- Fason süresi teslim tarihini riske atıyor mu?
- Ara fırsat siparişi mevcut planı bozmadan araya alınabilir mi?

Detaylı line veri modeli, line durumları, line kapasite hesabı ve harita üzerindeki line slot ilişkisi için:

```text
21-production-line-system.md
```

Siparişin ürün reçetesinden üretim rotasına çevrilmesi ve uygun line adaylarının hesaplanması için:

```text
23-order-assignment-logic.md
```

## Ürün Katmanının Siparişe Etkisi

Üretim emri sadece adet ve teslim tarihi taşımaz. Bağlı olduğu ürünün katmanı da sipariş davranışını belirler.

- Basic siparişler daha hızlı tamamlanır, daha düşük kar getirir.
- Premium siparişler daha yüksek kar getirir, kalite kontrol ve sertifika ister.
- Luxury siparişler çok yüksek kar potansiyeli sunar, fakat uzun üretim süresi, daha yüksek risk ve gelişmiş tesis gerektirir.

Sipariş kabul ekranı oyuncuya bu farkı sade şekilde göstermelidir.

## MVP Kapsamı

- Aktif üretim emirleri.
- Kalan adet takibi.
- Renk dağılımı takibi.
- Teslim tarihi.
- Öncelik.
- Line atama.
- Aynı ürüne birden fazla line atama.
- Line başına basit kapasite hesabı.
- Teslimat riski hesaplama.
- Basic ürün katmanı ile başlangıç siparişleri.
- Üründe gerekli ara işlem varsa basit fason kullanım kararı.
- Ara fırsat siparişlerini aktif üretim emrine dönüştürme.

## İleride Genişletilecek Alanlar

- Sipariş marketi ve teklif kabul etme.
- Ürün bazlı karlılık.
- Ürün zorluğu.
- Premium ve Luxury sipariş erişim kuralları.
- Sertifika gereksinimleri.
- Kalite kontrol kapasitesi.
- Fason firma seçimi ve karşılaştırması.
- Kendi makinesini alma yatırım kararı.
- Personel uzmanlığı.
- Line verimlilik seviyesi.
- Sektöre özel line türleri.
- Admin veya config üzerinden kapasite değerleri.
- Planlanan ve gerçekleşen maliyet karşılaştırması.
- Müşteri ve koleksiyon bazlı sipariş pazarı.

## Örnekler

Line atama örneği:

```text
Line 1 -> MDL-FW-1254
Line 2 -> MDL-FW-1254
Line 3 -> MDL-FW-1254
Line 4 -> MDL-FW-7512
```

Oyuncu mesajı:

```text
Line 4 yakında boşta kalacak.
Bu ürüne 1 line daha atarsan teslim tarihi kurtulur.
```

Premium kilit mesajı:

```text
Bu Premium sipariş ISO 9000 sertifikası istiyor.
Sertifikayı almadan bu siparişi kabul edemezsin.
```

Fason uyarısı:

```text
Bu ürün baskı işlemi istiyor.
Fabrikanda baskı makinesi yok; işi fasona gönderirsen 4 gün ek süre ve adet başı 1.20 USD maliyet oluşur.
```

Renk dağılımı örneği:

```text
Cameo toplam 2000 adet.
Siyah: 1000
Lacivert: 300
Kırmızı: 400
Camel: 300
```

Ara fırsat örneği:

```text
180 adet Cameo için ara fırsat geldi.
Yarın dikim hattında boşluk olduğu için planına iyi uyuyor.
Kabul edersen kar yüksek, fakat mevcut riskli siparişleri tekrar kontrol etmelisin.
```
