import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createR2S3Client, parseJsonBody } from '../lib/server/r2-api-helpers';

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

  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: path,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });

    return res.status(200).json({ uploadUrl });
  } catch (err: any) {
    console.error('Presign error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate presigned URL' });
  }
}
