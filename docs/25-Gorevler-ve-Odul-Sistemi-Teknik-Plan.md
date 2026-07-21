# 25 - Görevler ve Ödül Sistemi Teknik Planı

Bu doküman Factory Runway için görevler, müdür tavsiyeleri, XP, Runway Token ve Awards sistemlerinin teknik planını tanımlar.

Bu belge planlama aşamasıdır. Bu fazda Prisma şeması, servisler, server action'lar veya UI kodu değiştirilmez.

## 1. Amaç

Factory Runway'de oyuncunun yalnızca sipariş kabul edip vardiya ilerletmesi yeterli olmamalıdır.

Oyuncu şu gelişim zincirini doğal biçimde öğrenmelidir:

~~~
İlk sipariş
→ Üretim
→ Sevkiyat
→ Tahsilat
→ Kuyruk ve darboğaz
→ Yatırım kararı
→ Personel ve stage yönetimi
→ Yeni kapasite
→ Daha değerli siparişler
~~~

Bu sistem beş farklı sorumluluğu birbirinden ayırır:

| Sistem | Oyuncuya verdiği şey |
|---|---|
| Tutorial | İlk sistemleri adım adım öğretir |
| Hikâye Görevleri | Oyuncuya sıradaki gelişim yönünü gösterir |
| Müdür Tavsiyeleri | Mevcut fabrika durumunu yorumlar ve aksiyon önerir |
| XP | Kalıcı fabrika/seviye gelişimi sağlar |
| Runway Token | Harcanabilir meta ödül birimidir |
| Awards | Geçmiş başarıları ve prestiji kayıt altına alır |

## 2. Mevcut Sistemle İlişki

Görev sistemi mevcut motorların üzerine kurulmalıdır. Sipariş, simülasyon, yatırım veya finans motorları yeniden yazılmamalıdır.

Mevcut kullanılabilir kaynaklar:

| İhtiyaç | Mevcut kaynak |
|---|---|
| XP ve fabrika seviyesi | "Factory.currentXp", "Factory.currentLevel", "FactoryXpTransaction" |
| Sipariş kabulü | "CustomerOrder", "MarketOrderOffer" |
| Üretim ilerlemesi | "ProductionOrder", "ProductionOrderRouteProgress" |
| Vardiya sonucu | "ShiftSimulation", "ShiftLineResult", "ShiftDepartmentResult" |
| Sevkiyat | "CustomerOrder.shippedDay", "CustomerOrder.status" |
| Tahsilat | "FactoryFinanceTransaction", "FactoryFinanceDue" |
| Finans dönemi | "FactoryFinancePeriodSnapshot" |
| Yatırım | "FactoryProductionLine", yatırım servisleri |
| Leasing | "FactoryLeasingContract" |
| Stage | "FactoryOperatingStageState", stage requirement modelleri |
| Başarı | "AwardDefinition", "FactoryAwardProgress" |

İlgili mevcut belgeler:

- [12-PlayerLevel_Ranking_and_Awards.md](./12-PlayerLevel_Ranking_and_Awards.md)
- [15-Factory_Operating_Stage_and_Shared_Cost.md](./15-Factory_Operating_Stage_and_Shared_Cost.md)
- [18-Player_Onboarding_Factory_Setup_Flow.md](./18-Player_Onboarding_Factory_Setup_Flow.md)
- [20-vardiya-simulasyonu-gunluk-olay-paneli-ve-tetikleyici-sistemi.md](./20-vardiya-simulasyonu-gunluk-olay-paneli-ve-tetikleyici-sistemi.md)
- [23-compact-yatirim-paneli-scroll-ve-leasing-sistemi.md](./23-compact-yatirim-paneli-scroll-ve-leasing-sistemi.md)
- [24-faz-4-gunluk-olay-paneli-ve-kalici-vardiya-sonuc-paneli.md](./24-faz-4-gunluk-olay-paneli-ve-kalici-vardiya-sonuc-paneli.md)

## 3. Mevcut Eksikler

### 3.1. Görev katmanı

Prisma şemasında genel görev tanımı ve fabrika görev ilerlemesi bulunmamaktadır.

"TutorialProgress" yalnızca ilk sipariş tutorial'ına aittir ve genel görev sistemi için genişletilmemelidir.

### 3.2. Görev UI'ı

