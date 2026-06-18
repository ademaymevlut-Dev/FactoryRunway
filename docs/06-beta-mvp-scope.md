# Beta MVP Kapsamı

## Amaç

Bu doküman ilk beta sürümün sınırlarını netleştirir. Hedef, temel oyun döngüsünü hızlı ve anlaşılır şekilde oynanabilir hale getirmektir.

## Temel Kararlar

İlk beta yalnızca Textile Pack üzerine kurulacaktır. Sistem ileride genişlemeye uygun tasarlanır, fakat beta içinde başka sektör oynanabilir olmak zorunda değildir.

Ürün katmanı açısından ilk beta Basic ürünlerle başlamalıdır. Premium ve Luxury ürünler daha sonra açılacak gelişim hedefleri olarak tasarlanmalı, fakat veri ve tasarım kararları şimdiden core sisteme uygun düşünülmelidir.

Fabrika gelişimi açısından ilk beta, atölyeden entegre tesise büyüme fikrini hissettirmelidir. Bunun için en az bir basit fason ara işlem tasarlanabilir.

MVP'nin ana hedefi:

```text
Oyuncu siparişleri görür, line atar, vardiyayı başlatır, sonucu izler, rapor alır ve ertesi gün daha iyi karar verir.
```

## MVP İçinde Olmalı

- Fabrika başlangıcı.
- İlk tekstil üretim emirleri.
- Line sistemi.
- Cutting -> Sewing -> Ironing -> Packing -> Shipping akışı.
- Ara kuyruklar.
- Vardiya başlatma.
- Hızlandırılmış simülasyon.
- Vardiya sonu raporu.
- Basit vardiya randıman raporu.
- Basit level / XP / factory cash sistemi.
- Ayın 1'inde sade maaş ödeme olayı.
- Ayın 10'unda sade genel gider ödeme olayı.
- Yeni line açma.
- Darboğaz uyarıları.
- Teslim tarihi riski.
- Basic ürün grubu.
- Basit fason ara işlem.
- Basit factory level.
- Yeni line açma için temel yatırım sistemi.
- En az bir kapasite upgrade'i.

## MVP İçinde Şimdilik Olmamalı

- Çok detaylı personel moral sistemi.
- Maaş bordrosu ve detaylı personel maliyet yönetimi.
- Elektrik / su / bakım mikro yönetimi.
- Çok karmaşık stok maliyeti.
- 15 farklı makine tipi.
- Ağır ERP terminolojisi.
- Agresif oyun içi para harcatma sistemi.
- Reklam izlemeyi zorunlu kılan ilerleme sistemi.
- Tam detaylı sertifika edinme sistemi.
- Premium / Luxury ürünlerin tüm kalite güvence derinliği.
- Çok detaylı fason sözleşme ve tedarikçi pazarlığı.
- Kumaş üretimini tam oynanabilir sistem haline getirme.

## İlk 10 Dakika Deneyimi

1. Oyuncu küçük bir tekstil atölyesi ile başlar.
2. İlk üretim emrini alır.
3. 2 sewing line ile başlar.
4. Line'lara sipariş ataması yapar.
5. Vardiyayı başlatır.
6. 2-3 dakikalık simülasyonu izler.
7. Vardiya sonu raporunu görür.
8. Küçük ödül ve gelişim hissi alır.
9. Sonraki gün için yeni karar verir.

## İleride Genişletilecek Alanlar

- Yeni sektör paketleri.
- Gelişmiş ekonomi.
- Sipariş marketi.
- Daha çok upgrade.
- Fabrika level, departman level ve capability unlock sistemleri.
- Kalite sistemi.
- Premium ve Luxury ürün grupları.
- BSCI / ISO 9000 gibi sertifika gereksinimleri.
- Baskı, nakış, boya ve yıkama kabiliyetlerini fabrika içine alma.
- Kumaş üretimi ile tam entegre tesis seviyesi.
- Personel yönetimi.
- Kozmetik tema veya dengeli stratejik varyasyonlar.

## Örnekler

İlk sipariş:

```text
Product Code: MDL-TSHIRT-001
Tier: Basic
Order Quantity: 120
Due Date: 3 gün
```

İlk ödül:

```text
+120 XP
+1.500 Factory Cash
Yeni özellik açıldı: Paketleme İyileştirme
```
