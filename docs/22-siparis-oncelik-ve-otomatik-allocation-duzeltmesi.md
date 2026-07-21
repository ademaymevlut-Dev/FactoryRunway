# 22 — Sipariş Öncelik Sistemi ve Otomatik Üretim Allocation Düzeltmesi

## Amaç

Mevcut projede daha önce hazırlanmış olan sipariş öncelik sıralama sistemi kaldırılmış veya devre dışı kalmıştır.

Bu çalışmanın amacı:

1. Mevcut draggable sipariş öncelik sistemini bulmak ve yeniden kullanılabilir durumdaysa geri getirmek.
2. Oyuncunun her üretim hattına ayrı ayrı günlük iş ataması yapmasını engellemek.
3. Oyuncunun yalnızca sipariş öncelik sırasını yönetmesini sağlamak.
4. Vardiya başlatıldığında aktif üretim hatlarının, hazır WIP ve sipariş önceliğine göre otomatik kullanılmasını sağlamak.
5. Mevcut Faz 1, Faz 2 ve Faz 3A güvenliklerini bozmadan sistemi düzeltmek.

Bu çalışma yeni bir mikro yönetim sistemi kurmayacaktır.

---

# 1. Zorunlu Başlangıç

Kod yazmadan önce mutlaka oku:

```text
docs/00-Development_Rules.md
docs/06-Factory_and_FactoryProductionLine.md
docs/10-ShiftSimulation_and_ShiftLineResult.md
docs/13-Staff_and_Organization.md
docs/20-vardiya-simulasyonu-gunluk-olay-paneli-ve-tetikleyici-sistemi.md
docs/21-faz-2-departman-sonuclari-ve-vardiya-playback-ui.md
```

Ayrıca proje içinde aşağıdaki yapıların gerçek dosyalarını bul ve incele:

```text
ProductionOrder
ProductionPlan
ProductionAllocation
ProductionOrderRouteProgress
ProductRouteStep
FactoryProductionLine
ShiftLineResult
ShiftDepartmentResult
day-simulation.ts
sipariş paneli
draggable / sortable order list
order priority action veya service
game snapshot
factory map
shift start action
```

Özellikle Git geçmişini incele:

```bash
git log --all -- path/to/order-priority-files
git diff
git status
```

Daha önce var olan draggable priority sistemi silindiyse veya değiştirilmişse:

- önce eski implementasyonu bul,
- neden kaldırıldığını belirle,
- uygunsa mevcut mimariye adapte ederek geri getir,
- sıfırdan paralel bir priority sistemi yazma.

---

# 2. Kesin Ürün Kararı

Oyuncu her üretim hattına ayrı ayrı günlük iş atamayacaktır.

Oyuncunun ana üretim kararı:

```text
Sipariş Öncelik Sırası
```

olacaktır.

Örnek:

```text
1. Sipariş A
2. Sipariş C
3. Sipariş B
4. Sipariş D
```

Bu sıralama draggable liste üzerinden değiştirilecektir.

Oyuncu vardiyayı başlattığında sistem:

```text
sipariş önceliği
+ departmandaki hazır WIP
+ aktif üretim hatları
+ hatların gerçek kapasitesi
+ ürün workload puanı
+ personel coverage
```

üzerinden otomatik üretim dağılımı yapacaktır.

---

# 3. Departman Kapasitesi Mantığı

Bir departmanın günlük üretim gücü, aktif ve kullanılabilir bütün hatlarının efektif kapasite toplamıdır.

Örnek:

```text
Kesim Workshop Hat 1: 14.500 point
Kesim Workshop Hat 2: 14.500 point

Kesim Departmanı Toplamı: 29.000 point
```

Oyuncu iki ayrı Kesim hattına günlük sipariş seçmek zorunda değildir.

Sistem bu toplam kapasiteyi, öncelik sırasındaki uygun siparişlere dağıtır.

Teknik olarak hatlar ayrı kalmaya devam eder:

- her hattın personeli,
- condition değeri,
- template grade’i,
- kapasitesi,
- arıza durumu,
- ShiftLineResult kaydı

ayrı tutulur.

Ancak oyuncuya zorunlu mikro yönetim olarak sunulmaz.

---

# 4. Otomatik Üretim Dağıtım Kuralı

Her departman için vardiya başlangıcında:

1. Aktif ve kullanılabilir hatları bul.
2. Her hattın gerçek efektif kapasitesini hesapla.
3. Departman için toplam kapasiteyi belirle.
4. Siparişleri oyuncunun priority sırasına göre oku.
5. Yalnızca o departmanda hazır WIP bulunan siparişleri üretime al.
6. İlk uygun siparişin WIP miktarını ve workload değerini kullan.
7. Sipariş tamamlanırsa kalan kapasiteyi sonraki öncelikli siparişe aktar.
8. Departman kapasitesi veya hazır WIP bitene kadar devam et.

Ana kural:

```text
En yüksek öncelikli ve o departmanda üretime hazır siparişi işle.
```

Öncelikli siparişte o departman için hazır WIP yoksa:

- departman beklememeli,
- sıradaki üretilebilir siparişe geçmelidir.

---

# 5. Hatların Boş Kalma Kuralı

Varsayılan durumda şu koşullar varsa hat boş kalmamalıdır:

```text
Hat aktif
+ personel mevcut
+ departmanda hazır WIP var
+ üretilebilir sipariş var
= otomatik üretim
```

Hat yalnızca şu durumlarda boş kalabilir:

- hazır WIP yok,
- üretilebilir sipariş yok,
- hat BROKEN,
- hat MAINTENANCE,
- hat DISABLED veya SOLD,
- personel coverage sıfır,
- oyuncunun gelecekte açıkça seçtiği özel hat kuralı.

“Manuel allocation yapılmadı” varsayılan boş kalma sebebi olmayacaktır.

---

# 6. ProductionPlan ve ProductionAllocation Kararı

Mevcut tablolar kaldırılmayacaktır.

## ProductionPlan

Günün üretim planını ve sipariş öncelik snapshot’ını temsil eder.

İçeriği mevcut modele göre şu kavramları desteklemelidir:

```text
factoryId
gameDay
status
order priority snapshot / ilişkisi
lockedAt
completedAt
```

## ProductionAllocation

Oyuncunun her hatta elle girdiği kayıt olmayacaktır.

Vardiya başlatıldığında otomatik allocation motoru tarafından oluşturulacaktır.

Yani:

```text
Oyuncu kararı:
Sipariş önceliği

Sistem kararı:
Hangi hat hangi siparişi ne kadar işleyecek
```

Mevcut allocation modeli bu otomatik sonuçları tutmak için kullanılmalıdır.

Yeni paralel allocation tablosu açma.

---

# 7. Sipariş Öncelik UI Düzeltmesi

Sipariş panelinde draggable priority list geri getirilmeli veya mevcut kod yeniden aktif edilmelidir.

UI davranışı:

- Aktif ve üretilebilir siparişler listelenir.
- Oyuncu drag-and-drop ile sıralamayı değiştirir.
- Sıra veritabanına kaydedilir.
- Sayfa yenilendiğinde aynı sıra korunur.
- Vardiya başlamadan önce değiştirilebilir.
- Vardiya playback sırasında değiştirilemez.
- Vardiya tamamlandıktan sonra yeni gün için tekrar düzenlenebilir.

Görünür kartlarda en az:

```text
Sipariş kodu
Müşteri / marka
Ürün
Termin günü
Kalan miktar
Öncelik sırası
```

gösterilmelidir.

Mevcut sortable component veya daha önceki order priority bileşeni uygunsa yeniden kullan.

Yeni drag-and-drop kütüphanesi ekleme.

---

# 8. Öncelik Kaydı

Mevcut schema ve servisleri incele.

Tercih edilen yaklaşım:

```text
ProductionOrder.priority
```

veya mevcut eşdeğer alan üzerinden sıralamayı tutmaktır.

Eğer priority zaten başka bir tabloda doğru biçimde tutuluyorsa onu kullan.

Aşağıdakileri yapma:

- JSON içinde belirsiz liste saklama,
- client state içinde kalıcı olmayan sıra,
- aynı sipariş için birden fazla çelişkili priority kaynağı,
- her departman için ayrı manuel priority listesi.

Oyuncunun ana order priority listesi tek kaynak olmalıdır.

Server sıralaması deterministik olmalıdır:

```text
priority
→ dueDay
→ createdAt
→ id
```

veya mevcut proje standardındaki eşdeğeri.

---

# 9. Vardiya Başlatma Akışı

Vardiya başlatıldığında mevcut Faz 1 claim ve idempotency sistemi korunmalıdır.

Önerilen sıra:

