# 20 — Vardiya Simülasyonu, Günlük Olay Paneli ve Periyodik Tetikleyici Sistemi Planlama Talebi

## Belgenin Amacı

Bu belge, Factory Runway projesinde vardiya simülasyonu sırasında gösterilecek üretim ilerleyişinin, günlük olayların, personel/makine kaynaklı sorunların ve periyodik finansal tetikleyicilerin mevcut sisteme nasıl entegre edilebileceğini Codex'in ayrıntılı biçimde incelemesi için hazırlanmıştır.

Bu aşamada **kodlama yapılmayacaktır**.

Codex'in görevi:

1. Mevcut proje yapısını ve ilgili karar dokümanlarını okumak.
2. Eksik alanları tespit etmek.
3. Mevcut mimariye en uygun çözüm yaklaşımını önermek.
4. Gerekli olabilecek veri modeli, servis, simülasyon motoru ve arayüz değişikliklerini raporlamak.
5. Kodlamaya başlamadan önce uygulanabilir, aşamalı ve dosya bazlı bir teknik plan hazırlamak.

---

# 1. Zorunlu Başlangıç Talimatları

Codex, incelemeye başlamadan önce aşağıdaki dosyaları belirtilen sırayla okumalıdır.

## 1.1. İlk okunacak dosya

```text
docs/00-Development_rules
```

Bu dosyadaki geliştirme prensipleri, proje standartları, isimlendirme kuralları, mimari sınırlar ve yasaklar bu çalışmanın tamamında kesin olarak uygulanmalıdır.

Bu dosya okunmadan:

- kod önerisi yapılmamalı,
- dosya yapısı önerilmemeli,
- Prisma değişikliği önerilmemeli,
- mevcut mimari hakkında karar verilmemelidir.

## 1.2. Personel davranışlarıyla ilgili karar dokümanı

```text
docs/13-*
```

`docs` klasörü altındaki 13 numaralı personel davranışları, personel eksikliği, işe gelmeme ve ilgili fabrika olaylarını açıklayan karar dokümanı bulunmalı ve tamamı okunmalıdır.

Codex özellikle aşağıdaki konuları bu dosyadan doğrulamalıdır:

- personelin işe gelmeme ihtimali,
- hastalık veya devamsızlık olayları,
- fabrika büyüklüğüne göre olay sıklığı,
- eksik personelin üretim kapasitesine etkisi,
- olayların günlük simülasyona nasıl dahil edilmesi gerektiği,
- varsa personel morali, disiplin, sadakat veya benzeri davranış kararları,
- daha önce karara bağlanmış dengeleme sınırları.

Dokümandaki mevcut kararlarla çelişen yeni bir sistem önerilmemelidir.

## 1.3. İncelenecek diğer temel alanlar

Codex ayrıca en az aşağıdaki alanları bulup incelemelidir:

```text
prisma/schema.prisma
components/Count.tsx
docs/*
```

Projedeki gerçek dosya konumları farklıysa, ilgili karşılıkları bulunmalıdır.

Ayrıca aşağıdaki mevcut yapılar araştırılmalıdır:

- vardiya başlatma akışı,
- vardiya simülasyon servisi veya motoru,
- üretim kapasitesi hesaplamaları,
- üretim yük puanı hesaplamaları,
- departman ve üretim hattı modelleri,
- üretim emirleri,
- WIP veya departman kuyrukları,
- günlük finans hareketleri,
- müşteri ödemeleri,
- fason ödemeleri,
- sevkiyat işlemleri,
- günlük rapor veya vardiya sonuç yapısı,
- mevcut bildirim, toast, drawer, sheet veya side panel bileşenleri,
- gün ilerletme mekanizması,
- oyuncunun oyun günü değerinin tutulduğu alan,
- veri tabanında günlük olay veya finans kaydı bulunup bulunmadığı.

---

# 2. Kesin Veritabanı Kuralı

Bu projede migration kullanılmamaktadır.

Prisma şemasında ileride bir değişiklik gerekirse uygulanacak tek yöntem:

```bash
npx prisma db push
```

Kesin yasaklar:

```bash
npx prisma migrate dev
npx prisma migrate deploy
npx prisma migrate reset
```

Codex:

- migration dosyası oluşturmamalı,
- migration komutu önermemeli,
- migration geçmişi üretmemeli,
- mevcut migration klasörünü bu iş için kullanmamalıdır.

Bu ilk aşama yalnızca analiz ve planlama aşamasıdır. Bu nedenle veritabanında veya Prisma şemasında fiilen değişiklik yapılmamalıdır.

Raporda veri modeli değişikliği önerilecekse, açıkça şu not eklenmelidir:

> Uygulama aşamasında yalnızca Prisma schema güncellenecek ve `prisma db push` kullanılacaktır. Migration çalıştırılmayacaktır.

---

# 3. Mevcut Vardiya Tasarım Kararı

Oyuncu **Vardiyayı Başlat** butonuna bastığında yaklaşık 25 saniyelik görsel bir vardiya simülasyonu çalışacaktır.

Simülasyonun temel özellikleri:

- Oyun içi vardiya: 08:00–17:00
- Görsel simülasyon süresi: yaklaşık 25 saniye
- Vardiya sonucu arka planda önceden hesaplanabilir
- Arayüz, hesaplanan sonucu 25 saniyelik zaman çizelgesinde oyuncuya gösterebilir
- Üretim hatlarının kapasitesi vardır
- Ürünlerin departmanlara göre üretim yük puanları vardır
- Ürüne göre darboğaz değişebilir
- Bazı günler Kesim darboğaz olabilir
- Bazı günler Dikim darboğaz olabilir
- Bazı günler Ütü & Paket darboğaz olabilir
- Departman işi vardiya bitmeden tamamlayabilir
- Departman girdi bekleyebilir
- Departmanın iş emri olmayabilir
- Personel eksikliği veya makine arızası kapasiteyi düşürebilir

