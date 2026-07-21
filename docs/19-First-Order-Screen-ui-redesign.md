# 19 - İlk Sipariş Ekranı UI Redesign ve Uygulama Talimatı

## Factory Runway - Order Market / First Order Selection Screen

Bu doküman, Factory Runway projesindeki **İlk Siparişini Seç / Order Market** ekranının yeniden tasarlanması için hazırlanmıştır.

Amaç, mevcut ekranın temel mantığını koruyarak daha kompakt, premium, oyun hissi güçlü, performans dostu ve veri tabanı verileriyle çalışan bir UI elde etmektir.

Bu doküman Codex tarafından proje içinde okunarak uygulanmalıdır.

---

# 1. Kesin Tasarım Kararları

Bu ekranda aşağıdaki kararlar uygulanacaktır:

1. Ana market paneli ekranı dikine tamamen kaplamayacaktır.
2. Sayfa hafif mouse/touch hareketinde body scroll açmayacaktır.
3. Ana panel viewport yüksekliğinin yaklaşık `%90` sınırında kalacaktır.
4. Sağ sipariş detay alanı mevcut halinden daha dar ve odaklı olacaktır.
5. Ürün görseli hero kart içinde daha büyük, daha önde ve daha premium görünecektir.
6. Ürün görseli alttan hizalanacak, gerekiyorsa hero kartın üst sınırından hafif taşabilecektir.
7. Mevcut iki adet düz dolu renk dairesi kaldırılacaktır.
8. 2. ve 3. admin renkleri arka planda **organik blob**, **rotated rounded panel**, **soft gradient shape**, **dot pattern** gibi premium şekillerle kullanılacaktır.
9. Hiçbir sipariş verisi, fiyat, kod, adet, gün, müşteri adı, ürün adı veya rota metni hardcoded yazılmayacaktır.
10. Tüm dinamik değerler mevcut veritabanı / API / component props verisinden alınacaktır.
11. Tailwind sınıfları ağırlıklı kullanılacak, özel CSS sadece gerçekten gerektiğinde eklenecektir.
12. UI mevcut dark theme ile uyumlu kalacaktır.
13. Sonuç generic CRUD panel değil, premium business simulation game ekranı gibi hissettirmelidir.

---

# 2. Çok Önemli Veri Kuralı

Codex hiçbir şekilde örnek değerleri component içine sabit metin olarak yazmamalıdır.

Aşağıdaki değerler **örnek değildir, mevcut datadan gelmelidir**:

- müşteri / marka adı
- sipariş adı
- ürün adı
- ürün tipi
- ürün görseli
- koleksiyon adı
- zorluk etiketi
- sipariş kodu
- istenen tarih / teslim günü
- sipariş adedi
- teklif fiyatı
- birim teklif
- üretim rotası
- para birimi
- aktif teklif sayısı
- renkler
- ürün ikonları
- order index / sıra numarası

Codex bu değerleri mevcut veri yapısından okumalıdır. Eğer mevcut component içinde bu alanlar farklı isimlerle geliyorsa, mevcut isimleri koruyarak UI uygulanmalıdır.

Sadece UI sabit label metinleri kullanılabilir. Örneğin:

- `ORDER MARKET`
- `İlk Siparişini Seç`
- `SEÇİLİ SİPARİŞ`
- `Kod`
- `İstenen Tarih`
- `Sipariş Adedi`
- `Teklif Fiyatı`
- `Birim Teklif`
- `Üretim Rotası`
- `Siparişi kabul et`

Eğer projede i18n veya translation sistemi varsa bu label metinleri de mevcut translation sistemine uygun biçimde kullanılmalıdır.

---

# 3. Genel Görsel Hedef

Ekran şu hissi vermelidir:

- koyu lacivert / siyah premium dashboard
- oyun içi market ekranı
- güçlü ama abartısız neon/cyan vurgu
- seçili siparişte admin renklerine bağlı sıcak accent
- ürün kartında editorial / katalog kalitesinde ürün sunumu
- compact layout
- kontrollü panel yüksekliği
- yüksek okunabilirlik
- düşük görsel karmaşa

