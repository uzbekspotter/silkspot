/**
 * Telegram notify: new photo pending moderation.
 * Called by Supabase Database Webhook (HTTP) on INSERT into `photos` with status PENDING.
 *
 * Security: set TELEGRAM_WEBHOOK_SECRET and send the same value as
 *   Authorization: Bearer <secret>
 * or header x-telegram-webhook-secret: <secret>
 * in the Supabase webhook configuration.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendTelegramMessage(text: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const rawIds = process.env.TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID || '';
  const chatIds = rawIds
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!token || chatIds.length === 0) {
    console.warn('[telegram-moderation] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_IDS not set; skipping send');
    return { ok: false, error: 'Telegram not configured' };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  for (const chatId of chatIds) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    if (!res.ok || !data.ok) {
      console.error('[telegram-moderation] Telegram API error:', data);
      return { ok: false, error: data.description || `HTTP ${res.status}` };
    }
  }
  return { ok: true };
}

function verifySecret(req: VercelRequest): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) {
    console.error('[telegram-moderation] TELEGRAM_WEBHOOK_SECRET is not set');
    return false;
  }
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7) === expected;
  }
  const h = req.headers['x-telegram-webhook-secret'];
  const headerVal = Array.isArray(h) ? h[0] : h;
  return headerVal === expected;
}

/** Supabase Database Webhook payload (typical shape). */
function parseWebhookBody(body: unknown): {
  type?: string;
  table?: string;
  record?: Record<string, unknown> | null;
} | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (b.record && typeof b.record === 'object') {
    return {
      type: typeof b.type === 'string' ? b.type : undefined,
      table: typeof b.table === 'string' ? b.table : undefined,
      record: b.record as Record<string, unknown>,
    };
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!verifySecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parsed = parseWebhookBody(req.body);
  const record = parsed?.record;
  const table = parsed?.table;
  const type = parsed?.type;

  if (table && table !== 'photos') {
    return res.status(200).json({ ok: true, skipped: 'not photos table' });
  }
  if (type && type !== 'INSERT') {
    return res.status(200).json({ ok: true, skipped: 'not INSERT' });
  }

  const status = typeof record?.status === 'string' ? record.status : '';
  if (status && status !== 'PENDING') {
    return res.status(200).json({ ok: true, skipped: 'status not PENDING' });
  }

  const id = typeof record?.id === 'string' ? record.id : null;
  if (!id) {
    return res.status(400).json({ error: 'Missing record.id' });
  }

  const baseUrl = (process.env.TELEGRAM_APP_URL || process.env.VITE_APP_URL || 'https://silkspot.vercel.app').replace(/\/$/, '');
  const link = `${baseUrl}/admin`;

  const text = [
    '<b>SILKSPOT</b> — new photo in moderation queue',
    '',
    `Photo ID: <code>${escapeHtml(id)}</code>`,
    '',
    `<a href="${escapeHtml(link)}">Open Moderation Center</a>`,
  ].join('\n');

  const send = await sendTelegramMessage(text);
  if (!send.ok && send.error === 'Telegram not configured') {
    return res.status(200).json({ ok: true, warning: 'Telegram not configured; set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_IDS' });
  }
  if (!send.ok) {
    return res.status(502).json({ ok: false, error: send.error });
  }

  return res.status(200).json({ ok: true });
}