Codex, mevcut simülasyon sisteminin bu yapıyı ne ölçüde desteklediğini araştırmalıdır.

---

# 4. Üst Vardiya Progress Bar Tasarımı

Vardiya başladığında ekranın üst bölümünde vardiyanın ilerlemesini gösteren tek bir ana progress bar bulunacaktır.

Bu progress bar:

- 08:00 başlangıcını,
- 17:00 bitişini,
- güncel simülasyon saatini,
- 25 saniyelik animasyon ilerlemesini

temsil edecektir.

Örnek:

```text
08:00 ━━━━━━━━━━━━━━━━━━━━━━━━━ 17:00
              13:42
```

Ana prensip:

- Bütün departman sayaçları,
- olay paneline düşen olaylar,
- erken biten departmanlar,
- personel veya makine olayları,
- sevkiyat ve finans olayları

aynı global vardiya zaman çizelgesine bağlı çalışmalıdır.

Codex şu konuyu değerlendirmelidir:

- Tek bir global simulation progress state mi kullanılmalı?
- Mevcut vardiya motorunda oyun dakikası karşılığı var mı?
- 25 saniye ile 540 oyun dakikası nasıl eşleştirilmeli?
- Sayfa yenilenirse vardiya nasıl devam etmeli?
- Simülasyon sonucu önceden kaydedilmeli mi?
- Client yalnızca animasyon mu göstermeli?
- Sunucu ve client sorumlulukları nasıl ayrılmalı?

Önerilen temel eşleştirme:

```ts
simulationProgress = elapsedRealTime / 25
simulationMinute = simulationProgress * 540
```

Ancak Codex, mevcut mimariye göre bunun uygunluğunu araştırmalı ve daha doğru bir yapı varsa raporlamalıdır.

---

# 5. Departman Bazlı Günlük Sayaç Kartları

Ana progress barın hemen altında, o gün aktif iş yüküne sahip departmanların kartları gösterilecektir.

Başlangıç fabrikasında örnek departmanlar:

- Kesim
- Dikim
- Ütü & Paket

İleride departman sayısı artabilir.

Her departman kartında yalnızca o güne ait iki temel sayaç gösterilecektir:

```text
KUYRUĞA GİREN
ÇIKAN
```

Bu değerler **toplam tarihsel değerler değildir**.

Yalnızca simülasyonu yapılan günün değerleri gösterilecektir.

## 5.1. Kuyruğa Giren

O vardiya sırasında ilgili departmanın işleme kuyruğuna ulaşan ürün adedidir.

Örnek:

- Dikimden Ütü & Paket kuyruğuna bugün 650 adet geldiyse:
  - Ütü & Paket `Kuyruğa Giren = 650`

## 5.2. Çıkan

O vardiya sırasında ilgili departmanda işlemi tamamlanan ürün adedidir.

Örnek:

- Ütü & Paket bugün 650 adet tamamladıysa:
  - Ütü & Paket `Çıkan = 650`

## 5.3. Mevcut Count bileşeni

Projede aşağıdaki bileşen bulunmaktadır:

```text
components/Count.tsx
```

Codex bu dosyayı mutlaka incelemeli ve sayaç animasyonlarında mümkünse mevcut bileşeni yeniden kullanmalıdır.

Yeni ve benzer bir counter bileşeni oluşturmadan önce mevcut `Count.tsx` bileşeninin:

- API'sini,
- animasyon davranışını,
- performansını,
- çok sayıda eşzamanlı sayaç kullanımına uygunluğunu,
- sayının artması ve azalmasını destekleyip desteklemediğini,
- GSAP veya başka bir animasyon bağımlılığı olup olmadığını

incelemelidir.

Raporda şu karar açıkça verilmelidir:

- Mevcut `Count.tsx` doğrudan kullanılabilir
- Küçük bir genişletme ile kullanılabilir
- Mevcut bileşen uygun değildir ve gerekçesi budur

Gerekçesiz biçimde yeni sayaç bileşeni önerilmemelidir.

## 5.4. Kartların ölçeklenmesi

İlk seviyede üç departman vardır.

İleride oyuncunun 50–60 üretim hattı olabilir.

Ana ekranda sayaçlar üretim hattı bazında değil, departman toplamı bazında gösterilmelidir.

Örnek:

```text
DİKİM · 24 HAT

Kuyruğa Giren: 12.850
Çıkan: 11.920
```

Codex şu konuları raporlamalıdır:

- Veriler departman bazında nasıl gruplanmalı?
- Çok sayıda üretim hattının toplamı nasıl hesaplanmalı?
- Client tarafında mı, sunucu tarafında mı aggregate edilmeli?
- Günlük giriş ve çıkış miktarı için mevcut veri yapısı yeterli mi?
- Mevcut kuyruk alanları toplam WIP tutuyorsa, günlük delta nasıl ayrıştırılmalı?

---

# 6. Sağdan Açılan Günlük Olay Paneli

Toast sistemi kullanılmayacaktır.

Vardiya başladığında ekranın sağ tarafından şık bir panel açılacaktır.

Bu panel:

- sağdan sola kayarak açılmalı,
- vardiya boyunca oluşan olayları zaman sırasına göre eklemeli,
- oyuncu kapatana kadar açık kalmalı,
- oyuncunun hiçbir olayı kaçırmamasını sağlamalı,
- vardiya sonunda günlük olay raporu gibi okunabilmeli,
- oyuncu kapattığında sağa doğru kayarak kapanmalı,
- ertesi oyun gününde yeni ve boş bir günlük olay listesiyle yeniden açılmalıdır.

