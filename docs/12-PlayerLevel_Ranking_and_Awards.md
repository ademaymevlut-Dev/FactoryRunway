# 12 - PlayerLevel, Ranking and Awards

Bu doküman Factory Runway içinde oyuncu ilerlemesi, XP kazanımı, ödül yapısı, ranking sistemi ve monetization sınırlarını tanımlar.

Amaç; oyuncuya yalnızca para yönetimi değil, sürekli küçük hedefler, görünür ilerleme, rekabet ve tıklanabilir ödül hissi vermektir.

Bu sistem oyunun dopamin katmanıdır.
Fabrika üretir, finans sistemi parayı yönetir, bu sistem de oyuncuya “devam et, az kaldı” hissini verir.
İnsan beyninin küçük rozetlere bu kadar açık olması tuhaf ama sektör bunu keşfetti, biz de medeni şekilde kullanacağız.

---

# 1. Ayrılması Gereken Sistemler

Factory Runway içinde aşağıdaki kavramlar birbirine karıştırılmamalıdır.

| Kavram | Amaç |
|---|---|
| Factory Scale Tier | Fabrikanın fiziksel büyüklüğü ve ranking label değeri |
| Production Grade | Üretim hattının teknoloji seviyesi: WORKSHOP, INDUSTRIAL, PRECISION, SMART |
| Player / Factory Progress Level | Oyuncunun ilgili fabrika/sektördeki ilerleme ve unlock seviyesi |
| Ranking | Oyuncunun diğer oyunculara göre performans ölçümü |
| Awards | Oyuncuya küçük ve orta vadeli hedefler veren başarı sistemi |
| Monetization | Üretim avantajı satmadan yeni içerik ve oynanış alanı açma sistemi |

Yanlış yaklaşım:

```text
Player Level 20 oldu → üretim kapasitesi +%25
```

Doğru yaklaşım:

```text
Player Level 20 oldu → yeni müşteri segmenti / yeni rapor / yeni senaryo / yeni grade erişimi açıldı
```

Player Level doğrudan üretim kapasitesi vermemelidir.
Üretim kapasitesi hâlâ `ProductionLineTemplate`, `FactoryProductionLine`, personel, kondisyon ve vardiya simülasyonu üzerinden gelir.

---

# 2. Player Level Scope Kararı

Oyuncu ileride birden fazla sektörde oynayabileceği için level sistemi dikkatli tasarlanmalıdır.

Önerilen ana karar:

```text
Gameplay progression factory/sector scoped olmalıdır.
```

Yani oyuncunun Textile fabrikası Level 28 iken Chocolate fabrikası Level 1 olabilir.
Bu, yeni sektör açıldığında oyuncunun eski sektörde kazandığı güçle yeni sektörü ezmesini engeller.

Önerilen yapı:

| Yapı | Açıklama |
|---|---|
| Factory.currentLevel | O fabrikanın ilgili sektördeki oyun ilerleme seviyesi |
| Factory.currentXp | O fabrikanın XP değeri |
| Player global profile level | İleride kozmetik / profil prestiji için eklenebilir |

MVP için asıl kullanılacak yapı:

```text
Factory.currentLevel
Factory.currentXp
```

Global oyuncu seviyesi beta için zorunlu değildir.
Ancak profil kartı, toplam başarı ve hesabın genel prestiji için ileride eklenebilir.

---

# 3. Player Level Ne İşe Yarar?

Player / Factory Progress Level şu alanlarda kullanılmalıdır:

1. Yeni müşteri segmentlerini açmak
2. Yeni teklif tiplerini açmak
3. Yeni production grade satın alma izni vermek
4. Leasing gibi finans seçeneklerini açmak
5. Rapor ekranlarını genişletmek
6. Award zincirlerini açmak
7. Ranking ekranını açmak
8. Eğitim / onboarding adımlarını ilerletmek
9. Senaryo paketlerine hazırlık seviyesi vermek
10. Oyuncuya sürekli ilerleme hissi sağlamak

Player Level şu alanlarda kullanılmamalıdır:

