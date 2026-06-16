# Vardiya Sonu Raporu ve Finansal Takvim

## Amaç

Bu doküman vardiya tamamlandığında oyuncuya gösterilecek üretim raporlarını, günlük randıman hesaplarını, kuyruklara aktarılan adetleri ve aylık finansal takvim olaylarını tanımlar.

Hedef ağır muhasebe sistemi kurmak değildir. Finansal olaylar oyuncuya planlama baskısı yaratmalı, fakat oyunu maaş bordrosu veya gider mikro yönetimine çevirmemelidir.

## Temel Kararlar

- Vardiya sonu raporu her gün oyuncunun ana karar ekranlarından biri olmalıdır.
- Rapor sadece sonuç göstermemeli; ertesi gün için karar nedeni üretmelidir.
- `Tamamlanan adet` ifadesi final ürün anlamına gelmez. Her operasyon kendi çıktısını üretir.
- Sevkiyata hazır ürünler ayrı takip edilmelidir.
- Günlük randıman tek yüzdeyle gösterilebilir, ancak departman kırılımı da bulunmalıdır.
- Maaş, kira, elektrik ve genel giderler takvim bazlı sade finans olayları olarak çalışmalıdır.
- Sevkiyat sonrası ödeme hemen alınır; müşteri tahsilat riski oyuncuya yüklenmez.
- Finansal takvim oyuncuya birkaç gün önceden uyarı üretmelidir.

## Vardiya Sonu Üretim Raporu

Her vardiya sonunda ana rapor şu bilgileri taşımalıdır:

- Bugünkü toplam operasyon çıktısı.
- Sevkiyata hazır adet.
- Bugün sevk edilen adet.
- Sipariş bazlı tamamlanan / kalan adet.
- Departman bazlı çıktı.
- Kuyruğa aktarılan adet.
- Günlük fabrika randımanı.
- Departman bazlı randıman.
- Boşta kalan line süresi.
- Ana darboğaz.
- Teslim riski değişimi.
- Bugünkü önemli olaylar.
- Ertesi gün önerisi.

Örnek:

```text
Bugün 740 adet operasyon çıktısı oluştu.
Sevkiyata hazır ürün: 150 adet.
Bugün sevk edilen ürün: 120 adet.
Günlük fabrika randımanı: %78.
Ana darboğaz: Ütü.
```

## Operasyon Çıktısı ve Kuyruklara Aktarım

Tekstil akışında her departmanın çıktısı bir sonraki aşamanın kuyruğuna aktarılır.

Örnek:

```text
Kesim tamamlandı: 320 adet -> CUT_READY
Dikim tamamlandı: 210 adet -> SEWN_READY
Ütü tamamlandı: 180 adet -> IRON_READY
Paket tamamlandı: 150 adet -> SHIP_READY
Sevkiyata hazır: 150 adet
Bugün sevk edilen: 120 adet
```

Bu ayrım oyuncuya hattın nerede aktığını ve nerede biriktiğini net gösterir.

Yanlış kullanım:

```text
Bugün 320 ürün tamamlandı.
```

Doğru kullanım:

```text
Bugün kesimden 320 adet çıktı ve dikim kuyruğuna aktarıldı.
Bugün sevkiyata hazır hale gelen ürün: 150 adet.
```

## Randıman Hesaplama Mantığı

Günlük fabrika randımanı sade bir üst gösterge olmalıdır.

Temel mantık:

```text
Günlük randıman % = gerçekleşen operasyon çıktısı / planlanan teorik kapasite
```

Departman bazlı randıman ayrıca gösterilmelidir:

```text
Kesim randımanı: %91
Dikim randımanı: %74
Ütü randımanı: %68
Paket randımanı: %82
```

Randıman düşüş nedenleri ayrıca sınıflandırılmalıdır:

- Kuyruk yetersizliği.
- Personel eksikliği.
- Makine arızası.
- Kumaş gecikmesi.
- Aksesuar eksikliği.
- Fason dönüş gecikmesi.
- Bir sonraki departmanda yığılma.

Örnek mesaj:

```text
Bugünkü fabrika randımanın %78.
Düşüşün ana nedeni: Ütü kapasitesi.
Dikim iyi çalıştı, fakat ürünler ütüden yeterince hızlı geçemedi.
```

## Sipariş Bazlı Durum

Rapor her aktif sipariş için sade durum göstermelidir.

Alanlar:

