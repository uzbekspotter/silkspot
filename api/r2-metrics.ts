/**
 * Cloudflare R2 account storage metrics for Moderation Center → Platform Stats.
 *
 * Env (Vercel):
 *   CLOUDFLARE_API_TOKEN — API Token with Account → R2 Storage → Read (or Admin Read)
 *   R2_ACCOUNT_ID        — same as presign / R2 dashboard URL
 *   R2_STORAGE_CAP_GB    — optional; your plan size in GB (e.g. 10 or 20). If unset, defaults to 10 GB for display only.
 *
 * Auth: Authorization: Bearer <Supabase access_token>; user must be ADMIN | MODERATOR | SCREENER.
 * Uses only SUPABASE_URL (or VITE_SUPABASE_URL) + anon key — no service role required on Vercel.
 */
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://silkspot.vercel.app',
];

function getCorsOrigin(req: VercelRequest): string {
  const origin = req.headers.origin || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

type SizeBlock = { metadataSize?: number; objects?: number; payloadSize?: number };

function sumR2Metrics(result: {
  standard?: { published?: SizeBlock; uploaded?: SizeBlock };
  infrequentAccess?: { published?: SizeBlock; uploaded?: SizeBlock };
}): { payloadBytes: number; metadataBytes: number; objects: number } {
  let payloadBytes = 0;
  let metadataBytes = 0;
  let objects = 0;
  const add = (b?: SizeBlock) => {
    if (!b) return;
    payloadBytes += Number(b.payloadSize) || 0;
    metadataBytes += Number(b.metadataSize) || 0;
    objects += Number(b.objects) || 0;
  };
  add(result?.standard?.published);
  add(result?.standard?.uploaded);
  add(result?.infrequentAccess?.published);
  add(result?.infrequentAccess?.uploaded);
  return { payloadBytes, metadataBytes, objects };
}

async function verifyStaff(req: VercelRequest): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return { ok: false, status: 401, message: 'Missing or invalid Authorization' };
  }
  const token = auth.slice(7).trim();
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return {
      ok: false,
      status: 500,
      message:
        'Server missing Supabase URL or anon key (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY on Vercel)',
    };
  }

  const pub = createClient(url, anon);
  const { data: userData, error: authErr } = await pub.auth.getUser(token);
  if (authErr || !userData?.user) {
    return { ok: false, status: 401, message: 'Invalid or expired session' };
  }

  const asUser = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: profile, error: profErr } = await asUser
    .from('user_profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profErr) {
    return { ok: false, status: 500, message: 'Could not verify role' };
  }
  const role = String(profile?.role || '').toUpperCase();
  if (!['ADMIN', 'MODERATOR', 'SCREENER'].includes(role)) {
    return { ok: false, status: 403, message: 'Staff role required' };
  }
  return { ok: true };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const gate = await verifyStaff(req);
  if (!gate.ok) {
    return res.status(gate.status).json({ error: gate.message });
  }

  const cfToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!cfToken || !accountId) {
    return res.status(503).json({
      error: 'R2 metrics not configured (set CLOUDFLARE_API_TOKEN and R2_ACCOUNT_ID on Vercel)',
      code: 'not_configured',
    });
  }

  const cfRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/metrics`, {
    headers: { Authorization: `Bearer ${cfToken}` },
  });

  const cfJson = (await cfRes.json().catch(() => null)) as {
    success?: boolean;
    errors?: { message?: string }[];
    result?: {
      standard?: { published?: SizeBlock; uploaded?: SizeBlock };
      infrequentAccess?: { published?: SizeBlock; uploaded?: SizeBlock };
    };
  };

  if (!cfRes.ok || !cfJson?.success) {
    const msg = cfJson?.errors?.[0]?.message || `Cloudflare HTTP ${cfRes.status}`;
    return res.status(502).json({ error: msg, code: 'cloudflare_error' });
  }

  const { payloadBytes, metadataBytes, objects } = sumR2Metrics(cfJson.result || {});
  const totalStoredBytes = payloadBytes + metadataBytes;

  const capGbRaw = (process.env.R2_STORAGE_CAP_GB || '').trim();
  const capGbParsed =
    capGbRaw && /^\d+(\.\d+)?$/.test(capGbRaw) ? parseFloat(capGbRaw) : null;
  const DEFAULT_PLAN_GB = 10;
  const capGb = capGbParsed ?? DEFAULT_PLAN_GB;
  const capSource: 'env' | 'default' = capGbParsed != null ? 'env' : 'default';
  const capBytes = Math.round(capGb * 1024 ** 3);
  const remainingBytes = Math.max(0, capBytes - totalStoredBytes);

  return res.status(200).json({
    payloadBytes,
    metadataBytes,
    objectCount: objects,
    totalStoredBytes,
    capGb,
    capBytes,
    capSource,
    remainingBytes,
    note: 'Account-wide R2 usage (all buckets). Cloudflare may delay metrics by up to several hours.',
  });
}