Panel klasik geçici toast davranışı göstermemelidir.

## 6.1. Panel davranışı

Önerilen davranış:

1. Oyuncu vardiyayı başlatır.
2. Panel sağdan açılır.
3. İlk olay olarak vardiya başlangıcı gösterilebilir.
4. Olaylar simülasyon saatine göre sırayla panele eklenir.
5. Yeni olay geldiğinde panel içeriği otomatik olarak son olaya kayabilir.
6. Oyuncu isterse panel içinde yukarı kaydırarak önceki olayları okuyabilir.
7. Panel oyuncu kapatana kadar açık kalır.
8. Vardiya bittikten sonra panel günlük olay özeti olarak açık kalabilir.
9. Oyuncu paneli kapattığında sağa kayarak kapanır.
10. Sonraki oyun gününde aynı panel yeni gün olaylarıyla yeniden başlar.

Codex aşağıdaki kullanıcı deneyimi kararlarını değerlendirmelidir:

- Panel varsayılan olarak her vardiya başlangıcında otomatik açılmalı mı?
- Oyuncu simülasyon sırasında kapatırsa yeni olay geldiğinde tekrar açılmalı mı?
- Yeni olay geldiğinde kapalı panel üzerinde badge gösterilmeli mi?
- Panel açıkken yeni olay geldiğinde otomatik scroll nasıl yönetilmeli?
- Oyuncu geçmiş olayları okurken otomatik scroll zorla aşağı indirmemeli mi?
- Panelin genişliği masaüstünde ne olmalı?
- Küçük ekranlarda Sheet veya Drawer davranışı nasıl olmalı?
- Mevcut shadcn `Sheet` bileşeni kullanılabilir mi?
- Projede hâlihazırda sağ panel/drawer bileşeni var mı?

## 6.2. Olay kartı içeriği

Her olay kaydı en az aşağıdaki alanları desteklemelidir:

```ts
type DailyEventItem = {
  id: string
  gameDay: number
  occurredAtMinute: number
  category: EventCategory
  severity: EventSeverity
  title: string
  description?: string
  amount?: number
  currency?: string
  departmentId?: string
  lineId?: string
  employeeId?: string
  machineId?: string
  orderId?: string
  shipmentId?: string
  paymentId?: string
}
```

Bu yalnızca örnek bir şekildir.

Codex mevcut veri modellerini inceleyerek:

- hangi alanların gerçekten gerekli olduğunu,
- hangilerinin mevcut modellerle ilişkilendirilebileceğini,
- olay metinlerinin veritabanında mı yoksa kod tarafında mı üretilmesi gerektiğini,
- çoklu dil yapısına nasıl uyacağını

raporlamalıdır.

---

# 7. Günlük Olay Türleri

Panel yalnızca üretim hatalarını göstermeyecektir.

O gün işletmede gerçekleşen önemli bütün olaylar burada sıralanabilir.

## 7.1. Üretim olayları

Örnekler:

```text
Ütü & Paket işini erken tamamladı.
Dikim departmanında kapasite sorunu oluştu.
Kesim departmanı için aktif iş emri bulunmuyor.
Dikim departmanında 180 adet ürün yarına kaldı.
Ütü & Paket girdi beklemeye başladı.
Kesim planlanan işi tamamladı.
Üretim emri tamamlandı.
Sipariş termin riski oluştu.
```

## 7.2. Personel olayları

Örnekler:

```text
Dikim departmanında 4 personel hastalık nedeniyle işe gelmedi.
Kesim departmanında 1 personel eksik.
Eksik personel nedeniyle günlük dikim kapasitesi %18 azaldı.
```

Personel olayları için `docs/13-*` kararları esas alınmalıdır.

## 7.3. Makine olayları

Örnekler:

```text
Dikim hattında makine arızası oluştu.
Kesim makinesinde 90 dakikalık kapasite kaybı yaşandı.
Ütü & Paket hattında bakım gereksinimi oluştu.
```

Makine arızası sistemi henüz kodlanmamış olabilir.

Codex:

- mevcut Machine veya Equipment modellerini,
- üretim hattı ve makine ilişkilerini,
- bakım veya arıza alanlarını,
- kapasite etkisinin nerede hesaplanabileceğini

incelemelidir.

Bu aşamada kesin bir arıza algoritması üretmek yerine, mevcut mimariye uygun bir olay ve kapasite etkisi planı hazırlanmalıdır.

## 7.4. Lojistik olayları

Örnekler:

```text
Sevk deposundan müşteriye 850 adet ürün gönderildi.
Müşteriye yapılan teslimat tamamlandı.
Sevkiyat gecikti.
```

## 7.5. Finans olayları

Örnekler:

```text
Müşteriden €18.500 ödeme geldi.
Fason üretim ödemesi yapıldı.
Maaş ödemesi yapıldı.
Kira ödemesi yapıldı.
Elektrik gideri ödendi.
Diğer işletme giderleri ödendi.
```

## 7.6. Olay kategorileri

Codex mevcut enum ve isimlendirme düzenine göre uygun bir kategori sistemi önermelidir.

Örnek:

```ts
PRODUCTION
CAPACITY
STAFF
MACHINE
LOGISTICS
FINANCE
ORDER
SYSTEM
```

Ayrıca severity sistemi değerlendirilebilir:

```ts
INFO
SUCCESS
WARNING
CRITICAL
```

