# Fabrika Büyümesi ve Fason İşler

## Amaç

Bu doküman oyuncunun küçük bir atölyeden tam entegre tesise dönüşen yolculuğunu tanımlar. Büyüme sadece Kesim, Dikim, Ütü, Paket gibi mevcut departmanlara yeni line eklemekten ibaret olmamalıdır.

Oyuncu başlangıçta bazı ara işlemleri dış firmalara yaptırabilir. Finansman ve seviye arttıkça bu işlemleri kendi fabrikasına alarak daha entegre, daha karlı ve daha kontrollü bir tesise dönüşür.

## Temel Kararlar

Başlangıç atölyesi temel departmanlarla kurulur:

```text
Kumaş Depo -> Kesim -> Dikim -> Ütü/Paket -> Sevkiyat
```

Atölyede olmayan bazı işlemler fason firmalarla yapılabilir:

- Nakış.
- Baskı.
- Yıkama.
- Boya.
- Özel paketleme.
- Kumaş hazırlık veya kumaş üretimi.

Bu işlemler ürün rotasına ara adım olarak girer. Eğer oyuncunun fabrikasında ilgili kabiliyet yoksa sistem uygun fason seçeneklerini gösterir.

## Core Mantık

Ürün rotası operasyonlardan oluşur. Her operasyon iki şekilde tamamlanabilir:

- Fabrika içinde: Oyuncunun ilgili departmanı, makinesi veya line'ı varsa.
- Fason firma ile: Oyuncunun tesiste kabiliyeti yoksa, dış firmaya gönderilerek.

Bu nedenle ürün rotasında "Baskı" adımı varsa sistem şu soruyu sorar:

```text
Bu fabrikada baskı kabiliyeti var mı?
Evet -> Baskı departmanında üret.
Hayır -> Fason baskı firması seç.
```

Fason kullanımı siparişi kaçırmama fırsatı verir, fakat süre, maliyet ve planlama riski ekler.

Fason teklifleri oyuncuya risk-karar alanı açmalıdır. Ucuz teklif daha riskli, güvenli teklif daha pahalı olabilir.

## Fason Firma Verisi

Bir fason firma en az şu verileri taşımalıdır:

- Firma adı.
- Desteklediği operasyon.
- Birim işlem ücreti.
- Tamamlanma süresi.
- Kapasite limiti.
- Kalite seviyesi.
- Güvenilirlik / gecikme riski.
- Minimum adet.
- Sektör uyumluluğu.
- Ürün katmanı uyumluluğu.
- Teklif tipi: ucuz, normal, güvenli.

Örnek:

```text
Firma: Vizyon Baskı San.Tic.Ltd
Operasyon: Baskı
Ücret: 1.20 USD / adet
Süre: 4 gün
Kalite: Orta
Gecikme Riski: Düşük
Uyum: Basic ve Premium tekstil ürünleri
```

Oyuncuya sunulabilecek teklif örneği:

```text
Ucuz Teklif: 1.00 USD/adet, 5 gün, yüksek gecikme riski
Normal Teklif: 1.20 USD/adet, 4 gün, orta risk
Güvenli Teklif: 1.55 USD/adet, 3 gün, düşük risk
```

## Veriler Neleri Etkiler?

Fason veya iç üretim seçimi şu sistemleri etkiler:

- Sipariş karlılığı: Fason maliyeti ürün başına karı düşürür.
- Teslimat riski: Fason süresi teslim tarihine ek yük getirir.
- Ara kuyruklar: Kesimden sonra parçalar baskı veya nakış için dışarı çıkabilir.
- Line planlama: Dikim line'ları fason dönüşünü bekleyebilir.
- Günlük rapor: Fasona giden, fasondan dönen ve geciken işler raporda görünmelidir.
- Upgrade hedefi: Oyuncu sık kullandığı fason işlemi kendi fabrikasına almayı hedefler.

## Atölyeden Entegre Tesise Yolculuk

Oyuncu büyümeyi iki eksende hisseder:

