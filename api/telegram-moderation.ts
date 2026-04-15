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
import { escapeHtml, sendTelegramMessage, verifyWebhookSecret } from './_telegram.js';

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

  if (!verifyWebhookSecret(req)) {
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