| Kullanım | Karar |
|---|---|
| Direkt üretim hızı bonusu | Hayır |
| Direkt kapasite artışı | Hayır |
| Sipariş teslim süresini otomatik düşürme | Hayır |
| Kaos olaylarını otomatik azaltma | Hayır |
| Daha fazla para basma | Hayır |

---

# 4. XP Kaynakları

XP, yalnızca üretim adedinden gelmemelidir.
Aksi halde Basic yüksek adet çalışan oyuncu, Premium/Luxury stratejisi oynayan oyuncuyu haksız şekilde ezer.

XP kaynakları dengeli olmalıdır.

| Kaynak | XP Rolü |
|---|---|
| Vardiya tamamlamak | Düşük temel XP |
| Sipariş tamamlamak | Ana XP kaynağı |
| Zamanında sevkiyat | Bonus XP |
| Gecikmesiz 7 oyun günü | Planlama bonusu |
| Premium/Luxury sipariş tamamlamak | Zorluk bonusu |
| Yeni üretim hattı satın almak | Milestone XP |
| Factory Scale yükseltmek | Büyük milestone XP |
| Finans ayını kârlı kapatmak | Yönetim XP |
| Pozitif cash flow korumak | Finansal yönetim XP |
| Fason işi başarıyla tamamlamak | Operasyon XP |
| Award tamamlamak | Claim XP |

XP oyuncuya para yerine ilerleme hissi verir.
Finans sistemi kasayı, XP sistemi motivasyonu yönetir.

---

# 5. XP Anti-Abuse Kararları

XP sistemi kolay suistimal edilmemelidir.

Yanlış davranış örneği:

```text
Oyuncu sürekli çok küçük ve risksiz siparişler alır.
Sadece XP kasmak için üretim simülasyonunu spamler.
```

Bu yüzden XP hesaplarında şu sınırlar kullanılabilir:

1. Aynı gün vardiya XP’si çok düşük olmalı.
2. Sipariş XP’si sadece tamamlanmış ve sevk edilmiş işten gelmeli.
3. Çok küçük siparişlerde minimum XP limiti düşük tutulmalı.
4. Gecikmiş / zarar ettiren siparişler daha az XP vermeli.
5. Aynı award tekrar tekrar sınırsız XP vermemeli.
6. Queue drag-drop gibi oyuncu aksiyonları doğrudan XP vermemeli.

Queue yönetimi oyun stratejisidir, XP çiftliği değildir.
Oyuncunun listeyi 40 kere sürüklemesi başarı sayılmamalı. İnsanlık zaten yeterince tıklıyor.

---

# 6. XP Hesap Mantığı

Basit MVP formülü:

```ts
orderXp =
  baseOrderXp
  + quantityFactorXp
  + productTierBonusXp
  + onTimeBonusXp
  + complexityBonusXp
  - delayPenaltyXp
```

Örnek alanlar:

| Etki | Açıklama |
|---|---|
| `baseOrderXp` | Her tamamlanan sipariş için temel XP |
| `quantityFactorXp` | Adet / workload büyüklüğüne göre XP |
| `productTierBonusXp` | Premium / Luxury zorluk bonusu |
| `onTimeBonusXp` | Termin başarısı |
| `complexityBonusXp` | Çok ürünlü / fasonlu sipariş bonusu |
| `delayPenaltyXp` | Gecikme varsa XP azaltımı |

XP, toplam adet yerine üretim workload point üzerinden hesaplanırsa daha dengeli olur.

Örnek:

```ts
workloadXp = Math.floor(totalOrderWorkloadPoints / 1000)
```

Bu sayede 500 adet Luxury ceket ile 500 adet Basic T-shirt aynı XP’yi vermez.
Sonunda matematik işe yarar, şaşırtıcı ama gerçek.

---

# 7. Level Config Yapısı

Level değerleri hardcode edilmemelidir.
Database config veya seed data olarak tutulmalıdır.

Önerilen model:

```prisma
model PlayerLevelConfig {
  id              String        @id @default(cuid())

  sectorId        String?       @map("sector_id")

  level           Int
  requiredXp      Int           @map("required_xp")

  unlockKey       String?       @map("unlock_key")
  rewardXp        Int           @default(0) @map("reward_xp")
  rewardCashCents BigInt?       @map("reward_cash_cents")

  status          ContentStatus @default(ACTIVE)
  metadata        Json?

  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  sector          Sector?       @relation(fields: [sectorId], references: [id], onDelete: Cascade)

  @@unique([sectorId, level])
  @@index([sectorId, status])
  @@map("player_level_configs")
}
```

Not:

- `sectorId = null` olursa global level config anlamına gelebilir.
- Textile gibi sektöre özel progression için `sectorId` dolu olmalıdır.

---

# 8. Factory Üzerindeki Level Alanları

`Factory` tablosunda şu alanlar bulunabilir:

```prisma
currentLevel Int @default(1) @map("current_level")
currentXp    Int @default(0) @map("current_xp")
```

Bu alanlar fabrikanın ilgili sektördeki gameplay progression değeridir.
Factory Scale ile karıştırılmamalıdır.

Örnek:

```text
Factory currentLevel: 18
Factory Scale: Small Garment Workshop
Sewing Line Grade: Industrial
```

Bu üç değer ayrı şeydir.

---

# 9. XP Transaction Ledger

XP hareketleri de para gibi izlenebilir olmalıdır.
Ancak finans ledger kadar uzun süre detaylı tutulması şart değildir.

Önerilen model:

```prisma
model FactoryXpTransaction {
  id              String   @id @default(cuid())

  factoryId       String   @map("factory_id")
  gameDay         Int      @map("game_day")

  amountXp        Int      @map("amount_xp")
  balanceAfterXp  Int      @map("balance_after_xp")

  sourceType      String?  @map("source_type")
  sourceId        String?  @map("source_id")

  reason          XpReason
  metadata        Json?

  createdAt       DateTime @default(now()) @map("created_at")

  factory         Factory  @relation(fields: [factoryId], references: [id], onDelete: Cascade)

  @@index([factoryId, gameDay])
  @@index([sourceType, sourceId])
  @@map("factory_xp_transactions")
}
```

Enum:

```prisma
enum XpReason {
  SHIFT_COMPLETED
  ORDER_COMPLETED
  ON_TIME_DELIVERY
  PREMIUM_ORDER
  LUXURY_ORDER
  FACTORY_EXPANSION
  SCALE_UP
  FINANCE_MONTH_PROFIT
  AWARD_CLAIM
  OUTSOURCE_COMPLETED
}
```

---

# 10. Level Unlock Örnekleri

Textile beta için örnek progression:

| Level | Unlock |
|---:|---|
| 1 | Başlangıç fabrika |
| 2 | Basic daily goals |
| 3 | Yeni müşteri teklifleri |
| 5 | Yeni production line satın alma sistemi |
| 8 | Küçük Premium sipariş ihtimali |
| 10 | Industrial grade erişimi |
| 12 | Gelişmiş finans dashboard |
| 15 | Ranking ekranı |
| 18 | Luxury Boutique küçük teklifleri |
| 20 | Precision grade erişimi |
| 25 | Gelişmiş leasing seçenekleri |
| 30 | Large Retail müşteri erişimi |
| 35 | Premium/Luxury koleksiyon teklifleri |
| 40 | Smart grade erişimi |
| 50 | Enterprise ranking segmenti |

Bu değerler dengeleme sırasında değiştirilebilir.
Önemli olan level sisteminin direkt kapasite vermemesi, yeni strateji alanları açmasıdır.

---

# 11. Awards / Achievement Sistemi

Awards oyuncuya kısa ve orta vadeli hedefler verir.

Award sistemi şu hissi oluşturmalıdır:

```text
Bir vardiya daha yaparsam şu hedef tamamlanacak.
Bir sipariş daha zamanında sevk edersem ödül alacağım.
Bu ayı kârlı kapatırsam rozet açılacak.
```

Award türleri:

| Tür | Örnek |
|---|---|
| First Time | İlk vardiya, ilk sevkiyat |
| Production | 100.000 sewing point kullan |
| Delivery | 7 gün gecikmesiz çalış |
| Finance | Ayı kârla kapat |
| Expansion | Yeni hat satın al |
| Outsource | 5 fason işi tamamla |
| Premium/Luxury | İlk luxury siparişi tamamla |
| Queue Strategy | Departman kuyruğunu stratejik kullan |
| Scale | Factory Scale yükselt |
| Ranking | İlk 100’e gir |

---

# 12. Award Örnekleri

| Award Key | Açıklama | Ödül |
|---|---|---|
| `first_shift` | İlk vardiyayı tamamla | XP |
| `first_delivery` | İlk siparişi sevk et | XP + küçük cash |
| `no_delay_week` | 7 oyun günü gecikmesiz çalış | XP + badge |
| `sewing_master_1` | 100.000 sewing point kullan | XP |
| `premium_starter` | İlk premium siparişi tamamla | XP + badge |
| `luxury_first_deal` | İlk luxury siparişi tamamla | XP + profil badge |
| `cash_survivor` | Finans ayını pozitif kasayla kapat | XP |
| `queue_strategist` | 10 departman kuyruğu manuel düzenle | Badge |
| `outsource_manager` | 5 fason işi başarıyla tamamla | XP |
| `factory_expansion` | İlk yeni production line satın al | XP |
| `scale_up` | Factory Scale yükselt | XP + badge |

Not:

Queue drag-drop doğrudan sınırsız XP üretmemelidir.
`queue_strategist` gibi ödüller sınırlı milestone olarak kullanılmalıdır.

---

# 13. Claimable Reward Kararı

Award tamamlandığında ödül otomatik verilmemelidir.
Oyuncu ödülü `Claim` butonu ile almalıdır.

Akış:

```text
Award condition completed
↓
Award status = COMPLETED
↓
Oyuncu Claim eder
↓
XP / badge / küçük cash / kozmetik verilir
↓
Award status = CLAIMED
```

Bu tıklama hissi oyuncuya küçük dopamin verir.
Ama sistem kırmızı nokta çöplüğüne dönmemelidir.
Oyuncuyu ödüllendirelim, taciz etmeyelim. İnce çizgi, insanlık çoğu zaman kaçırıyor.

---

# 14. AwardDefinition Modeli

```prisma
model AwardDefinition {
  id              String        @id @default(cuid())

  sectorId        String?       @map("sector_id")

  key             String
  category        AwardCategory
  scope           AwardScope    @default(FACTORY)

  targetValue     Int           @default(1) @map("target_value")

  rewardXp        Int           @default(0) @map("reward_xp")
  rewardCashCents BigInt?       @map("reward_cash_cents")
  rewardMetadata  Json?         @map("reward_metadata")

  sortOrder       Int           @default(0) @map("sort_order")
  status          ContentStatus @default(ACTIVE)
  metadata        Json?

  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  sector          Sector?       @relation(fields: [sectorId], references: [id], onDelete: Cascade)
  translations    AwardDefinitionTranslation[]

  @@unique([sectorId, key])
  @@index([sectorId, status])
  @@index([category])
  @@map("award_definitions")
}
```

Translation:

```prisma
model AwardDefinitionTranslation {
  id                String          @id @default(cuid())

  awardDefinitionId String          @map("award_definition_id")
  locale            String

  name              String
  description       String?

  awardDefinition   AwardDefinition @relation(fields: [awardDefinitionId], references: [id], onDelete: Cascade)

  @@unique([awardDefinitionId, locale])
  @@index([locale])
  @@map("award_definition_translations")
}
```

Enums:

```prisma
enum AwardCategory {
  PRODUCTION
  DELIVERY
  FINANCE
  EXPANSION
  OUTSOURCE
  QUALITY
  QUEUE
  RANKING
  FIRST_TIME
}

enum AwardScope {
  GLOBAL
  SECTOR
  FACTORY
}
```

---

# 15. FactoryAwardProgress Modeli

MVP için award progress fabrika bazlı tutulmalıdır.