Renk, ikon ve görsel gösterim yalnızca bu sınıflandırmaya bağlı olmalı; metin içinde sabit renk mantığına dağılmamalıdır.

---

# 8. Olayların Simülasyon Zamanına Bağlanması

Olaylar panele rastgele zamanlarda düşmemelidir.

Her olayın oyun içindeki oluşma dakikası bulunmalıdır.

Örnek:

```ts
{
  occurredAtMinute: 75,
  category: "STAFF",
  title: "Dikim departmanında 4 personel işe gelmedi."
}
```

Bu olay 08:00 başlangıcından 75 dakika sonra, yani oyun saatiyle 09:15'te oluşmuş kabul edilir.

25 saniyelik görsel simülasyondaki gösterim zamanı:

```ts
realSecond = (occurredAtMinute / 540) * 25
```

Codex şu mimari seçenekleri değerlendirmelidir:

### Seçenek A — Vardiya başında tüm sonuç ve olayları hesaplamak

- Vardiya sonucu sunucuda hesaplanır
- Bütün olaylar oluşturulur
- Sonuç veritabanına kaydedilir
- Client yalnızca zaman çizelgesine göre animasyon oynatır

### Seçenek B — Olayları simülasyon sırasında parça parça üretmek

- Client veya sunucu belirli aralıklarla yeni olay oluşturur
- Sonuç aşamalı hesaplanır

Tercih edilen yaklaşım büyük ihtimalle Seçenek A'dır.

Ancak Codex mevcut sistemin yapısına göre karar vermeli ve raporda gerekçelendirmelidir.

Değerlendirilmesi gerekenler:

- sayfa yenileme güvenliği,
- aynı vardiyanın iki kez çalıştırılmasını önleme,
- oyuncunun simülasyonu atlaması,
- Vercel/serverless koşulları,
- transaction güvenliği,
- finans hareketlerinin iki kere oluşmaması,
- maaş ve gider tetikleyicilerinin idempotent olması,
- olayların tekrar üretilememesi,
- simülasyon sonucunun deterministik olması.

---

# 9. Personel İşe Gelmeme Sistemi

Personel işe gelmeme sistemi henüz kodlanmamıştır.

Codex `docs/13-*` dosyasını okuyarak mevcut kararları sisteme nasıl taşıyacağımızı raporlamalıdır.

İncelenecek başlıklar:

- Günlük devamsızlık kontrolü hangi aşamada yapılmalı?
- Vardiya başlamadan önce mi hesaplanmalı?
- Departman veya üretim hattı bazında mı etkili olmalı?
- Eksik personel kapasiteyi doğrusal mı azaltmalı?
- Minimum ekip sayısının altına düşen hat kapanmalı mı?
- Eksik personel başka hatta aktarılabilir mi?
- Hastalık olayı tek günlük mü, çok günlük mü?
- Personel bazlı geçmiş kayıt tutulmalı mı?
- Aynı personele çok sık devamsızlık yazılmasını engelleyen dengeleme var mı?
- Fabrika büyüklüğü olay sıklığını nasıl etkiler?
- Olaylar `DailyEvent` benzeri bir yapıya nasıl dönüştürülür?
- Vardiya raporunda kapasite kaybı nasıl gösterilir?

Örnek günlük olay:

```text
09:15 · PERSONEL
Dikim departmanında 4 personel işe gelmedi.
Tahmini kapasite kaybı: 120 adet
```

Codex, personel eksikliğinin yalnızca mesaj olarak kalmamasını sağlamalıdır.

Kapasite matematiğine etkisi de planlanmalıdır.

---

# 10. Makine Arıza Sistemi

Makine arızası sistemi henüz kodlanmamıştır.

Codex şu alanları incelemeli ve raporlamalıdır:

- Projede makine veya ekipman modelleri var mı?
- Üretim hattı bir veya birden fazla makineyle ilişkilendiriliyor mu?
- Makine seviyesi veya kalite seviyesi bulunuyor mu?
- Bakım maliyeti veya durability sistemi var mı?
- Arıza olasılığı hangi verilerden üretilebilir?
- Arıza süreleri oyun dakikası olarak tutulabilir mi?
- Arıza kapasiteye nasıl yansıtılmalı?
- Arıza vardiya ortasında mı başlamalı?
- Onarım aynı gün tamamlanabilir mi?
- Oyuncu müdahalesi gerekecek mi?
- İlk sürüm için basitleştirilmiş bir arıza modeli yeterli mi?

Örnek olaylar:

```text
11:20 · MAKİNE
Dikim hattında makine arızası oluştu.
Kapasite kaybı: 75 dakika
```

```text
14:10 · MAKİNE
Makine onarımı tamamlandı.
```

Bu aşamada amaç kapsamı gereksiz büyütmek değildir.

Codex, beta için minimum uygulanabilir makine arıza sistemini önermelidir.

---

# 11. 22 Günlük Oyun Ayı ve Periyodik Tetikleyiciler

Oyunda gerçek takvim tarihi kullanılmamaktadır.

Bir oyun ayı:

```text
22 oyun günü
```

olarak kabul edilir.

Bu nedenle belirli finansal işlemlerin oyun günü üzerinden tetiklenmesi gerekir.

---

# 12. Maaş Ödemesi Tetikleyicisi

Maaş ödemesi her 22 oyun gününde bir yapılmalıdır.

İlk ödeme günü:

```text
22. gün
```

Sonraki ödeme günleri:

```text
44. gün
66. gün
88. gün
...
```

Önerilen matematik:

```ts
gameDay % 22 === 0
```

Ancak Codex mevcut gün numaralandırmasını kontrol etmelidir.

Özellikle:

