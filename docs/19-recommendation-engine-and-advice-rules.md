# Tavsiye Motoru ve Yol Gösterici Kurallar

## Amaç

Bu doküman Factory Runway'de oyuncuya gösterilecek tavsiye mesajlarının hangi metriklerden üretileceğini, nasıl önceliklendirileceğini ve oyuncuyu daha iyi planlama / daha değerli üretim / doğru yatırım kararlarına nasıl yönlendireceğini tanımlar.

Tavsiye sistemi oyunun koç sistemi gibi çalışmalıdır. Oyuncuya tek tek her veriyi anlatmak yerine, önemli sinyalleri yakalayıp "bugün neyi değiştirmeliyim?" sorusuna cevap vermelidir.

## Temel Kararlar

- Tavsiyeler metrik bazlı üretilmelidir.
- Her tavsiye bir `messageKey` ile mesaj config sistemine bağlanmalıdır.
- Oyuncuya aynı anda çok fazla tavsiye gösterilmemelidir.
- Günde en fazla 2-3 ana tavsiye öne çıkarılmalıdır.
- Tavsiye motoru planlama ekranında, sipariş kabul ekranında, vardiya sonunda ve yatırım ekranında çalışabilir.
- Tavsiyeler kesin emir gibi değil, karar desteği gibi yazılmalıdır.
- Tavsiye sistemi oyun testlerinde genişletilecek; ilk aşamada ana metrik aileleri yeterlidir.

## Tavsiye Metrik Aileleri

Başlangıç metrik aileleri:

- Kuyruk yoğunluğu.
- Departman randımanı.
- Line boşta kalma süresi.
- Teslim tarihi riski.
- Finansal yatırım uygunluğu.
- Yaklaşan maaş / genel gider riski.
- Ürün stratejisi.
- Katma değerli ürün oranı.
- Fason kullanım sıklığı.
- Final aşama darboğazı.
- Reputation / sipariş adedi uyumu.

## Kuyruk ve Darboğaz Tavsiyeleri

Departman güvenliği bir sonraki aşamanın kaç günlük kapasitesini beslediğiyle değerlendirilmelidir.

Önerilen eşikler:

```text
0-1 gün: Kritik düşük, line boş kalabilir
1-2 gün: Düşük güvenlik
3-5 gün: İdeal
6-7 gün: İzle
7+ gün: Kapasite yatırımı öner
10+ gün: Acil darboğaz
```

Örnek:

```text
Ütü önünde 8 günlük iş birikti.
Ütü kapasitesini artırmak sevkiyata hazır ürün sayını yükseltebilir.
```

Yatırım tavsiyesi üretilmeden önce şu kontroller yapılmalıdır:

- Oyuncunun yeterli factory cash'i var mı?
- Yaklaşan maaş / genel gider sonrası güvenli nakit kalıyor mu?
- Fabrika level yeni hat veya makineye izin veriyor mu?
- Departman slotu uygun mu?
- Sonraki aşama bu yatırımı kaldırabilir mi?

## Finansal Yatırım Tavsiyeleri

Oyuncunun yatırım yapabilecek duruma geldiği sistem tarafından yakalanmalıdır.

Basit yatırım uygunluğu:

```text
yatırım yapılabilir nakit = mevcut cash - yaklaşan ödemeler - güvenli nakit rezervi
```

Örnek güvenli yatırım:

```text
Nakit durumun yeni paketleme hattı için uygun görünüyor.
Bu yatırım sevkiyata hazır ürün sayını artırabilir.
```

Örnek riskli yatırım:

```text
Yeni hat açmak için bütçen var, fakat 3 gün sonra maaş ödemesi bulunuyor.
Bu yatırımı sevkiyat gelirinden sonra yapmak daha güvenli olabilir.
```

## Ürün Stratejisi ve Katma Değer Takibi

Oyuncunun sadece kolay ve düşük karlı siparişlere mi yöneldiği, yoksa daha zor ve katma değerli üretimlere mi geçtiği takip edilmelidir.

