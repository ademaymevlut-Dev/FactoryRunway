import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const sourceRoot = fileURLToPath(new URL("../../", import.meta.url));

const convertedRuntimePaths = [
  "app/(default-tr)/game",
  "app/(default-tr)/help/gameplay",
  "app/(default-tr)/onboarding",
  "app/(default-tr)/player/first-order",
  "app/player-locale-actions.ts",
  "app/user-actions.ts",
  "components/game-locale-switcher.tsx",
  "components/game-presentation",
  "features/awards",
  "features/game",
  "features/game-guide",
  "features/investment",
  "features/landing/components",
  "features/manager",
  "features/orders",
  "features/production-queue",
  "features/ranking",
  "features/tasks",
  "lib/i18n/player-locale.ts",
] as const;

const forbiddenLocaleLocks = [
  {
    label: "hardcoded Turkish locale assignment",
    pattern: /\blocale\s*=\s*["']tr["']/,
  },
  {
    label: "hardcoded Turkish locale default parameter",
    pattern: /\blocale\s*:\s*SupportedLocale\s*=\s*["']tr["']/,
  },
  {
    label: "hardcoded Turkish locale object property",
    pattern: /\blocale:\s*["']tr["']/,
  },
  {
    label: "hardcoded Turkish Prisma translation filter",
    pattern: /where:\s*\{\s*locale:\s*["']tr["']\s*\}/,
  },
  {
    label: "hardcoded Turkish formatter locale",
    pattern: /["']tr-TR["']/,
  },
] as const;

test("converted runtime files do not reintroduce Turkish locale locks", () => {
  const violations = collectConvertedRuntimeFiles().flatMap((filePath) => {
    const source = readFileSync(filePath, "utf8");
    const displayPath = relative(sourceRoot, filePath).split(sep).join("/");

    return forbiddenLocaleLocks
      .map(({ label, pattern }) => {
        const match = source.match(pattern);

        return match ? `${displayPath}: ${label} (${match[0]})` : null;
      })
      .filter((violation): violation is string => violation !== null);
  });

  assert.deepEqual(violations, []);
});

function collectConvertedRuntimeFiles() {
  return convertedRuntimePaths.flatMap((relativePath) =>
    collectRuntimeSourceFiles(join(sourceRoot, relativePath)),
  );
}

function collectRuntimeSourceFiles(path: string): string[] {
  const entryStat = statSync(path);

  if (entryStat.isFile()) {
    return isRuntimeSourceFile(path) ? [path] : [];
  }

  if (!entryStat.isDirectory()) return [];

  return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    collectRuntimeSourceFiles(join(path, entry.name)),
  );
}

function isRuntimeSourceFile(path: string) {
  return (
    (path.endsWith(".ts") || path.endsWith(".tsx")) &&
    !path.endsWith(".test.ts") &&
    !path.endsWith(".test.tsx") &&
    !path.endsWith(".spec.ts") &&
    !path.endsWith(".spec.tsx") &&
    !path.endsWith(".d.ts")
  );
}