"GamePanelKey" içinde "tasks" tanımlıdır; ancak görev paneli henüz yer tutucudur. "GameSnapshot" içinde aktif görev, ödül veya görev ilerlemesi bulunmamaktadır.

### 3.3. Awards uygulaması

"AwardDefinition" ve "FactoryAwardProgress" modelleri mevcuttur. Ancak ilerleme evaluator'ı, claim action'ı ve ödül verme servisi görev sistemiyle henüz bağlanmamıştır.

### 3.4. Runway Token

Mevcut şemada oyuncuya ait harcanabilir meta para birimi veya token ledger'ı bulunmamaktadır.

"Factory.cashBalanceCents" Runway Token için kullanılmamalıdır. Factory cash, üretim ekonomisine aittir.

### 3.5. Müdür tavsiyeleri

Mevcut bildirim sistemi anlık ve sınırlıdır. Geciken sipariş ve aktif üretim emri gibi durumları bildirir; kural tabanlı, aksiyon bağlantılı tavsiye sistemi henüz yoktur.

### 3.6. Event kullanımı

Vardiya event'leri playback ve günlük olay paneli için kullanılabilir. Ancak görev ilerlemesi yalnızca client tarafındaki timeline'a bırakılmamalıdır.

Sipariş kabulü, yatırım ve leasing gibi vardiya dışı aksiyonlar da görev ilerlemesine kaynak olmalıdır.

## 4. Kapsam Dışı Bırakılan Kararlar

İlk uygulama aşağıdaki özellikleri kapsamaz:

- Gerçek para ile Runway Token satın alma
- Turnuva sistemi
- Token mağazası
- Sezon bileti
- Karmaşık daily/weekly görev üretimi
- Yapay zekâ tabanlı müdür
- Üretim avantajı satan token harcamaları

Bu özellikler için gerekli temel ledger altyapısı hazırlanabilir; fakat ödeme ve turnuva sistemleri daha sonraki fazlara bırakılır.

## 5. Veri Modeli Kararı

### 5.1. TaskDefinition

Görev içeriklerinin master tanımıdır.

Önerilen alanlar:

~~~
id
scopeKey
sectorId
key
taskType
chapterKey
sortOrder
prerequisiteTaskKey
activationDay
objectiveType
targetValue
objectiveConfig
rewardXp
rewardRunwayTokens
rewardCashCents
status
metadata
createdAt
updatedAt
~~~

"taskType" ilk sürümde:

~~~
STORY
~~~

İleride:

~~~
REPEATABLE
SCENARIO
~~~

olarak genişletilebilir.

"scopeKey", mevcut "AwardDefinition" ve "PlayerLevelConfig" yaklaşımıyla uyumlu olmalıdır.

Örnek:

~~~
GLOBAL
sector-id
~~~

Önerilen "objectiveType" değerleri:

~~~
ACCEPT_ORDER
COMPLETE_SHIFT
SHIP_ON_TIME
PAYMENT_RECEIVED
CHANGE_PRIORITY
ACQUIRE_PRODUCTION_LINE
USE_NEW_PRODUCTION_LINE
COMPLETE_OUTSOURCE
MEET_STAGE_STAFF
CLOSE_PROFITABLE_FINANCE_PERIOD
COMPLETE_PREMIUM_ORDER
COMPLETE_EXPRESS_ORDER
~~~

"objectiveConfig" yalnızca objective türüne özel parametreler için kullanılmalıdır.

Örnek:

~~~json
{
  "acquisitionTypes": ["PURCHASED", "LEASED"],
  "departmentKey": "SEWING"
}
~~~

Görev adımları ilk sürümde ayrı görev tanımları olarak tutulacaktır. Görevlerin "prerequisiteTaskKey" ve "sortOrder" alanları hikâye zincirini oluşturacaktır.

İleride tek görevin içinde çoklu adım ihtiyacı oluşursa ayrıca "TaskStepDefinition" modeli eklenebilir. İlk sürümde bu tablo gereksizdir.

### 5.2. TaskDefinitionTranslation

Görevlerin çoklu dil içeriğini tutar.

~~~text
id
taskDefinitionId
locale
title
description
completionMessage
createdAt
updatedAt
~~~

Görev açıklamaları doğrudan Türkçe cümle olarak master tabloya yazılmamalıdır.

