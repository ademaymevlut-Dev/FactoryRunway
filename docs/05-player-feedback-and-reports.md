# Oyuncu Geri Bildirimi ve Raporlar

## Amaç

Bu doküman oyuncuya gösterilecek uyarı, tavsiye ve vardiya sonu raporu dilini tanımlar.

## Temel Kararlar

Oyuncu dili sade, anlaşılır ve oyun hissi veren bir dil olmalıdır. Ağır ERP terimleri kullanılmamalıdır.

Mesajlar kod içine dağılmamalı; `message key`, tetik kuralı ve localization sistemiyle yönetilmelidir.

İlk aşamada tüm mesaj metinleri tamamlanmayacaktır. Test günleri ilerledikçe gerçek oynanış sonuçlarına göre yeni mesaj ihtiyaçları yakalanmalı ve mesaj kütüphanesi genişletilmelidir.

Mesajlar oyuncuya veri yığını değil, karar nedeni sunmalıdır:

- Ne oldu?
- Neden oldu?
- Yarın neyi değiştirmeliyim?
- Daha karlı ürünlere geçmek için hangi koşul eksik?
- Fason yerine hangi operasyonu fabrikaya almak mantıklı?
- Planımdaki boşluğu karlı bir ara fırsatla değerlendirebilir miyim?
- Bu sevkiyat güvenilirliğimi nasıl etkiledi?

Vardiya boyunca yalnızca anlamlı uyarılar gösterilmelidir. Her küçük üretim olayı bildirim olmamalıdır.

Başlangıç mesaj grupları:

```text
planning
queue
order_risk
shift_event
machine
staff
material
accessory
subcontract
investment
reputation
opportunity
report
tutorial
system
```

## Vardiya İçi Mesajlar

Örnekler:

```text
Line 4 yakında boşta kalacak.
Bu ürün teslim tarihine yetişmeyecek.
Kesim kuyruğu yetersiz olduğu için Line 2 bekliyor.
Bu ürüne 1 line daha atarsan teslim tarihi kurtulur.
Bugünün ana darboğazı: Kesim.
Dikim kapasiten güçlü ama kesim hattı yetersiz kaldı.
Paketleme yavaş olduğu için ürünler sevkiyata hazır hale gelemedi.
Bu Premium sipariş kalite kontrol kapasitesi istiyor.
ISO 9000 sertifikası olmadan bu siparişi kabul edemezsin.
Luxury sipariş karlı, fakat mevcut tesisin bu üretim için yavaş kalacak.
Bu siparişte baskı işlemi var. Fabrikanda baskı makinesi olmadığı için iş fasona gönderilecek.
Baskı 4 gün sürecek; dikim line'larını buna göre planla.
Ara fırsat: Yarınki boş dikim kapasiten 180 adet Cameo için uygun görünüyor.
Sevkiyat tamamlandı. Ödeme factory cash hesabına geçti.
Bu müşteriye zamanında teslim yaptın; güvenilirliğin arttı.
```

## Vardiya Sonu Raporu

Rapor oyunun en önemli ekranlarından biridir. Rapor oyuncuya hem sonucu hem de sonraki kararı göstermelidir.

Rapor bölümleri:

1. Günlük özet.
2. Sipariş bazlı durum.
3. Darboğaz analizi.
4. Operasyon çıktısı ve kuyruk aktarımı.
5. Randıman özeti.
6. Tavsiye.
7. Ödül, ödeme ve gelişim.

## MVP Kapsamı

- Toplam üretilen adet.
- Sevkiyata hazır ürün.
- Bugün sevk edilen ürün.
- Operasyon bazlı tamamlanan adet.
- Kuyruklara aktarılan adet.
- Günlük fabrika randımanı.
- Departman bazlı randıman.
- Risk artan sipariş sayısı.
- Boşta kalan toplam line süresi.
- Sipariş bazlı bugün üretilen ve kalan adet.
- Ana darboğaz.
- Basit tavsiye.
- XP ve factory cash ödülü.
- Sevkiyat sonrası alınan ödeme.
- Ayın 1'inde maaş ödemesi mesajı.
- Ayın 10'unda genel gider ödemesi mesajı.
- Yaklaşan finansal ödeme uyarıları.
- Güvenilirlik / bilinirlik değişimi.
- Ürün katmanına göre sade risk / kilit mesajları.
- Fason maliyeti ve fason kaynaklı bekleme uyarıları.
- Ara fırsat siparişleri için plan uyumu mesajları.
- Message key ve Türkçe localization yapısı.

## İleride Genişletilecek Alanlar

- Daha akıllı tavsiye motoru.
- Önceki günlerle karşılaştırma.
- Grafikler.
- Sektöre özel rapor dili.
- Premium ve Luxury ürünler için sertifika ve kalite güvence tavsiyeleri.
- Fason kullanım geçmişinden yatırım tavsiyesi.
- Boş kapasiteye göre ara fırsat önerileri.
- Güvenilirlik artışına göre daha büyük sipariş önerileri.
- Oyuncu stratejisine göre kişiselleştirilmiş öneriler.
- Çoklu dil mesaj kütüphanesi.
- Admin mesaj editörü.

## Örnekler

Günlük özet:

```text
Bugün üretilen toplam adet: 86
Sevkiyata hazır ürün: 52
Bugün sevk edilen ürün: 48
Fabrika randımanı: %78
Gecikme riski artan sipariş: 1
Boşta kalan toplam line süresi: 74 dakika
```

Kuyruk aktarım özeti:

```text
Kesim tamamlandı: 320 adet -> CUT_READY
Dikim tamamlandı: 210 adet -> SEWN_READY
Ütü tamamlandı: 180 adet -> IRON_READY
Paket tamamlandı: 150 adet -> SHIP_READY
```

Sipariş bazlı durum:

```text
MDL-FW-1254
Bugün üretilen: 62
Kalan: 438
Teslim riski: Riskli

MDL-FW-7512
Bugün üretilen: 24
Kalan: 126
Teslim riski: Güvenli
```

Darboğaz analizi:

```text
Bugünün ana darboğazı: Kesim.
Dikim line'ları toplam 74 dakika kesim kuyruğu bekledi.
Kesim kapasitesini artırmak yarınki üretimi yaklaşık %12 yükseltebilir.
```

Tavsiye:

```text
MDL-FW-1254 için yarın en az 3 line ayırman önerilir.
Kesim hazırlığını artırmadan yeni sewing line açmak verimsiz olur.
```

Fason tavsiyesi:

```text
Son siparişlerde baskı işlemi için sık sık fason kullandın.
Baskı makinesi yatırımı teslim süresini kısaltabilir ve birim karı artırabilir.
```

Ara fırsat tavsiyesi:

```text
Bugünkü planın yarın için 3 saatlik dikim boşluğu bıraktı.
Küçük ve karlı bir ara sipariş alarak bu boşluğu değerlendirebilirsin.
```

İlk rapor örneği:

```text
Bugün 42 ürün tamamlandı.
Teslimat hala riskli.
Yarın 2 line çalışırsa sipariş yetişebilir.
+120 XP
+1.500 Factory Cash
Yeni özellik açıldı: Paketleme İyileştirme
```

Güvenilirlik örneği:

```text
Urban Loop siparişini zamanında sevk ettin.
Ödeme alındı: +18.400 Factory Cash
Güvenilirlik arttı.
Bu müşteri artık daha büyük adetli siparişler önerebilir.
```

Finansal takvim örneği:

```text
3 gün sonra maaş ödemesi var.
Tahmini ödeme: 12.600 Factory Cash.
Mevcut nakit bu ödeme için yeterli.
```