```prisma
model FactoryAwardProgress {
  id                String              @id @default(cuid())

  factoryId         String              @map("factory_id")
  awardDefinitionId String              @map("award_definition_id")

  currentValue      Int                 @default(0) @map("current_value")
  targetValue       Int                 @default(1) @map("target_value")

  status            AwardProgressStatus @default(IN_PROGRESS)

  completedAt       DateTime?           @map("completed_at")
  claimedAt         DateTime?           @map("claimed_at")

  metadata          Json?

  createdAt         DateTime            @default(now()) @map("created_at")
  updatedAt         DateTime            @updatedAt @map("updated_at")

  factory           Factory             @relation(fields: [factoryId], references: [id], onDelete: Cascade)
  awardDefinition   AwardDefinition     @relation(fields: [awardDefinitionId], references: [id], onDelete: Cascade)

  @@unique([factoryId, awardDefinitionId])
  @@index([factoryId, status])
  @@map("factory_award_progress")
}
```

Enum:

```prisma
enum AwardProgressStatus {
  IN_PROGRESS
  COMPLETED
  CLAIMED
}
```

---

# 16. Task / Goal Sistemi

Daily / weekly görevler oyuna tıklanabilir kısa hedefler ekleyebilir.
Ancak Factory Runway gerçek zamanlı mobil idle oyun değildir.
Bu yüzden görevler gerçek dünya günü yerine oyun günü / oyun haftası üzerinden çalışmalıdır.

Öneri:

| Görev Tipi | Süre |
|---|---|
| Daily Goal | 1 oyun günü |
| Weekly Goal | 7 oyun günü |
| Finance Period Goal | 22 oyun günü |

Örnek görevler:

- Bugün en az 2 hattı %80 üzerinde kullan
- Bugün gecikme riski olan işi öne al
- 7 oyun günü boyunca gecikmesiz sevkiyat yap
- 22 oyun günü sonunda kârlı kal
- Bu hafta 2 fason işi başarıyla tamamla

MVP’de task sistemi zorunlu değildir.
İlk beta için awards yeterli olabilir.
Task sistemi ikinci iterasyonda eklenebilir.

---

# 17. Ranking Sistemi

Ranking yalnızca Factory Scale’e göre yapılmamalıdır.
Büyük fabrika kurmak başarıdır ama iyi yönetilmeyen büyük fabrika sadece pahalı bir kaostur.

Ranking score şu metrikleri dikkate almalıdır:

| Metrik | Açıklama |
|---|---|
| Factory Scale | Fabrika büyüklüğü ve prestij |
| Total Daily Point Capacity | Üretim gücü |
| Average Utilization | Kapasiteyi kullanma başarısı |
| Delivery Reliability | Zamanında teslim oranı |
| Quality Score | Fire / rework / şikayet dengesi |
| Financial Health | Kasa, kârlılık, borç yükü |
| Revenue | Ticari büyüklük |
| Net Profit | Gerçek kazanç |
| Support Coverage | Yönetim ve destek kadrosu yeterliliği |
| Order Tier Mix | Premium/Luxury iş başarısı |

Ranking sadece “en büyük kim?” sorusunu değil, “en iyi kim yönetiyor?” sorusunu cevaplamalıdır.

---

# 18. Ranking Kategorileri

Oyuncular farklı stratejilerle öne çıkabilmelidir.

Önerilen ranking kategorileri:

| Ranking | Açıklama |
|---|---|
| Overall Ranking | Genel başarı skoru |
| Textile Ranking | Sektör bazlı genel skor |
| Mass Producer | En yüksek adet / point üretimi |
| Delivery Master | En iyi zamanında teslim oranı |
| Profit Leader | En yüksek net kâr |
| Premium Specialist | Premium sipariş başarısı |
| Luxury Producer | Luxury sipariş başarısı |
| Cash Efficient | En iyi nakit yönetimi |
| Fast Growing Factory | En hızlı scale büyümesi |
| Stable Operator | Düşük kaos etkisi + yüksek planlama başarısı |

Bu sayede yalnızca büyük adet çalışan oyuncu değil, niş premium/luxury stratejisi oynayan oyuncu da görünür olur.

---