- Sipariş kodu.
- Ürün adı / ürün kodu.
- Bugün sevkiyata hazır hale gelen adet.
- Bugün operasyonlardan geçen adet.
- Kalan adet.
- Teslim tarihine kalan gün.
- Teslim riski.
- Risk değişimi.

Örnek:

```text
FW.BSH.21 - Cameo
Bugün sevkiyata hazır: 90
Bugün dikimden çıkan: 130
Kalan: 1.420
Teslime kalan: 4 gün
Risk: Orta -> Riskli
```

## Finansal Takvim Olayları

Finansal takvim sade ve okunabilir tutulmalıdır.

Başlangıç önerisi:

```text
Her ayın 1'i: Maaş ödemesi
Her ayın 10'u: Genel gider ödemesi
```

Genel gider kapsamı:

- Kira.
- Elektrik.
- Genel bakım.
- Atölye / fabrika sabit giderleri.

Oyuncuya ilk aşamada detaylı fatura tablosu gösterilmez. Toplam ödeme ve nakit etkisi gösterilir.

Örnek:

```text
Maaş ödemesi tamamlandı: -12.600 Factory Cash
Genel giderler ödendi: -8.400 Factory Cash
```

## Yaklaşan Ödeme Uyarıları

Finansal olaylar gerçekleşmeden önce uyarı üretmelidir.

Önerilen uyarı zamanları:

```text
3 gün kala
1 gün kala
ödeme günü
```

Örnek güvenli durum:

```text
3 gün sonra maaş ödemesi var.
Tahmini ödeme: 12.600 Factory Cash.
Mevcut nakit bu ödeme için yeterli.
```

Örnek riskli durum:

```text
Yaklaşan maaş ödemesi için nakit riskli.
Bugün sevkiyata hazır ürünleri tamamlamak finansal rahatlama sağlayabilir.
```

## Config Alanları

Finansal takvim olayları config veya database üzerinden yönetilebilir olmalıdır.

Önerilen alanlar:

- `eventKey`
- `eventType`
- `dayOfMonth`
- `amountFormula`
- `warningDaysBefore`
- `severityRule`
- `messageKey`
- `isRecurring`
- `enabledFromFactoryLevel`

Örnek:

```text
eventKey: payroll.monthly
eventType: payroll
dayOfMonth: 1
amountFormula: activeStaffCount * salaryPerStaff
warningDaysBefore: 3, 1
messageKey: finance.payroll.upcoming
isRecurring: true
enabledFromFactoryLevel: 1
```

## MVP Kapsamı

- Vardiya sonu üretim özeti.
- Departman bazlı çıktı adetleri.
- Kuyruğa aktarılan adetler.
- Sevkiyata hazır adet.
- Bugün sevk edilen adet.
- Günlük fabrika randımanı.
- Departman bazlı randıman.
- Basit darboğaz nedeni.
- Sipariş bazlı teslim riski değişimi.
- Ayın 1'inde maaş ödemesi.
- Ayın 10'unda genel gider ödemesi.
- Yaklaşan ödeme uyarıları.
- Ödeme sonrası factory cash düşüşü.

## İleride Genişletilecek Alanlar

- Haftalık / aylık üretim trendleri.
- Planlanan ve gerçekleşen maliyet karşılaştırması.
- Ürün başı gerçek maliyet hesaplama.
- Departman bazlı maliyet kırılımı.
- Bakım bütçesi.
- Enerji verimliliği yatırımları.
- Vardiya geçmişi karşılaştırmaları.
- Daha gelişmiş finansal uyarı ve nakit akışı projeksiyonu.

## Örnekler

Vardiya sonu özet:

```text
Bugün sevkiyata hazır hale gelen ürün: 150 adet.
Bugün sevk edilen ürün: 120 adet.
Fabrika randımanı: %78.
Ana darboğaz: Ütü.
```

Kuyruk aktarım özeti:

```text
Kesimden çıkan 320 adet CUT_READY kuyruğuna aktarıldı.
Dikimden çıkan 210 adet SEWN_READY kuyruğuna aktarıldı.
Ütüden çıkan 180 adet IRON_READY kuyruğuna aktarıldı.
Paketlemeden çıkan 150 adet SHIP_READY kuyruğuna aktarıldı.
```

Finansal takvim mesajı:

```text
Yarın genel gider ödemesi var.
Tahmini ödeme: 8.400 Factory Cash.
Bugünkü sevkiyatları tamamlarsan nakit durumun güvenli kalır.
```

