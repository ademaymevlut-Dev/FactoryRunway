# Proje Vizyonu

## Amaç

Factory Runway, oyuncunun küçük bir üretim atölyesini daha verimli bir fabrikaya dönüştürdüğü web öncelikli bir fabrika yönetimi / üretim simülasyonu oyunudur.

İlk beta tekstil üretimine odaklanır. Ancak temel sistem, ileride farklı sektör paketlerinin eklenmesine izin verecek şekilde kurulmalıdır.

## Temel Kararlar

- İlk sektör paketi: `Textile Pack`.
- Core sistem sektörlerden bağımsız kalır.
- Sektörler üretim rotası, ürün, kapasite, makine, balans ve görsel sunum farklarını config / module / data yapılarıyla tanımlar.
- Ürünler tüm sektörlerde ortak bir kalite/karlılık katmanı taşır: `Basic`, `Premium`, `Luxury`.
- Oyun realtime idle değildir; oyuncu gün başlamadan plan yapar ve vardiya sonucunu izler.
- Ana deneyim hızlı, anlaşılır ve karar odaklı olmalıdır.
- Oyuncu karmaşık ERP ekranlarıyla değil, sade fabrika kararlarıyla uğraşmalıdır.
- Oyuncu küçük bir atölyeden tam entegre bir üretim tesisine büyüme yolculuğu yaşamalıdır.
- Büyüme sadece daha fazla line açmak değil, yeni üretim kabiliyetlerini fabrikaya dahil etmek anlamına gelmelidir.

## Oyun Vaadi

Oyuncu her gün şu sorulara cevap verir:

- Hangi sipariş daha acil?
- Hangi line hangi ürünü çalışmalı?
- Bugünkü darboğaz nerede oluşacak?
- Yarın kapasiteyi hangi noktadan geliştirmeliyim?
- Daha karlı ürünlere geçmek için hangi kalite, sertifika veya tesis yatırımına ihtiyacım var?
- Bu işi fasonla mı çözmeliyim, yoksa bu operasyonu artık kendi fabrikama mı almalıyım?

Temel cümle:

```text
Bugün hangi siparişi kurtaracağım, hangi line'ı nereye vereceğim ve yarın hangi darboğazı çözeceğim?
```

## MVP Kapsamı

İlk beta için vizyon dar tutulur:

- Küçük tekstil atölyesiyle başlama.
- İlk üretim emirlerini kabul etme.
- Line atama ve vardiya başlatma.
- Hızlandırılmış üretim simülasyonu.
- Gün sonu raporu ve gelişim hissi.
- Basit level, XP ve factory cash ödülleri.
- Basic ürünler üzerinden sade başlangıç deneyimi.
- İlk fason işlem deneyimi için basit bir ara operasyon.

## İleride Genişletilecek Alanlar

- Chocolate Factory Pack.
- Toy Factory Pack.
- Furniture Pack.
- Electronics Pack.
- Sektörlere özel üretim sorunları, makineler ve stratejik kararlar.
- Premium ve Luxury ürünlerle daha yüksek karlılık, daha uzun rota, kalite kontrol ve sertifika hedefleri.
- Baskı, nakış, boya, yıkama ve kumaş üretimi gibi yeni tesis kabiliyetleri.
- Dengeli expansion / pack bazlı monetization.

## Örnekler

İlk beta başlangıç siparişi:

```text
Product Code: MDL-TSHIRT-001
Tier: Basic
Order Quantity: 120
Due Date: 3 gün
```

İlerleme örneği:

```text
Basic ürünler hızlı nakit akışı sağlar.
Premium ürünler sertifika ve kalite kontrol ister, fakat daha karlıdır.
Luxury ürünler gelişmiş tesis ve güçlü kalite güvence gerektirir.
```

Atölyeden tesise büyüme örneği:

```text
Başta baskıyı fason yaptırırım.
Sonra baskı makinesi alırım.
Daha sonra kumaş tedariğini de kendi tesisime taşırım.
```

Örnek oyuncu hissi:

```text
Küçük bir atölyem var. Bugün doğru line kararları verirsem bu siparişi zamanında yetiştirebilirim.
```
