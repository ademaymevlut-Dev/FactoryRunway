# Sektör Paketi Genişleme Notları

## Amaç

Bu doküman Factory Runway'in Textile Pack sonrasında farklı sektör paketlerine nasıl genişleyebileceğini tanımlar.

## Temel Kararlar

Core sistem sektör bağımsız kalmalıdır. Sektörler core sistemi değiştirmeden üretim rotası, ürünler, kuyruklar, makineler, upgrade'ler ve oyuncu dili üzerinden farklılaşmalıdır.

`Basic`, `Premium` ve `Luxury` ürün katmanları core sistemin ortak parçasıdır. Her sektör bu üç katmanı kendi üretim diliyle uygular.

Core sistemde ortak olan yapılar:

- Fabrika.
- Üretim emri.
- Departman / istasyon / line.
- Ara kuyruk.
- Hammadde.
- Ürün.
- Ürün katmanı.
- İşlem süresi.
- Kapasite.
- Personel / makine gereksinimi.
- Teslim tarihi.
- Öncelik.
- Vardiya simülasyonu.
- Rapor.
- Upgrade.
- Sertifika / kalite gereksinimi.
- Player / factory / department progression.
- Boost ve yatırım sistemi.

Sektöre özel olan yapılar:

- Üretim adımları.
- Ara kuyruk isimleri.
- Ürün tipleri.
- Ürün katmanlarının sektör içindeki karşılıkları.
- İşlem süreleri.
- Makine ve personel gereksinimleri.
- Darboğaz mesajları.
- Görsel tema.
- Sektöre özel kurallar.

## Potansiyel Sektör Rotaları

Textile:

```text
Kumaş Depo -> Kesim -> Baskı/Nakış -> Dikim -> Boya/Yıkama -> Ütü/Paket -> Sevkiyat
```

Textile ileri seviye:

```text
Kumaş Üretim -> Kumaş Depo -> Kesim -> Baskı/Nakış -> Dikim -> Boya/Yıkama -> Ütü/Paket -> Sevkiyat
```

Chocolate:

```text
Karışım -> Pişirme -> Kalıp -> Soğutma -> Paket
```

Toy:

```text
Parça üretimi -> Boyama -> Montaj -> Kalite kontrol -> Paket
```

Furniture:

```text
Kesim -> Zımpara -> Montaj -> Cila -> Paket
```

Electronics:

```text
PCB -> Montaj -> Test -> Kalibrasyon -> Paket
```

## Ortak Ürün Katmanları

Her sektör ürünlerini aynı üç ana kalite/karlılık grubunda sunabilir:

- Basic: Hızlı, ucuz, başlangıç dostu.
- Premium: Daha karlı, kalite kontrol ve sertifika isteyen.
- Luxury: En karlı, en uzun üretim süreli, gelişmiş tesis ve yüksek kalite güvence isteyen.

Sektör örnekleri:

```text
Textile Basic: Basic T-Shirt
Textile Premium: Premium Hoodie
Textile Luxury: Luxury Coat

Chocolate Basic: Basic Bar
Chocolate Premium: Artisan Box
Chocolate Luxury: Limited Gift Collection

Furniture Basic: Simple Chair
Furniture Premium: Upholstered Armchair
Furniture Luxury: Handmade Designer Sofa
```

## MVP Kapsamı

Beta içinde yalnızca Textile Pack oynanabilir olmalıdır. Ancak veri modeli ve simülasyon kavramları ileride farklı sektör rotalarını taşıyacak şekilde isimlendirilmelidir.

Örneğin core sistem "sewing" kavramına bağımlı olmamalı; bunun yerine genel olarak `workstation`, `route step`, `buffer` ve `line` kavramlarını kullanmalıdır.

## İleride Genişletilecek Alanlar

- Sektör registry yapısı.
- Sektör bazlı config dosyaları.
- Ürün config'leri.
- Ürün katmanı config'leri.
- Route config'leri.
- Machine config'leri.
- Upgrade config'leri.
- Balancing config'leri.
- UI label config'leri.
- Sektöre özel rule modülleri.
- Sertifika ve kalite güvence modülleri.

## Monetization Notu

Agresif pay-to-win modeli tercih edilmez.

Önerilen paket yapısı:

```text
Factory Runway Starter -> Ücretsiz / Demo
Textile Full Pack -> 9.99 veya 10 USD
Chocolate Pack -> Ayrı ücretli expansion
Toy Factory Pack -> Ayrı ücretli expansion
Furniture Pack -> Ayrı ücretli expansion
```

Özel makineler ileride eklenebilir, fakat pay-to-win hissi vermemelidir. Bunlar kozmetik, tema veya dengeli stratejik varyasyon olarak düşünülmelidir.

Reklam veya oyun içi ödeme seçenekleri ileride eklenirse zorunlu ilerleme duvarı olarak kullanılmamalıdır. Geçici kolaylık, kozmetik, rapor görünümü veya sınırlı boost olarak kalmalıdır.

## Örnekler

Sektör bağımsız düşünme örneği:

```text
Yanlış: SewingLine sadece tekstil için hard-coded olsun.
Doğru: Line bir route step çalıştırır; Textile Pack bu step'i "Dikim" olarak adlandırır.
```

Ürün katmanı örneği:

```text
Yanlış: Premium sadece tekstile özel bir ürün tipi olsun.
Doğru: Premium core ürün katmanıdır; her sektör kendi Premium gereksinimlerini tanımlar.
```
