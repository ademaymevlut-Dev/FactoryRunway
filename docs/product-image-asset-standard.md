# FactoryRunway Product Image Asset Standard

## Genel Görsel Kararı

FactoryRunway ürün görselleri semi-realistic ghost mannequin stilinde hazırlanır.

Her ürün:

- Tek renk olur
- Front ve back olmak üzere iki ana görsele sahiptir
- MASTER PNG dosyaları veritabanına kaydedilmez
- MASTER PNG dosyaları geliştirici tarafından lokal bilgisayarda arşivlenir
- UI'da kullanılacak optimize WEBP dosyaları Vercel Blob'a yüklenir

## UI Görsel Varyantları

### DETAIL

- 1000 x 1250 px
- WEBP
- image/webp
- Kullanım: ürün detay modalı / büyük preview

### CARD

- 600 x 750 px
- WEBP
- image/webp
- Kullanım: ürün kartları / üretim ve sipariş kartları

### THUMBNAIL

- 300 x 375 px
- WEBP
- image/webp
- Kullanım: admin listeleri / küçük seçim alanları / hızlı preview

## Database Mapping

ProductImage tablosu sadece UI'da kullanılacak optimize görselleri tutar.

Alanlar:

- view: FRONT / BACK
- variant: DETAIL / CARD / THUMBNAIL
- url: Vercel Blob public URL
- pathname: Vercel Blob pathname
- width: görsel genişliği
- height: görsel yüksekliği
- mimeType: image/webp
- fileSizeBytes: dosya boyutu

## Beklenen Kayıt Yapısı

Bir ürün için maksimum 6 görsel kaydı beklenir:

- FRONT + DETAIL
- FRONT + CARD
- FRONT + THUMBNAIL
- BACK + DETAIL
- BACK + CARD
- BACK + THUMBNAIL

## Naming Convention

Önerilen dosya adları:

```text
product-code-front-detail.webp
product-code-front-card.webp
product-code-front-thumbnail.webp

product-code-back-detail.webp
product-code-back-card.webp
product-code-back-thumbnail.webp
```

## Admin / Upload Tarafı

Admin ürün görsel upload sistemi yeni modele göre güncellenmelidir.

Upload sırasında:

- Kullanıcı FRONT veya BACK seçebilmelidir
- Sistem yüklenen görselden üç WEBP varyantı oluşturmalıdır:
  - DETAIL: 1000 x 1250
  - CARD: 600 x 750
  - THUMBNAIL: 300 x 375
- Oluşan üç dosya Vercel Blob'a yüklenmelidir
- Her dosya için ProductImage tablosuna ayrı kayıt açılmalıdır
- Aynı ürün için aynı view + variant varsa eski kayıt güncellenmeli veya replace edilmelidir

Bu güncellemenin amacı MASTER kaynak dosyaları veritabanından tamamen ayırmak ve ProductImage tablosunu sadece UI'da kullanılan optimize ürün görselleri için sade, temiz ve sürdürülebilir hale getirmektir.
