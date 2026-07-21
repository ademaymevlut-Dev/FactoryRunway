# 04 - Factory Level ve Büyüme Merdiveni

Bu doküman fabrikanın oyun içindeki gelişim sistemlerini birbirinden ayırır.

Detaylı stage config ve ortak gider hesabı:

```text
15-Factory_Operating_Stage_and_Shared_Cost.md
```

Doğrudan production line maliyeti:

```text
14-ProductionLine_Cost_Config.md
```

---

# 1. Ayrı Sistemler

Factory Runway içinde üç farklı gelişim kavramı vardır:

| Sistem | Soru |
|---|---|
| Player Level | Oyuncu hangi özellikleri açtı? |
| Production Grade | Üretim hattının teknoloji ve kapasite seviyesi nedir? |
| Factory Operating Stage | Fabrika organizasyon olarak hangi büyüklükte? |

Bu sistemler birbirinin yerine kullanılmaz.

---

# 2. Production Grade

Production Grade:

```text
WORKSHOP
INDUSTRIAL
PRECISION
SMART
```

Grade, `ProductionLineTemplate` özelliğidir.

Grade yükseldiğinde:

- günlük point kapasitesi artabilir,
- elektrik ve alan ihtiyacı değişebilir,
- aynı gider daha fazla üretim point'ine yayılabilir,
- doğrudan point maliyeti düşebilir.

Grade için ayrıca maliyet multiplier uygulanmaz.

---

# 3. Factory Operating Stage

Factory Operating Stage açık bir merdivendir:

| Sort | Stage | Production Line |
|---:|---|---:|
| 1 | Micro Workshop | 1–2 |
| 2 | Small Workshop | 3–5 |
| 3 | Stable Workshop | 6–9 |
| 4 | Growing Factory | 10–15 |
| 5 | Mass Factory | 16–22 |
| 6 | Large Factory | 23–30 |
| 7 | Enterprise Factory | 31+ |

Stage geçişi yalnızca aktif production line adedine göre yapılır.

Direkt personel ve günlük point kapasitesi ayrı operasyon göstergeleridir;
stage kilidi olarak kullanılmaz.

---

# 4. Stage'in Oyuncuya Etkisi

Yeni stage:

- yeni yönetim ve support ihtiyaçları,
- yeni depo ve tesis alanları,
- yeni sabit giderler,
- yeni UI etiketi,
- yeni bildirim,
- ranking ve unlock ilerlemesi

oluşturur.

Stage doğrudan üretim kapasitesini çarpmaz.

Kapasite yalnızca oyuncunun gerçek production line template değerlerinden gelir.

---

# 5. Ölçek Avantajı

Eski karar:

```text
base cost × unitCostMultiplierBps
```

kullanılmayacaktır.

Yeni karar:

```text
Shared cost per unit =
Stage shared monthly cost
/ monthly production quantity
```

Oyuncu daha fazla hat kurduğunda:

- doğrudan hat gideri artar,
- kapasite artar,
- ortak gider stage eşiklerinde kademeli artar,
- ortak gider daha fazla ürüne yayılır,
- tam birim CMT maliyeti düşebilir.

Bu ölçek avantajı açık ve izlenebilir bir sonuçtur; gizli multiplier değildir.

---

# 6. Current Stage

Mevcut stage yalnızca hesaplanan bir UI etiketi değildir.

Her fabrika için:

```text
FactoryOperatingStageState
```

kaydı tutulur.

State:

- current stage,
- highest reached stage,
- entered game day,
- last notified stage,
- requirement status,
- progress snapshot

bilgilerini taşır.

---

# 7. UI

Factory Dashboard:

```text
Current Stage: Small Workshop
Next Stage: Stable Workshop

Production Lines: 4 / 6
Next Stage at: 6 active lines
Direct Staff: 48
Daily Capacity: 72.000
```

Oyuncu bir sonraki hamlesini açıkça görebilmelidir.

Yeni stage'in:

- gereksinimleri,
- aylık ortak gideri,
- yeni kadro ihtiyaçları,
- kapasite yayılımı

önceden gösterilmelidir.

---

# 8. Notification

Stage değişikliği transaction içinde kaydedilir.

Yukarı geçişte oyuncuya bir defa bildirim verilir.

Stage history idempotency için:

```text
factoryId + stageId + enteredGameDay
```

benzersizliği kullanılır.

---

# 9. Maliyet Ayrımı

```text
Direct Production Cost
= ProductionLineTemplate tabanlı doğrudan maliyet
```

```text
Shared Factory Cost
= Stage yönetim, depo, support ve ortak tesis gideri
```

```text
Fully Loaded CMT Cost
= Direct Production Cost + Shared Factory Cost Share
```

Admin ürün fiyatını kendisi belirler.

Sistem yalnızca maliyet ve referans marj rehberi sunar.

---

# 10. Final Karar

| Konu | Karar |
|---|---|
| Fabrika büyümesi | Açık Operating Stage merdiveni |
| Maliyet multiplier | Kullanılmayacak |
| Current stage | Ayrı state kaydı |
| Stage history | Bildirim ve audit için tutulacak |
| Grade | Production line kapasite/teknoloji seviyesi |
| Scale avantajı | Ortak giderin kapasiteye yayılması |
| UI | Current, next, progress ve effects |
| Ana detay dokümanı | `15-Factory_Operating_Stage_and_Shared_Cost.md` |
