import { del } from "@vercel/blob";

export type DeleteProductBlobs = (
  pathnames: readonly string[],
) => Promise<unknown>;

async function deleteProductBlobs(pathnames: readonly string[]) {
  return del([...pathnames], {
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
}

export async function cleanupFailedProductImageUpload(
  pathnames: readonly string[],
  deleteBlobs: DeleteProductBlobs = deleteProductBlobs,
): Promise<void> {
  const uniquePathnames = [...new Set(pathnames.filter(Boolean))];
  if (uniquePathnames.length === 0) return;

  await deleteBlobs(uniquePathnames).catch(() => undefined);
}
