# Ana Oyun Döngüsü

## Amaç

Bu doküman Factory Runway'in sektör bağımsız ana oyun döngüsünü tanımlar. Textile Pack ilk örnektir, fakat bu döngü ileride tüm sektör paketleri için ortak kalmalıdır.

## Temel Kararlar

Ana model:

```text
Planla -> Line Ata -> Vardiyayı Başlat -> Simülasyonu İzle -> Rapor Al -> Geliştir -> Sonraki Gün
```

Oyun idle bir sayaç deneyimi değildir. Oyuncu üretim gününe başlamadan önce karar verir. Vardiya başladıktan sonra sistem hızlandırılmış simülasyonu çalıştırır ve gün sonunda sonuçları raporlar.

Günlük döngü:

1. Gün raporunu gör.
2. Aktif siparişleri incele.
3. Line'lara üretim emirlerini ata.
4. Risk tahminlerini gör.
5. Vardiyayı başlat.
6. 2-3 dakikalık hızlandırılmış üretimi izle.
7. Vardiya sonu raporunu al.
8. Darboğazları çöz.
9. Yeni line / personel / makine / kapasite yatırımı yap.
10. Sonraki güne geç.

## Oyuncu Kararları

Her gün oyuncunun verdiği kararlar şunlara bağlanmalıdır:

- Sipariş önceliği.
- Line ataması.
- Kapasite yeterliliği.
- Teslim tarihi riski.
- Darboğaz çözümü.
- Bir sonraki gün yatırımı.
- Fason işlem planlaması.
- Yeni üretim kabiliyeti yatırımı.

Kararlar hızlı okunmalı, sonuçları raporda net görülmelidir.

## MVP Kapsamı

- Gün başı planlama ekranı.
- Aktif sipariş listesi.
- Line atama.
- Teslim riski ön izlemesi.
- Vardiya başlatma.
- Gün sonu raporu.
- Basit upgrade veya line açma kararı.
- Basit fason işlem kararı.

## İleride Genişletilecek Alanlar

- Sipariş marketi ve teklif seçimi.
- Daha detaylı yatırım kararları.
- Sektöre özel olaylar.
- Günlük hedefler ve kısa görevler.
- Oyuncu stratejisine göre farklı gelişim yolları.
- Atölyeden entegre tesise büyüme hedefleri.

## Örnekler

Planlama örneği:

```text
Line 1 -> MDL-FW-1254
Line 2 -> MDL-FW-1254
Line 3 -> MDL-FW-1254
Line 4 -> MDL-FW-7512
```

Karar mesajı örneği:

```text
MDL-FW-1254 riskli görünüyor. Bu ürüne 1 line daha ayırırsan teslim tarihi kurtulabilir.
```

Fason karar örneği:

```text
Bu siparişte baskı işlemi var.
Fabrikanda baskı makinesi olmadığı için işi fasona gönderebilirsin.
Baskı 4 gün süreceği için dikim planını buna göre ayarla.
```