Bu ekran oyuncuya ilk siparişini seçtirir. Bu yüzden ürün, fiyat ve karar alanı net görünmelidir.

---

# 4. Ana Sayfa Wrapper Kararı

Body veya page-level wrapper accidental scroll üretmemelidir.

Önerilen yapı:

```tsx
<div className="min-h-screen overflow-hidden bg-[#08111f] text-white">
  <div className="mx-auto flex min-h-screen max-w-[1440px] items-center justify-center px-6 py-6">
    {/* Main Order Market Panel */}
  </div>
</div>
```

Notlar:

- `overflow-hidden` sayfa scroll problemini engellemek için önemlidir.
- Eğer app layout içinde zaten global shell varsa aynı davranış mevcut parent layout içinde sağlanmalıdır.
- Main panel kendi içinde kontrollü alanlara sahip olmalıdır.
- Tüm ekran scroll olmamalıdır.

---

# 5. Ana Market Paneli

Ana panel floating card gibi görünmelidir.

Önerilen kararlar:

```tsx
<div className="relative h-[90dvh] max-h-[900px] min-h-[700px] w-full max-w-[1080px] overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(24,39,73,0.45),transparent_30%),linear-gradient(180deg,rgba(16,22,37,0.98),rgba(10,14,26,0.98))] shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
  {/* Decorative layers */}
  {/* Content grid */}
</div>
```

Eğer `border-white/8` Tailwind sürümünde çalışmıyorsa `border-white/[0.08]` kullanılmalıdır.

Alternatif güvenli kullanım:

```tsx
<div className="relative h-[90dvh] max-h-[900px] min-h-[700px] w-full max-w-[1080px] overflow-hidden rounded-[28px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(24,39,73,0.45),transparent_30%),linear-gradient(180deg,rgba(16,22,37,0.98),rgba(10,14,26,0.98))] shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
```

## 5.1 Panel arka plan dekorasyonu

Panelin premium havası için çok hafif dekoratif katmanlar kullanılmalıdır.

```tsx
<div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,rgba(59,130,246,0.22)_1px,transparent_1px)] [background-size:140px_100%]" />

<div className="pointer-events-none absolute inset-y-0 left-[18%] w-[240px] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.14),transparent_70%)] blur-3xl" />

<div className="pointer-events-none absolute inset-y-0 right-[12%] w-[240px] bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.10),transparent_70%)] blur-3xl" />
```

Bu dekoratif alanlar kullanıcı etkileşimine girmemelidir. Bu yüzden `pointer-events-none` kullanılmalıdır.

---

# 6. İç Layout Grid Kararı

Ekran iki ana kolondan oluşacaktır:

- Sol: sipariş listesi
- Sağ: seçili sipariş detayı

Sağ alan mevcut halinden daha dar tutulmalıdır.

Önerilen grid:

```tsx
<div className="relative z-10 grid h-full grid-cols-[360px_minmax(0,540px)] gap-6 p-8">
  <OrderListPanel />
  <SelectedOrderPanel />
</div>
```

Kesin oran:

- Sol kolon: yaklaşık `360px`
- Sağ kolon: yaklaşık `540px`
- Gap: `24px`
- Main panel max width: yaklaşık `1080px`

Bu oranlar sağ ürün kartının gereksiz yatay genişlemesini engeller.

---

# 7. Sol Panel - Sipariş Listesi

Sol panel kompakt ama okunaklı olmalıdır.

## 7.1 Sol başlık alanı

```tsx
<div className="mb-6">
  <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-cyan-400/90">
    ORDER MARKET
  </p>

  <h1 className="mt-2 text-[36px] font-semibold leading-[1.05] tracking-[-0.02em] text-white">
    İlk Siparişini Seç
  </h1>

  <p className="mt-3 text-sm text-white/45">
    {/* Mevcut açıklama verisi veya mevcut static UI açıklaması */}
  </p>
</div>
```