- Oyun 0. günden mi, 1. günden mi başlıyor?
- Ödeme vardiya başlamadan önce mi yapılmalı?
- Ödeme vardiya sonunda mı yapılmalı?
- Maaş gideri hangi günün personel sayısına göre hesaplanmalı?
- O gün işten çıkarılan veya yeni alınan personel nasıl değerlendirilmeli?
- Maaş daha önce ödendiyse tekrar ödenmesini ne engelleyecek?
- Yetersiz nakit varsa ne olacak?
- Negatif bakiye destekleniyor mu?
- Ödeme FinancialTransaction benzeri kayıt oluşturuyor mu?
- Günlük olay paneline hangi saatte eklenmeli?

Örnek olay:

```text
17:00 · FİNANS
Aylık maaş ödemesi yapıldı.
Toplam ödeme: €42.600
```

Codex, bu işlemin yalnızca UI mesajı değil gerçek finans hareketi olmasını planlamalıdır.

---

# 13. Kira, Elektrik ve Benzeri Gider Tetikleyicisi

Kira, elektrik ve benzeri işletme giderleri oyun ayının 10. gününde ödenmelidir.

İlk ödeme günü:

```text
10. gün
```

Daha sonraki ödeme günleri her 22 günde bir tekrarlanmalıdır:

```text
10. gün
32. gün
54. gün
76. gün
...
```

Önerilen matematik:

```ts
(gameDay - 10) % 22 === 0 && gameDay >= 10
```

Codex mevcut gün sistemine göre bu formülü doğrulamalıdır.

Giderler örnek olarak şunları içerebilir:

- kira,
- elektrik,
- su,
- internet,
- bakım,
- genel işletme giderleri,
- varsa mevcut config sisteminde tanımlı diğer sabit giderler.

Codex şu konuları incelemelidir:

- Bu giderler hâlihazırda hangi tabloda veya config yapısında tutuluyor?
- Sabit giderler tek işlem olarak mı, ayrı ayrı mı kaydedilmeli?
- Olay panelinde tek özet mi, ayrı olaylar mı gösterilmeli?
- Gider tutarları fabrika büyüklüğüne göre değişiyor mu?
- Yeni departman veya üretim hattı elektrik giderini artırıyor mu?
- Kira fabrika seviyesi veya alan büyüklüğüne bağlı mı?
- Aynı gün birden fazla finansal tetikleyici çalışabilir mi?
- Tetikleyiciler hangi servis içinde toplanmalı?
- Tekrarlı ödeme nasıl engellenmeli?

Örnek panel gösterimi:

```text
17:00 · FİNANS
Aylık işletme giderleri ödendi.
Kira: €8.000
Elektrik: €4.250
Diğer giderler: €1.100
Toplam: €13.350
```

---

# 14. Genel Tetikleyici Sistemi

Maaş ve işletme giderleri için birbirinden bağımsız, sabit kod blokları oluşturmak yerine yeniden kullanılabilir bir tetikleyici yapısı değerlendirilmelidir.

Codex, mevcut mimariye göre aşağıdaki seçenekleri karşılaştırmalıdır.

## 14.1. Kod tabanlı sabit tetikleyiciler

Örnek:

```ts
if (gameDay % 22 === 0) {
  processPayroll()
}

if (gameDay >= 10 && (gameDay - 10) % 22 === 0) {
  processOperatingExpenses()
}
```

Avantajları:

- basit,
- hızlı,
- beta için yeterli olabilir.

Dezavantajları:

- yeni periyodik işlemlerde kod büyüyebilir.

## 14.2. Veri tabanlı zamanlanmış oyun olayları

Örnek yapı:

```ts
ScheduledGameTrigger {
  key
  firstDay
  repeatEveryDays
  enabled
  handlerType
}
```

Avantajları:

- genişletilebilir,
- admin tarafından yönetilebilir,
- farklı sektörlerde kullanılabilir.

Dezavantajları:

- ilk sürüm için gereksiz karmaşık olabilir.

## 14.3. Hibrit yaklaşım

- Tetikleyici tanımı kodda
- Son çalıştırma ve idempotency kaydı veri tabanında
- Finans işlemleri ayrı servislerde

Codex beta kapsamını dikkate almalı ve gereksiz soyutlama yapmadan en uygun çözümü önermelidir.

Raporda şu soruya açık cevap verilmelidir:

> Mevcut proje ve beta kapsamı için hangi tetikleyici yaklaşımı seçilmeli ve neden?

---

# 15. Idempotency ve Tekrarlı İşlem Güvenliği

Bu sistemin en kritik alanlarından biri aynı finansal işlemin iki kez çalışmamasıdır.

Örnek riskler:

- Kullanıcı Vardiyayı Başlat butonuna iki kez basar
- API isteği iki kez gönderilir
- Sayfa yenilenir
- Vercel fonksiyonu tekrar denenir
- Gün simülasyonu yarıda kesilir
- Aynı gün için ikinci kez sonuç oluşturulmaya çalışılır

Codex aşağıdakileri incelemelidir:

- Gün başına tek shift sonucu kısıtı var mı?
- Player + gameDay için unique constraint var mı?
- FinancialTransaction üzerinde reference key var mı?
- Maaş işlemi için `PAYROLL_DAY_22`, `PAYROLL_DAY_44` benzeri benzersiz referans üretilebilir mi?
- İşletme gideri için benzersiz period key kullanılabilir mi?
- Prisma transaction kullanılmalı mı?
- Shift sonucu, finans hareketleri ve olaylar tek transaction içinde mi oluşturulmalı?
- Uzun süren işlemler Vercel serverless limitlerine takılır mı?

