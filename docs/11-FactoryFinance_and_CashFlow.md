# 11 - FactoryFinance and CashFlow

Bu doküman Factory Runway içinde fabrika finans sisteminin temel kararlarını tanımlar.

Amaç, oyuncuya işletmenin kasasına giren ve çıkan parayı net göstermek, gelecek ödemeleri ve gelecek tahsilatları takip ettirmek, gereksiz muhasebe karmaşasına girmeden sağlam bir finans altyapısı kurmaktır.

Bu sistem tam muhasebe programı değildir.
Oyuncu için anlaşılır, performanslı ve oyun dengesi açısından yeterli bir cash-flow sistemidir.

---

# 1. Temel Finans Kararı

Factory Runway içinde finansın ana merkezi `Factory` olmalıdır.

Her fabrika kendi kasasına sahip olur.

```text
Factory.cashBalanceCents = fabrikanın işletme kasası
```

Oyuncunun birden fazla sektörde fabrika açması durumunda her fabrikanın kasası ayrı tutulmalıdır.

Örnek:

```text
Textile Factory Cash: 850.000
Chocolate Factory Cash: 250.000
```

İlk beta için sektörler arası para transferi yapılmaz.

Bunun sebebi oyun dengesi açısından önemlidir. Oyuncu bir sektörde çok para kazanıp yeni açtığı sektörü doğrudan finanse ederse, yeni sektörün başlangıç ekonomisi bozulur.

İleride kontrollü şekilde ayrı bir sistem eklenebilir:

```text
OwnerCapitalTransfer
```

Ancak V1 / Beta için karar:

```text
Her fabrika kendi kasasıyla yaşar.
```

---

# 2. Player Wallet ve Factory Cash Ayrımı

`PlayerWallet` ile `Factory.cashBalanceCents` aynı şey değildir.

| Yapı | Kullanım |
|---|---|
| PlayerWallet | Meta oyun, premium haklar, kozmetik, sektör paketi gibi oyun dışı veya üst seviye kullanım |
| Factory Cash | Üretim, sipariş, yatırım, maaş, kira, fason, leasing ve işletme giderleri |

Beta için oyuncu üretim ekonomisini `Factory.cashBalanceCents` üzerinden yönetir.

`PlayerWallet` varsa bile üretim giderleri için kullanılmaz.

---

# 3. Para Birimi Kararı

Oyun içinde tek para değeri çalışır.

Oyuncu yalnızca para birimi etiketi seçebilir:

```text
EUR veya USD
```

Ancak kur dönüşümü yapılmaz.

```text
100.000 EUR = 100.000 oyun parası
100.000 USD = 100.000 oyun parası
```

Veritabanında para değerleri cent olarak saklanmalıdır.

```text
100.000 = 10.000.000 cents
```

Büyük finans değerleri için `BigInt` kullanılmalıdır.

---

# 4. Factory Üzerindeki Finans Alanları

`Factory` modeli üzerinde minimum şu alanlar bulunmalıdır:

```prisma
model Factory {
  id                    String   @id @default(cuid())

  sectorId              String   @map("sector_id")

  name                  String
  currencyCode          String   @default("EUR") @map("currency_code")
  cashBalanceCents      BigInt   @default(0) @map("cash_balance_cents")

  currentDay            Int      @default(1) @map("current_day")
  currentFinancePeriod  Int      @default(1) @map("current_finance_period")

  metadata              Json?

  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  @@index([sectorId])
  @@map("factories")
}
```

Alan açıklamaları:

| Alan | Açıklama |
|---|---|
| `currencyCode` | Oyuncunun seçtiği para etiketi. Kur hesabı yoktur. |
| `cashBalanceCents` | Fabrikanın gerçek işletme kasası. |
| `currentDay` | Oyuncunun içinde olduğu oyun günü. |
| `currentFinancePeriod` | Finansal ay / dönem sayacı. 22 oyun günü = 1 finans dönemi. |

---

# 5. Finans Ayı Kararı

