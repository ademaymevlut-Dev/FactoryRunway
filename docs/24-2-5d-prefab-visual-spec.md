# 2.5D Prefab Visual Spec

## Amaç

Bu doküman Factory Runway'de kullanılacak fabrika prefab görsellerinin standartlarını tanımlar.

Amaç, her departman ve line görselini tutarlı bir 2.5D / isometric açıyla üretmek, oyun haritasında aynı dünya hissini korumak ve durum bilgisini görsel dosyaya gömmek yerine UI katmanıyla yönetmektir.

## Temel Kararlar

- Prefab görseller 2.5D / isometric açıyla hazırlanır.
- Görseller mümkünse transparent arka planlı olur.
- Durum renkleri görselin içine işlenmez; CSS overlay ile verilir.
- Base prefab aynı kalır.
- Active / Busy / Risk / Maintenance gibi durumlar UI katmanı ile eklenir.
- Görsel üzerinde yazı, sayı, badge veya durum etiketi bulunmamalıdır.
- Her prefab aynı ışık yönü, kamera açısı ve zemin perspektifiyle üretilmelidir.

## Prefab Katman Mantığı

```text
Base prefab image
+ CSS glow
+ status badge
+ progress overlay
+ selected border
+ optional warning icon
```

Bu yaklaşım sayesinde tek görsel çok farklı durumlarda kullanılabilir.

Örnek:

```text
sewing-line-base.webp
```

UI durumları:

```text
Active: yeşil glow
Busy: amber glow
Risk: kırmızı glow
Maintenance: turuncu/gri overlay
Selected: mavi/cyan border
```

## Görsel Açı ve Stil

Standart:

```text
Angle: 2.5D / isometric
Camera: hafif üstten
Mood: dark industrial, premium game UI
Lighting: üstten yumuşak ışık + düşük neon vurgu
Background: transparent
Floor: mümkünse ayrı map zemini üzerinde kullanılacak şekilde sade
Text: yok
Logo: yok
Status color: yok
```

Line prefabları kendi içinde net okunmalıdır:

- Dikim line'ında masalar ve makineler anlaşılmalı.
- Kesim line'ında kesim masası ve kumaş parçaları görünmeli.
- Ütü/Paket line'ında masa, paket, ütü veya pres hissi olmalı.
- Sevkiyatta araç, rampa veya palet hissi olmalı.
- Ara işlemde baskı, nakış veya boya makinesi ayrışmalı.

## Boyut Standartları

Önerilen ana boyutlar:

```text
Small Line Prefab: 512x384
Standard Line Prefab: 768x512
Large Department Prefab: 1024x640
Detail Panel Image: 1024x768 veya 1024x1024
Minimap Marker: SVG veya CSS icon
```

Dosya formatı:

```text
Primary: webp
Alternative: avif
Fallback: png
```

Not:

`avif` daha küçük dosya verebilir, fakat üretim ve tarayıcı uyumluluğu sürecinde `webp` ana format olarak daha pratik olabilir.

## Şeffaflık ve Gölge

Prefab dosyası transparent arka planlı olmalıdır.

İki seçenek:

```text
1. Hafif base shadow görselin içinde olabilir.
2. Durum glow ve seçili border kesinlikle CSS ile verilir.
```

Base shadow, prefabın zemine oturmasını sağlar. Ancak risk/aktif/selected gibi gameplay sinyalleri görselin içine işlenmemelidir.

## Slot İçinde Yerleşim

Her prefab slot kutusuna oturmalıdır.

Önerilen anchor:

```text
Anchor: bottom-center
Fit: contain
Safe padding: %6 - %10
```

Prefab görselleri farklı boyutlarda olsa bile UI slot sistemi onları aynı mantıkla hizalamalıdır.

```text
LineSlot
- x
- y
- width
- height
- prefabAnchor
- prefabScale
```

## Durum Overlay Standartları

CSS ile eklenecek durumlar:

```text
Active:
- yeşil outer glow
- küçük yeşil durum noktası

Busy:
- amber glow
- progress bar
- kapasite etiketi

Risk:
- kırmızı glow
- uyarı ikonu
- seçiliyse daha parlak border

Maintenance:
- turuncu/gri glow
- wrench icon
- opacity veya scanline efekti

Empty:
- mavi kesikli slot sınırı
- artı ikonu

Locked:
- gri kesikli slot sınırı
- kilit ikonu
- düşük opacity
```

Önemli:

Oyuncu durumları sadece renkten değil ikon ve etiketlerden de anlayabilmelidir.

## Dosya İsimlendirme

Önerilen yapı:

```text
assets/prefabs/textile/sewing-line/basic/v01/base.webp
assets/prefabs/textile/cutting-line/basic/v01/base.webp
assets/prefabs/textile/printing-line/basic/v01/base.webp
assets/prefabs/textile/embroidery-line/basic/v01/base.webp
assets/prefabs/textile/ironing-packing-line/basic/v01/base.webp
assets/prefabs/textile/shipping-line/basic/v01/base.webp
```

Gelecekte sektör paketleri:

```text
assets/prefabs/chocolate/...
assets/prefabs/toy/...
assets/prefabs/furniture/...
assets/prefabs/electronics/...
```

## Prefab Metadata

Her görsel config ile bağlanmalıdır.

```text
PrefabConfig
- prefabKey
- sectorPack
- departmentType
- lineType
- assetPath
- width
- height
- anchor
- defaultScale
- supportsStatusOverlay
- detailImagePath
```

LineTypeConfig bu prefab'a referans verir:

```text
LineTypeConfig.visualPrefabKey = textile.sewing.basic.v01
```

## Görsel Üretim Prompt Notları

Görsel üretirken kullanılacak ana tarif:

```text
2.5D isometric factory production line module,
dark industrial textile factory,
transparent background,
no text, no logo, no UI,
consistent top-down camera,
premium game asset,
clean readable machinery,
soft overhead lighting,
subtle shadows,
web game prefab
```

Kaçınılacaklar:

- Görselin içine yazı eklemek.
- Badge, uyarı ikonu veya progress bar çizmek.
- Çok güçlü tek renkli neonla prefabı boyamak.
- Farklı açılardan üretilmiş görselleri aynı haritada kullanmak.
- Fotoğraf gibi gerçekçi ama oyun haritasına oturmayan görseller.

## MVP Asset Listesi

İlk beta için gerekli minimum prefablar:

```text
Textile:
- Kumaş Depo Slot
- Kesim Line
- Dikim Line
- Ütü/Paket Line
- Sevkiyat Line
- Baskı Line
- Nakış Line
- Boş Slot Placeholder
- Kilitli Slot Placeholder
```

Opsiyonel:

```text
- Kumaş Üretim Line
- Kalite Kontrol Line
- Boya / Yıkama Line
- Maintenance overlay icon
- Risk overlay icon
```

## Performans Notları

- Harita üzerinde çok sayıda prefab görüneceği için görseller optimize edilmelidir.
- Aynı prefab farklı slotlarda tekrar kullanılmalıdır.
- Büyük görseller lazy load edilebilir.
- Detail panel için daha yüksek çözünürlüklü görsel kullanılabilir.
- Minimap gerçek görselleri değil sade markerları kullanmalıdır.

## MVP Kapsamı

- 2.5D transparent webp prefab standardı.
- Textile line prefabları.
- CSS status overlay.
- Selected border.
- Progress overlay.
- Prefab metadata config.
- Sağ panel detail image desteği.

## İleride Genişletilecek Alanlar

- Idle / working animasyon varyantları.
- Küçük işçi sprite'ları.
- Line üstünde ürün akışı animasyonu.
- Mevsim / tema skinleri.
- Kozmetik prefab varyasyonları.
- Sektör paketlerine özel görsel diller.

## Örnek

```text
Prefab:
textile.sewing.basic.v01

Base:
assets/prefabs/textile/sewing-line/basic/v01/base.webp

Slot:
Dikim Zone / Slot 03

Runtime UI:
- status: Risk
- glow: red
- badge: Yoğun
- progress: %87
- selected: true
```