Not:

- Buradaki açıklama mevcut kodda nasıl geliyorsa korunmalıdır.
- Hardcoded şirket adı, day bilgisi veya oyun günü yazılmamalıdır.
- Eğer bu açıklama dinamikse mevcut datadan gelmelidir.

## 7.2 Liste alanı

```tsx
<div className="flex h-full min-h-0 flex-col">
  <div className="mb-6">...</div>

  <div className="min-h-0 space-y-4 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
    {/* order cards */}
  </div>
</div>
```

Not:

- Body scroll değil, gerekirse sadece list body scroll olmalıdır.
- 3 sipariş varsa scroll görünmemelidir.
- Daha fazla siparişte sadece sol liste kaymalıdır.

---

# 8. Order List Card Tasarımı

Her sipariş kartı dark glass panel olarak görünmelidir.

## 8.1 Base card

```tsx
<button
  type="button"
  className={cn(
    "group relative w-full rounded-[22px] border bg-white/[0.035] px-4 py-4 text-left transition-all duration-300 ease-out",
    "border-white/[0.08] hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.05]",
    selected && "shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_0_32px_rgba(0,0,0,0.18)]"
  )}
  style={selected ? selectedCardStyle : undefined}
>
  ...
</button>
```

## 8.2 İç düzen

```tsx
<div className="flex items-center gap-4">
  <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[18px] border border-white/[0.12] bg-black/20">
    {/* product icon / image from data */}
  </div>

  <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border text-sm font-semibold">
    {/* dynamic order index */}
  </div>

  <div className="min-w-0 flex-1">
    <p className="truncate text-[18px] font-semibold tracking-[-0.01em] text-white">
      {/* dynamic customer/order name */}
    </p>

    <p className="mt-1 text-sm text-white/55">
      {/* dynamic product type */}
    </p>

    <p className="mt-1 text-xs text-white/35">
      {/* dynamic quantity and delivery info */}
    </p>
  </div>

  <div className="shrink-0 text-right">
    <p className="text-[16px] font-semibold tracking-[-0.01em]">
      {/* dynamic price + currency */}
    </p>
  </div>
</div>
```

## 8.3 Seçili kart renk davranışı

Seçili kartın border ve glow değeri `primaryColor` üzerinden gelmelidir.

Hardcoded sarı değer kullanma. Eğer mevcut seçili siparişin accent rengi sarıysa zaten veriden gelecektir.

Önerilen yardımcı fonksiyon:

```ts
function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

function hexToRgbString(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
}

function rgbaFromHex(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
```

Seçili kart style örneği:

```tsx
const selectedCardStyle: React.CSSProperties = selected
  ? {
      borderColor: rgbaFromHex(order.primaryColor, 0.58),
      background: `linear-gradient(180deg, ${rgbaFromHex(order.primaryColor, 0.11)}, rgba(255,255,255,0.025))`,
      boxShadow: `0 0 0 1px ${rgbaFromHex(order.primaryColor, 0.22)}, 0 0 30px ${rgbaFromHex(order.primaryColor, 0.16)}`,
    }
  : {};
```

Index badge için:

```tsx
style={{
  borderColor: rgbaFromHex(order.primaryColor, selected ? 0.72 : 0.4),
  color: selected ? order.primaryColor : "rgba(255,255,255,0.72)",
  backgroundColor: selected ? rgbaFromHex(order.primaryColor, 0.11) : "rgba(255,255,255,0.035)",
}}
```

---

# 9. Sağ Panel - Seçili Sipariş Detayı

Sağ panel tek bir dikey stack gibi çalışmalıdır.

```tsx
<div className="flex h-full min-h-0 flex-col">
  <SelectedOrderHeader />
  <SelectedOrderChips />
  <SelectedOrderHero />
  <SelectedOrderMetaTable />
  <SelectedOrderFooter />
</div>
```

## 9.1 Sağ panel üst başlık