Factory Runway içinde 1 finans ayı şu şekilde kabul edilir:

```text
1 finans ayı = 22 oyun günü
```

Bu karar yemek, maaş, kira, elektrik ve genel gider hesaplarıyla uyumludur.

Örnek dönemler:

| Period | Gün Aralığı |
|---|---:|
| 1 | Day 1 - Day 22 |
| 2 | Day 23 - Day 44 |
| 3 | Day 45 - Day 66 |

Her 22. gün sonunda aylık giderler hesaplanır.

---

# 6. Finans Sisteminin Ana Katmanları

Finans sistemi iki temel kayıt tipinden oluşur:

```text
FactoryFinanceDue         = Gelecek tahsilat / gelecek ödeme
FactoryFinanceTransaction = Gerçekleşmiş para hareketi
```

Bu ayrım önemlidir.

Örnek:

```text
Day 20: Sipariş sevk edildi, 7 gün vadeli alacak oluştu.
Day 27: Para kasaya girdi, transaction oluştu.
```

Yani her gelir veya gider anında kasaya yansımaz.
Önce due olarak planlanabilir, vadesi geldiğinde transaction olarak gerçekleşir.

---

# 7. FactoryFinanceDue Modeli

Bu tablo gelecek tahsilatları ve gelecek ödemeleri tutar.

Dashboard üzerinde “önümüzdeki 7 gün içinde gelecek para / çıkacak para” bu tablodan okunur.

```prisma
model FactoryFinanceDue {
  id                    String             @id @default(cuid())

  factoryId             String             @map("factory_id")

  createdDay            Int                @map("created_day")
  dueDay                Int                @map("due_day")
  periodIndex           Int                @map("period_index")

  direction             FinanceDirection
  category              FinanceCategory

  amountCents           BigInt             @map("amount_cents")
  settledAmountCents    BigInt             @default(0) @map("settled_amount_cents")

  status                FinanceDueStatus   @default(PENDING)

  sourceType            FinanceSourceType? @map("source_type")
  sourceId              String?            @map("source_id")

  description           String?
  metadata              Json?

  createdAt             DateTime           @default(now()) @map("created_at")
  updatedAt             DateTime           @updatedAt @map("updated_at")

  factory               Factory            @relation(fields: [factoryId], references: [id], onDelete: Cascade)

  @@index([factoryId, dueDay, status])
  @@index([factoryId, direction, status])
  @@index([factoryId, category])
  @@index([sourceType, sourceId])
  @@map("factory_finance_dues")
}
```

---

# 8. FactoryFinanceTransaction Modeli

Bu tablo gerçek para hareketlerini tutar.

Kasa bakiyesi yalnızca transaction oluştuğunda değişir.

```prisma
model FactoryFinanceTransaction {
  id                    String             @id @default(cuid())

  factoryId             String             @map("factory_id")

  gameDay               Int                @map("game_day")
  periodIndex           Int                @map("period_index")

  direction             FinanceDirection
  category              FinanceCategory

  amountCents           BigInt             @map("amount_cents")
  balanceBeforeCents    BigInt             @map("balance_before_cents")
  balanceAfterCents     BigInt             @map("balance_after_cents")

  sourceType            FinanceSourceType? @map("source_type")
  sourceId              String?            @map("source_id")

  financeDueId          String?            @map("finance_due_id")

  description           String?
  metadata              Json?

  createdAt             DateTime           @default(now()) @map("created_at")

  factory               Factory            @relation(fields: [factoryId], references: [id], onDelete: Cascade)
  financeDue            FactoryFinanceDue? @relation(fields: [financeDueId], references: [id], onDelete: SetNull)

  @@index([factoryId, gameDay])
  @@index([factoryId, periodIndex])
  @@index([factoryId, category])
  @@index([sourceType, sourceId])
  @@map("factory_finance_transactions")
}
```

---

# 9. Finance Enum Yapıları

```prisma
enum FinanceDirection {
  INCOME
  EXPENSE
}
```

