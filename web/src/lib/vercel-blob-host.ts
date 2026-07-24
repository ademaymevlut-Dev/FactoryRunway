export const VERCEL_BLOB_HOST_SUFFIX =
  ".public.blob.vercel-storage.com" as const;

export const VERCEL_BLOB_REMOTE_HOSTNAME =
  `**${VERCEL_BLOB_HOST_SUFFIX}` as const;
