# 17 - Onboarding Motion and Content

Bu doküman Factory Runway oyuncu onboarding akışının ilk deneyim ekranlarını,
mevcut motion kararlarını, içerik tonunu ve sektör seçimi ekranının güncel
tasarım kurallarını tanımlar.

Bu doküman artık fabrika kurulum transaction akışını detaylandırmaz.
Sektör seçiminden sonra başlayacak fabrika kurulum ekranları ve veritabanı
kayıtları `docs/18-Player_Onboarding_Factory_Setup_Flow.md` içinde
tanımlanır.

---

# 1. Güncel Kapsam

17 numaralı dokümanın kapsamı:

```text
İlk onboarding sunumu
Sektörleri tanıtma
Sektör seçim ekranı
Bu ekranların motion davranışı
Bu ekranlarda kullanılacak içerik tonu
```

Kapsam dışı:

```text
Factory oluşturma transaction'ı
Başlangıç sermayesinin DB'ye yazılması
Başlangıç üretim hatlarının kurulması
Başlangıç kadrosunun oluşturulması
İlk 3 gün tutorial akışı
```

Bu kapsam dışı başlıklar 18 numaralı dokümanda devam eder.

---

# 2. Güncel Temel Kararlar

1. Onboarding scroll kontrollü olmayacaktır.
2. Onboarding, GSAP timeline ile çalışan otomatik sayfa geçişleri kullanır.
3. ScrollTrigger onboarding içinde kullanılmaz.
4. Eski "Factory Core Transition", dot expansion, screen-cover ve 8 panel
   curtain fikirleri iptal edilmiştir.
5. Her onboarding adımı tam ekran bir sayfa gibi davranır.
6. Yeni sayfa, mevcut sayfa ekranda kalırken farklı yönlerden blok olarak
   ekrana girer.
7. Her ana içerik kendi `game-card` yüzeyi içinde gösterilir.
8. Büyük başlıklarda mevcut `BlurText` component'i kullanılır.
9. Başlık tamamlandıktan sonra destek metinleri ve küçük içerikler kontrollü
   şekilde görünür.
10. Sektör seçimi bu aşamada deneme akışıdır; gerçek fabrika ve sektör kaydı
    bu dokümanda değil, sonraki fabrika kurulum akışında ele alınır.
11. `prefers-reduced-motion` desteklenmelidir.

---

# 3. Güncel Ekran Sırası

Mevcut ilk onboarding akışı:

| Sıra | Ekran | Amaç |
| ---: | --- | --- |
| 1 | Welcome Slogan | Oyuncuya oyunun ana vaadini verir |
| 2 | Multi-sector Intro | Factory Runway'in farklı sektör deneyimi sunduğunu anlatır |
| 3 | Sector Spotlight 1 | İlk sektör tanıtım kartını gösterir |
| 4 | Sector Spotlight 2 | Sonraki sektör tanıtım kartını gösterir |
| 5 | Sector Spotlight 3 | Sonraki sektör tanıtım kartını gösterir |
| 6 | Sector Spotlight 4 | Sonraki sektör tanıtım kartını gösterir |
| 7 | Sector Selection | Aktif sektörü seçtirir |

Not:

Spotlight ekranlarının sayısı mevcut sektör datasından gelir.
İlk uygulamada `sectors.slice(0, 4)` ile en fazla 4 sektör spotlight olarak
gösterilir.

---

# 4. Motion Modeli

## Ana Model

Her ekran `onboarding-scene-page` olarak tam ekran konumlanır.
GSAP timeline yeni sayfayı ekrana taşırken önceki sayfayı yavaşça ekrandan
çıkarır.

Bu motion modeli, scroll hissini timeline ile taklit eder.
Ancak kullanıcı scroll yapmaz.

## Giriş Yönleri

Mevcut davranış:

| Ekran | Giriş Yönü | Çıkış Davranışı |
| --- | --- | --- |
| Intro | Sağdan ve hafif aşağıdan gelir | Welcome hafif sola/yukarı çıkar |
| İlk spotlight | Alttan yukarı gelir | Intro yukarı çıkar |
| Diğer spotlight'lar | Sağ / sol dönüşümlü gelir | Önceki spotlight karşı yöne çıkar |
| Final selection | Yukarıdan aşağı iner | Önceki sayfa hafif aşağı çıkar |

## Süreler

Güncel süreler:

```text
İlk welcome beklemesi: 3.2s
Ara ekran beklemesi: 2.4s
Geçiş animasyonu: yaklaşık 0.98s - 1.08s
```

Bu tempo premium hissi korurken bekleme süresini gereksiz uzatmaz.

## Easing

Geçişlerde varsayılan GSAP easing:

```text
power4.inOut
```

---

# 5. Card Yüzeyi Kararı

Her ana ekran kendi içeriğini card içinde göstermelidir.

Sebep:

- Sayfa hareketi ile içerik birbirinden kopmaz.
- Gölge ve arka plan oyun UI sistemiyle uyumlu kalır.
- Global `background`, `card`, `border` ve shadow kararları korunur.

Kural:

```text
Tam ekran hareket eden şey page'dir.
Okunabilir içerik page içindeki card'dır.
```

Bu nedenle:

- Welcome sloganı card içinde olmalıdır.
- Intro metni card içinde olmalıdır.
- Sector spotlight görseli card içinde olmalıdır.
- Final selection listesi card içinde olmalıdır.

---

# 6. Welcome Slogan Ekranı

## Amaç

Oyuncuya oyunun ana vaadini kısa ve güçlü şekilde verir.

## Güncel Büyük Metin

```text
Kendi fabrikanı kur. Üretimi yönet. Büyümeyi planla.
```

## Destek Metni

```text
İlk akışta yalnızca sektör seçimine kadar ilerliyoruz. Seçim hissi oluşacak,
fakat veritabanında fabrika veya sektör kaydı oluşturulmayacak.
```

Bu metin, gerçek kayıt akışına geçilene kadar geçerlidir.
Fabrika kurulum transaction'ı uygulandığında bu metin güncellenmelidir.

## Motion

- Büyük metin `BlurText` ile gelir.
- `animateBy="words"` kullanılmalıdır.
- Başlık tamamlandıktan sonra destek metni görünür.
- Destek metni başlıkla aynı anda gelmemelidir.

---

# 7. Multi-sector Intro Ekranı

## Amaç

Oyuncuya Factory Runway'in tek sektörlü bir oyun olmadığını, ileride farklı
üretim dünyalarına açılacağını anlatır.

## Güncel Büyük Metin

```text
FACTORY RUNWAY size farklı sektörlerde farklı üretim deneyimleri sunar.
```

## Destek Maddeleri

```text
Her sektörün kendine özgü üretim hatları vardır.
Her sektör farklı kararlar ve büyüme dinamikleri sunar.
Oyuncu ileride farklı üretim dünyalarına geçebilir.
```

## Motion

- Büyük metin `BlurText` ile gelir.
- `FACTORY RUNWAY` kelimeleri primary renkle vurgulanır.
- Başlık tamamlandıktan sonra maddeler görünür.
- Maddeler eski tarz ağır fade gibi değil, kısa ve kontrollü reveal gibi
  davranmalıdır.

---

# 8. Sector Spotlight Ekranları

## Amaç

Sektör seçim ekranından önce oyuncuya sektörlerin atmosferini tanıtmak.

## Yapı

Her spotlight ekranı:

```text
Page surface
  -> Sector spotlight card
       -> Sektör görseli card background
       -> Sağ karanlık alanda sektör metni
```

## İçerik

Her sektör için gösterilecek alanlar:

- eyebrow
- sektör başlığı
- kısa açıklama
- en fazla 3 bullet

## Görsel Kural

Sektör görseli tam ekran zemin değildir.
Görsel card'ın içindedir.
Bu karar önceki full-screen image yaklaşımının yerine geçmiştir.

Metin, görselin sağdaki karanlık alanına oturmalıdır.
Görsel ile metin ayrı iki panel gibi görünmemelidir.

---

# 9. Sector Selection Ekranı

## Amaç

Oyuncuya başlangıç sektörünü seçtirmek.

Bu ekran mevcut aşamada sadece seçim hissi verir.
Gerçek DB kaydı sonraki implementation adımında bağlanacaktır.

## Başlık

```text
Sektörünü Seç
```

## Motion

- Başlık `BlurText` ile gelir.
- Başlık tamamlandıktan sonra açıklama ve step dots görünür.
- Sector kartları card içinde sabit listelenir.

## Açıklama

```text
Yeni şirketin için üretim sektörünü belirle. Aktif sektörler şimdi oynanabilir,
pasif sektörler sonraki paketlerde açılacak.
```

## Kart Düzeni

