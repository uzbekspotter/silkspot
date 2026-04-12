import { S3Client } from '@aws-sdk/client-s3';

/**
 * Vercel may deliver `req.body` as object, string, or Buffer depending on runtime.
 * Kept outside `api/` so the serverless bundler always traces these imports.
 */
export function parseJsonBody(req: { body?: unknown }): Record<string, unknown> {
  const b = req.body;
  if (b == null) return {};
  if (typeof b === 'string') {
    try {
      return JSON.parse(b) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(b)) {
    try {
      return JSON.parse(b.toString('utf8')) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof b === 'object') return b as Record<string, unknown>;
  return {};
}

/**
 * S3-compatible endpoint for R2. Default: `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`.
 * Override with `R2_S3_ENDPOINT` or `R2_JURISDICTION=eu` for EU jurisdictional buckets.
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

/** Shared client for presign, upload proxy, delete. */
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