```prisma
enum FinanceDueStatus {
  PENDING
  PAID
  PARTIAL
  OVERDUE
  CANCELLED
}
```

```prisma
enum FinanceCategory {
  ORDER_REVENUE

  OUTSOURCE_COST
  PAYROLL
  RENT
  ELECTRICITY
  MEAL
  OVERHEAD
  MACHINE_PURCHASE
  LEASING_DOWN_PAYMENT
  LEASING_PAYMENT
  MAINTENANCE
  PENALTY
  BONUS
  CAPITAL_INJECTION
  OTHER
}
```

```prisma
enum FinanceSourceType {
  CUSTOMER_ORDER
  CUSTOMER_ORDER_ITEM
  PRODUCTION_ORDER
  OUTSOURCE_JOB
  FACTORY_PRODUCTION_LINE
  LEASING_CONTRACT
  MONTHLY_CLOSING
  CHAOS_EVENT
  MANUAL_ADJUSTMENT
}
```

---

# 10. Gelir Akışı

Sipariş kabul edildiğinde kasa artmaz.

```text
MarketOrderOffer kabul edildi → CustomerOrder oluşur → gelir yok
```

Üretim tamamlandığında da kasa artmaz.

```text
ProductionOrder completed → gelir yok
```

Sipariş hedef teslim günü geldiğinde ve sipariş hazırsa sevk edilir.

```text
CustomerOrder shipped → receivable oluşur
```

Vade günü geldiğinde para kasaya girer.

```text
FinanceDue dueDay geldi → FactoryFinanceTransaction INCOME oluşur → cashBalance artar
```

Örnek:

```text
Day 1: Sipariş kabul edildi
Day 18: Üretim tamamlandı, ürün depoda bekliyor
Day 20: Sipariş sevk edildi, 7 gün vadeli alacak oluştu
Day 27: Para kasaya girdi
```

---

# 11. Payment Term Kararı

V1 için default ödeme vadesi:

```text
paymentTermDays = 7
```

İleride bu değer müşteri segmentine göre değişebilir.

Öneri:

| Müşteri Tipi | Payment Term |
|---|---:|
| Budget Retailer | 10 - 15 gün |
| Mass Retailer | 7 - 15 gün |
| Premium Brand | 5 - 10 gün |
| Luxury Boutique | 0 - 7 gün |
| Export Buyer | 15 - 30 gün |

Beta’da ilk kullanım için `VirtualCustomer` veya `CustomerSegment` üzerinde `paymentTermDays` alanı eklenebilir.

```prisma
paymentTermDays Int @default(7) @map("payment_term_days")
```

---

# 12. Gider Akışı

Giderler iki şekilde oluşur:

1. Anında ödenen giderler
2. Vadesi gelen giderler

## 12.1 Anında Ödenen Giderler

Aşağıdaki giderler gerçekleştiği anda kasadan düşer:

| Gider | Kural |
|---|---|
| Makine satın alma | Satın alma anında ödeme |
| Leasing peşinatı | Leasing kontratı oluşturulurken ödeme |
| Manuel gider / düzeltme | Admin veya sistem işlemi anında |

## 12.2 Vadeli / Dönemsel Giderler

Aşağıdaki giderler 22 günlük finans dönemi sonunda oluşur:

| Gider | Kural |
|---|---|
| Maaş | 22 günde bir |
| Kira | 22 günde bir |
| Elektrik | 22 günde bir |
| Yemek | 22 günde bir |
| Genel gider | 22 günde bir |
| Leasing taksiti | Aylık / dönemsel |

Maliyet kaynakları ikiye ayrılır:

| Katman | Kaynak |
|---|---|
| Doğrudan üretim hattı giderleri | Aktif hatlar, direkt personel, hat elektriği ve üretim alanı |
| Paylaşılan işletme giderleri | Mevcut `FactoryOperatingStageState` kademesinin açık rol/adet ve gider configleri |