# 19. Ranking Score MVP Formülü

Basit MVP formülü:

```ts
rankingScore =
  factoryScaleScore
  + capacityScore
  + utilizationScore
  + deliveryScore
  + financeScore
  + qualityScore
  + premiumLuxuryScore
```

Örnek ağırlıklar:

| Skor | Ağırlık |
|---|---:|
| Factory Scale | 15% |
| Capacity | 15% |
| Utilization | 15% |
| Delivery Reliability | 20% |
| Finance / Profit | 20% |
| Quality | 10% |
| Premium/Luxury Mix | 5% |

Bu değerler seed/config üzerinden değiştirilebilir.

Önemli karar:

```text
Ranking canlı sorgularla sürekli hesaplanmamalıdır.
Ranking snapshot mantığıyla güncellenmelidir.
```

Yani her oyuncu leaderboard açtığında tüm üretim geçmişini hesaplatmayacağız.
Veritabanı da bu iyiliği hak etti.

---

# 20. Ranking Season ve Snapshot

Ranking dönemsel çalışmalıdır.

Öneri:

| Period | Süre |
|---|---:|
| Weekly | 7 oyun günü |
| Monthly / Finance Period | 22 oyun günü |
| All Time | Özetlenmiş toplam |

Model:

```prisma
model RankingSeason {
  id            String        @id @default(cuid())

  key           String        @unique
  sectorId      String?       @map("sector_id")

  periodType    RankingPeriodType @map("period_type")
  startGameDay  Int           @map("start_game_day")
  endGameDay    Int           @map("end_game_day")

  status        RankingSeasonStatus @default(ACTIVE)
  metadata      Json?

  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  sector        Sector?       @relation(fields: [sectorId], references: [id], onDelete: Cascade)

  @@index([sectorId, status])
  @@map("ranking_seasons")
}
```

Enums:

```prisma
enum RankingPeriodType {
  WEEKLY
  FINANCE_PERIOD
  ALL_TIME
}

enum RankingSeasonStatus {
  ACTIVE
  CLOSED
  ARCHIVED
}
```

---

# 21. FactoryRankingSnapshot Modeli

```prisma
model FactoryRankingSnapshot {
  id                    String   @id @default(cuid())

  factoryId             String   @map("factory_id")
  rankingSeasonId       String   @map("ranking_season_id")

  category              RankingCategory

  rankingScore          Int      @default(0) @map("ranking_score")
  rankPosition          Int?     @map("rank_position")

  factoryScaleScore     Int      @default(0) @map("factory_scale_score")
  capacityScore         Int      @default(0) @map("capacity_score")
  utilizationScore      Int      @default(0) @map("utilization_score")
  deliveryScore         Int      @default(0) @map("delivery_score")
  financeScore          Int      @default(0) @map("finance_score")
  qualityScore          Int      @default(0) @map("quality_score")
  premiumLuxuryScore    Int      @default(0) @map("premium_luxury_score")

  metadata              Json?

  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  factory               Factory       @relation(fields: [factoryId], references: [id], onDelete: Cascade)
  rankingSeason         RankingSeason @relation(fields: [rankingSeasonId], references: [id], onDelete: Cascade)

  @@unique([factoryId, rankingSeasonId, category])
  @@index([rankingSeasonId, category, rankingScore])
  @@index([factoryId])
  @@map("factory_ranking_snapshots")
}
```

Enum:

```prisma
enum RankingCategory {
  OVERALL
  MASS_PRODUCER
  DELIVERY_MASTER
  PROFIT_LEADER
  PREMIUM_SPECIALIST
  LUXURY_PRODUCER
  CASH_EFFICIENT
  FAST_GROWING
  STABLE_OPERATOR
}
```

---

# 22. Ranking Güncelleme Zamanı

Ranking her vardiyada tam hesaplanmamalıdır.

Önerilen güncelleme noktaları:

1. Her 7 oyun günü sonunda weekly snapshot
2. Her 22 oyun günü sonunda finance period snapshot
3. Factory Scale değiştiğinde kısmi snapshot
4. Oyuncu ranking ekranını açtığında mevcut snapshot okunur