Örnek benzersiz referanslar:

```text
PAYROLL:playerId:22
OPERATING_EXPENSES:playerId:10
SHIFT:playerId:gameDay
```

Bunlar yalnızca örnektir.

Codex mevcut tablo ve isimlendirme yapısına göre daha doğru anahtarlar önermelidir.

---

# 16. Günlük Olayların Kalıcılığı

Olay paneli simülasyon sırasında gösterilecek olsa da, olayların yalnızca client state içinde tutulması yeterli olmayabilir.

Codex şu seçenekleri değerlendirmelidir:

## 16.1. Olayları veritabanında saklamak

Avantajları:

- sayfa yenilendiğinde kaybolmaz,
- vardiya raporunda tekrar kullanılabilir,
- geçmiş gün raporları gösterilebilir,
- debug edilebilir.

Dezavantajları:

- ek tablo ve veri miktarı oluşturur.

## 16.2. Shift result JSON içinde saklamak

Avantajları:

- günlük vardiya sonucuyla birlikte tutulur,
- ayrı tablo gerektirmeyebilir,
- beta için daha basit olabilir.

Dezavantajları:

- sorgulama ve ilişkilendirme sınırlı olabilir.

## 16.3. Yalnızca client state

Avantajları:

- en basit çözüm.

Dezavantajları:

- yenilemede kaybolur,
- rapor geçmişi oluşturmaz,
- finans ve üretim kayıtlarıyla doğrulanması zorlaşır.

Codex mevcut veri modelini inceleyerek en uygun yaklaşımı önermelidir.

Tercih edilen sonuç:

- Olaylar tekrar görüntülenebilmeli
- Vardiya raporuyla aynı kaynaktan beslenmeli
- UI için ayrı, finans için ayrı olay üretilmemeli
- Tek bir vardiya sonucu, olay listesi ve finans kayıtları birbirine bağlanabilmelidir

---

# 17. Çoklu Dil ve Metin Üretimi

Factory Runway global yayınlanacaktır.

Günlük olay panelindeki görünür metinler çoklu dil sistemine uygun olmalıdır.

Codex mevcut çeviri mimarisini incelemeli ve şu seçenekleri değerlendirmelidir:

## Yanlış yaklaşım

Veritabanına doğrudan Türkçe cümle kaydetmek:

```text
Dikim departmanında 4 personel işe gelmedi.
```

Bu yaklaşım global yapı için uygun olmayabilir.

## Tercih edilebilecek yaklaşım

Olay tipi ve parametrik payload saklamak:

```ts
{
  type: "STAFF_ABSENCE",
  payload: {
    departmentName: "Dikim",
    absentCount: 4,
    capacityLossPercent: 18
  }
}
```

UI tarafında çeviri anahtarıyla göstermek:

```text
events.staffAbsence
```

Ancak proje görünür içeriklerde veri tabanı translation tabloları kullanıyor olabilir.

Codex mevcut çoklu dil kararlarını inceleyerek olay metinleri için doğru yaklaşımı raporlamalıdır.

---

# 18. UI ve Animasyon İncelemesi

Codex mevcut ekran ve bileşen yapısını inceleyerek aşağıdaki UI planını değerlendirmelidir.

## 18.1. Vardiya başladığında

- Vardiya Başlat butonu pasifleşir
- Üst progress bar animasyonu başlar
- Departman günlük sayaç kartları görünür
- Sağ olay paneli açılır
- Olaylar zaman çizelgesine göre eklenir
- Aktif üretim hatlarında mevcut animasyonlar devam eder
- Yatırım veya yapı değiştiren aksiyonlar vardiya boyunca engellenebilir

## 18.2. Vardiya sırasında

- `Count.tsx` ile departman günlük sayaçları ilerler
- Kuyruğa Giren değeri olay zaman çizelgesine göre artar
- Çıkan değeri departmanın gerçek üretim hızına göre artar
- Erken biten departmanın sayacı durur
- Girdi bekleyen departman yeni ürün geldikçe tekrar ilerleyebilir
- Panel yeni olayları sırayla ekler

## 18.3. Vardiya sonunda

- Progress bar 17:00 değerine ulaşır
- Sayaçlar final değerlerinde kalır
- Günlük olay paneli açık kalır
- Oyuncu olayları okur
- Vardiya sonuç ekranı panelle birlikte veya panel kapandıktan sonra açılabilir

Codex şu UX kararını özellikle değerlendirmelidir:

> Vardiya sonuç raporu otomatik mi açılmalı, yoksa günlük olay paneli kapatıldıktan sonra mı gösterilmeli?

Her iki çözümün artı ve eksileri raporlanmalıdır.

---

# 19. Performans ve Ölçeklenme

İleride 50–60 üretim hattı olabilir.

Bu nedenle:

- 60 ayrı timer,
- 60 ayrı interval,
- her hat için bağımsız animation loop,
- sürekli yüksek frekanslı React state güncellemesi

kullanılmamalıdır.

Codex şu konuları incelemelidir:

- Tek global ticker kullanılabilir mi?
- `requestAnimationFrame`, GSAP timeline veya mevcut animation altyapısı hangisi uygun?
- Count bileşeni aynı anda kaç adet çalışabilir?
- Departman bazlı aggregate sayaçlar performans sorununu azaltır mı?
- UI state ile simulation data ayrımı nasıl yapılmalı?
- Zustand, React context veya mevcut state yönetimi yeterli mi?
- Server Components ve Client Components sınırı nasıl kurulmalı?
- Panel olayları sanallaştırılmalı mı?
- Günlük olay sayısı pratikte kaç olabilir?
- 25 saniyelik vardiyada render sıklığı ne olmalı?