### 5.3. FactoryTaskProgress

Bir fabrikanın görevdeki runtime ilerlemesidir.

~~~text
id
factoryId
taskDefinitionId
instanceKey
status
currentValue
targetValue
startedDay
completedDay
claimedDay
expiresDay
rewardSnapshot
metadata
createdAt
updatedAt
~~~

Önerilen unique kısıtı:

~~~text
factoryId + taskDefinitionId + instanceKey
~~~

Örnek instance anahtarları:

~~~text
STORY:default
DAILY:22
WEEKLY:4
~~~

Hikâye görevleri için görev tanımı aktif olduğunda progress kaydı oluşturulur.

Görev tanımı sonradan değişse bile aktif görevin hedefi ve ödülü değişmemelidir. Bu nedenle "targetValue" ve "rewardSnapshot" runtime kaydında tutulmalıdır.

### 5.4. PlayerTokenWallet

Runway Token oyuncu profilinde, factory'den bağımsız tutulur.

~~~text
id
playerProfileId
balance
version
createdAt
updatedAt
~~~

Kural:

~~~text
Bir PlayerProfile için yalnızca bir PlayerTokenWallet bulunur.
~~~

Token bakiyesi hızlı gösterim için tutulur. Asıl denetlenebilir hareket geçmişi ledger tablosudur.

### 5.5. PlayerTokenTransaction

Her token kazanımı ve harcaması için değiştirilemez kayıt oluşturur.

~~~text
id
walletId
playerProfileId
amountDelta
balanceBefore
balanceAfter
entryType
reason
sourceType
sourceId
referenceKey
metadata
createdAt
~~~

"entryType":

~~~text
EARN
SPEND
REVERSAL
~~~

"reason":

~~~text
TASK_REWARD
AWARD_REWARD
EVENT_REWARD
TOURNAMENT_ENTRY
COSMETIC_PURCHASE
REAL_MONEY_PURCHASE
REVERSAL
~~~

"referenceKey" unique olmalıdır.

Örnek:

~~~text
TASK_REWARD:factory-task-progress-id
AWARD_REWARD:factory-award-progress-id
~~~

Client hiçbir zaman doğrudan token bakiyesi güncellememelidir.

### 5.6. FactoryManagerRecommendation — Sonraki Aşama

İlk müdür tavsiyesi sürümünde tavsiyeler mevcut state'ten anlık üretilebilir. Kullanıcı dismiss, cooldown ve geçmiş gereksinimi oluştuğunda aşağıdaki tablo eklenir:

~~~text
id
factoryId
ruleKey
occurrenceKey
status
severity
firstShownDay
lastShownDay
resolvedDay
dismissedDay
cooldownUntilDay
payload
createdAt
updatedAt
~~~

Önerilen unique kısıtı:

~~~text
factoryId + occurrenceKey
~~~

Metin yerine "ruleKey" ve parametrik payload tutulmalıdır.

Örnek:

~~~json
{
  "departmentKey": "SEWING",
  "queueDays": 4.2,
  "capacityBps": 9400,
  "cashBalanceCents": "1850000"
}
~~~

### 5.7. Daha Sonraki Token Tabloları

Gerçek para ve mağaza sistemi başladığında:

~~~text
TokenProduct
TokenPurchase
~~~

tabloları gerekir.

"TokenPurchase" içinde ödeme sağlayıcısının işlem kimliği unique tutulmalıdır. Token, ödeme sağlayıcısı doğrulanmadan verilmemelidir.

## 6. Enum Kararları

Mevcut "XpReason" enum'una görev ödülünü ayırt etmek için yeni bir değer eklenmelidir:

~~~text
TASK_CLAIM
~~~

Görev durumları:

~~~text
LOCKED
ACTIVE
COMPLETED
CLAIMED
EXPIRED
DISMISSED
~~~

Runway Token hareketleri:

~~~text
EARN
SPEND
REVERSAL
~~~

## 7. Görev İlerleme Akışı

Görev ilerlemesi ilgili domain transaction'ının içinde gerçekleşmelidir.

Örnek:

~~~text
Sipariş kabul transaction'ı
→ CustomerOrder oluşturulur
→ ProductionOrder oluşturulur
→ ilgili task event değerlendirilir
→ FactoryTaskProgress güncellenir
→ transaction tamamlanır
~~~