```tsx
<div className="mb-4 flex items-start justify-between gap-4">
  <div className="min-w-0">
    <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-white/45">
      SEÇİLİ SİPARİŞ
    </p>

    <h2 className="mt-2 truncate text-[34px] font-semibold leading-none tracking-[-0.03em] text-white">
      {/* dynamic selected order/customer name */}
    </h2>

    <p className="mt-3 text-sm text-white/60">
      Koleksiyon:{" "}
      <span style={{ color: selected.primaryColor }} className="font-medium">
        {/* dynamic collection name */}
      </span>
    </p>
  </div>

  <span className="shrink-0 rounded-full border border-white/[0.10] bg-white/[0.05] px-4 py-2 text-sm text-white/60">
    {/* dynamic open offers count / status label */}
  </span>
</div>
```

Not:

- `ALESSANDRA` veya başka bir müşteri adı hardcoded yazılmayacaktır.
- Header truncate desteklemelidir.

## 9.2 Chip alanı

```tsx
<div className="mb-5 flex items-center gap-3">
  <span
    className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
    style={{
      borderColor: rgbaFromHex(selected.primaryColor, 0.35),
      backgroundColor: rgbaFromHex(selected.primaryColor, 0.12),
      color: selected.primaryColor,
    }}
  >
    <span
      className="h-2 w-2 rounded-full"
      style={{ backgroundColor: selected.primaryColor }}
    />
    {/* dynamic product type */}
  </span>

  <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-4 py-2 text-sm font-medium text-fuchsia-200">
    {/* dynamic difficulty label */}
  </span>
</div>
```

---

# 10. Product Hero Card - En Önemli Alan

Hero kart ekranın premium hissini belirleyen ana alandır.

Mevcut düz gri kart ve iki düz daire sistemi kaldırılacaktır.

Yerine:

- dark gradient base
- 2. renkten organik blob
- 3. renkten rotated rounded panel
- düşük opacity dot pattern
- büyük ürün görseli
- faint letter / watermark
- ürün adı
- küçük accent underline

## 10.1 Hero card container

```tsx
<div
  className="relative h-[310px] overflow-visible rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
  style={
    {
      "--order-primary-rgb": hexToRgbString(selected.primaryColor),
      "--order-secondary-rgb": hexToRgbString(selected.secondaryColor),
      "--order-tertiary-rgb": hexToRgbString(selected.tertiaryColor),
    } as React.CSSProperties
  }
>
  ...
</div>
```

## 10.2 Global dark gradient wash

```tsx
<div className="pointer-events-none absolute inset-0 rounded-[26px] bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.05),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.02),transparent_55%)]" />
```

## 10.3 Secondary color organic blob

Bu alan adminin 2. renginden oluşmalıdır.

```tsx
<div
  className="pointer-events-none absolute right-[116px] top-[44px] h-[170px] w-[160px] rounded-[58%_42%_47%_53%/40%_51%_49%_60%] opacity-75 blur-[1px]"
  style={{
    background: `linear-gradient(135deg, rgba(${hexToRgbString(selected.secondaryColor)},0.82), rgba(${hexToRgbString(selected.secondaryColor)},0.38))`,
  }}
/>
```

## 10.4 Tertiary color rotated rounded panel

Bu alan adminin 3. renginden oluşmalıdır.

```tsx
<div
  className="pointer-events-none absolute right-[34px] top-[58px] h-[160px] w-[160px] rotate-[18deg] rounded-[34px] opacity-70"
  style={{
    background: `linear-gradient(135deg, rgba(${hexToRgbString(selected.tertiaryColor)},0.78), rgba(${hexToRgbString(selected.tertiaryColor)},0.36))`,
  }}
/>
```

## 10.5 Dot pattern

Dot pattern çok hafif olmalıdır. Dikkat çekmemeli, sadece premium graphic hissi vermelidir.

