# Tekstil Üretim Sistemi

## Amaç

Bu doküman ilk beta sürümde kullanılacak Textile Pack üretim akışını tanımlar. Tekstil sistemi core üretim motorunun ilk somut uygulaması olacaktır.

## Temel Kararlar

Tekstil üretim akışı:

```text
Depo -> Kesim -> Dikim -> Ütü -> Paket -> Sevkiyat
```

Core sistem bu adımları sektör bağımsız bir üretim rotası olarak görmelidir. Tekstile özel isimler ve ayarlar Textile Pack içinde tanımlanmalıdır.

Textile Pack ürünleri de core ürün katmanlarını kullanır:

- `Basic`: Başlangıç seviyesi hızlı ve uygun fiyatlı tekstil ürünleri.
- `Premium`: Kalite kontrol adımları ve BSCI / ISO 9000 gibi sertifika gereksinimleri olan daha karlı ürünler.
- `Luxury`: Daha uzun üretim süreleri, yoğun kalite güvence, özel işçilik ve gelişmiş tesis gerektiren en karlı ürünler.

Tekstil rotası ürün özelliğine göre ara işlemler içerebilir. Baskı, nakış, taş yıkama ve parça boya gibi işlemler oyuncunun fabrikasında yoksa fason firmalarla tamamlanabilir.

Ara kuyruklar:

```text
CUT_READY
SEWN_READY
IRON_READY
PACKED_READY / SHIP_READY
```

Üretim mantığı:

- Kumaş depoya girdiği gün kesime hazır sayılır.
- Cutting tamamlandıkça `CUT_READY` oluşur.
- Sewing line `CUT_READY` kuyruğunu tüketir.
- Sewing tamamlandıkça `SEWN_READY` oluşur.
- Ironing `SEWN_READY` kuyruğunu tüketir.
- Packing `IRON_READY` kuyruğunu tüketir.
- Shipping sevkiyata hazır ürünleri tamamlar.

## Darboğaz Mantığı

Ara kuyruklar oyuncuya gerçek üretim hattındaki sıkışmayı göstermelidir.

Örnek durumlar:

- Cutting yavaşsa sewing line bekler.
- Sewing güçlü ama ironing zayıfsa `SEWN_READY` birikir.
- Packing yavaşsa sevkiyata hazır ürün sayısı düşük kalır.
- Premium ve Luxury ürünlerde kalite kontrol kapasitesi yeni bir darboğaz türü olabilir.
- Fasona gönderilen ara işler dikim veya sonraki operasyonları bekletebilir.
- Kuyrukta 1-2 günlük iş düşük güvenlik, 3-5 günlük iş ideal, 8-10 günlük iş fazla birikim olarak değerlendirilir.

## Makine ve Teknoloji Gelişimi

Textile Pack'te oyuncu oyuna basic makineler ve insan ağırlıklı bir sistemle başlamalıdır. Büyüme yalnızca yeni hat eklemekle sınırlı olmamalıdır; mevcut parkurlar teknoloji yatırımlarıyla güçlendirilebilmelidir.

Teknoloji gelişimi şu metrikleri etkiler:

- Üretim süresi.
- Fire oranı.
- Kalite riski.
- Gerekli personel.
- Bakım / enerji maliyeti.
- Premium ve Luxury ürün uygunluğu.

Örnek kesim progression:

```text
Level 1:
Tahta kesim masası, manuel kumaş serme, el motoru ile kesim.

Level 2:
Otomatik serim makinesi, kesim hâlâ el motoru ile.

Level 3:
Otomatik serim ve otomatik kesim.

Level 4:
Otomatik serim, otomatik kesim ve lazer işaretleme.
```

Örnek dikim progression:

