import { S3Client } from '@aws-sdk/client-s3';

/**
 * S3-compatible endpoint for R2. Default: `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`.
 * Set `R2_S3_ENDPOINT` to override (e.g. EU jurisdictional buckets:
 * `https://<R2_ACCOUNT_ID>.eu.r2.cloudflarestorage.com`), or set `R2_JURISDICTION=eu`.
 */
export function getR2S3Endpoint(): string {
  const custom = process.env.R2_S3_ENDPOINT?.trim();
  if (custom) return custom.replace(/\/$/, '');
  const id = process.env.R2_ACCOUNT_ID?.trim();
  if (!id) return '';
  const jur = (process.env.R2_JURISDICTION || '').trim().toLowerCase();
  if (jur === 'eu') return `https://${id}.eu.r2.cloudflarestorage.com`;
  return `https://${id}.r2.cloudflarestorage.com`;
}

/** Shared client for presign, upload proxy, delete. Path-style URLs work reliably with R2. */
export function createR2S3Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: getR2S3Endpoint(),
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });
}
