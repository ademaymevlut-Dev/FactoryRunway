import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("mobile first-order keeps three offers in a horizontal selector", () => {
  const client = source("./first-order-client.tsx");
  const page = source("./page.tsx");

  assert.match(page, /take: 3/);
  assert.match(client, /snap-x snap-mandatory/);
  assert.match(client, /md:flex-col/);
  assert.match(client, /compareHint/);
  assert.match(client, /offerProgress\(selectedIndex \+ 1, orderCount\)/);
});

test("mobile first-order contains product media and preserves the tablet hero", () => {
  const client = source("./first-order-client.tsx");

  assert.match(client, /h-\[220px\] overflow-hidden[\s\S]*?md:h-\[255px\] md:overflow-visible/);
  assert.match(client, /inset-y-2 right-0 z-\[4\] w-\[60%\] md:hidden/);
  assert.match(client, /hidden h-\[350px\] w-\[66%\] md:block/);
});

test("mobile first-order uses one document scroll and a safe fixed action", () => {
  const client = source("./first-order-client.tsx");
  const page = source("./page.tsx");
  const globals = source("../../../globals.css");
  const viewportHook = source("../../../../hooks/use-visual-viewport-bottom-inset.ts");

  assert.match(page, /min-h-dvh[\s\S]*?md:h-screen md:overflow-hidden/);
  assert.match(client, /first-order-form game-card/);
  assert.match(client, /useVisualViewportBottomInset\(formRef\)/);
  assert.match(client, /fixed inset-x-0 bottom-\[var\(--visual-viewport-bottom,0px\)\]/);
  assert.match(client, /env\(safe-area-inset-bottom\)/);
  assert.match(client, /md:static/);
  assert.match(client, /name="optionId"[\s\S]*?value=\{selectedOrder\.id\}/);
  assert.match(viewportHook, /window\.visualViewport/);
  assert.match(viewportHook, /const layoutViewportHeight = window\.innerHeight/);
  assert.match(viewportHook, /visualViewport\.offsetTop \+ visualViewport\.height/);
  assert.match(viewportHook, /--visual-viewport-bottom/);
  assert.match(viewportHook, /visualViewport\.addEventListener\("resize"/);
  assert.match(viewportHook, /visualViewport\.addEventListener\("scroll"/);
  assert.match(globals, /@media \(max-width: 767px\)[\s\S]*?\.first-order-form[\s\S]*?backdrop-filter: none/);
});

test("mobile first-order prioritizes summary metrics and collapses secondary details", () => {
  const client = source("./first-order-client.tsx");
  const copy = source("./first-order-copy.ts");

  assert.match(client, /<MobileMetric[\s\S]*?copy\.selection\.meta\.totalPrice/);
  assert.match(client, /<details className="group/);
  assert.match(copy, /details: "Sipariş detayları"/);
  assert.match(copy, /details: "Order details"/);
});