Raporda gereksiz optimizasyon yapılmamalı ancak büyük fabrika senaryosu dikkate alınmalıdır.

---

# 20. İncelenmesi Gereken Mevcut Dosya ve Akışlar

Codex proje içinde aşağıdaki alanları araştırmalı ve gerçek dosya yollarını raporlamalıdır:

1. Vardiya başlatma butonu
2. Vardiya başlatma API route veya server action
3. Gün ilerletme servisi
4. Shift simulation engine
5. Üretim kapasitesi hesaplama servisi
6. Ürün yük puanı hesaplama servisi
7. Departman queue/WIP hesaplama yapısı
8. Üretim emri modeli ve servisi
9. Personel modeli
10. Personel-departman veya personel-hat ilişkisi
11. Makine modeli
12. Finans hareket modeli
13. Müşteri ödeme sistemi
14. Fason ödeme sistemi
15. Sevkiyat sistemi
16. Mevcut bildirim veya toast sistemi
17. Mevcut Sheet/Drawer bileşenleri
18. `Count.tsx`
19. Vardiya sonuç ekranı
20. Günlük rapor veya geçmiş kayıt ekranı

Her alan için şu bilgiler verilmelidir:

```text
Dosya yolu:
Mevcut sorumluluk:
Bu özellik için yeterli mi:
Gerekli değişiklik:
Risk:
```

---

# 21. İlk Aşamada Codex'ten Beklenen Rapor

Bu belge okunduktan sonra Codex doğrudan kod yazmamalıdır.

Aşağıdaki başlıklarla ayrıntılı bir analiz raporu üretmelidir.

## 21.1. Mevcut sistem özeti

- Vardiya sistemi şu anda nasıl çalışıyor?
- Gün nasıl ilerliyor?
- Üretim sonucu nerede hesaplanıyor?
- Finans hareketleri nerede oluşuyor?
- Personel ve makine modellerinin mevcut durumu nedir?

## 21.2. Eksik alanlar

Açıkça listelenmelidir:

- personel devamsızlık sistemi,
- makine arıza sistemi,
- günlük olay kaydı,
- sağ olay paneli,
- 22 günlük maaş tetikleyicisi,
- 10 + 22 günlük gider tetikleyicisi,
- günlük departman giriş/çıkış sayaç verisi,
- vardiya progress timeline,
- idempotency açıkları,
- çoklu dil olay metinleri,
- gerekli diğer eksikler.

## 21.3. Önerilen mimari

Şunlar açıklanmalıdır:

- vardiya sonucu nasıl hesaplanacak,
- olaylar nasıl üretilecek,
- olaylar nasıl saklanacak,
- client animasyonu nasıl oynatacak,
- finans tetikleyicileri hangi servis içinde çalışacak,
- personel ve makine etkileri kapasiteye nasıl yansıyacak,
- günlük sayaç verileri nasıl üretilecek.

## 21.4. Veri modeli etkisi

Her olası Prisma değişikliği ayrı ayrı açıklanmalıdır:

```text
Model:
Alan:
İlişki:
Neden gerekli:
Alternatif:
```

Bu aşamada schema değiştirilmemelidir.

## 21.5. API ve servis etkisi

- Yeni endpoint gerekir mi?
- Mevcut shift endpoint genişletilebilir mi?
- Server action kullanılabilir mi?
- Event timeline hangi payload ile client'a dönecek?
- Vardiya tekrar okunabilir mi?
- Sayfa yenileme nasıl desteklenecek?

## 21.6. UI bileşen planı

Önerilen veya değiştirilecek bileşenler:

- `ShiftProgressBar`
- `DepartmentShiftCounter`
- `DailyEventsPanel`
- `DailyEventItem`
- mevcut `Count.tsx`
- varsa mevcut Sheet/Drawer bileşeni
- vardiya başlatma kontrol bileşeni

İsimler yalnızca örnektir.

Codex proje isimlendirme standartlarına göre gerçek isimleri önermelidir.

## 21.7. Dosya bazlı uygulama planı

Örnek format:

```text
1. prisma/schema.prisma
   - Önerilen değişiklik
   - Gerekçe
   - db push gereksinimi

2. lib/simulation/...
   - Önerilen servis
   - Mevcut servisle ilişkisi

3. components/...
   - UI bileşeni
   - Kullanılacak mevcut bileşenler
```

## 21.8. Aşamalı geliştirme planı

Önerilen fazlar:

### Faz 1
Mevcut vardiya verisini analiz etme ve günlük timeline üretme

### Faz 2
Progress bar ve departman günlük sayaçları

### Faz 3
Sağ günlük olay paneli

### Faz 4
22 günlük maaş ve 10 + 22 günlük gider tetikleyicileri

### Faz 5
Personel devamsızlık sistemi

### Faz 6
Makine arıza sistemi

### Faz 7
Test, dengeleme ve vardiya raporu entegrasyonu

Codex mevcut bağımlılıklara göre faz sırasını değiştirebilir, ancak gerekçesini açıklamalıdır.

## 21.9. Test planı

En az aşağıdaki senaryolar test edilmelidir:

### Vardiya sayaçları

- Kesim darboğaz
- Dikim darboğaz
- Ütü & Paket darboğaz
- Departman işi erken bitiriyor
- Departmanda iş emri yok
- Girdi bekleyen departman
- Birden fazla üretim hattı olan departman
- 50–60 hatlı fabrika

### Personel

- Hiç devamsızlık yok
- Tek personel gelmedi
- Dört personel gelmedi
- Hat minimum ekip sayısının altına düştü
- Personel eksikliği kapasiteyi azalttı