Final seçim ekranında bütün sektör kartları aynı ana görsel mantığını kullanır:

```text
Sektör görseli kartın tam genişliğini kaplar.
Metin sağdaki karanlık görsel alanına yerleşir.
Aktif ve pasif kartlar aynı layout sistemini kullanır.
```

Aktif kart:

- border primary renge yaklaşır
- içeri doğru hafif ışık yayar
- `AVAILABLE` etiketi mavi/primary ışıklı görünür
- action butonu görünür

Pasif kart:

- görsel doygunluğu ve parlaklığı azaltılır
- `COMING SOON` etiketi kullanılır
- action butonu gösterilmez
- sağ ok ikonu küçük ve sakin kalır

## Aktif Sektör Davranışı

Aktif sektör koşulu:

```text
sector.playable === true
veya
sector.status === ACTIVE
```

Aktif sektör etiketi:

```text
AVAILABLE
```

Pasif sektör etiketi:

```text
COMING SOON
```

## Demo Akış Notu

Mevcut implementation'da seçim sonrası notice değişir:

```text
Tekstil seçildi. Bu deneme akışında kayıt oluşturulmadı.
```

Bu geçici bir davranıştır.
Gerçek seçim ve fabrika kurulum akışı 18 numaralı dokümandaki plana göre
bağlanacaktır.

---

# 10. Reduced Motion

`prefers-reduced-motion` aktif olduğunda:

- Otomatik page slide animasyonları kullanılmamalıdır.
- Final selection ekranı doğrudan gösterilebilir.
- BlurText component'i kendi reduced-motion fallback'ini kullanmalıdır.
- Başlık sonrası içerikler gizli kalmamalıdır.

Reduced motion, kullanıcıyı onboarding dışında bırakmamalıdır.
Sadece hareket azaltılmalıdır.

---

# 11. İçerik Tonu

Metin dili:

- kısa
- operasyonel
- premium
- oyuncuya net fayda anlatan
- teknik terimleri minimum kullanan

Kaçınılacak dil:

- uzun açıklama
- admin paneli hissi
- "sistem kayıt oluşturacak" gibi teknik cümleler
- fazla tutorial metni

İyi örnek:

```text
3 başlangıç hattın hazır.
Nakış ve baskı ilk aşamada outsource edilecek.
```

Zayıf örnek:

```text
Bu aşamada sistem çeşitli operasyonel parametreler oluşturarak simülasyon
kayıtlarını hazırlayacaktır.
```

---

# 12. Teknik Uygulama Notları

Mevcut component ayrımı:

```text
OnboardingExperience
WelcomeScene
IntroScene
SpotlightScene
SectorSelectionScene
SectorCard
```

Mevcut hareket modeli:

```text
onboardingPages array
GSAP timeline
onboarding-scene-page absolute stack
getPageMotion(index, pageCount)
```

Mevcut state:

```text
headlineReady
selectedSectorKey
notice
Intro titleReady
Selection titleReady
```

Gelecek gerçek kayıt akışında bu component yapısı genişletilebilir.
Ancak 17 numaralı doküman ilk sunum ve sektör seçimi yüzeyinin kararlarını
korur.

---

# 13. 18 Numaralı Dokümana Devir

Sektör seçiminden sonra başlayacak adımlar 18 numaralı dokümanda ele alınır:

```text
Başlangıç sermayesi
Fabrika adı
Para etiketi
Başlangıç yatırım paketi
Başlangıç kadrosu
Kurulum özeti
Factory transaction
İlk 3 gün tutorial başlangıcı
```

Bu ayrım önemlidir:

```text
17 = ilk onboarding sunumu ve sektör seçimi
18 = sektör seçiminden sonra gerçek fabrika kurulum flow'u
```

---

# 14. Güncel Açık Kararlar

Bu dokümanda kalan açık kararlar:

1. Welcome destek metni gerçek DB kayıt akışı bağlanınca nasıl değişecek?
2. Spotlight ekranlarında kaç sektör gösterilecek?
3. Pasif sektör kartları sadece bilgi mi verecek, yoksa ileride bekleme listesi
   gibi bir aksiyon taşıyacak mı?
4. Sector selection sonrası geçiş 18 numaralı flow'a hangi route veya component
   state ile bağlanacak?
5. İlk sunum ekranları oyuncu daha önce onboarding'i tamamlamışsa tekrar
   gösterilecek mi?

