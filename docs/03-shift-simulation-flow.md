# Vardiya Simülasyon Akışı

## Amaç

Bu doküman vardiya başlatma, hızlandırılmış simülasyon ve vardiya sonu kayıt akışını tanımlar.

## Temel Kararlar

Oyun içi vardiya:

```text
08:00 - 17:00
```

Vardiya matematiği:

```text
540 GameTime dakikası
```

Gerçek oyuncu süresi:

```text
Yaklaşık 2-3 dakika
```

Vardiya başladığında oyuncunun temel line, sipariş ve kuyruk öncelik kararları kilitlenir. Simülasyon üretim emirlerini, line kapasitelerini, ara kuyrukları, tedarik durumunu, olay risklerini ve teslim tarihi riskini işler.

Frontend canlı simülasyon hissi verebilir. Ancak nihai üretim sonucu backend tarafında hesaplanmalı ve transaction mantığıyla kaydedilmelidir.

## Simülasyon Akışı

1. Gün başı planlama alınır.
2. Line atamaları doğrulanır.
3. Drag-drop kuyruk öncelikleri doğrulanır.
4. Üretim rotası ve kuyruk başlangıç değerleri hazırlanır.
5. Vardiya zamanı hızlandırılmış şekilde ilerletilir.
6. Üretim, bekleme ve kuyruk olayları hesaplanır.
7. Fasona giden veya fasondan dönen ara işler işlenir.
8. Personel, makine, kumaş ve aksesuar olayları işlenir.
9. Anlamlı olaylar oyuncuya bildirilir.
10. Gün sonu sonuçları kaydedilir.
11. Operasyon çıktıları ve kuyruklara aktarılan adetler ayrıştırılır.
12. Sevkiyata hazır ve sevk edilen adetler hesaplanır.
13. Günlük randıman ve departman randımanları hesaplanır.
14. Rapor oluşturulur.

## Ekran Yapısı

Sol bölüm:

```text
Aktif üretim emirleri
Kalan adet
Teslim riski
```

Orta bölüm:

```text
KESİM -> CUT_READY -> DİKİM -> SEWN_READY -> ÜTÜ -> IRON_READY -> PAKET -> SHIP_READY
```

Alt bölüm:

```text
Line 1: MDL-FW-1254 dikiliyor
Line 2: MDL-FW-1254 dikiliyor
Line 3: MDL-FW-7512 dikiliyor
Line 4: Boşta
```

Sağ bölüm:

```text
09:20 - Line 2 kesim kuyruğu bekliyor.
10:40 - Paketleme tarafında yığılma başladı.
12:15 - MDL-FW-1254 için 24 adet üretildi.
15:30 - Line 3 verimlilik düştü.
16:10 - Baskıdan dönen parçalar dikim kuyruğuna alındı.
```

## MVP Kapsamı

- Vardiya başlatma aksiyonu.
- 08:00-17:00 aralığının hızlandırılmış gösterimi.
- Üretim adetlerinin hesaplanması.
- Ara kuyrukların tüketilmesi ve dolması.
- Vardiya öncesi kuyruk önceliği.
- Vardiya öncesi planlama takvimi ve yoğunluk kontrolü.
- Line bekleme olayları.
- Fasona giden / dönen iş olayları.
- Personel eksikliği, makine arızası ve tedarik gecikmesi olayları.
- Anlamlı uyarı listesi.
- Gün sonu raporuna veri üretimi.
- Sevkiyata hazır adet, operasyon çıktısı ve kuyruk aktarım adetlerinin ayrıştırılması.
- Günlük fabrika randımanı ve departman bazlı randıman hesapları.

## İleride Genişletilecek Alanlar

- Daha zengin animasyonlar.
- Sektöre özel vardiya olayları.
- Geçici arıza veya kalite problemi.
- Simülasyon tekrar izleme.
- Karar etkisini gösteren mini grafikler.
- Fason firma gecikmeleri.
- Yedek makine ve bakım etkileri.
- Kumaş / aksesuar tedarik riskleri.

## Örnekler

Örnek vardiya uyarıları:

```text
09:20 - Line 2 kesim kuyruğu bekliyor.
10:40 - Paketleme tarafında yığılma başladı.
15:30 - Line 3 verimlilik düştü.
16:10 - Baskıdan dönen parçalar dikim kuyruğuna alındı.
```
