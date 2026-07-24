import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { cleanupFailedProductImageUpload } from "./product-image-blob-cleanup";

function readActions() {
  return readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
}

test("başarılı ürün görseli update akışı eski Blob pathname'lerini silmez", () => {
  const actions = readActions();

  assert.doesNotMatch(actions, /\bnextPaths\b|\breplaced\b|product\.images/);
  assert.doesNotMatch(actions, /import\s*\{[^}]*\bdel\b[^}]*\}\s*from\s*"@vercel\/blob"/);
  assert.match(actions, /await prisma\.\$transaction/);
});

test("upload ve DB hata yolları yalnızca yeni yüklenen Blob'ları cleanup eder", () => {
  const actions = readActions();
  const cleanupCalls = [
    ...actions.matchAll(/await cleanupFailedProductImageUpload\(/g),
  ];

  assert.equal(cleanupCalls.length, 2);
  assert.match(
    actions,
    /cleanupFailedProductImageUpload\(\s*uploadedImages\.map\(\(image\) => image\.pathname\)/,
  );
});

test("orphan cleanup yeni pathname listesini tekilleştirerek delete işlevine verir", async () => {
  const calls: string[][] = [];

  await cleanupFailedProductImageUpload(
    ["products/new-card.webp", "products/new-card.webp", "products/new-detail.webp"],
    async (pathnames) => {
      calls.push([...pathnames]);
    },
  );

  assert.deepEqual(calls, [
    ["products/new-card.webp", "products/new-detail.webp"],
  ]);
});

test("boş orphan listesi Blob delete çağrısı yapmaz", async () => {
  let callCount = 0;

  await cleanupFailedProductImageUpload([], async () => {
    callCount += 1;
  });

  assert.equal(callCount, 0);
});
