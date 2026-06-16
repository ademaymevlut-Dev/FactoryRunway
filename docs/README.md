# Factory Runway Dokümantasyon İndeksi

## Amaç

Bu klasör Factory Runway için temel sistem kararlarını toplar. Hedef, kod yazımına başlamadan önce oyun döngüsü, üretim sistemi, beta kapsamı ve teknik yön hakkında kısa ve uygulanabilir bir referans oluşturmaktır.

İlk beta odağı `Textile Pack` olacaktır. Core sistem ise ileride chocolate, toy, furniture, electronics gibi farklı sektör paketlerini taşıyabilecek şekilde sektör bağımsız kalmalıdır.

## Dokümanlar

- [00-project-vision.md](00-project-vision.md): Proje vizyonu, oyun vaadi ve ürün yönü.
- [01-core-game-loop.md](01-core-game-loop.md): Ana oyuncu döngüsü ve günlük karar yapısı.
- [02-textile-production-system.md](02-textile-production-system.md): İlk beta için tekstil üretim akışı.
- [03-shift-simulation-flow.md](03-shift-simulation-flow.md): Vardiya başlatma, simülasyon ve gün sonu akışı.
- [04-production-orders-and-lines.md](04-production-orders-and-lines.md): Üretim emirleri, line atamaları ve kapasite kararları.
- [05-player-feedback-and-reports.md](05-player-feedback-and-reports.md): Oyuncuya gösterilecek mesajlar, uyarılar ve rapor yapısı.
- [06-beta-mvp-scope.md](06-beta-mvp-scope.md): İlk beta içinde olan ve olmayan sistemler.
- [07-sector-pack-expansion-notes.md](07-sector-pack-expansion-notes.md): Gelecek sektör paketleri için genişleme prensipleri.
- [08-technical-architecture-notes.md](08-technical-architecture-notes.md): Web öncelikli teknik mimari notları.
- [09-product-tiers-and-product-data.md](09-product-tiers-and-product-data.md): Basic, Premium ve Luxury ürün katmanları ile ürün verisi.
- [10-factory-growth-and-subcontracting.md](10-factory-growth-and-subcontracting.md): Atölyeden entegre tesise büyüme ve fason iş mantığı.
- [11-product-recipes-admin-and-risk-model.md](11-product-recipes-admin-and-risk-model.md): Admin ürün reçetesi, fiyat, süre ve risk modeli.
- [12-order-market-and-offer-pricing.md](12-order-market-and-offer-pricing.md): Müşteri, koleksiyon, sipariş teklifi ve ara fırsat siparişleri.
- [13-factory-capacity-investment-and-scaling.md](13-factory-capacity-investment-and-scaling.md): Level katmanları, kapasite, yatırım, makine config ve boost sistemi.
- [14-shift-events-risk-and-crisis-system.md](14-shift-events-risk-and-crisis-system.md): 540 dakikalık GameTime vardiya, olaylar, personel, makine ve tedarik riskleri.
- [15-warehouse-queues-and-priority-planning.md](15-warehouse-queues-and-priority-planning.md): Depo, ara kuyruklar, drag-drop öncelik ve kuyruk güvenlik bantları.
- [16-planning-ui-calendar-and-player-flow.md](16-planning-ui-calendar-and-player-flow.md): Planlama ana ekranı, fabrika haritası, department zone, takvim, sipariş timeline ve etki önizlemesi.
- [17-message-config-warning-and-localization.md](17-message-config-warning-and-localization.md): Mesaj config, uyarı grupları, tetik kuralları ve çoklu dil sistemi.
- [18-end-of-shift-report-and-financial-calendar.md](18-end-of-shift-report-and-financial-calendar.md): Vardiya sonu üretim raporu, randıman ve aylık finansal takvim.
- [19-recommendation-engine-and-advice-rules.md](19-recommendation-engine-and-advice-rules.md): Tavsiye motoru, value add stratejisi, yatırım önerileri ve XP puanlama kuralları.
- [20-factory-layout-system.md](20-factory-layout-system.md): Büyüyen fabrika haritası, department zone, line slot, drag/zoom ve minimap sistemi.
- [21-production-line-system.md](21-production-line-system.md): Line verisi, line durumları, kapasite hesabı, atama kuralları ve line kararları.
- [22-factory-expansion-math.md](22-factory-expansion-math.md): Slot açma, line kurulum, upgrade maliyeti, capacity math ve expansion config yapısı.
- [23-order-assignment-logic.md](23-order-assignment-logic.md): Sipariş reçetesinden rota çıkarma, line adayları, kuyruk, darboğaz ve teslim riski hesabı.
- [24-2-5d-prefab-visual-spec.md](24-2-5d-prefab-visual-spec.md): 2.5D/isometric prefab görsel standardı, format, overlay ve asset naming kararları.