Yatırım örneği:

~~~text
Hat satın alma transaction'ı
→ FactoryProductionLine oluşturulur
→ FinanceTransaction oluşturulur
→ XP verilir
→ TaskProgress güncellenir
→ transaction tamamlanır
~~~

Vardiya örneği:

~~~text
simulateFactoryDay
→ üretim sonuçları
→ sevkiyat
→ finans
→ currentDay ilerlemesi
→ görev ilerlemesi
→ playback oluşturulması
~~~

Görev progress fonksiyonları idempotent olmalıdır. Aynı kaynak işlem ikinci kez işlendiğinde ilerleme veya ödül iki kez verilmemelidir.

## 8. Ödül Verme Akışı

Görev tamamlandığında progress durumu "COMPLETED" olur.

Ödül alma akışı:

~~~text
COMPLETED
→ oyuncu ödülü talep eder
→ task progress CLAIMED yapılır
→ grantFactoryXp çalışır
→ PlayerTokenTransaction oluşturulur
→ gerekiyorsa BONUS finans işlemi oluşturulur
~~~

XP ve token ödülü aynı transaction içinde verilmelidir.

Görev claim transaction'ı şu korumalara sahip olmalıdır:

- yetkilendirme: görev ilgili oyuncunun fabrikasına ait olmalı
- status kontrolü: yalnızca "COMPLETED" görev claim edilebilmeli
- unique task progress
- unique token "referenceKey"
- seri transaction veya optimistic update
- tekrar gönderilen request'in aynı sonucu vermesi

Görevlerden küçük nakit ödülü verilecekse doğrudan "cashBalanceCents" artırılmamalıdır. "FactoryFinanceTransaction" üzerinde "BONUS" kategorisi ve unique referenceKey kullanılmalıdır.

## 9. İlk Hikâye Görev Zinciri

İlk üç günlük tutorial mevcut "TutorialProgress" sistemiyle devam eder. Tutorial tamamlandıktan sonra aşağıdaki hikâye zinciri aktive edilir.

| Sıra | Görev | Objective | Önerilen ödül |
|---:|---|---|---|
| 1 | İlk normal siparişi kabul et | "ACCEPT_ORDER" | 100 XP |
| 2 | İlk üretim vardiyasını tamamla | "COMPLETE_SHIFT" | 100 XP |
| 3 | İlk siparişi zamanında sevk et | "SHIP_ON_TIME" | 150 XP + 5 RT |
| 4 | İlk müşteri tahsilatını al | "PAYMENT_RECEIVED" | 100 XP |
| 5 | Üretim kuyruğunda öncelik değiştir | "CHANGE_PRIORITY" | 150 XP |
| 6 | Yatırım seçeneklerini incele | UI guidance / yatırım CTA | 50 XP |
| 7 | İlk yeni üretim hattını kur | "ACQUIRE_PRODUCTION_LINE" | 300 XP + 15 RT |
| 8 | Yeni hattı aktif üretimde kullan | "USE_NEW_PRODUCTION_LINE" | 250 XP + 10 RT |
| 9 | Yeni stage personel gereksinimlerini tamamla | "MEET_STAGE_STAFF" | 200 XP |
| 10 | Bir finans dönemini pozitif kapat | "CLOSE_PROFITABLE_FINANCE_PERIOD" | 300 XP + 15 RT |

İlk yatırım görevi oyuncuyu kör biçimde harcama yapmaya zorlamamalıdır. Görev aktifleşmeden önce oyuncuya yeterli sipariş yükü ve yatırım önizlemesi gösterilmelidir.

Yatırım görevi satın alma veya leasing seçeneklerinin ikisini de kabul etmelidir:

~~~text
PURCHASED
LEASED
~~~

## 10. Müdür Tavsiyesi Kuralları

İlk sürümde dört kurallı tavsiye yeterlidir.

### 10.1. Üretim darboğazı

Tetikleyici sinyaller:

- departman kuyruğu belirli gün eşiğinin üzerinde
- kapasite kullanımı yüksek
- sonraki departmana girdi aktarımı gecikiyor

Mesaj fikri:

~~~text
Dikim departmanı 4,2 günlük iş yükü taşıyor. Yeni hat veya fason seçeneğini inceleyin.
~~~

CTA:

~~~text
Yatırımı incele
Fason seçeneklerini aç
Kuyruk önceliğini düzenle
~~~

### 10.2. Yatırım önerisi

Yatırım yalnızca aşağıdaki koşullar birlikte oluştuğunda önerilmelidir:

- yüksek ve tekrarlayan kapasite kullanımı
- aktif sipariş yükü
- nakit ve yaklaşan finans ödemeleri uygun
- yeni hattın maliyeti karşılanabilir

Boş duran hatlar veya düşük sipariş yükü varsa yatırım önerilmemelidir.

### 10.3. Personel eksikliği

Tetikleyici sinyaller:

- hat staff coverage %100 altında
- stage requirement eksik
- personel eksikliği kapasiteyi düşürüyor

CTA:

~~~text
Personel panelini aç
Stage gereksinimlerini görüntüle
~~~

### 10.4. Finansal risk

Tetikleyici sinyaller:

- yaklaşan giderler kasa için riskli
- leasing veya periyodik borç ödemesi yaklaşıyor
- negatif cash-flow tahmini
- yatırım sonrası nakit rezervi yetersiz

Mesaj yatırımı tamamen yasaklamamalı; risk ve alternatif hamleleri göstermelidir.

## 11. Müdür Tavsiyesi Davranış Kuralları

- Aynı tavsiye aynı koşul için sürekli görünmemelidir.
- En fazla bir ana tavsiye ve iki yardımcı tavsiye gösterilmelidir.
- Çözülen tavsiye kapanmalıdır.
- Aynı kural için cooldown uygulanmalıdır.
- Acil hata/uyarı ile stratejik tavsiye aynı bileşende gösterilmemelidir.
- Tavsiyeler parametrik payload kullanmalıdır.
- Tavsiye metinleri translation key üzerinden oluşturulmalıdır.
- Yapay zekâ ilk sürümde kullanılmamalıdır.

## 12. GameSnapshot Entegrasyonu

"GameSnapshot" içine aşağıdaki alanlar eklenmelidir:

~~~text
tasks
taskSummary
claimableTaskRewardCount
managerRecommendations
~~~

Örnek görev görünümü:

~~~text
id
key
title
description
status
currentValue
targetValue
progressBps
rewardXp
rewardRunwayTokens
ctaTarget
ctaPayload
~~~

Örnek müdür tavsiyesi görünümü:

~~~text
id
ruleKey
title
description
severity
priority
ctaTarget
ctaPayload
payload
~~~

CTA hedefleri mevcut panel yapısıyla uyumlu olmalıdır:

~~~text
orders
production
departmentQueue
investment
staff
finance
warehouse
reports
~~~

## 13. Fazlara Bölünmüş Kodlama Planı

### Faz 0 — İçerik ve teknik sözleşme

Kodlama yapılmaz.

Hazırlanacaklar:

- görev anahtarları
- görev sırası
- objective türleri
- prerequisite ilişkileri
- XP ve Runway Token ödülleri
- CTA hedefleri
- görev çevirileri
- müdür kural eşikleri
- ödül claim politikası

Kabul kriteri:

İlk oyuncunun tutorial sonrası ilk yatırım görevine nasıl ulaşacağı yazılı olarak netleşmiş olmalıdır.

### Faz 1 — Prisma veri temeli

Eklenecek modeller:

- "TaskDefinition"
- "TaskDefinitionTranslation"
- "FactoryTaskProgress"
- "PlayerTokenWallet"
- "PlayerTokenTransaction"

Eklenecek enum değerleri:

- görev tipleri
- görev objective türleri
- görev progress status'ları
- token entry type
- token transaction reason
- "XpReason.TASK_CLAIM"

Seed:

- ilk 8–10 hikâye görevi
- Türkçe görev çevirileri
- varsa global/sector scope kayıtları

Bu fazda görev UI'ı yapılmaz.

Proje kuralına göre kodlama başladığında veritabanı değişiklikleri migration yerine "prisma db push" ile uygulanır.

### Faz 2 — Görev ve ödül servisleri

Yeni servisler:

~~~text
features/tasks/types.ts
features/tasks/services/task-definition-service.ts
features/tasks/services/task-progress-service.ts
features/tasks/services/task-reward-service.ts
features/tokens/services/runway-token-service.ts
features/tasks/actions/claim-task-reward-action.ts
~~~

