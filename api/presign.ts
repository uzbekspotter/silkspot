import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Vercel bundles each `api/*.ts` entry separately; keep R2 helpers here (also in upload.ts, delete.ts). */
function parseJsonBody(req: { body?: unknown }): Record<string, unknown> {
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

function getR2S3Endpoint(): string {
  const custom = process.env.R2_S3_ENDPOINT?.trim();
  if (custom) return custom.replace(/\/$/, '');
  const id = process.env.R2_ACCOUNT_ID?.trim();
  if (!id) return '';
  const jur = (process.env.R2_JURISDICTION || '').trim().toLowerCase();
  if (jur === 'eu') return `https://${id}.eu.r2.cloudflarestorage.com`;
  return `https://${id}.r2.cloudflarestorage.com`;
}

function createR2S3Client(): S3Client {
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

const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://silkspot.vercel.app',
];

function allowedOrigins(): string[] {
  const extra = process.env.UPLOAD_ALLOWED_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
  return [...DEFAULT_ORIGINS, ...extra];
}

function getCorsOrigin(req: VercelRequest): string {
  const origin = (req.headers.origin as string) || '';
  const list = allowedOrigins();
  return list.includes(origin) ? origin : list[0];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const origin = getCorsOrigin(req);
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = parseJsonBody(req);
    const path = typeof body.path === 'string' ? body.path : '';
    const contentType = typeof body.contentType === 'string' ? body.contentType : '';
    if (!path || !contentType) {
      return res.status(400).json({ error: 'Missing path or contentType' });
    }

    const {
      R2_ACCOUNT_ID,
      R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY,
      R2_BUCKET_NAME = 'silkspot-photos',
    } = process.env;

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      return res.status(500).json({ error: 'R2 credentials not configured' });
    }

    const s3 = createR2S3Client();
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: path,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });

    return res.status(200).json({ uploadUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Presign error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: message || 'Failed to generate presigned URL' });
    }
    throw err;
  }
}