### Makine

- Arıza yok
- Kısa arıza
- Uzun arıza
- Aynı gün onarım
- Vardiya sonuna kadar onarılamayan arıza

### Finans

- 9. gün gider yok
- 10. gün gider var
- 31. gün gider yok
- 32. gün gider var
- 21. gün maaş yok
- 22. gün maaş var
- 44. gün maaş var
- Aynı gün işlemi ikinci kez çalıştırma girişimi
- Yetersiz nakit
- Aynı gün maaş ve başka finans olayları

### Panel

- Olaylar doğru sırada geliyor
- Panel kapatılabiliyor
- Panel kapalıyken badge artıyor
- Sayfa yenilendiğinde olaylar kaybolmuyor
- Ertesi gün önceki olaylar yeni güne karışmıyor
- Çok sayıda olayda scroll düzgün çalışıyor

## 21.10. Riskler ve açık kararlar

Codex kesin karar veremediği alanları açıkça listelemelidir.

Örnek:

- Maaş vardiya başında mı sonunda mı ödenmeli?
- Panel vardiya başında otomatik açılmalı mı?
- Vardiya sonuç ekranı ne zaman açılmalı?
- Olaylar ayrı tabloda mı, shift result JSON içinde mi tutulmalı?
- Personel devamsızlığı bireysel personel bazında mı, toplu departman olayı olarak mı hesaplanmalı?
- Makine arızası ilk sürümde gerçek makine bazında mı, hat kapasite kaybı olarak mı modellenmeli?

Her açık karar için önerilen tercih ve gerekçe yazılmalıdır.

---

# 22. Codex İçin Kesin Yasaklar

Bu ilk çalışma sırasında Codex:

- kod yazmamalı,
- dosya oluşturmamalı,
- dosya değiştirmemeli,
- Prisma schema değiştirmemeli,
- veritabanına bağlanmamalı,
- `prisma db push` çalıştırmamalı,
- migration çalıştırmamalı,
- paket kurmamalı,
- mevcut UI'ı yeniden tasarlamamalı,
- kararlaştırılmış oyun matematiğini keyfî biçimde değiştirmemeli,
- `docs/13-*` kararlarıyla çelişmemeli,
- `Count.tsx` dosyasını incelemeden yeni counter bileşeni önermemeli,
- mevcut servisleri incelemeden paralel ve tekrar eden servisler tasarlamamalıdır.

---

# 23. Beklenen Nihai Çıktı Formatı

Codex'in cevabı aşağıdaki ana başlıklara sahip olmalıdır:

```text
1. Okunan Dosyalar
2. Mevcut Mimari Özeti
3. Tespit Edilen Eksikler
4. Vardiya Timeline Önerisi
5. Departman Günlük Sayaç Sistemi
6. Günlük Olay Paneli Mimarisi
7. Personel Devamsızlık Sistemi
8. Makine Arıza Sistemi
9. 22 Günlük Maaş Tetikleyicisi
10. 10 + 22 Günlük Gider Tetikleyicisi
11. Idempotency ve Finans Güvenliği
12. Veri Modeli Etki Analizi
13. API ve Servis Etki Analizi
14. UI Bileşen Planı
15. Dosya Bazlı Değişiklik Planı
16. Aşamalı Uygulama Planı
17. Test Senaryoları
18. Riskler ve Açık Kararlar
19. Tavsiye Edilen Nihai Yaklaşım
```

Son bölümde Codex açık biçimde şu soruya cevap vermelidir:

> Bu yapı mevcut Factory Runway mimarisine hangi yaklaşım ile, hangi sırayla ve en düşük teknik riskle uygulanmalıdır?

---

# 24. Kabul Edilen Temel Ürün Kararları

Aşağıdaki kararlar artık tartışmaya açık değildir ve plan bunlara göre hazırlanmalıdır:

1. Vardiya simülasyonu yaklaşık 25 saniye sürecektir.
2. Üstte tek bir ana vardiya progress bar bulunacaktır.
3. Progress barın altında departman bazlı günlük sayaç kartları bulunacaktır.
4. Sayaçlar yalnızca o güne ait `Kuyruğa Giren` ve `Çıkan` değerlerini gösterecektir.
5. Mevcut `components/Count.tsx` öncelikle yeniden kullanılacaktır.
6. Üretim hattı sayısı büyüdüğünde ana görünüm departman toplamlarını gösterecektir.
7. Toast kullanılmayacaktır.
8. Günlük olaylar sağdan açılan kalıcı panelde gösterilecektir.
9. Panel oyuncu kapatana kadar açık kalacaktır.
10. Panel ertesi oyun gününde yeni günlük olay listesiyle yeniden başlayacaktır.
11. Personel işe gelmeme sistemi `docs/13-*` kararlarına uygun kurulacaktır.
12. Makine arızası sistemi mevcut mimariye uygun minimum uygulanabilir kapsamda planlanacaktır.
13. Maaş ödemesi ilk olarak 22. günde ve her 22 günde bir yapılacaktır.
14. Kira, elektrik ve benzeri giderler ilk olarak 10. günde ve sonrasında her 22 günde bir yapılacaktır.
15. Bütün finansal işlemler gerçek kayıt üretmeli ve tekrar çalışmaya karşı güvenli olmalıdır.
16. Veritabanı değişikliklerinde migration kesinlikle kullanılmayacaktır.
17. Uygulama aşamasında yalnızca `prisma db push` kullanılacaktır.
18. Bu ilk aşama yalnızca inceleme ve raporlama aşamasıdır.
19. Planlama onaylanmadan kodlamaya başlanmayacaktır.