Bu takip için ürün kartına `valueAddCategory` alanı eklenmelidir.

`ProductTier` ürünün pazar / kalite seviyesini anlatır:

```text
Basic
Premium
Luxury
```

`valueAddCategory` ürünün katma değer kaynağını anlatır:

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

Bu ürün hala Basic olabilir, fakat düz Basic üründen daha karlı ve daha planlama isteyen bir üründür.

Strateji tavsiyesi örneği:

```text
Son 10 siparişinin çoğu düz Basic ürünlerden oluşuyor.
Baskı makinesi yatırımı daha karlı siparişleri kabul etmeni sağlayabilir.
```

## Fason Kullanımından Yatırım Tavsiyesi

Oyuncu aynı katma değer operasyonunu sık sık fasona gönderiyorsa, sistem iç yatırım tavsiyesi üretmelidir.

Örnek tetik:

```text
Son 15 günde baskı operasyonu 4 veya daha fazla kez fasona gönderildi.
Fason baskı maliyeti toplamı, baskı makinesi yatırımının anlamlı bir kısmına ulaştı.
```

Örnek mesaj:

```text
Baskı işlerini sık sık dışarı gönderiyorsun.
Baskı makinesi yatırımı teslim süresini kısaltabilir ve birim karı artırabilir.
```

## Final Aşama Darboğazı

Ütü ve paketleme kuyrukları özel önem taşır. Çünkü bu aşamalardaki yığılma, ürünlerin sevkiyata hazır hale gelmesini ve ödeme alınmasını geciktirir.

Örnek:

```text
Paketleme önünde 7 günlük ürün birikti.
Bu ürünler sevkiyata hazır hale gelemediği için ödeme alamıyorsun.
Paketleme kapasitesini artırmak nakit akışını hızlandırabilir.
```

## XP ve Level Puanlaması ile Bağlantı

Oyuncu level yükseltirken sadece ürettiği adede göre puan kazanmamalıdır. Aksi halde en kolay ürünleri yüksek adetle üretmek en doğru stratejiye dönüşür.

XP / progression puanı şu faktörlerle ağırlıklandırılmalıdır:

- Ürün katmanı.
- `valueAddCategory`.
- Üretim zorluğu.
- Operasyon sayısı.
- Fason / iç operasyon yönetimi.
- Teslim başarısı.
- Erken teslim.
- Ara fırsat siparişi tamamlama.
- Yeni ürün veya yeni operasyon deneme.
- Darboğaz çözme.
- Stratejik yatırım yapma.

Örnek ürün puan katsayıları:

```text
Basic plain: 1.0x
Basic printed / embroidered: 1.3x - 1.5x
Premium standard: 2.0x
Premium certified: 2.3x
Luxury detail: 3.0x+
```

Basit formül taslağı:

```text
progressionPoints =
completedQuantity
* productDifficultyScore
* tierMultiplier
* valueAddMultiplier
* deliveryPerformanceMultiplier
```

Denge notu:

- Puan sistemi adet spam'ini ödüllendirmemelidir.
- Düşük zorluklu ürünlerde yüksek adet üretimi factory cash sağlar, fakat player level için sınırlı puan vermelidir.
- Katma değerli ve zor ürünler daha az adetle bile daha yüksek progression puanı vermelidir.
- Günlük veya sipariş bazlı diminishing return kullanılabilir.

## Yatırımdan Puan Kazanma

Oyuncu sadece üretimden değil, doğru yatırım kararlarından da progression puanı kazanmalıdır.

Yatırım puanı kaynakları:

- Yeni line açma.
- Darboğazı çözen kapasite yatırımı.
- Yeni capability unlock.
- Fason bağımlılığını azaltan makine yatırımı.
- Kalite sistemi yatırımı.
- Premium / Luxury üretime hazırlık.
- Final aşama kapasitesini artırma.

Örnek:

```text
Paketleme darboğazı 3 gün üst üste raporlandı.
Oyuncu paketleme kapasite upgrade'i aldı.
Sonraki 2 vardiyada sevkiyata hazır adet arttı.
Bu yatırım başarılı yatırım puanı üretir.
```

## Tavsiye Önceliklendirme

Tavsiyeler skorlanmalıdır.

Önerilen önem sırası:

```text
critical: üretim duruyor / teslim kaçacak / nakit ödeme riski
high: büyük darboğaz / 7+ gün kuyruk / final aşama tıkanıklığı
medium: yatırım fırsatı / finansal olarak uygun büyüme
low: stratejik gelişim / ürün portföyü çeşitlendirme
```

Filtreleme:

- Aynı tavsiye her gün tekrar etmemelidir.
- Çözülemeyen kritik tavsiye tekrar gösterilebilir.
- Tavsiyeler oyuncunun mevcut bütçesine ve level durumuna göre süzülmelidir.
- Günde en fazla 2-3 ana tavsiye öne çıkarılmalıdır.

## Recommendation Rule Alanları

Bir tavsiye kuralı şu alanları taşıyabilir:

- `recommendationKey`
- `group`
- `severity`
- `triggerMetric`
- `threshold`
- `priorityScore`
- `cooldownDays`
- `requiredFactoryLevel`
- `requiredCapability`
- `targetEntityType`
- `targetEntityId`
- `messageKey`
- `suggestedAction`
- `reasonMetrics`

Örnek:

```text
recommendationKey: investment.ironing.capacity_needed
group: bottleneck
severity: high
triggerMetric: IRON_READY queue days
threshold: >= 7
priorityScore: 85
cooldownDays: 2
targetEntityType: Department
targetEntityId: ironing
messageKey: recommendation.investment.ironing.capacity_needed
suggestedAction: increase_ironing_capacity
reasonMetrics:
  - queueDays
  - readyToShipDelay
  - estimatedCashDelay
```

## MVP Kapsamı

- Kuyruk 7+ gün olunca yatırım tavsiyesi.
- Kuyruk 10+ gün olunca acil darboğaz tavsiyesi.
- Finansal olarak güvenli yatırım yapılabilecekse büyüme tavsiyesi.
- Yaklaşan maaş / genel gider riski varsa yatırım uyarısı.
- Ürünlerde `valueAddCategory` alanı.
- Son siparişlerde `plain Basic` yoğunluğu yüksekse katma değerli üretim tavsiyesi.
- Sık fason kullanılan operasyon için iç yatırım tavsiyesi.
- Ütü / paket final aşama darboğazı için nakit akışı tavsiyesi.
- XP puanını ürün zorluğu ve katma değer kategorisine göre ağırlıklandırma.

## İleride Genişletilecek Alanlar

- Oyuncu strateji profili.
- Daha gelişmiş tavsiye skorlama.
- Kişiselleştirilmiş tavsiye dili.
- Tavsiyenin gerçekleşen etkisini ölçme.
- Tavsiyeyi izleyen yatırımın başarılı olup olmadığını değerlendirme.
- Sektöre özel value add kategorileri.
- Admin tavsiye kural editörü.

## Örnekler

Kuyruk tavsiyesi:

```text
Ütü önünde 8 günlük iş birikti.
Ütü kapasitesini artırmak sevkiyata hazır ürün sayını yükseltebilir.
```

Finansal yatırım tavsiyesi:

```text
Nakit durumun yeni paketleme hattı için uygun.
Bu yatırım ödeme almanı hızlandırabilir.
```

Katma değer tavsiyesi:

```text
Son siparişlerin çoğu düz Basic ürünlerden oluşuyor.
Baskılı ürünlere geçmek için baskı yatırımı iyi bir sonraki adım olabilir.
```

XP mesajı:

```text
Cameo siparişini zamanında tamamladın.
Baskılı ürün üretimi sayesinde ekstra tecrübe kazandın.
```