```text
1. Shift claim
2. Günün aktif sipariş priority sırasını oku
3. ProductionPlan kaydını oluştur veya mevcut DRAFT planı yükle
4. Planı LOCKED yap
5. Otomatik allocation motorunu çalıştır
6. Hat bazında ProductionAllocation kayıtlarını oluştur
7. Simülasyonu yalnızca oluşturulan allocation kayıtlarıyla çalıştır
8. ShiftLineResult kayıtlarını oluştur
9. ShiftDepartmentResult aggregation yap
10. Planı COMPLETED yap
11. Factory.currentDay değerini ilerlet
```

Bütün işlem mevcut transaction mimarisiyle uyumlu olmalıdır.

Aynı vardiya ikinci kez allocation üretmemelidir.

---

# 10. Otomatik Allocation Detayı

Allocation motoru gerçek hatları ayrı ayrı kullanmalıdır.

Örnek:

```text
Kesim Hat 1: 14.500 point
Kesim Hat 2: 14.500 point
Toplam: 29.000 point
```

Priority listesi:

```text
1. Order A
2. Order C
```

Order A:

```text
Hazır miktar: 2.000
Workload: 10 point/adet
Toplam ihtiyaç: 20.000 point
```

Dağılım örneği:

```text
CUT-01 → Order A → 14.500 point
CUT-02 → Order A → 5.500 point
CUT-02 kalan kapasite → Order C → 9.000 point
```

Bu dağılım oyuncuya zorunlu günlük görev olarak gösterilmez.

Ancak şu kayıtlarda korunmalıdır:

```text
ProductionAllocation
ShiftLineResult
```

Bir hat bir vardiyada birden fazla işi ardışık işleyebiliyorsa mevcut allocation modeli bunu desteklemelidir.

Desteklemiyorsa:

- önce mevcut modeli raporla,
- en az müdahaleyle otomatik segment/allocation desteği ekle,
- oyuncuyu manuel tek-iş-per-line modeline zorlamayı çözüm olarak kullanma.

---

# 11. Aynı Gün Departman Transferi

Mevcut batch kararı korunacaktır.

```text
Bugünkü Kesim çıktısı
→ bugün Dikim kuyruğuna eklenir
→ Dikim tarafından ertesi vardiyada işlenir
```

Otomatik allocation yalnızca vardiya başında hazır bulunan WIP’i kullanmalıdır.

Bugün upstream departmandan gelecek miktarı aynı vardiyada downstream üretime verme.

---

# 12. Özel Hat Önceliği

Bu fazda zorunlu değildir.

Mevcut yapıya kolayca uyuyorsa opsiyonel olarak yalnızca şu model desteklenebilir:

```text
AUTO
PREFERRED_ORDER
```

Varsayılan:

```text
AUTO
```

`PREFERRED_ORDER` seçilmişse:

- tercih edilen siparişte hazır WIP varsa önce onu işler,
- hazır WIP yoksa otomatik priority kuyruğuna geri döner,
- hat gereksiz yere boş kalmaz.

Tam kilitli “yalnızca bu siparişi üret” modu ekleme.

Bu özellik mevcut yapıyı büyütüyorsa bu fazda kodlama; yalnızca raporla.

---

# 13. Plansız Vardiya Davranışı

Aktif üretilebilir sipariş ve WIP varsa otomatik allocation üretilmelidir.

Oyuncunun ayrıca plan oluşturmasına gerek yoktur.

Şu durumda iç üretim sıfır olabilir:

```text
Aktif üretilebilir sipariş yok
veya
Hazır WIP yok
```

ProductionPlan/ProductionAllocation tablosunda kayıt olmaması, tek başına üretimi durdurmamalıdır.

Sistem vardiya başlatıldığında gerekli otomatik plan ve allocation kayıtlarını üretmelidir.

---

# 14. Çoklu Hat Testi

Gerçek senaryo:

```text
Kesim:
- CUT-01 Workshop
- CUT-02 Workshop

Dikim:
- SEW-01 Workshop
- SEW-02 Industrial

Ütü & Paket:
- IRN-01 Workshop
```

Beklenen:

- Sipariş priority listesi tek.
- Her departman kendi hazır WIP’ine göre aynı priority sırasını uygular.
- Aktif hatlar otomatik kullanılır.
- Plansız fakat kullanılabilir hat boş kalmaz.
- Her hat için ayrı ShiftLineResult oluşur.
- Her departman için tek ShiftDepartmentResult oluşur.
- activeLineCount doğru hesaplanır.
- Toplam point kapasitesi gerçek hat toplamıdır.
- Üretim planned/allocation miktarlarını aşmaz.
- Aynı WIP iki kez tüketilmez.

---

# 15. UI Kapsamı