Canlı ranking sorgusu sadece küçük MVP test ortamında kullanılabilir.
Gerçek beta için snapshot yaklaşımı tercih edilmelidir.

---

# 23. Monetization Ana Kararı

Factory Runway içinde ücretlendirme doğrudan üretim avantajı satışı üzerine kurulmayacaktır.

Satılmayacak şeyler:

- Üretim hızı boost
- Daha yüksek kapasite
- Direkt oyun parası / cash paketi
- XP satın alma
- Sipariş avantajı
- Daha düşük arıza / daha az kaos
- Daha iyi ranking skoru
- Daha hızlı vardiya sonucu

Bu tür satışlar simülasyon dengesini bozar.
Oyuncu para verdiği için daha iyi fabrika işletmemelidir.
Daha iyi fabrika işletmek için daha iyi karar vermelidir. Ne garip ve radikal bir fikir.

---

# 24. Uygun Monetization Alanları

Monetization yeni içerik, yeni sektör, yeni senaryo ve kozmetik genişleme üzerinden kurulmalıdır.

Uygun modeller:

| Model | Açıklama |
|---|---|
| Sector Expansion Pack | Yeni sektör paketi |
| Brand Builder Expansion | Kendi markanı oluşturma sistemi |
| Retail / Store Expansion | Mağaza ve satış kanalı yönetimi |
| Scenario Pack | Özel görev ve kriz senaryoları |
| Cosmetic Pack | UI skin, fabrika tema, profil badge |
| Supporter / Founder Pack | Destekçi rozeti, özel profil çerçevesi |
| Season Awards | Kozmetik ve prestij ağırlıklı sezon ödülleri |

---

# 25. Ücretli Genişleme Modülleri

## 25.1 Sector Expansion Packs

Yeni sektör paketleri ayrı ücretli içerik olarak sunulabilir.

Örnek:

- Textile
- Chocolate
- Toys
- Furniture
- Electronics

Her sektör kendi ürünleri, üretim hatları, müşteri segmentleri, sipariş matematiği ve simülasyon dengesiyle ayrı oynanış sunar.

## 25.2 Brand Builder Expansion

Oyuncu yalnızca fason üretici olmaktan çıkar ve kendi markasını kurabilir.

Açılabilecek sistemler:

- Marka oluşturma
- Koleksiyon hazırlama
- Ürünleri kendi markasıyla üretme
- Marka bilinirliği
- Pazarlama bütçesi
- Perakende fiyatlandırma
- Stok riski
- Satış tahmini

Bu modül CMT üretimden farklı bir risk getirir.
Oyuncu artık yalnızca üretmez, satılmayan stok riskini de taşır.
Yani başarı ihtimali artar, ama felaket seçenekleri de zenginleşir.

## 25.3 Retail / Store Expansion

Oyuncu kendi mağaza veya satış kanallarını açabilir.

Açılabilecek sistemler:

- Mağaza açma
- Online satış kanalı
- Bölge / ülke bazlı mağaza yönetimi
- Raf / stok planlama
- Perakende satış raporları
- İade / müşteri memnuniyeti
- Sezon yönetimi

Bu modül üretim simülasyonunu perakende yönetimiyle genişletir.

## 25.4 Scenario Packs

Oyuncuya özel zorluk senaryoları sunulabilir.

Örnek:

- Kriz döneminde fabrikayı ayakta tut
- Büyük müşteri denetimine hazırlan
- 60 günde ihracat siparişini tamamla
- Sadece premium ürünlerle kâra geç
- Düşük sermayeyle büyüme görevi
- Arıza ve personel eksikliği yüksek sezonda ayakta kal

Scenario pack’ler tekrar oynanabilir hedefler ve ayrı ranking tabloları içerebilir.

## 25.5 Cosmetic / Supporter Packs

Oyuna etki etmeyen görsel paketler satılabilir.

Örnek:

- Fabrika zemin temaları
- UI skin
- Profil badge
- Founder badge
- Ranking kartı çerçevesi
- Özel fabrika isim plakası
- Özel award ikonları

---

