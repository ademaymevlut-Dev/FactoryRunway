import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const showcaseCatalogFilePath = fileURLToPath(
  new URL(
    "../src/features/landing/showcase/data/catalog.generated.json",
    import.meta.url,
  ),
);

export async function readGeneratedShowcaseCatalog(): Promise<string> {
  return readFile(showcaseCatalogFilePath, "utf8");
}

export async function writeGeneratedShowcaseCatalogAtomically(
  contents: string,
): Promise<void> {
  const directory = dirname(showcaseCatalogFilePath);
  const temporaryPath = join(
    directory,
    `.${basename(showcaseCatalogFilePath)}.${process.pid}.${randomUUID()}.tmp`,
  );

  await mkdir(directory, { recursive: true });

  try {
    await writeFile(temporaryPath, contents, {
      encoding: "utf8",
      flag: "wx",
    });
    await rename(temporaryPath, showcaseCatalogFilePath);
  } finally {
    await unlink(temporaryPath).catch(() => undefined);
  }
}

export function parseGeneratedShowcaseCatalog(contents: string): unknown {
  try {
    return JSON.parse(contents);
  } catch (error) {
    throw new Error(
      `Generated showcase JSON parse edilemedi: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
