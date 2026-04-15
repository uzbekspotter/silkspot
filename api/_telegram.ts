/**
 * Shared Telegram helpers for Vercel API routes.
 * Not exposed as a public endpoint (underscore prefix → Vercel skips routing).
 *
 * Env vars required:
 *   TELEGRAM_BOT_TOKEN      — bot token from @BotFather
 *   TELEGRAM_CHAT_IDS       — comma-separated chat / channel IDs (also accepts
 *                             TELEGRAM_CHANNEL_ID or TELEGRAM_CHAT_ID as aliases)
 *   TELEGRAM_WEBHOOK_SECRET — shared secret for Supabase → Vercel webhook auth
 */
import type { VercelRequest } from '@vercel/node';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function sendTelegramMessage(
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const rawIds =
    process.env.TELEGRAM_CHAT_IDS ||
    process.env.TELEGRAM_CHANNEL_ID ||
    process.env.TELEGRAM_CHAT_ID ||
    '';
  const chatIds = rawIds
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!token || chatIds.length === 0) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_IDS not set; skipping send');
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
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      description?: string;
    };
    if (!res.ok || !data.ok) {
      console.error('[telegram] Telegram API error:', data);
      return { ok: false, error: data.description || `HTTP ${res.status}` };
    }
  }
  return { ok: true };
}

export function verifyWebhookSecret(req: VercelRequest): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) {
    console.error('[telegram] TELEGRAM_WEBHOOK_SECRET is not set');
    return false;
  }
  const auth = req.headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7) === expected;
  }
  const h = req.headers['x-telegram-webhook-secret'];
  const headerVal = Array.isArray(h) ? h[0] : h;
  return headerVal === expected;
}
