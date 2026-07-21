# 05 - FactoryScaleTier Kararının Operating Stage Yapısına Dönüşümü

Bu doküman eski FactoryScaleTier yaklaşımının yeni final karardaki karşılığını
açıklar.

Canonical model ve hesaplar:

```text
15-Factory_Operating_Stage_and_Shared_Cost.md
```

---

# 1. Neden Değiştirildi?

Eski model:

- unit cost multiplier,
- utilization factor,
- support factor,
- management complexity multiplier

gibi birbiri üzerine uygulanan oranlara dayanıyordu.

Bu yapı:

- oyuncuya anlatılması zor,
- Admin tarafından balanslanması zor,
- aynı maliyet avantajını iki kez uygulamaya açık,
- UI ilerleme hissi zayıf

olduğu için final yapı değildir.

---

# 2. Yeni Final Model

Yeni sistem:

```text
SectorFactoryOperatingStage
FactoryOperatingStageState
FactoryOperatingStageHistory
SectorFactoryOperatingStageStaffRequirement
```

üzerinden çalışır.

Her stage:

- açık eşikler,
- açık role quantity değerleri,
- açık depo/tesis alanları,
- açık ortak gider değerleri

taşır.

Multiplier kullanılmaz.

---

# 3. Eski ve Yeni Alan Eşlemesi

| Eski Yapı | Yeni Yapı |
|---|---|
| `FactoryScaleTier` | Stage adı global tablo yerine sektör stage translation |
| `SectorFactoryScaleTier` | `SectorFactoryOperatingStage` |
| `unitCostMultiplierBps` | Kaldırılır |
| `managementComplexityBps` | Kaldırılır; stage requirement ve event sistemi kullanılır |
| `minUtilizationBpsForBenefit` | Kaldırılır; gerçek ortak gider/üretim hesabı kullanılır |
| `minSupportCoverageBps` | Kaldırılır; role checklist kullanılır |
| `Factory.currentSectorScaleTierId` | `FactoryOperatingStageState.currentStageId` |
| Hesaplanan label | Kalıcı current/highest stage state |

---

# 4. Stage Sektöre Özel Olmalıdır

Textile, furniture, chocolate ve diğer sektörler aynı eşikleri kullanmak
zorunda değildir.

Bu nedenle stage config:

```text
sectorId + key
```

scope'unda tanımlanır.

Örnek:

```text
textile / small_workshop
furniture / small_workshop
```

aynı UI kavramına benzese bile farklı:

- production line eşiği,
- depo alanı,
- support kadrosu,
- ortak gider

taşıyabilir.

---

# 5. Textile Stage Sırası

| Sort | Key | UI Name | Min Line |
|---:|---|---|---:|
| 1 | `micro_workshop` | Micro Workshop | 1 |
| 2 | `small_workshop` | Small Workshop | 3 |
| 3 | `stable_workshop` | Stable Workshop | 6 |
| 4 | `growing_factory` | Growing Factory | 10 |
| 5 | `mass_factory` | Mass Factory | 16 |
| 6 | `large_factory` | Large Factory | 23 |
| 7 | `enterprise_factory` | Enterprise Factory | 31 |

Diğer eşikler ve gider değerleri stage seed çalışmasında doldurulur.

---

# 6. Stage Eligibility

Bir fabrikanın stage'i:

```ts
activeProductionLineCount >= minProductionLines
&& (
  maxProductionLines == null
  || activeProductionLineCount <= maxProductionLines
)
```

aralığına uyan aktif stage'dir.

Direkt personel ve günlük point kapasitesi stage kilidi değildir.

Support role requirement yeni stage aktif olduğunda devreye girer.

Eksik support:

- UI uyarısı,
- operasyon riski,
- event olasılığı

oluşturabilir; gizli cost multiplier oluşturmaz.

---

# 7. Stage Cost

Her stage ortak gider girdilerini açık değer olarak taşır:

```text
Warehouse areas
Office/social/technical area
Facility electricity
Staff electricity extra
Daily meal per staff
Canteen fixed cost
Overhead base
Overhead per staff
Role-based support requirements
```

Stage ortak gideri gerçek üretim miktarına bölünerek birim ortak gider bulunur.

---

# 8. Current State

Current stage her request'te geçici olarak hesaplanıp unutulmaz.

`FactoryOperatingStageState`:

- UI,
- notification,
- audit,
- next stage progress,
- highest reached stage

için source of truth'tür.

State yalnızca `recalculateFactoryOperatingStage` servisiyle güncellenir.

---

# 9. Schema Geçiş Notu

Kodlama aşamasında:

1. Yeni operating stage modelleri eklenir.
2. Stage seed verileri oluşturulur.
3. Mevcut factory scale verileri stage kayıtlarına dönüştürülür.
4. Factory state kayıtları oluşturulur.
5. Eski multiplier kullanımları kaldırılır.
6. Kullanılmayan eski scale tabloları testlerden sonra kaldırılır.

Geliştirme aşamasında migration yerine mevcut proje kararına uygun olarak
`db push` kullanılabilir.

---

# 10. Final Karar

| Konu | Karar |
|---|---|
| Factory scale multiplier | Final sistem değil |
| Yeni model | Factory Operating Stage |
| Sektöre özel config | Evet |
| Açık gider değerleri | Evet |
| Role bazlı requirement | Evet |
| Current stage state | Evet |
| Highest reached stage | Evet |
| Stage notification | Evet |
| Canonical detay | 15 numaralı doküman |