## Temel Kararlar

- Factory Runway web öncelikli bir business / factory management simulation oyunudur.
- Oyun realtime idle olmayacaktır.
- Ana model: `Planla -> Line Ata -> Vardiyayı Başlat -> Simülasyonu İzle -> Rapor Al -> Geliştir -> Sonraki Gün`.
- Vardiya oyun içinde `08:00 - 17:00` aralığını temsil eder.
- Gerçek oyuncu süresi yaklaşık `2-3 dakika` hızlandırılmış simülasyondur.
- Nihai vardiya sonucu backend tarafında hesaplanıp güvenli şekilde kaydedilmelidir.
- Oyuncu dili sade, karar odaklı ve oyun hissi veren bir dil olmalıdır.
- Ürünler tüm sektörlerde `Basic`, `Premium` ve `Luxury` katmanlarıyla modellenmelidir.
- Ürün katmanı üretim rotasını, kalite kontrol ihtiyacını, sertifika gereksinimini, üretim süresini, fiyatı, karlılığı ve teslimat riskini etkiler.
- Fabrika büyümesi iki eksenlidir: mevcut departmanlara kapasite eklemek ve yeni üretim kabiliyetlerini tesise dahil etmek.
- Oyuncu yatay büyüme ile yeni line / slot açabilmeli, dikey büyüme ile mevcut line veya parkuru teknoloji yatırımıyla güçlendirebilmelidir.
- Makine ve teknoloji upgrade'leri üretim süresi, fire oranı, kalite riski, personel ihtiyacı, bakım maliyeti ve Premium / Luxury uygunluğunu etkilemelidir.
- Oyuncu başlangıçta baskı, nakış, taş yıkama veya parça boya gibi ara işlemleri fason firmalara yaptırabilir.
- Her ürün kodu kendi görsellerine, üretim reçetesine, fiyat metriklerine ve operasyon risk profillerine sahip olmalıdır.
- Siparişlerde beden detayı yoktur; renk dağılımı sipariş üzerinde tutulur.
- Sipariş pazarı müşteri, koleksiyon ve teklif mantığıyla çalışmalıdır.
- Ara fırsat siparişleri iyi planlama yapan oyuncuya yüksek karlı küçük işler sunmalıdır.
- Sevkiyat sonrası ödeme hemen yapılmalı; müşteri tahsilat riski oyuncuya yüklenmemelidir.
- Başarılı sevkiyat performansı güvenilirlik / bilinirlik puanını artırarak daha büyük siparişleri açmalıdır.
- Tek level sistemi kullanılmamalıdır; player level, factory level, department level, capability unlock ve reputation ayrı tutulmalıdır.
- Boost sistemi kalıcı yatırımlar ve geçici destekler olarak ayrılmalı; reklam/ödeme fırsatları pay-to-win baskısına dönüşmemelidir.
- Üretim tek vardiya ve 540 GameTime dakikası üzerinden hesaplanmalıdır.
- Personel eksikliği, makine arızası, kumaş ve aksesuar tedarik gecikmeleri üretimi dinamik hale getirmelidir.
- Depo sade tutulmalı; kumaş depoya girdiği gün kesime hazır sayılmalıdır.
- Departman güvenliği kuyruktaki ürün miktarı ve gün karşılığıyla değerlendirilmelidir.
- Planlama ekranı fabrika haritası, department zone/line slot görünümü, takvim yoğunluk haritası, ürün/sipariş timeline ve yeni sipariş etki önizlemesi etrafında kurulmalıdır.
- Oyuncu mesajları config ve localization sistemiyle yönetilmeli; kod tarafı mesaj metni değil mesaj anahtarı üretmelidir.
- Vardiya sonu raporu sevkiyata hazır adet, operasyon çıktısı, kuyruklara aktarılan adet ve günlük randımanı açıkça ayırmalıdır.
- Maaş ve genel giderler aylık takvim olayları olarak sade tutulmalı; finans oyuncuya planlama baskısı vermeli ama muhasebe karmaşasına dönüşmemelidir.
- Ürünlerde `ProductTier` ile `valueAddCategory` ayrı tutulmalıdır; oyuncunun kolay ürünlere mi yoksa katma değerli ürünlere mi yöneldiği bu alanla takip edilmelidir.
- Player level puanı sadece üretilen adede göre verilmemeli; ürün zorluğu, katma değer, teslim başarısı ve stratejik yatırımlar puanı etkilemelidir.
- Ana fabrika ekranı kart dashboard değil, büyüyen 2.5D fabrika haritası olarak ele alınmalıdır.
- Departmanlar harita üzerinde `Department Zone`, üretim hatları ise zone içindeki `Line Slot` yapısıyla modellenmelidir.
- Yeni hat açmak görsel olarak boş slotun aktif hatta dönüşmesiyle hissedilmelidir.
- Line durumları `Locked`, `Empty`, `Active`, `Busy`, `Risk` ve `Maintenance` olarak sade fakat karar verdirici şekilde gösterilmelidir.
- Sipariş atama sistemi ürün reçetesinden operasyon rotası çıkarıp uygun line adaylarını, kuyruk etkisini, darboğazı ve teslim riskini hesaplamalıdır.
- Prefab görseller 2.5D/isometric, transparent, yazısız ve durum bilgisiz hazırlanmalı; active/busy/risk görsel sinyalleri CSS overlay ile verilmelidir.