Bu fazda bağlanacak domain noktaları:

- ilk tutorial tamamlanması
- market siparişi kabulü
- vardiya tamamlanması
- zamanında sevkiyat
- müşteri tahsilatı
- kuyruk önceliği değişimi
- hat satın alma
- leasing
- yeni hattın üretimde kullanılması
- finans dönemi kapanışı

Testler:

- görev progress artırma
- prerequisite zinciri
- görev tamamlanması
- iki kez claim denemesi
- token ledger idempotency
- XP/token aynı transaction davranışı
- yetkisiz görev claim'i

### Faz 3 — Snapshot ve görev paneli

Değiştirilecek alanlar:

- "GameSnapshot" tipleri
- "getGameSnapshot"
- "panel-registry.tsx"
- görev paneli bileşenleri
- dock badge hesaplaması

Görev paneli şunları göstermelidir:

- aktif hikâye görevi
- ilerleme çubuğu
- ödül önizlemesi
- görevin ilgili panele götüren CTA'sı
- tamamlanmış fakat claim edilmemiş görev
- alınmış ödül geçmişi

Bu fazda müdür tavsiyeleri ayrı bileşen olarak eklenebilir; fakat kural motoru henüz zorunlu değildir.

### Faz 4 — Hikâye zinciri ve ilk yatırım akışı

Yeni oyuncu akışı doğrulanır:

~~~text
İlk sipariş tutorial'ı
→ İlk normal sipariş
→ İlk sevkiyat
→ İlk tahsilat
→ Kuyruk önceliği
→ Yatırım paneli
→ İlk yeni hat
→ Yeni hattın kullanılması
~~~

Test senaryoları:

- oyuncu uzun süre sipariş kabul etmez
- oyuncunun yatırım için yeterli parası yoktur
- oyuncu satın alma yerine leasing seçer
- oyuncu yeni hattı alır fakat kullanmaz
- stage personeli eksik kalır
- sayfa yenilenir
- aynı server action iki kez gönderilir

### Faz 5 — Kurallı Müdür Tavsiyeleri

Yeni servisler:

~~~text
features/manager/services/manager-recommendation-engine.ts
features/manager/services/manager-metrics.ts
features/manager/types.ts
~~~

İlk saf fonksiyonlar:

~~~text
evaluateBottleneck
evaluateInvestmentOpportunity
evaluateStaffShortage
evaluateFinancialRisk
~~~

İlk fazda tavsiyeler canlı state'ten üretilebilir. Dismiss ve cooldown ihtiyacı oluşursa "FactoryManagerRecommendation" tablosu eklenir.

Testler:

- darboğaz tavsiyesi
- yatırım tavsiyesi
- düşük nakitte yatırım tavsiyesinin bastırılması
- personel eksikliği
- finansal risk
- aynı önerinin tekrar edilmemesi
- CTA payload doğruluğu

### Faz 6 — Awards sistemi

Mevcut Award modelleri üzerine:

- Award progress evaluator
- Award claim action
- Award reward service
- XP ödülü
- Runway Token ödülü
- Award paneli

Awards görevlerden ayrı kalmalıdır. Aynı domain event'i hem görev hem Award ilerlemesini güncelleyebilir; fakat iki ayrı progress kaydı kullanılmalıdır.

### Faz 7 — Token mağazası ve turnuvalar

Bu faz daha sonradır.

Eklenecek olası tablolar:

- "TokenProduct"
- "TokenPurchase"
- "Tournament"
- "TournamentEntry"

Gerçek para ödemelerinde:

- provider transaction id unique olmalı
- webhook doğrulanmalı
- token server-side verilmeli
- refund/reversal desteklenmeli
- client tarafından token üretilememeli

## 14. İdempotency Kararları

Görev ve ödül sistemi mevcut finans ve yatırım idempotency yaklaşımıyla uyumlu olmalıdır.

Her ödül için deterministik kaynak anahtarı oluşturulmalıdır:

~~~text
TASK_REWARD:{factoryTaskProgressId}
AWARD_REWARD:{factoryAwardProgressId}
~~~

Aynı görev claim request'i:

- ikinci kez token oluşturmamalı
- ikinci kez XP oluşturmamalı
- ikinci kez nakit bonusu oluşturmamalı
- mevcut claim sonucunu güvenli biçimde döndürmeli