Bu fazda yapılacak UI:

- Draggable sipariş öncelik listesi
- Priority kaydetme
- Priority sırasını gösterme
- Playback sırasında kilit
- Vardiya sonrası yeni gün için tekrar düzenleme

Bu fazda yapılmayacak UI:

- Her hatta ayrı günlük sipariş formu
- Her hatta ayrı adet girişi
- Büyük allocation dashboard
- Drag ile siparişi production line kartına bırakma
- Her departman için ayrı priority listesi

Hat detayında otomatik allocation sonucu yalnızca bilgi amaçlı gösterilebilir.

---

# 16. Mevcut Kodun Geri Getirilmesi

Daha önce hazırlanmış priority kodu kaldırılmışsa:

1. Git geçmişinden ilgili commit/diff’i bul.
2. Hangi dosyaların kaldırıldığını veya değiştirildiğini belirle.
3. Faz 1–3A mimarisiyle çakışan eski noktaları ayır.
4. Uygun bileşen, action ve service’leri geri getir.
5. Eski kodu körlemesine restore etme.
6. Faz 1 idempotency, Faz 2 playback ve Faz 3A yatırım yapısını bozma.

Raporun sonunda açıkça belirt:

```text
Geri kullanılan eski dosyalar
Yeniden yazılan dosyalar
Kaldırılmış olup geri getirilemeyen parçalar
```

---

# 17. Test Gereksinimleri

En az şu testleri ekle:

## Priority

1. Priority sırası kaydediliyor
2. Refresh sonrası korunuyor
3. Aynı priority değeri deterministik çözülüyor
4. Playback sırasında değiştirilemiyor
5. Başka factory siparişi değiştirilemiyor

## Otomatik allocation

6. Tek hat tek siparişi otomatik alıyor
7. İki hat aynı departman kapasitesine katılıyor
8. İlk sipariş bitince kalan kapasite ikinci siparişe geçiyor
9. İlk priority siparişinde WIP yoksa sonraki siparişe geçiliyor
10. Uygun WIP varken aktif hat boş kalmıyor
11. WIP yoksa üretim yapılmıyor
12. Personel coverage kapasiteye yansıyor
13. Aynı WIP iki kez tüketilmiyor
14. Allocation ve ShiftLineResult tutarlı

## Regresyon

15. Faz 1 vardiya idempotency testleri geçiyor
16. Faz 2 playback ve ShiftDepartmentResult testleri geçiyor
17. Faz 3A yatırım/personel testleri geçiyor
18. Aynı vardiya ikinci kez allocation oluşturmuyor
19. Gün yalnızca bir kez ilerliyor

---

# 18. Bu Fazda Yapılmayacaklar

```text
Leasing
Maaş ödeme tetikleyicisi
10+22 gider tetikleyicisi
Günlük olay paneli
Personel devamsızlığı
Makine arızası
Hat upgrade
Hat satışı
Manuel line-by-line günlük plan
Gerçek zamanlı aynı gün departman transferi
```

---

# 19. Veritabanı Kuralı

Migration kullanılmayacaktır.

Yasak:

```bash
npx prisma migrate dev
npx prisma migrate deploy
npx prisma migrate reset
```

Schema değişikliği gerekirse:

```bash
npx prisma db push
```

kullan.

`db push` öncesinde tüm schema diff’ini raporla.

Gerekli değilse schema değiştirme.

---

# 20. Beklenen Son Rapor

```text
1. Okunan Dosyalar
2. Git Geçmişinde Bulunan Eski Priority Sistemi
3. Geri Getirilen veya Uyarlanan Kodlar
4. Mevcut Priority Veri Kaynağı
5. Draggable Priority UI
6. Priority Kaydetme Güvenliği
7. Otomatik Allocation Algoritması
8. Departman Kapasite Toplama
9. Hat Bazlı Allocation Sonuçları
10. WIP Tüketim Güvenliği
11. Vardiya Entegrasyonu
12. Çoklu Hat Test Sonuçları
13. Değiştirilen Dosyalar
14. Prisma ve db push Durumu
15. Test, ESLint, TypeScript ve Build Sonuçları
16. Açık Riskler
```

Önce kısa analiz ve dosya planı ver.

Ardından bu düzeltmeyi uygula.

Oyuncuya her üretim hattını tek tek planlatan sistemi oluşturma veya koruma.

Ana oyun kararı:

```text
Oyuncu sipariş önceliğini belirler.
Sistem aktif hatları otomatik kullanır.
```