- Kapasite büyümesi: Aynı departmana yeni line, personel veya makine ekleme.
- Kabiliyet büyümesi: Yeni operasyonları fabrika içine alma.

Örnek büyüme yolu:

```text
1. Atölye: Depo, Kesim, Dikim, Ütü, Paket, Sevkiyat
2. Katma Değer: Baskı ve Nakış makineleri
3. Yıkama/Boya: Dikim sonrası reçete bazlı yıkama ve boya operasyonları
4. Kalite: Kalite kontrol ve kalite güvence departmanı
5. Entegre Tesis: Kumaş hazırlık ve kumaş üretimi
```

Bu yolculuk oyuncuya uzun vadeli hedef verir:

```text
Bugün baskıyı fason yaptırıyorum.
Yeterince kazanınca baskı makinesi alıp bu karı ve zamanı fabrikada tutacağım.
```

## Ürün Katmanıyla İlişki

Ürün katmanı ve operasyon karmaşıklığı aynı şey değildir.

- Basic ürün sade olabilir, fakat baskı veya nakış gibi ara işlem de içerebilir.
- Premium ürün daha fazla kalite kontrol ve sertifika isteyebilir.
- Luxury ürün hem yoğun kalite kontrol hem de özel işçilik / özel operasyonlar isteyebilir.

Örnek:

```text
Düz Basic T-Shirt: Kumaş Depo -> Kesim -> Dikim -> Ütü/Paket -> Sevkiyat
Baskılı Basic T-Shirt: Kumaş Depo -> Kesim -> Fason Baskı -> Dikim -> Ütü/Paket -> Sevkiyat
Nakışlı Premium Hoodie: Kumaş Depo -> Kesim -> Nakış -> Dikim -> Yıkama -> Ütü/Paket -> Sevkiyat
Luxury Coat: Kumaş Üretim -> Kumaş Depo -> Malzeme Kontrol -> Kesim -> Özel İşçilik -> Boya/Yıkama -> Final Kalite -> Özel Paket -> Sevkiyat
```

## MVP Kapsamı

İlk beta için bu sistem sade tutulmalıdır:

- Başlangıç fabrikasında temel departmanlar.
- En az bir ara işlem tipi: Baskı veya Nakış.
- En az bir fason firma.
- Ürün rotasında fason adım.
- Fason maliyeti ve süre etkisi.
- Fasona giden / dönen işlerin basit takibi.
- Gün sonu raporunda fason kaynaklı bekleme veya gecikme uyarısı.

## İleride Genişletilecek Alanlar

- Birden fazla fason firma seçeneği.
- Fiyat / süre / kalite karşılaştırması.
- Fason firma güvenilirliği.
- Gecikme ve kalite problemi riski.
- Fason arıza, yoğunluk ve teslim gecikmesi olayları.
- Fason sözleşmeleri.
- Kendi makinesini alma yatırım kararı.
- Kumaş üretimini tesise dahil etme.
- Tam entegre tesis seviyesi.

## Örnek Senaryo

Sipariş:

```text
Ürün: V Yaka Basic Bayan T-Shirt
Özellik: Ön taraf çiçek desenli baskı
Adet: 500
Teslim: 8 gün
```

Oyuncunun fabrikasında baskı makinesi yoktur. Sistem üretim rotasını şöyle kurar:

```text
Kumaş Depo -> Kesim -> Fason Baskı -> Dikim -> Ütü/Paket -> Sevkiyat
```

Fason seçeneği:

```text
Vizyon Baskı San.Tic.Ltd
Ücret: 1.20 USD / adet
Süre: 4 gün
```

Oyuncu mesajı:

```text
Bu siparişte baskı işlemi var.
Fabrikanda baskı makinesi olmadığı için kesilen parçalar Vizyon Baskı'ya gönderilecek.
Baskı 4 gün sürecek; dikim line'larını buna göre planla.
```

Yatırım hedefi:

```text
Son 5 siparişte baskıya 2.400 USD fason ücreti ödedin.
Baskı makinesi almak uzun vadede karlılığı artırabilir.
```