## MVP Kapsamı

İlk beta yalnızca Textile Pack ve temel üretim döngüsüne odaklanır:

- Fabrika başlangıcı.
- İlk tekstil üretim emirleri.
- Line sistemi.
- Cutting -> Sewing -> Ironing -> Packing -> Shipping akışı.
- Ara kuyruklar.
- Vardiya simülasyonu.
- Gün sonu raporu.
- Basit XP, factory cash ve level sistemi.
- Yeni line açma.
- Teslim tarihi riski ve darboğaz uyarıları.
- Basic ürünlerle başlangıç deneyimi.
- Basit fason işlem ve dış firma takibi.
- Basit sipariş marketi ve ilk ara fırsat siparişleri.
- Sevkiyat sonrası anında ödeme.
- Sevkiyat performansına bağlı basit güvenilirlik ilerlemesi.
- Basit factory level, yeni line açma ve kapasite upgrade'i.
- Basit vardiya olayları, makine arızası ve tedarik gecikmesi.
- Vardiya öncesi kuyruk önceliği ve drag-drop planlama.
- Planlama UI, departman detayları ve 7 günlük yoğunluk haritası.
- Temel uyarı mesaj grupları ve Türkçe varsayılan localization.
- Vardiya sonu randıman raporu ve temel finansal takvim olayları.
- Temel tavsiye motoru, kuyruk/yatırım önerileri ve value add bazlı XP ağırlıkları.
- Büyüyen fabrika haritası, drag/zoom davranışı ve basit minimap.
- Department zone ve line slot durumları.
- Seçili line için sağ detay paneli.
- Line bazlı kapasite hesabı, line atama ve teslim riski sinyali.
- Slot unlock, line install ve basit upgrade maliyetleri.
- Sipariş reçetesinden operasyon rotası çıkarma ve line adaylarını hesaplama.
- Textile Pack için ilk 2.5D prefab görsel standardı.

## İleride Genişletilecek Alanlar

- Yeni sektör paketleri.
- Premium ve Luxury ürün katmanlarının oynanabilir hale getirilmesi.
- Sertifika ve kalite güvence sistemleri.
- Atölyeden tam entegre tesise büyüme.
- Baskı, nakış, yıkama, boya ve kumaş üretimi gibi üretim kabiliyetleri.
- Sektöre özel ürün, rota, makine, upgrade ve balans config yapıları.
- Daha gelişmiş ekonomi.
- Müşteri ilişkisi, koleksiyonlar ve gelişmiş teklif fiyatlandırma.
- Güvenilirlik / bilinirlik puanına göre sipariş adetlerinin büyümesi.
- Fabrika kapasite, yatırım, departman level ve makine config sistemleri.
- Vardiya olayları, kriz yönetimi, yedek makine ve sade kumaş/aksesuar tedarik riskleri.
- Gelişmiş kuyruk tavsiyeleri ve otomatik öncelik önerileri.
- Gelişmiş takvim, otomatik plan önerisi ve sipariş etki simülasyonu.
- Çok dilli mesaj kütüphanesi, admin mesaj editörü ve gelişmiş tavsiye motoru.
- Planlanan / gerçekleşen maliyet karşılaştırması ve nakit akışı projeksiyonu.
- Oyuncu strateji profili ve tavsiye kurallarının admin panelden yönetimi.
- Serbest veya yarı serbest fabrika yerleşimi.
- Gelişmiş minimap, camera preset ve fit view davranışları.
- Line uzmanlaşması, setup süresi ve ürün değişim cezası.
- Otomatik sipariş atama optimizasyonu ve plan karşılaştırma.
- Görsel prefab animasyonları, işçi sprite'ları ve sektör paketlerine özel asset setleri.
- Kozmetik veya dengeli stratejik varyasyonlar.
- Daha detaylı raporlama ve oyuncu tavsiyeleri.

## Örnek Ana Cümle

```text
Bugün hangi siparişi kurtaracağım, hangi line'ı nereye vereceğim ve yarın hangi darboğazı çözeceğim?
```
