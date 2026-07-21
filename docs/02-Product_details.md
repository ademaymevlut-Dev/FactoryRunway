# Product Detayları aşağdıaki gibidir. 

- Ürün Kartı olarak kullanılacak ve tüm sektörler için tüm ürün kayıtları bu tabloda tutulacak.  
- model Product için ilk aşama aşağıdaki alanları planlıyorum.  Ana ürün tablosu

model Product {
  id                      String               @id @default(cuid())
  sectorId                String               @map("sector_id")
  categoryId              String               @map("category_id")
  productTypeId           String               @map("product_type_id")

  key                     String
  code                    String?
  name                    String

  tier                    ProductTier
  gender                  Gender?

  status                  ContentStatus        @default(DRAFT)
  sortOrder               Int                  @default(0) @map("sort_order")

  requiredPlayerLevel     Int                  @default(1) @map("required_player_level")

  cardPrimaryColor        String               @default("#D29D00") @map("card_primary_color")
  cardSecondaryColor      String               @default("#ED719E") @map("card_secondary_color")
  cardGradientFrom        String               @default("#535353") @map("card_gradient_from")
  cardGradientTo          String               @default("#929292") @map("card_gradient_to")
  cardTextColor           String               @default("#FFFFFF") @map("card_text_color")
  cardSvgIconColor        String               @default("#FFFFFF") @map("card_svg_icon_color")
  cardSvgIconAccentColor  String               @default("#4A304E") @map("card_svg_icon_accent_color")
  cardForegroundTone      String               @default("LIGHT") @map("card_foreground_tone")

  metadata                Json?
  createdAt               DateTime             @default(now()) @map("created_at")
  updatedAt               DateTime             @updatedAt @map("updated_at")

  sector                  Sector               @relation(fields: [sectorId], references: [id], onDelete: Cascade)
  category                ProductCategory      @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  productType             ProductType          @relation(fields: [productTypeId], references: [id], onDelete: Restrict)

  translations            ProductTranslation[]
  images                  ProductImage[]
  routeSteps              ProductRouteStep[]

  inputRequirements       ProductInputRequirement[]
  certifications          ProductCertification[]
  collectionProducts      CollectionProduct[]
  orderOffers             OrderOffer[]
  productionOrders        ProductionOrder[]
  factoryProducts         FactoryProduct[]
  startingTemplateProducts StartingTemplateProduct[]

  @@unique([sectorId, key])
  @@unique([code])
  @@index([sectorId, status])
  @@index([categoryId, productTypeId])
  @@index([tier])
  @@map("products")
}

Ürün Segmenti için kullanılacak aşağıdaki alanlar tüm sektörler için sabittir ve Enum olarak Planlanabilir. 


enum ProductTier {
  BASIC
  STANDARD
  PREMIUM
  LUXURY
}


# Product image için planladığım alanlar aşağıdaki gibidir. 

model ProductImage {
  id            String              @id @default(cuid())
  productId     String              @map("product_id")
  view          ProductImageView    @default(FRONT)
  variant       ProductImageVariant @default(CARD)
  url           String
  pathname      String?
  width         Int?
  height        Int?
  mimeType      String?             @map("mime_type")
  fileSizeBytes Int?                @map("file_size_bytes")
  sortOrder     Int                 @default(0) @map("sort_order")
  createdAt     DateTime            @default(now()) @map("created_at")
  updatedAt     DateTime            @updatedAt @map("updated_at")

  product       Product             @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([productId, view, variant])
  @@map("product_images")
}

# ProductTranslation gerekli mi?
Bence evet, ama ürün ismi için değil, açıklama ve pazarlama metinleri için.

model ProductTranslation {
  id          String   @id @default(cuid())
  productId   String   @map("product_id")
  locale      String
  description String?

  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([productId, locale])
  @@index([locale])
  @@map("product_translations")
}

Örnek kullanım ;
Product.name = Manama

TR description = Basic segmentte kolay üretilebilir kadın t-shirt modeli.
EN description = An easy-to-produce women's T-shirt model in the Basic segment.



# Kategori ve ürün tipi çok dilli olmalı
Burada kesinlikle translation tablosu kullanmalısın.

model ProductCategory {
  id           String                       @id @default(cuid())
  sectorId     String                       @map("sector_id")
  key          String
  sortOrder    Int                          @default(0) @map("sort_order")
  status       ContentStatus                @default(ACTIVE)
  metadata     Json?

  sector       Sector                       @relation(fields: [sectorId], references: [id], onDelete: Cascade)
  translations ProductCategoryTranslation[]
  productTypes ProductType[]
  products     Product[]

  @@unique([sectorId, key])
  @@index([sectorId, sortOrder])
  @@map("product_categories")
}

model ProductCategoryTranslation {
  id          String          @id @default(cuid())
  categoryId  String          @map("category_id")
  locale      String
  name        String
  description String?

  category    ProductCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([categoryId, locale])
  @@index([locale])
  @@map("product_category_translations")
}

Örnek ; 

upper_wear  → Üst Giyim / Upper Wear
bottom_wear → Alt Giyim / Bottom Wear
outerwear   → Dış Giyim / Outerwear
dresswear   → Elbise Grubu / Dresswear


