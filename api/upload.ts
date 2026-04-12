/**
 * Fallback photo upload: browser → Vercel → R2 (same PutObject as presign).
 * Use when direct PUT to *.r2.cloudflarestorage.com fails (ERR_CONNECTION_RESET, etc.).
 *
 * Limit: ~4 MB body (Vercel serverless). Site JPEGs are capped by width so this is enough.
 */
import { PutObjectCommand } from '@aws-sdk/client-s3';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createR2S3Client } from '../lib/server/r2-api-helpers';

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

const MAX_BYTES = 4 * 1024 * 1024;

/** Photo batch uploads + avatar proxy fallback (matches Settings `avatars/{uuid}_{ts}.ext`). */
function isAllowedPhotoPath(p: string): boolean {
  if (!p || p.length > 512) return false;
  if (p.includes('..') || p.includes('\\')) return false;
  if (/^photos\/\d{4}\/\d{2}\/[A-Za-z0-9_.-]+\.(jpg|jpeg)$/i.test(p)) return true;
  return /^avatars\/[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}_\d+\.(jpg|jpeg|png|webp)$/i.test(
    p,
  );
}

function normalizeContentType(header: string | undefined, path: string): string {
  const h = (header || '').split(';')[0].trim().toLowerCase();
  if (h === 'image/jpeg' || h === 'image/jpg') return 'image/jpeg';
  if (h === 'image/png') return 'image/png';
  if (h === 'image/webp') return 'image/webp';
  if (h === 'application/octet-stream' && /\.jpe?g$/i.test(path)) return 'image/jpeg';
  if (h === 'application/octet-stream' && /\.png$/i.test(path)) return 'image/png';
  if (h === 'application/octet-stream' && /\.webp$/i.test(path)) return 'image/webp';
  return h || 'application/octet-stream';
}

async function readBody(req: VercelRequest, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req as AsyncIterable<Buffer | string | Uint8Array>) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > maxBytes) {
      throw new Error('Payload too large');
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Upload-Path');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawPath = req.headers['x-upload-path'];
  const path = typeof rawPath === 'string' ? decodeURIComponent(rawPath) : '';
  if (!isAllowedPhotoPath(path)) {
    return res.status(400).json({ error: 'Invalid or disallowed path' });
  }

  const len = Number(req.headers['content-length'] || '0');
  if (len > MAX_BYTES) {
    return res.status(413).json({ error: `Body too large (max ${MAX_BYTES} bytes)` });
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

  let body: Buffer;
  try {
    body = await readBody(req, MAX_BYTES);
  } catch (e: unknown) {
    console.error('upload read body:', e);
    const msg = e instanceof Error ? e.message : 'Could not read upload body';
    return res.status(400).json({ error: msg });
  }

  if (!body.length || body.length > MAX_BYTES) {
    return res.status(400).json({ error: 'Empty or oversized body' });
  }

  const contentType = normalizeContentType(req.headers['content-type'] as string | undefined, path);
  if (!contentType.startsWith('image/')) {
    return res.status(400).json({ error: 'Unsupported content type' });
  }

  const s3 = createR2S3Client();

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: path,
        Body: body,
        ContentType: contentType,
      })
    );
    return res.status(200).json({ ok: true, path });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    console.error('R2 PutObject (proxy):', err);
    return res.status(500).json({ error: msg });
  }
}