```tsx
<div className="pointer-events-none absolute left-[26px] top-[28px] grid grid-cols-5 gap-3 opacity-40">
  {Array.from({ length: 20 }).map((_, i) => (
    <span
      key={i}
      className="h-[3px] w-[3px] rounded-full"
      style={{ backgroundColor: rgbaFromHex(selected.primaryColor, 0.7) }}
    />
  ))}
</div>
```

## 10.6 Faint letter / product watermark

Bu alan ürün kartına editorial karakter verir.

```tsx
<span className="pointer-events-none absolute left-7 top-10 text-[72px] font-light tracking-[-0.04em] text-white/[0.14]">
  {/* dynamic first letter of selected order/customer/product group */}
</span>
```

Hardcoded `A` yazılmamalıdır. Dinamik üretilmelidir.

Örnek:

```ts
const heroLetter = selected.customerName?.charAt(0)?.toUpperCase() ?? "";
```

## 10.7 Hero title

```tsx
<div className="absolute bottom-8 left-7 z-[3]">
  <h3 className="max-w-[240px] text-[24px] font-semibold leading-[1.1] tracking-[-0.02em] text-white">
    {/* dynamic product name */}
  </h3>

  <div
    className="mt-4 h-[3px] w-10 rounded-full"
    style={{ backgroundColor: selected.primaryColor }}
  />
</div>
```

Ürün adı hardcoded yazılmamalıdır.

## 10.8 Ürün görseli

Ürün görseli daha büyük ve hero alanının ana karakteri olmalıdır.

Temel karar:

```tsx
<img
  src={selected.productImage}
  alt={selected.productName}
  className="pointer-events-none absolute bottom-0 right-6 z-[4] h-[285px] w-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.35)]"
/>
```

Eğer mevcut ürün asset boyutu uygunsa daha premium taşma için:

```tsx
<img
  src={selected.productImage}
  alt={selected.productName}
  className="pointer-events-none absolute -top-8 right-4 z-[4] h-[320px] w-auto object-contain drop-shadow-[0_24px_40px_rgba(0,0,0,0.42)]"
/>
```

Uygulama sırasında gerçek asset’e göre en iyi kompozisyon seçilmelidir.

Kesin kural:

- ürün eski halindeki gibi küçük kalmamalıdır
- ürün alttan veya hafif üstten taşarak hero kartın ana objesi olmalıdır
- product card wrapper `overflow-visible` olmalıdır

---

# 11. Detay Satırları / Meta Table

Hero kartın altında compact data panel kullanılacaktır.

## 11.1 Container

```tsx
<div className="mt-4 overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.03]">
  {/* rows */}
</div>
```

## 11.2 Satır tasarımı

```tsx
<div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3 last:border-b-0">
  <div className="flex items-center gap-3">
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-500/12 text-fuchsia-300">
      {/* icon */}
    </span>

    <span className="text-[15px] text-white/58">
      {/* label */}
    </span>
  </div>

  <span
    className="text-[15px] font-medium tracking-[-0.01em]"
    style={{ color: valueShouldBeAccent ? selected.primaryColor : "rgba(255,255,255,0.78)" }}
  >
    {/* dynamic value */}
  </span>
</div>
```

Satırlar:

- Kod
- İstenen Tarih
- Sipariş Adedi
- Teklif Fiyatı
- Birim Teklif
- Üretim Rotası

Not:

- Label metinleri mevcut sistemde varsa oradan alınmalıdır.
- Value değerleri kesinlikle dinamik olmalıdır.
- Kod, adet, fiyat, tarih, rota örnekleri hardcoded olmayacaktır.

---

# 12. Footer CTA Panel

Footer alanı sağ panelin altında compact ve güçlü kalmalıdır.

