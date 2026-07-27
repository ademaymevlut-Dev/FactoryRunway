import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("beklenmeyen admin action hataları yapılandırılmış referansla loglanır", () => {
  const source = read("./admin-action-errors.ts");

  assert.match(source, /randomUUID\(\)/);
  assert.match(source, /console\.error\("\[admin-action\] failed"/);
  assert.match(source, /action,\s*context,\s*error:/);
  assert.match(source, /Hata referansı:/);
});

test("ürün düzenleme formları global 500 yerine action state kullanır", () => {
  const actions = read("./products/product-actions.ts");
  const page = read("./products/[id]/page.tsx");
  const definitions = read("./products/[id]/product-definitions-form.tsx");
  const cardDesigner = read("./products/[id]/product-card-designer.tsx");

  assert.match(
    actions,
    /updateProductMainAction\([\s\S]*_previousState: AdminActionState[\s\S]*Promise<AdminActionState>/,
  );
  assert.match(
    actions,
    /updateProductDefinitionsAction\([\s\S]*_previousState: AdminActionState[\s\S]*Promise<AdminActionState>/,
  );
  assert.match(
    actions,
    /updateProductCardAction\([\s\S]*_previousState: AdminActionState[\s\S]*Promise<AdminActionState>/,
  );
  assert.match(page, /<AdminForm[\s\S]*updateProductMainAction/);
  assert.match(definitions, /<AdminForm[\s\S]*updateProductDefinitionsAction/);
  assert.match(cardDesigner, /<AdminForm[\s\S]*updateProductCardAction/);
});

test("admin hata sınırı Next digest kodunu görünür yapar", () => {
  const source = read("./error.tsx");

  assert.match(source, /error\.digest/);
  assert.match(source, /Next hata kodu:/);
  assert.match(source, /onClick=\{reset\}/);
});

test("server upload eşikleri Vercel 4.5 MB payload sınırının altında kalır", () => {
  const nextConfig = read("../../../../next.config.ts");
  const packageJson = read("../../../../package.json");
  const productUpload = read("./actions.ts");
  const sectorUpload = read("./sectors/sector-actions.ts");
  const lineUpload = read(
    "./production-lines/production-line-actions.ts",
  );

  assert.match(nextConfig, /bodySizeLimit: "4\.25mb"/);
  assert.match(packageJson, /"sharp": "0\.34\.5"/);

  for (const source of [productUpload, sectorUpload, lineUpload]) {
    assert.match(
      source,
      /const MAX_SERVER_UPLOAD_BYTES = 4 \* 1024 \* 1024/,
    );
    assert.doesNotMatch(source, /^import sharp from "sharp";/m);
    assert.match(source, /await import\("sharp"\)/);
  }
});