İlgili mevcut yaklaşım örnekleri:

- finans "referenceKey"
- yatırım request idempotency
- vardiya game day unique kısıtı
- leasing ödeme reference key'leri

## 15. Ödül Dengesi

XP her görevde verilebilir. Runway Token daha kontrollü dağıtılmalıdır.

Önerilen dağılım:

| Ödül türü | Kullanım |
|---|---|
| XP | Sık görev ödülü, kalıcı gelişim |
| Runway Token | Büyük milestone, önemli karar, özel görev |
| Factory cash | İlk sürümde sınırlı; yalnızca finans transaction'ı ile |
| Badge/kozmetik | Awards ve uzun vadeli prestij |

Runway Token:

- üretim kapasitesi satın almamalı
- otomatik teslimat avantajı vermemeli
- garanti edilmiş turnuva skoru sağlamamalı
- oyuncuya doğrudan XP veya fabrika seviyesi vermemeli

## 16. Kabul Kriterleri

İlk görev sistemi tamamlanmış sayılmak için:

1. Yeni oyuncu tutorial sonrası ilk hikâye görevini görmelidir.
2. Görev ilerlemesi server-side tutulmalıdır.
3. Görev tamamlanması sayfa yenilenmesinden etkilenmemelidir.
4. Oyuncu görev CTA'sı ile ilgili panele gidebilmelidir.
5. İlk yatırım görevi satın alma ve leasing seçeneklerini desteklemelidir.
6. Yeni hat kullanıldığında görev ilerlemesi oluşmalıdır.
7. XP ödülü mevcut progression sistemine yazılmalıdır.
8. Runway Token ledger kaydı oluşmalıdır.
9. Aynı ödül iki kez verilememelidir.
10. Görevler ve Awards ayrı progress kayıtlarına sahip olmalıdır.
11. Müdür tavsiyeleri düşük nakitte oyuncuyu yanlış yatırıma zorlamamalıdır.
12. Kodlama sonrası mevcut sipariş, simülasyon, finans ve yatırım testleri bozulmamalıdır.

## 17. Nihai Uygulama Kararı

İlk kodlama sırası:

~~~text
TaskDefinition
→ FactoryTaskProgress
→ PlayerTokenWallet
→ PlayerTokenTransaction
→ TaskProgressService
→ TaskRewardService
→ GameSnapshot
→ Görev Paneli
→ Hikâye görevleri
→ Müdür tavsiyeleri
→ Awards
→ Token mağazası ve turnuva
~~~

İlk geliştirme iterasyonunda günlük ve haftalık görevler yapılmamalıdır.

Öncelik, oyuncuyu ilk siparişten ilk gerçek üretim hattı yatırımına götüren güvenilir hikâye zinciridir.

Müdür tavsiyeleri bu zinciri desteklemeli; oyuncunun yerine karar vermemeli ve her durumda yatırım önermemelidir.

Bu yapı Factory Runway'in mevcut üretim, sipariş, finans, personel, XP ve yatırım altyapısını koruyarak oyuncuya anlaşılır bir gelişim yönü kazandırır.

## 18. Faz-0 Başlangıç Karar Kaydı

Bu bölüm Faz-0 çalışmasının başlangıç taslağıdır. Faz-1 kodlamasına geçilmeden önce ürün kararları ve görev içerikleri kesinleştirilmelidir.

### 18.1. Sabitlenmesi önerilen temel kararlar

| Konu | Faz-0 önerisi |
|---|---|
| Görev kapsamı | İlk sürümde yalnızca hikâye görevleri |
| İlk görev zinciri | Tutorial sonrası ilk normal siparişten ilk yeni üretim hattına kadar |
| Günlük/haftalık görev | Faz-1 dışında bırakılacak |
| XP kapsamı | Factory scoped, mevcut progression sistemi kullanılacak |
| Runway Token kapsamı | PlayerProfile scoped, factory cash'ten ayrı tutulacak |
| Token ledger | Her kazanım/harcama için immutable transaction kaydı |
| Görev ödülü | XP düzenli, Runway Token seçilmiş milestone görevlerinde |
| Nakit ödülü | İlk sürümde sınırlı ve yalnızca finans transaction'ı ile |
| Görev claim'i | Tamamlanan görev ödülü güvenli bir claim akışıyla verilecek |
| Müdür tavsiyesi | İlk sürümde kurallı ve server-side |
| Yapay zekâ | İlk sürümde kullanılmayacak |
| Awards | Görevlerden ayrı progress ve claim sistemi |