```tsx
<div className="mt-4 flex items-center justify-between gap-4 rounded-[24px] border border-cyan-500/12 bg-[linear-gradient(135deg,rgba(59,130,246,0.08),rgba(255,255,255,0.02))] px-6 py-5">
  <div className="min-w-0">
    <p className="text-[15px] font-medium text-white/82">
      {/* static or existing translated helper text */}
    </p>

    <p className="mt-1 text-sm text-white/42">
      {/* static or existing translated sub helper text */}
    </p>
  </div>

  <button className="inline-flex h-[56px] shrink-0 items-center gap-3 rounded-full bg-cyan-500 px-7 text-[17px] font-semibold text-white shadow-[0_10px_24px_rgba(6,182,212,0.34)] transition-all duration-300 hover:bg-cyan-400 hover:shadow-[0_14px_30px_rgba(34,211,238,0.36)]">
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
      ✓
    </span>
    Siparişi kabul et
  </button>
</div>
```

Buton aksiyonu mevcut kabul fonksiyonunu kullanmalıdır. Yeni sahte handler yazılmamalıdır.

---

# 13. Component Refactor Önerisi

Mevcut dosya çok büyüdüyse şu componentlere ayrılabilir:

```txt
OrderMarketPage
OrderListPanel
OrderListCard
SelectedOrderPanel
SelectedOrderHeader
SelectedOrderHero
SelectedOrderMetaTable
SelectedOrderFooter
```

Ancak gereksiz büyük refactor yapılmamalıdır. Öncelik mevcut ekranı güvenli şekilde iyileştirmektir.

---

# 14. TypeScript Veri Yapısı İçin Uyarı

Aşağıdaki yapı yalnızca yön gösterir. Codex mevcut projedeki gerçek type / Prisma / API response yapısını bozmayacaktır.

```ts
type OrderSummary = {
  id: string;
  index: number;
  customerName: string;
  productType: string;
  quantity: number;
  deliveryDays: number;
  price: number;
  currency: string;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  productImage: string;
  productName: string;
  collectionName: string;
  difficultyLabel: string;
  code: string;
  requestedDayLabel: string;
  unitPriceLabel: string;
  routeLabel: string;
  statusLabel?: string;
};
```

Bu type projede yoksa direkt birebir eklemek zorunda değildir. Mevcut type yapısını inceleyip uygun şekilde eşlemelidir.

---

# 15. Admin Renklerinin Kullanım Kuralı

Sipariş / ürün admin ekranından gelen renkler şu şekilde kullanılacaktır:

```txt
primaryColor   -> seçili kart border/glow, fiyat accent, chip accent, underline
secondaryColor -> hero kart arka planındaki organik blob
tertiaryColor  -> hero kart arka planındaki rotated rounded panel / soft shape
```

Renkler tüm ekranı boyamamalıdır. Dark UI ana zemin olarak kalmalıdır.

Renk kullanım oranı:

- ana zemin: dark navy / black
- primary accent: seçili alanlarda kontrollü
- secondary / tertiary: sadece hero art background içinde düşük opacity ve gradient olarak

---

# 16. Motion / Transition Kuralları

Bu ekranda ağır animasyon yapılmayacaktır. Hafif micro interaction yeterlidir.

Kullanılacaklar:

```txt
transition-all
transition-transform
transition-opacity
duration-300
ease-out
hover:-translate-y-0.5
opacity transition
scale transition
```

Sipariş seçimi değiştiğinde:

- seçili kart glow değişir
- hero görseli hafif fade + y hareketi ile yenilenebilir
- background shape’ler scale/opacity ile yumuşak değişebilir
- detay satırları çok kısa opacity geçişi alabilir

GSAP bu ekran için zorunlu değildir. Mevcut projede zaten GSAP varsa sadece küçük timeline ile ürün değişimi yapılabilir. Ancak öncelik Tailwind + CSS transition olmalıdır.

---

# 17. Responsive Davranış

Bu ekran öncelikle desktop için tasarlanmaktadır. Ancak tablet ve küçük ekranlarda kırılmamalıdır.

Minimum responsive karar:

```tsx
<div className="relative z-10 grid h-full grid-cols-1 gap-6 p-5 lg:grid-cols-[360px_minmax(0,540px)] lg:p-8">
```

Eğer küçük ekranlarda iki kolon sığmıyorsa:

- üstte sipariş listesi
- altta detay paneli
- main panel `overflow-y-auto` olabilir
- desktopta body scroll kesinlikle açılmamalıdır

Desktop ana hedef korunmalıdır.

---

# 18. Kabul Kriterleri

Uygulama tamamlandığında aşağıdakiler sağlanmalıdır:

1. Sayfa hafif scroll davranışı üretmemelidir.
2. Ana market paneli yaklaşık `%90` viewport yüksekliğiyle merkezde durmalıdır.
3. Sağ detay paneli mevcut halinden daha dar ve dengeli olmalıdır.
4. Sol sipariş kartları daha kompakt ve premium görünmelidir.
5. Seçili sipariş kartı admin primaryColor ile glow/border almalıdır.
6. Ürün görseli belirgin şekilde büyümelidir.
7. Ürün görseli hero kart içinde ana odak olmalıdır.
8. Ürün görseli alttan hizalanmalı ve gerekirse üstten hafif taşmalıdır.
9. İki düz renk dairesi tamamen kaldırılmalıdır.
10. Secondary ve tertiary renkler premium abstract background shape olarak kullanılmalıdır.
11. Ürün adı, fiyat, kod, adet, tarih, rota gibi tüm değerler data’dan gelmelidir.
12. Örnek müşteri adı, fiyat, kod veya ürün adı hardcoded yazılmamalıdır.
13. Kabul butonu mevcut işlevini korumalıdır.
14. UI mevcut dark theme ile uyumlu kalmalıdır.
15. Sonuç premium game dashboard hissi vermelidir.

---

# 19. Uygulama Sırası

Codex uygulamayı şu sırayla yapmalıdır:

1. İlgili page/component dosyasını bul.
2. Mevcut veri akışını ve props yapısını incele.
3. Hardcoded olmayan mevcut dinamik değerleri koru.
4. Page wrapper ve main panel yüksekliğini düzenle.
5. Body scroll problemini çöz.
6. İç grid oranlarını güncelle.
7. Sol order card tasarımını compact/premium hale getir.
8. Seçili kart için admin primaryColor tabanlı style uygula.
9. Sağ header ve chip alanlarını sıkılaştır.
10. Hero card container’ı yeniden tasarla.
11. İki düz daireyi kaldır.
12. Secondary / tertiary renklerle abstract shape sistemini kur.
13. Ürün görselini büyüt ve overflow-visible mantığını uygula.
14. Meta table satırlarını compact hale getir.
15. Footer CTA panelini düzenle.
16. TypeScript hatalarını gider.
17. Responsive kırılmaları kontrol et.
18. Lint/build varsa çalıştır ve hataları düzelt.

---

# 20. Kod Kalitesi Uyarıları

- Mevcut business logic değiştirilmemelidir.
- Sipariş kabul akışı bozulmamalıdır.
- Veri fetch mantığı bozulmamalıdır.
- Format helper varsa mevcut helper kullanılmalıdır.
- Yeni formatter yazılacaksa merkezi ve temiz yazılmalıdır.
- Gereksiz npm paketi eklenmemelidir.
- CSS class karmaşası çok artarsa küçük componentlere bölünmelidir.
- Tasarım amacı uğruna data model değiştirilmemelidir.

---

# 21. Son Tasarım Tanımı

Final ekran şu şekilde görünmelidir:

- koyu lacivert browser/app zemininde merkezlenmiş floating market paneli
- sol tarafta compact sipariş listesi
- sağ tarafta daraltılmış seçili sipariş detayı
- üstte müşteri/sipariş başlığı ve chipler
- ortada güçlü ürün hero kartı
- hero kart içinde büyük ürün görseli
- ürün arkasında 2. ve 3. admin renklerinden oluşan premium abstract gradient shapes
- altta compact detay tablosu
- en altta net ve güçlü cyan kabul butonu

Bu ekran ilk sipariş kararını oyunsu ama ciddi bir business simulation havasıyla sunmalıdır.