`ProductionLineTemplate.directCostPer1000PointsCents` admin fiyatlandırması için türetilmiş referans değerdir; tek başına finans transaction üretmez.
Gerçek maaş, kira, elektrik, yemek ve genel giderler kapanışta kendi kaynaklarından bir kez hesaplanır. Böylece aynı maliyet hem referans CMT hesabında hem de kasa hareketinde iki kez yazılmaz.

---

# 13. Fason Ödeme Kararı

Fason işlemler production line gibi günlük üretim yapmaz.
Seçilen FAST / STANDARD / SAFE seçeneğine göre X gün sonra toplu döner.

Fason maliyeti iş oluşturulduğunda hesaplanır.

Ancak ödeme, fason işi tamamlandığında yapılır.

Örnek:

```text
Day 4: Printing FAST fasona gönderildi
readyDay = Day 6
cost = 1.200

Day 6: Fason tamamlandı
FactoryFinanceTransaction EXPENSE / OUTSOURCE_COST oluşur
cashBalance -1.200
```

Fason tamamlanma günü ödeme yapılamazsa `FactoryFinanceDue` kaydı `OVERDUE` olabilir.

Beta için öneri:

```text
Fason tamamlandığında otomatik ödeme denensin.
Kasa yetmezse due OVERDUE olur.
```

---

# 14. Leasing Finans Kararı

Makine yatırımları iki şekilde yapılabilir:

1. Peşin satın alma
2. Leasing

Peşin satın alma anında kasadan düşer.

Leasing için önerilen akış:

```text
Leasing contract oluşturulur
↓
Down payment kasadan düşer
↓
Her finans döneminde leasing payment due oluşur
↓
Vade günü geldiğinde ödeme yapılır
```

Leasing detayları ayrı dokümanda veya `FactoryLeasingContract` yapısında yönetilmelidir.

Finans sistemi yalnızca ödeme hareketlerini takip eder.

---

# 15. Aylık Finans Kapanışı

Her 22 oyun gününde bir finans kapanışı yapılır.

Kapanışta şu giderler hesaplanır:

```text
PAYROLL
RENT
ELECTRICITY
MEAL
OVERHEAD
LEASING_PAYMENT
```

Faaliyet kademesi kapanış sırasında değiştirilmez. Kapanış, o dönemde geçerli kademe durumu ile gerçek personel ve hat kayıtlarını okuyarak gider üretir.

Kapanış akışı:

```text
1. Factory currentDay kontrol edilir.
2. Eğer currentDay % 22 == 0 ise finans kapanışı çalışır.
3. Dönem giderleri hesaplanır.
4. FactoryFinanceDue veya doğrudan FactoryFinanceTransaction oluşturulur.
5. FactoryFinancePeriodSnapshot oluşturulur.
6. currentFinancePeriod + 1 yapılır.
```

Beta için basit karar:

```text
Aylık giderler dönem sonunda otomatik ödenir.
Kasa yetersizse ilgili due OVERDUE olarak kalır.
```

---

# 16. FactoryFinancePeriodSnapshot Modeli

Bu tablo dönemsel raporlar için kullanılacaktır.

Detay transaction kayıtlarını sürekli sorgulamak yerine finans dönemi sonunda özet alınır.

