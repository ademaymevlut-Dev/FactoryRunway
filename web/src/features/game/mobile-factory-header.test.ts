import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getCriticalFactoryNotificationCount,
  getMobileFactoryNamePresentation,
  getMobileFactoryStatusSheetBounds,
} from "./mobile-factory-header";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const header = readSource("./components/top-status-bar.tsx");
const styles = readSource("./components/top-status-bar.module.css");
const shell = readSource("./components/game-shell.tsx");
const localeSwitcher = readSource("../../components/game-locale-switcher.tsx");
const dialog = readSource("../../components/ui/dialog.tsx");
const factoryMap = readSource("./components/factory-map.tsx");
const copy = readSource("./game-copy.ts");

test("telefon ve coarse tablet kompakt header, fine pointer masaüstü geniş header kullanır", () => {
  assert.match(header, /function DesktopHeaderContent/);
  assert.match(header, /function MobileHeaderContent/);
  assert.match(header, /data-desktop-game-header/);
  assert.match(header, /data-mobile-game-header/);
  assert.match(styles, /\.desktopHeaderContent\s*\{[\s\S]*?display:\s*flex/);
  assert.match(styles, /\.mobileHeaderContent\s*\{[\s\S]*?display:\s*none/);
  assert.match(
    styles,
    /@media \(max-width: 639px\), \(pointer: coarse\)[\s\S]*?\.desktopHeaderContent\s*\{[\s\S]*?display:\s*none[\s\S]*?\.mobileHeaderContent\s*\{[\s\S]*?display:\s*flex/,
  );
});

test("mobil header yalnız fabrika kimliği ve tek durum trigger'ı taşır", () => {
  const mobileHeaderStart = header.indexOf("function MobileHeaderContent");
  const sheetStart = header.indexOf("function MobileFactoryStatusSheet");
  const mobileHeader = header.slice(mobileHeaderStart, sheetStart);

  assert.match(mobileHeader, /<FactoryLogo \/>/);
  assert.match(mobileHeader, /mobileFactoryIdentity/);
  assert.match(mobileHeader, /DialogTrigger asChild/);
  assert.match(mobileHeader, /aria-label=\{copy\.mobile\.factoryStatus\}/);
  assert.match(mobileHeader, /aria-expanded=\{sheetOpen\}/);
  assert.match(mobileHeader, /aria-controls=\{MOBILE_FACTORY_STATUS_SHEET_ID\}/);
  assert.match(mobileHeader, /size-11/);
  assert.doesNotMatch(
    mobileHeader,
    /AnimatedCashMetric|AnimatedXpMetric|AnimatedRunwayTokenMetric|Trophy|Mail|GameLocaleSwitcher|logoutAction/,
  );
});

test("uzun, boşluksuz ve Unicode fabrika adları sunumda değiştirilmeden korunur", () => {
  const names = [
    "Kline Textile Company",
    "Kline Textile International Manufacturing Corporation",
    "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    "iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii",
    "Fabrika🏭Üretim🧵Tekstil📦Şirketi",
    "BoşluksuzÇokUzunBirFabrikaAdıTesti",
  ];

  for (const name of names) {
    assert.deepEqual(getMobileFactoryNamePresentation(name), {
      accessibleName: name,
      text: name,
    });
  }

  assert.match(styles, /\.mobileFactoryIdentity\s*\{[\s\S]*?flex:\s*1 1 auto[\s\S]*?min-width:\s*0/);
  assert.match(styles, /\.mobileFactoryName\s*\{[\s\S]*?max-width:[\s\S]*?overflow:\s*hidden[\s\S]*?text-overflow:\s*ellipsis[\s\S]*?white-space:\s*nowrap/);
  assert.match(styles, /--mobile-factory-name-max-width:\s*124px/);
  assert.match(styles, /--mobile-factory-name-max-width:\s*160px/);
  assert.match(styles, /--mobile-factory-name-max-width:\s*190px/);
  assert.match(styles, /\.fullFactoryName\s*\{[\s\S]*?overflow-wrap:\s*anywhere/);
  assert.doesNotMatch(header, /substring|\.slice\(|dangerouslySetInnerHTML/);
});

test("header yüksekliği sabittir ve durum trigger'ı küçülmez", () => {
  assert.match(shell, /MOBILE_HEADER_HEIGHT_PX = 64/);
  assert.match(shell, /--game-mobile-header-height/);
  assert.match(styles, /height:\s*var\(--game-mobile-header-height\)/);
  assert.match(styles, /\.mobileStatusTrigger\s*\{[\s\S]*?flex:\s*0 0 44px/);
});

test("bottom sheet body portalındaki Dialog altyapısıyla focus, Escape ve backdrop davranışını devralır", () => {
  assert.match(header, /<Dialog onOpenChange=\{onSheetOpenChange\} open=\{sheetOpen\}>/);
  assert.match(header, /<DialogContent/);
  assert.match(header, /data-factory-status-bottom-sheet/);
  assert.match(header, /layout="custom"/);
  assert.match(header, /<DialogTitle/);
  assert.match(header, /<DialogDescription/);
  assert.match(header, /<DialogClose asChild>/);
  assert.doesNotMatch(header, /portalContainer/);
  assert.match(dialog, /DialogPrimitive\.Root/);
  assert.match(dialog, /layout = "centered"/);
  assert.match(dialog, /layout === "centered"/);
  assert.match(dialog, /<DialogPortal container=\{portalContainer \?\? undefined\}>/);
  assert.match(dialog, /DialogPrimitive\.Overlay/);
  assert.match(dialog, /DialogPrimitive\.Content/);
  assert.match(dialog, /DialogPrimitive\.Close/);
});

test("bottom sheet viewport genişliğini kullanır, yatay merkezlenir ve header ölçülerinden bağımsızdır", () => {
  assert.match(header, /const mobileBottomSheetTokensStyle/);
  assert.match(header, /--factory-status-sheet-edge-gap/);
  assert.match(header, /--factory-status-sheet-max-width/);
  const styleStart = header.indexOf("const mobileBottomSheetTokensStyle");
  const styleEnd = header.indexOf("as CSSProperties", styleStart);
  const bottomSheetStyle = header.slice(styleStart, styleEnd);

  assert.doesNotMatch(
    bottomSheetStyle,
    /game-header|game-mobile-header|mobile-factory-name-max-width/,
  );
  assert.match(styles, /\.mobileSheetContent\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(styles, /left:\s*50%/);
  assert.match(styles, /bottom:\s*0/);
  assert.match(styles, /width:\s*calc\(/);
  assert.match(styles, /safe-area-inset-left/);
  assert.match(styles, /safe-area-inset-right/);
  assert.match(styles, /max-width:\s*var\(--factory-status-sheet-max-width\)/);
  assert.match(styles, /translate:\s*-50% 0/);
});

test("küçük telefon, büyük telefon ve tablette bottom sheet genişlik hesabı kırpılmaz", () => {
  assert.deepEqual(getMobileFactoryStatusSheetBounds({ viewportWidth: 320 }), {
    left: 8,
    right: 312,
    width: 304,
  });
  assert.deepEqual(getMobileFactoryStatusSheetBounds({ viewportWidth: 430 }), {
    left: 8,
    right: 422,
    width: 414,
  });
  assert.deepEqual(getMobileFactoryStatusSheetBounds({ viewportWidth: 768 }), {
    left: 104,
    right: 664,
    width: 560,
  });
  assert.deepEqual(
    getMobileFactoryStatusSheetBounds({
      safeAreaLeft: 12,
      safeAreaRight: 12,
      viewportWidth: 390,
    }),
    { left: 20, right: 370, width: 350 },
  );
});

test("sheet Safari visualViewport ve standalone dvh içinde yalnız iç scroll alanını kullanır", () => {
  assert.match(shell, /--game-visual-viewport-height/);
  assert.match(shell, /visualViewport\.height/);
  assert.match(shell, /const documentRoot = document\.documentElement/);
  assert.match(shell, /documentRoot\.style\.setProperty\(/);
  assert.match(styles, /var\(--game-visual-viewport-height, 100dvh\)/);
  assert.match(styles, /max-height:\s*min\(/);
  assert.match(styles, /\.mobileSheetContent\s*\{[\s\S]*?display:\s*flex[\s\S]*?flex-direction:\s*column/);
  assert.match(styles, /\.mobileSheetFixedHeader\s*\{[\s\S]*?flex:\s*0 0 auto/);
  assert.match(styles, /\.mobileSheetScroll\s*\{[\s\S]*?overflow-y:\s*auto[\s\S]*?overscroll-behavior:\s*contain[\s\S]*?padding-bottom:\s*calc\(env\(safe-area-inset-bottom, 0px\) \+ 12px\)/);
  assert.doesNotMatch(styles, /-webkit-overflow-scrolling/);
});

test("bottom sheet alttan açılır, kapanır ve reduced motion tercihine uyar", () => {
  assert.match(styles, /\.mobileSheetContent\[data-state="open"\][\s\S]*?220ms/);
  assert.match(styles, /\.mobileSheetContent\[data-state="closed"\][\s\S]*?200ms/);
  assert.match(styles, /@keyframes factoryStatusSheetIn[\s\S]*?translateY\(100%\)[\s\S]*?translateY\(0\)/);
  assert.match(styles, /@keyframes factoryStatusSheetOut[\s\S]*?translateY\(100%\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test("sheet yalnız snapshot metriklerini ve gerçek personel toplamlarını gösterir", () => {
  assert.match(header, /snapshot\.metrics\.map/);
  assert.match(header, /metric\.value/);
  assert.match(header, /snapshot\.map\.totals\.assignedStaff/);
  assert.match(header, /snapshot\.map\.totals\.idealStaff/);
  assert.match(header, /<dt/);
  assert.match(header, /<dd/);
  assert.match(header, /min-h-11/);
  assert.match(header, /text-right/);
  assert.doesNotMatch(header, /€245\.300|12\.450|hardcodedMetric/);
});

test("ranking, mesaj, locale ve logout mevcut action zincirlerini korur", () => {
  assert.match(header, /onOpenPanel\("ranking"\)/);
  assert.match(header, /onOpenPanel\("playerFeedback"\)/);
  assert.match(header, /GameLocaleSwitcher locale=\{snapshot\.locale\} variant="sheet"/);
  assert.match(header, /<form action=\{logoutAction\}>/);
  assert.match(localeSwitcher, /updatePlayerPreferredLocaleAction/);
  assert.match(localeSwitcher, /variant === "sheet"/);
});

test("bildirim rozeti yalnız gerçek warning ve danger bildirimlerinden üretilir", () => {
  assert.equal(
    getCriticalFactoryNotificationCount([
      { id: "a", title: "A", body: "A", tone: "info" },
      { id: "b", title: "B", body: "B", tone: "warning" },
      { id: "c", title: "C", body: "C", tone: "danger" },
      { id: "d", title: "D", body: "D", tone: "success" },
    ]),
    2,
  );
});

test("sheet kamera state'ine dahil edilmez ve mevcut header inset selector'ı korunur", () => {
  assert.match(factoryMap, /topHud:\s*"\.game-top-status-bar"/);
  assert.doesNotMatch(factoryMap, /mobile-factory-status-sheet/);
  assert.doesNotMatch(header, /setMapPan|setMapZoom/);
  assert.match(header, /game-modal-backdrop z-50/);
  assert.match(header, /z-\[51\]/);
  assert.match(copy, /factoryStatus:\s*"Fabrika Durumu"/);
  assert.match(copy, /factoryStatus:\s*"Factory Status"/);
});