model ProductType {
  id           String                   @id @default(cuid())
  sectorId     String                   @map("sector_id")
  categoryId   String                   @map("category_id")
  key          String
  sortOrder    Int                      @default(0) @map("sort_order")
  status       ContentStatus            @default(ACTIVE)
  metadata     Json?

  sector       Sector                   @relation(fields: [sectorId], references: [id], onDelete: Cascade)
  category     ProductCategory          @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  translations ProductTypeTranslation[]
  products     Product[]

  @@unique([sectorId, key])
  @@index([sectorId, categoryId])
  @@index([categoryId, sortOrder])
  @@map("product_types")
}

model ProductTypeTranslation {
  id            String      @id @default(cuid())
  productTypeId String      @map("product_type_id")
  locale        String
  name          String
  description   String?

  productType   ProductType @relation(fields: [productTypeId], references: [id], onDelete: Cascade)

  @@unique([productTypeId, locale])
  @@index([locale])
  @@map("product_type_translations")
}

Örnek Kullanım ; 

ProductCategory: upper_wear
  - t_shirt
  - shirt
  - sweatshirt
  - blouse

ProductCategory: bottom_wear
  - pants
  - skirt
  - shorts

ProductCategory: outerwear
  - blazer
  - jacket
  - coat


  

# ProductColorVariant Master Yapısı

Bu yapı, siparişlerde gösterilecek renk dağılımı için kullanılacak master color havuzunu tanımlar.

Amaç:

- Sipariş tekliflerinde renk dağılımı göstermek
- Kabul edilmiş siparişlerde renk kırılımını saklamak
- UI’da küçük renk kutuları göstermek
- Üretim matematiğini karmaşıklaştırmadan gerçekçilik katmak

Renkler V1’de üretim kapasitesini, workload point hesaplarını, fiyatı, WIP akışını ve departman sırasını etkilemez.

Örnek kullanım:

```text
Product: Manama
Quantity: 1.600

Colors:
- Black: 500
- Camel: 300
- Grey Melange: 300
- Burgundy: 300
- White: 200

Üretim hesabı toplam adet üzerinden yapılır:
productionQty = sum(colorQuantities)


# ProductColorVariant Modeli

model ProductColorVariant {
  id          String        @id @default(cuid())

  sectorId    String        @map("sector_id")

  key         String
  hexCode     String        @map("hex_code")

  sortOrder   Int           @default(0) @map("sort_order")
  status      ContentStatus @default(ACTIVE)

  metadata    Json?

  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  sector       Sector        @relation(fields: [sectorId], references: [id], onDelete: Cascade)
  translations ProductColorVariantTranslation[]

  @@unique([sectorId, key])
  @@index([sectorId, status])
  @@index([sectorId, sortOrder])
  @@map("product_color_variants")
}


ProductColorVariantTranslation Modeli
Renk isimleri çok dilli gösterim için translation tablosunda tutulmalıdır.


model ProductColorVariantTranslation {
  id                    String              @id @default(cuid())

  productColorVariantId String              @map("product_color_variant_id")
  locale                String

  name                  String
  description           String?

  productColorVariant   ProductColorVariant @relation(fields: [productColorVariantId], references: [id], onDelete: Cascade)

  @@unique([productColorVariantId, locale])
  @@index([locale])
  @@map("product_color_variant_translations")
}

# Alan AÇIKLAMALARI 

| Alan           | Açıklama                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------- |
| `sectorId`     | Rengin hangi sektöre ait olduğunu belirtir. Textile için ayrı renk havuzu kullanılabilir. |
| `key`          | Teknik anahtar. Örnek: `black`, `camel`, `burgundy`.                                      |
| `hexCode`      | UI’da renk kutusu göstermek için HEX renk kodu.                                           |
| `sortOrder`    | Admin ve sipariş UI sıralaması.                                                           |
| `status`       | ACTIVE / PASSIVE / DRAFT durumu.                                                          |
| `metadata`     | İleride renk grubu, sezon etiketi veya UI badge gibi ek bilgiler için kullanılabilir.     |
| `translations` | Rengin çok dilli görünen adı.                                                             |





Kullanım Kararı
ProductColorVariant yalnızca master color havuzudur.
Teklif tarafında renk dağılımı:
MarketOrderOfferItemColor
Kabul edilmiş sipariş tarafında renk dağılımı:
CustomerOrderItemColor
içinde tutulur.
Renkler her siparişe text olarak yazılmaz.
Bunun yerine ProductColorVariant referansı kullanılır.
Yanlış yaklaşım:
CustomerOrderItem.colorName = "Black"
Doğru yaklaşım:
CustomerOrderItemColor.colorVariantId -> ProductColorVariant.black
Bu sayede renk isimleri, HEX kodları ve çeviriler tek yerden yönetilir.

Bir küçük not: `ProductColorVariant` içine şimdilik `rgb`, `pantone`, `fabricColorCode`, `dyeRecipeCode` gibi alanlar koyma. Daha oyunun ilk beta döneminde boya laboratuvarı açmayalım, yazılım zaten yeterince kimyasal reaksiyon üretiyor.