```prisma
model FactoryFinancePeriodSnapshot {
  id                    String   @id @default(cuid())

  factoryId             String   @map("factory_id")
  periodIndex           Int      @map("period_index")

  startDay              Int      @map("start_day")
  endDay                Int      @map("end_day")

  startingCashCents     BigInt   @map("starting_cash_cents")
  endingCashCents       BigInt   @map("ending_cash_cents")

  totalIncomeCents      BigInt   @default(0) @map("total_income_cents")
  totalExpenseCents     BigInt   @default(0) @map("total_expense_cents")
  netResultCents        BigInt   @default(0) @map("net_result_cents")

  orderRevenueCents     BigInt   @default(0) @map("order_revenue_cents")
  outsourceCostCents    BigInt   @default(0) @map("outsource_cost_cents")
  payrollCents          BigInt   @default(0) @map("payroll_cents")
  rentCents             BigInt   @default(0) @map("rent_cents")
  electricityCents      BigInt   @default(0) @map("electricity_cents")
  mealCents             BigInt   @default(0) @map("meal_cents")
  overheadCents         BigInt   @default(0) @map("overhead_cents")
  leasingPaymentCents   BigInt   @default(0) @map("leasing_payment_cents")
  maintenanceCents      BigInt   @default(0) @map("maintenance_cents")
  penaltyCents          BigInt   @default(0) @map("penalty_cents")

  metadata              Json?

  createdAt             DateTime @default(now()) @map("created_at")

  factory               Factory  @relation(fields: [factoryId], references: [id], onDelete: Cascade)

  @@unique([factoryId, periodIndex])
  @@index([factoryId, startDay, endDay])
  @@map("factory_finance_period_snapshots")
}
```

Bu yapı şu raporları kolaylaştırır:

- Aylık gelir
- Aylık gider
- Aylık net sonuç
- Tahmini yıllık gelir
- Tahmini yıllık gider
- Dönemsel kârlılık trendi

Tahmini yıllık değerler için ayrıca tablo açmaya gerek yoktur.
Sorgu veya servis ile dönem snapshot değerlerinden üretilebilir.

---

# 17. Cash Balance Güncelleme Kuralı

Kasa bakiyesi yalnızca tek servis üzerinden güncellenmelidir.

Önerilen servis:

```ts
postFinanceTransaction(params)
```

Bu servis:

```text
1. Factory kaydını transaction içinde okur.
2. Mevcut cashBalanceCents değerini alır.
3. Direction'a göre yeni bakiyeyi hesaplar.
4. Factory.cashBalanceCents günceller.
5. FactoryFinanceTransaction oluşturur.
6. Eğer due bağlantısı varsa due status günceller.
```

Kasa bakiyesi farklı servislerde manuel güncellenmemelidir.

Yanlış yaklaşım:

```ts
factory.cashBalanceCents -= amount
```

Doğru yaklaşım:

```ts
postFinanceTransaction({
  factoryId,
  direction: "EXPENSE",
  category: "OUTSOURCE_COST",
  amountCents,
  sourceType: "OUTSOURCE_JOB",
  sourceId: outsourceJobId
})
```

Bu sayede her para hareketinin açıklaması olur.
Oyuncuya “para nereye gitti?” sorusunun cevabı verilebilir.

---

# 18. Negatif Kasa ve Ödeme Güvenliği

Stratejik / isteğe bağlı harcamalarda kasa kontrolü yapılmalıdır.

Aşağıdaki işlemler için yeterli nakit yoksa işlem engellenebilir:

| İşlem | Kural |
|---|---|
| Peşin makine satın alma | Kasa yeterli olmalı |
| Leasing peşinatı | Kasa yeterli olmalı |
| Yeni yatırım | Kasa yeterli olmalı |

Zorunlu ödemelerde ise ödeme gecikebilir:

| İşlem | Kural |
|---|---|
| Maaş | Ödenemezse OVERDUE olur, personel moral / verim riski doğar |
| Kira | Ödenemezse OVERDUE olur |
| Elektrik | Ödenemezse OVERDUE olur, risk sistemi etkilenebilir |
| Fason | Ödenemezse OVERDUE olur, müşteri güveni / tedarikçi güveni etkilenebilir |

Beta için doğrudan iflas sistemi gerekli değildir.
Ancak negatif kasa veya overdue ödeme oyuncuya uyarı olarak gösterilmelidir.

---

# 19. Next 7 Days Cash Flow

Oyuncu finans dashboard’da önümüzdeki 7 günü görebilmelidir.

Gösterilecek alanlar:

```text
Next 7 Days Receivables
Next 7 Days Payables
Net 7 Days Cash Flow
Cash After 7 Days Estimate
```

Hesap:

```ts
incoming7Days = sum(
  FactoryFinanceDue
  where direction = INCOME
  and status = PENDING
  and dueDay between currentDay and currentDay + 7
)

outgoing7Days = sum(
  FactoryFinanceDue
  where direction = EXPENSE
  and status = PENDING
  and dueDay between currentDay and currentDay + 7
)

net7Days = incoming7Days - outgoing7Days
estimatedCashAfter7Days = cashBalanceCents + net7Days
```

Ayrıca 7 gün içinde finans ayı kapanışı varsa, aylık giderler forecast olarak gösterilebilir.

Bu forecast için ayrıca kayıt oluşturmak zorunlu değildir.
Servis mevcut personel, hat, m2 ve gider configlerinden tahmini hesap yapabilir.

---

# 20. Finans Dashboard Minimum İçerik

Beta için finans dashboard’da şu alanlar yeterlidir:

| Alan | Açıklama |
|---|---|
| Cash Balance | Güncel fabrika kasası |
| Incoming 7 Days | 7 gün içinde beklenen tahsilatlar |
| Outgoing 7 Days | 7 gün içinde beklenen ödemeler |
| Net 7 Days | Yakın dönem nakit akışı |
| Overdue Payments | Gecikmiş ödemeler |
| Current Period Income | Mevcut finans dönemi gelirleri |
| Current Period Expenses | Mevcut finans dönemi giderleri |
| Current Period Net | Mevcut dönem kâr / zarar |
| Last Period Result | Son finans dönemi sonucu |
| Biggest Expense Category | En büyük gider kalemi |

Oyuncuya özellikle şu mesajlar gösterilebilir:

```text
7 gün içinde 18.400 tahsilat bekleniyor.
7 gün içinde 12.800 ödeme var.
Tahmini 7 gün sonu kasa: 94.300
```

veya:

```text
7 gün içinde ödeme yükünüz beklenen tahsilatlardan yüksek.
Kasa açığı riski var.
```

---

# 21. Order Revenue ve Profitability

Her sipariş için gelir `CustomerOrder` üzerinden takip edilir.

Sipariş sevk edildiğinde `FactoryFinanceDue` oluşturulur:

```text
sourceType = CUSTOMER_ORDER
sourceId = customerOrderId
category = ORDER_REVENUE
```

Vade günü geldiğinde transaction oluşur.

Bu sayede sipariş bazlı gelir görülebilir.

Sipariş bazlı giderler için yalnızca doğrudan bağlanabilen giderler source ile bağlanmalıdır:

| Gider | Source Bağlantısı |
|---|---|
| Fason maliyeti | OUTSOURCE_JOB veya PRODUCTION_ORDER |
| Gecikme cezası | CUSTOMER_ORDER |
| Kalite cezası | CUSTOMER_ORDER |

Kira, maaş, elektrik gibi genel giderler siparişe tek tek dağıtılmamalıdır.
Bu dağıtım rapor ekranında tahmini maliyet analizi olarak yapılabilir.

Bu karar performans için önemlidir.

---

# 22. Finans ve ShiftSimulation İlişkisi

Vardiya simülasyonu doğrudan finans transaction üretmemelidir.

ShiftSimulation sonunda şu finans olayları oluşabilir:

| Olay | Finans Etkisi |
|---|---|
| Fason işi tamamlandı | OUTSOURCE_COST gideri |
| Sipariş hazır oldu | Gelir yok, ürün sevk günü bekler |
| Sipariş hedef gününde sevk edildi | ORDER_REVENUE receivable oluşur |
| Gecikme oluştu | PENALTY due veya revenue reduction oluşabilir |
| Aylık kapanış günü | dönemsel giderler oluşur |

Üretim adedi arttı diye her gün finans kaydı oluşturulmaz.
Para hareketi doğuran olay varsa finans kaydı oluşur.

---

# 23. Veri Saklama ve Performans Kararı

Finans kayıtları kaos event kayıtları gibi 20 gün sonra silinmemelidir.