# 26. Ana Oyun ve Genişleme Yolculuğu

Factory Runway’in büyüme yolu şu şekilde planlanabilir:

```text
CMT Factory
  ↓
Advanced Factory
  ↓
Brand Owner
  ↓
Retail Network
  ↓
Multi-Sector Business Group
```

Ana oyun CMT fabrika işletmesi üzerine kuruludur:

```text
Sipariş al
Üretimi planla
Fabrikayı büyüt
Finansı yönet
Ranking ve awards ile ilerle
```

Ücretli modüller bu ana döngüyü bozmaz.
Sadece oyuncuya yeni strateji katmanları açar.

---

# 27. UI Gösterimleri

Oyuncuya gösterilecek alanlar:

## Factory Dashboard

- Current Level
- Current XP
- Next Level Progress
- Active Awards
- Claimable Awards
- Current Ranking Class
- Weekly / Finance Period Rank

## Profile / Ranking Card

- Factory Name
- Sector
- Factory Scale
- Ranking Class
- Player / Factory Level
- Awards Count
- Best Ranking Category

## Award Panel

- Completed awards
- In progress awards
- Claimable rewards
- Locked awards
- Reward preview

## Ranking Panel

- Overall rank
- Category rank
- Weekly rank
- Finance period rank
- Comparison metrics

---

# 28. Performans Kararları

Bu sistemde performans için şu kararlar uygulanmalıdır:

1. Ranking canlı ağır sorgularla hesaplanmamalıdır.
2. Ranking için snapshot kullanılmalıdır.
3. Award progress her eventte tüm award’ları taramamalıdır.
4. Event bazlı ilgili award’lar güncellenmelidir.
5. XP transaction detayları beta sonrası özetlenebilir.
6. Çok eski ranking snapshotları arşivlenebilir.
7. Claim edilmiş eski award kayıtları tutulabilir; sayısı düşük olacağı için sorun yaratmaz.
8. Daily/weekly task sistemi MVP için ertelenebilir.

---

# 29. MVP İçin Minimum Kapsam

İlk beta için zorunlu sistemler:

| Sistem | Gerekli mi? |
|---|---|
| Factory currentLevel/currentXp | Evet |
| PlayerLevelConfig | Evet |
| FactoryXpTransaction | Evet |
| AwardDefinition | Evet |
| FactoryAwardProgress | Evet |
| Claimable award | Evet |
| Basic ranking snapshot | Evet |
| Çok detaylı task sistemi | Hayır |
| Season pass sistemi | Hayır |
| Monetization ödeme altyapısı | Beta sonrası |
| Brand/Retail expansion | İleride |

---

# 30. Final Karar Özeti

| Konu | Karar |
|---|---|
| Player Level | Factory/sector scoped gameplay progress olarak kullanılacak |
| Factory Scale ile ilişkisi | Ayrı sistemler |
| Production Grade ile ilişkisi | Ayrı sistemler |
| XP üretim kapasitesi verir mi? | Hayır |
| XP ne işe yarar? | Level, unlock, ödül ve ilerleme hissi |
| Award claim gerekli mi? | Evet |
| Award ödülleri | XP, badge, küçük cash, kozmetik |
| Ranking sadece scale mi? | Hayır |
| Ranking snapshot mı? | Evet |
| Monetization üretim avantajı satar mı? | Hayır |
| Uygun monetization | Sector, scenario, brand, retail, cosmetic, supporter pack |
| XP/cash satışı | Hayır |
| Speed boost satışı | Hayır |
| Daily/weekly task | MVP sonrası eklenebilir |

Final amaç:

```text
Oyuncu üretim planlarken strateji kuracak.
Finans ekranında parasını yönetecek.
XP ve awards ile sürekli ilerleme hissi alacak.
Ranking ile kendini diğer oyuncularla karşılaştıracak.
Monetization ise hile değil, yeni oynanış alanı satacak.
```

Bu yapı Factory Runway’i sadece hesap yapan bir fabrika simülasyonu olmaktan çıkarır.
Oyuncuya hedef, prestij, rekabet ve tekrar oynama sebebi verir.