```text
Level 1:
Bağımsız dikiş makineleri, iş dağılımı insanlar tarafından yapılır.

Level 2:
Yürüyen bant / konveyör destekli dikim hattı, yarı mamuller makineler arasında daha düzenli akar.

Level 3:
Modüler hat ve operasyon dengeleme, darboğaz operasyonlar daha iyi yönetilir.

Level 4:
Akıllı hat izleme, kalite hatası ve bekleme riski daha erken görünür.
```

Örnek ütü / paket progression:

```text
Level 1:
El ütüsü ve manuel paketleme.

Level 2:
Konveyör ütü, paketleme manuel devam eder.

Level 3:
Konveyör ütü ve yarı otomatik paketleme.

Level 4:
Konveyör ütü, otomatik paketleme ve daha tutarlı final kalite.
```

Örnek nakış progression:

```text
Level 1:
10 kafa nakış makinesi.

Level 2:
Daha büyük çok kafa nakış makinesi.

Level 3:
Çok kafa makine + otomatik renk / iplik izleme.
```

Bu sistem oyuncuya iki stratejik büyüme yolu sunar:

```text
Yeni hat açmak = daha fazla paralel kapasite.
Mevcut hattı upgrade etmek = aynı alanda daha hızlı, daha kaliteli ve daha az fireli üretim.
```

## Ürün Katmanına Göre Rota

Basic tekstil rotası:

```text
Depo -> Kesim -> Dikim -> Ütü -> Paket -> Sevkiyat
```

Baskılı Basic tekstil rotası:

```text
Depo -> Kesim -> Baskı -> Dikim -> Ütü -> Paket -> Sevkiyat
```

Premium tekstil rotası:

```text
Depo -> Kesim -> Kesim Kontrol -> Dikim -> Dikim Kontrol -> Ütü -> Paket -> Final Kontrol -> Sevkiyat
```

Luxury tekstil rotası:

```text
Depo -> Malzeme Kontrol -> Kesim -> Kesim Kontrol -> Dikim -> Ara Kontrol -> Detay İşçilik -> Final Kalite -> Özel Paket -> Sevkiyat
```

## MVP Kapsamı

- Tekstil üretim rotası.
- Kesim, dikim, ütü, paketleme ve sevkiyat adımları.
- Adımlar arası kuyruklar.
- Line bekleme süresi.
- Gün sonu ana darboğaz tespiti.
- Basit kapasite değerleri.
- Basic ürün rotası.
- Premium ve Luxury için veri ve rota tasarımının hazır düşünülmesi.
- Baskı veya nakış gibi en az bir ara işlemin fason üzerinden modellenmesi.

## İleride Genişletilecek Alanlar

- Ürün modeline göre farklı işlem süreleri.
- Kumaş tipi veya ürün zorluğu.
- Kalite kontrol.
- BSCI / ISO 9000 gibi sertifika gereksinimleri.
- Fire / yeniden işleme.
- Fason baskı, nakış, taş yıkama ve parça boya.
- Baskı / nakış makinelerini fabrika içine alma.
- Kumaş üretimini entegre tesise dahil etme.
- Sektöre özel makineler ve upgrade'ler.
- Daha ayrıntılı balans ayarları.

## Örnekler

Örnek üretim zinciri:

```text
08:00 Depodan kesime malzeme aktarıldı.
08:16 CUT_READY: 2 adet.
08:20 Sewing Line 1 üretime başladı.
09:20 Line 2 kesim kuyruğu bekliyor.
10:40 Paketleme tarafında yığılma başladı.
```

Örnek darboğaz mesajı:

```text
Bugünün ana darboğazı: Kesim.
Dikim kapasiten güçlü ama kesim hattı yetersiz kaldı.
```

Premium uyarı örneği:

```text
Bu Premium sipariş kalite kontrol kapasitesi istiyor.
ISO 9000 sertifikası olmadan bu siparişi kabul edemezsin.
```

Fason işlem örneği:

```text
Kesim tamamlandıktan sonra parçalar baskı için Vizyon Baskı'ya gönderilecek.
Baskı dönüşü parçalar dikim kuyruğuna alınacak.
```