Çünkü oyuncu finans geçmişini, kârlılık trendini ve gelir-gider hareketlerini görmek isteyebilir.

Ancak beta sonrası performans için şu yapı uygulanabilir:

```text
Son 60-90 gün transaction detaylı tutulur.
Daha eski dönemler FactoryFinancePeriodSnapshot üzerinden raporlanır.
Eski detay transaction kayıtları arşivlenebilir veya temizlenebilir.
```

İlk beta için transaction kayıtlarını tutmak yeterlidir.
Erken optimizasyonla sistemi gereksiz karmaşıklaştırmaya gerek yoktur.

---

# 24. Gerekli Servisler

Finans sistemi için önerilen servisler:

```text
postFinanceTransaction(factoryId, payload)
createFinanceDue(factoryId, payload)
settleFinanceDue(factoryId, dueId)
processDuePayments(factoryId, currentDay)
runFinancePeriodClosing(factoryId)
getFinanceDashboard(factoryId)
getNext7DaysCashFlow(factoryId)
```

## postFinanceTransaction

Gerçek para hareketi oluşturur ve kasa bakiyesini günceller.

## createFinanceDue

Gelecek ödeme veya tahsilat kaydı oluşturur.

## settleFinanceDue

Vadesi gelen due kaydını öder veya tahsil eder.

## processDuePayments

Her gün başlangıcında veya vardiya sonunda çalışabilir.
Vadesi gelen due kayıtlarını işler.

## runFinancePeriodClosing

22 günlük finans dönemi sonunda çalışır.
Aylık giderleri hesaplar ve snapshot oluşturur.

## getFinanceDashboard

Oyuncuya finans özetini gösterir.

---

# 25. Günlük Finans İşleme Sırası

Her oyun günü sonunda önerilen sıra:

```text
1. ShiftSimulation tamamlanır.
2. Fason tamamlanan işler kontrol edilir.
3. Sevk günü gelen hazır siparişler kontrol edilir.
4. Gelir receivable kayıtları oluşturulur.
5. Vadesi gelen due kayıtları işlenir.
6. Eğer finans dönemi sonuysa aylık kapanış yapılır.
7. Factory.currentDay + 1 yapılır.
```

Alternatif olarak `currentDay + 1` işleminden sonra yeni gün başlangıcında due processing yapılabilir.

Ancak tek bir standart seçilmelidir.

Beta için önerilen karar:

```text
Vardiya tamamlandıktan sonra gün sonu işlemleri yapılır.
Sonra currentDay + 1 olur.
```

---

# 26. Final Karar Özeti

| Konu | Karar |
|---|---|
| Finans merkezi | Factory kasası |
| Player wallet | Meta kullanım, üretim ekonomisi için değil |
| Çok sektör | Her fabrikanın kasası ayrı |
| Para birimi | Sadece etiket, kur hesabı yok |
| Para formatı | BigInt cents |
| Finans ayı | 22 oyun günü |
| Gerçek para hareketi | FactoryFinanceTransaction |
| Gelecek ödeme / tahsilat | FactoryFinanceDue |
| Dashboard | Cash balance + 7 günlük nakit akışı |
| Sipariş geliri | Sevkiyat sonrası receivable, vade günü cash |
| Fason gideri | Fason tamamlanınca ödeme |
| Maaş/kira/elektrik/yemek/genel gider | 22 günlük dönem sonunda |
| Yatırım | Peşin veya leasing |
| Kasa güncelleme | Tek servis üzerinden |
| Üretim adedi finans kaydı üretir mi? | Hayır |
| Genel gider siparişe tek tek dağıtılır mı? | Hayır; yalnızca yönetim raporunda tahmini birim maliyete paylaştırılır |
| Faaliyet kademesi maliyet çarpanı mı? | Hayır; açık rol/adet ve gider merdivenidir |
| Eski finans kayıtları | İlk beta’da tutulur, sonra snapshot/archive yapılabilir |
| İflas sistemi | V1’de şart değil, overdue/negative cash uyarısı yeterli |
