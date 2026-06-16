# Teknik Mimari Notları

## Amaç

Bu doküman Factory Runway'in web öncelikli teknik yönünü ve simülasyon güvenliğiyle ilgili temel kararları tanımlar.

## Temel Kararlar

Planlanan stack:

```text
Next.js
Prisma
PostgreSQL
Tailwind CSS
shadcn/ui
```

Simülasyon motoru backend tarafında güvenli çalışmalıdır. Frontend oyuncuya canlı simülasyon hissi verebilir, ancak nihai üretim sonucu backend tarafından hesaplanmalı ve kaydedilmelidir.

Vardiya sonuçları transaction mantığıyla veritabanına yazılmalıdır.

## Önerilen Modül Ayrımı

Core engine sektör bağımsız olmalıdır:

```text
game/core/simulation
game/core/domain
game/core/types
game/sectors/textile
game/sectors/chocolate
game/sectors/toys
game/registry
```

Core engine sorumlulukları:

- Vardiya simülasyonu.
- Üretim emri işleme.
- Ürün katmanı etkilerini uygulama.
- Ürün operasyon gereksinimlerini işleme.
- Fason işlem akışlarını hesaplama.
- Ara kuyruk hesaplama.
- Kapasite hesabı.
- Teslim tarihi riski.
- Rapor üretimi.

Sector pack sorumlulukları:

- Üretim rotası.
- Ürün listesi.
- Ürün katmanlarının sektörel karşılıkları.
- İşlem süreleri.
- Makine / personel ihtiyaçları.
- Sertifika ve kalite gereksinimleri.
- Sektöre özel operasyonlar ve fason seçenekleri.
- Upgrade seçenekleri.
- UI etiketleri.
- Sektöre özel kurallar.

## Veri ve Config Prensibi

Line süreleri, ürün rotaları, kapasite değerleri, ürün katmanı etkileri, operasyon gereksinimleri, fason firma seçenekleri, sertifika gereksinimleri ve upgrade etkileri kod içine dağılmamalıdır. Mümkün olduğunca config dosyaları veya database tabloları üzerinden yönetilebilir olmalıdır.

Örnek değiştirilebilir değer:

```text
10 personelli bir sewing line her 8 dakikada 1 ürün tamamlar.
```

Bu değer ileride Textile Pack balancing config içinde tutulabilir.

## MVP Kapsamı

- Next.js tabanlı web app.
- Prisma + PostgreSQL veri katmanı.
- Backend tarafında vardiya sonucu hesaplama.
- Transaction ile gün sonu kayıt.
- Textile Pack config başlangıcı.
- Basit domain model:
  - Factory.
  - ProductionOrder.
  - Customer.
  - CustomerReputation.
  - CustomerRelationshipEvent.
  - Collection.
  - OrderOffer.
  - OrderOfferColorLine.
  - OfferRiskSummary.
  - Product.
  - ProductImage.
  - ProductTier.
  - ProductValueAddCategory.
  - ProductionRecipe.
  - RecipeStep.
  - Operation.
  - OperationRiskProfile.
  - OperationBasePrice.
  - FactoryCapability.
  - Subcontractor.
  - OutsourcedJob.
  - OrderColorLine.
  - Line.
  - RouteStep.
  - Buffer.
  - QualityGate.
  - CertificationRequirement.
  - ShiftResult.
  - Report.
  - PaymentEvent.
  - PlayerProgress.
  - FactoryProgress.
  - DepartmentProgress.
  - LineTypeConfig.
  - MachineConfig.
  - UpgradeConfig.
  - BoostConfig.
  - ActiveBoost.
  - ShiftEvent.
  - EventTypeConfig.
  - MachineInstance.
  - MachineEvent.
  - SpareMachine.
  - MaterialRequirement.
  - AccessoryRequirement.
  - SupplyEvent.
  - MaterialReadyState.
  - ProductionBuffer.
  - BufferTypeConfig.
  - DepartmentPriorityQueue.
  - PriorityQueueItem.
  - BufferEvent.
  - PlanningDashboardView.
  - DepartmentCardView.
  - CalendarLoadCell.
  - OrderTimelineStepView.
  - OfferImpactPreview.
  - MessageConfig.
  - MessageLocalization.
  - MessageTriggerRule.
  - GeneratedMessage.
  - OperationOutputSummary.
  - QueueTransferSummary.
  - EfficiencyReport.
  - DepartmentEfficiencyReport.
  - FinancialCalendarEvent.
  - FinancialTransaction.
  - RecommendationRule.
  - RecommendationResult.
  - PlayerStrategyProfile.
  - ProductProgressScoreConfig.
  - PlayerProgressEvent.

## İleride Genişletilecek Alanlar

- Sektör registry.
- Ürün katmanı ve sertifika config'leri.
- Operasyon, fabrika kabiliyeti ve fason firma config'leri.
- Admin ürün reçetesi ve fiyat simülatörü.
- Sipariş marketi, müşteri ilişkisi ve ara fırsat öneri motoru.
- Sevkiyat sonrası ödeme ve güvenilirlik / bilinirlik puan sistemi.
- Fabrika level, departman level, yatırım, makine config ve boost sistemi.
- GameTime vardiya olayları, makine/personel/tedarik riskleri ve kriz sistemi.
- Depo, üretim buffer'ları, kuyruk öncelikleri ve güvenlik bandı hesapları.
- Planlama UI view model'leri, takvim yoğunluk hesapları ve sipariş etki önizlemesi.
- Message config, localization, trigger rule ve generated message sistemi.
- Vardiya sonu operasyon çıktısı, randıman raporu ve finansal takvim olayları.
- Tavsiye motoru, value add strateji takibi ve zorluk bazlı progression puanlama.
- Admin balancing paneli.
- Daha detaylı simülasyon logları.
- Kaydedilmiş vardiya tekrarları.
- Analitik ve event tracking.
- Çoklu save slot.
- Kullanıcı hesabı ve cloud save.

## Örnekler

Backend güvenliği:

```text
Frontend vardiyayı animasyonla gösterir.
Backend gerçek üretim sonucunu hesaplar.
Backend sonucu transaction ile kaydeder.
Rapor bu kayıttan üretilir.
```

Sektör bağımsız core örneği:

```text
Core: route step, buffer, line, capacity
Textile: Kesim, CUT_READY, Dikim, Sewing Line
Chocolate: Karışım, MIX_READY, Pişirme, Cooking Line
```

Ürün katmanı örneği:

```text
Core: Basic, Premium, Luxury
Textile Premium: kalite kontrol + ISO 9000/BSCI gereksinimi
Furniture Premium: kalite kontrol + gelişmiş montaj/kaplama gereksinimi
Chocolate Premium: kalite kontrol + soğutma/paket standardı gereksinimi
```

Fason işlem örneği:

```text
Product route: Kesim -> Baskı -> Dikim
Factory capability: Baskı yok
Subcontractor: Vizyon Baskı, 1.20 USD/adet, 4 gün
Simulation effect: Kesim sonrası parçalar fasona çıkar, dönüşte dikim kuyruğuna girer
```