### 18.2. İlk görev anahtarları

İlk içerik taslağında aşağıdaki key'ler kullanılmalıdır:

~~~text
story_first_normal_order
story_first_shift
story_first_on_time_delivery
story_first_customer_payment
story_first_priority_change
story_first_investment_review
story_first_production_line
story_first_new_line_usage
story_stage_staff_requirements
story_first_profitable_finance_period
~~~

Bu key'ler içerik kimliğidir. Kullanıcıya gösterilen metinler translation tablosundan okunmalıdır.

### 18.3. İlk event eşleştirmesi

| Görev | Tamamlanma kaynağı |
|---|---|
| story_first_normal_order | CustomerOrder oluşturulması |
| story_first_shift | ShiftSimulation tamamlanması |
| story_first_on_time_delivery | CustomerOrder.shippedDay ve lateDays = 0 |
| story_first_customer_payment | FactoryFinanceTransaction.ORDER_REVENUE gelir kaydı |
| story_first_priority_change | ProductionOrderRouteProgress.manualPriorityOverride değişimi |
| story_first_investment_review | Yatırım paneli CTA'sı veya yatırım karar akışı |
| story_first_production_line | FactoryProductionLine oluşturulması |
| story_first_new_line_usage | Yeni hat için pozitif ShiftLineResult.producedQuantity |
| story_stage_staff_requirements | Stage staff requirement kontrolünün tamamlanması |
| story_first_profitable_finance_period | Pozitif FactoryFinancePeriodSnapshot.netResultCents |

story_first_investment_review yalnızca UI tıklamasıyla tamamlanacaksa bu olayın server-side güvenilir biçimde kaydedilmesi gerekir. İlk uygulamada bu adımı zorunlu tutmak yerine yatırım görevi açıklamasında yatırım önizlemesi ve CTA gösterilmesi daha düşük risklidir.

### 18.4. İlk görev ödül politikası

Önerilen başlangıç değerleri:

| Görev | XP | Runway Token |
|---|---:|---:|
| İlk normal sipariş | 100 | 0 |
| İlk vardiya | 100 | 0 |
| Zamanında ilk sevkiyat | 150 | 5 |
| İlk tahsilat | 100 | 0 |
| İlk öncelik değişimi | 150 | 0 |
| İlk yatırım | 300 | 15 |
| Yeni hattı kullanma | 250 | 10 |
| Stage personeli | 200 | 0 |
| Pozitif finans dönemi | 300 | 15 |

Bu değerler ekonomi dengesi testi öncesi başlangıç parametreleridir; Faz-4 testlerinde yeniden ayarlanabilir.

### 18.5. İlk müdür kuralları

İlk sürümde dört rule key yeterlidir:

~~~text
manager_bottleneck_detected
manager_investment_opportunity
manager_staff_shortage
manager_financial_risk
~~~

Her kural aşağıdaki çıktıyı üretmelidir:

~~~text
ruleKey
severity
priority
titleKey
descriptionKey
ctaTarget
ctaPayload
payload
~~~

İlk gösterim eşikleri Faz-0'da içerik ve ekonomi verileriyle kesinleştirilmelidir. Eşikler görev tanımı içine dağınık biçimde yazılmamalı; kural motorunun merkezi konfigürasyonunda tutulmalıdır.

### 18.6. Faz-0 teslimatları

Faz-0 tamamlandığında aşağıdaki çıktılar hazır olmalıdır:

1. İlk 8–10 görevin kesin listesi.
2. Her görev için objective type ve tamamlanma event'i.
3. Her görev için XP ve Runway Token ödülü.
4. Görev prerequisite zinciri.
5. Görev CTA hedefleri.
6. Türkçe görev başlığı ve açıklamaları.
7. İlk dört müdür kuralı ve eşikleri.
8. Token kazanım ve harcama ilkeleri.
9. Görev claim ve idempotency kararı.
10. Faz-1 Prisma uygulamasına hazır veri sözleşmesi.

Bu teslimatlar onaylandıktan sonra Faz-1'e, yani Prisma veri temeli ve seed aşamasına geçilecektir.
