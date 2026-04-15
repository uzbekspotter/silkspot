/**
 * Telegram Bot API webhook — handles inline button callbacks.
 *
 * Register this endpoint with Telegram once:
 *   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://silkspot.vercel.app/api/telegram-bot-webhook"
 *
 * Supported callback_data values:
 *   ft:{userId}:{unixTs}:{hmac11}  — approve Fast Track for userId
 *   dismiss                         — ignore candidate, remove buttons
 *
 * Env vars required:
 *   TELEGRAM_BOT_TOKEN        — bot token from @BotFather
 *   TELEGRAM_ADMIN_IDS        — comma-separated Telegram user IDs allowed to approve
 *   TELEGRAM_FT_HMAC_SECRET   — secret for signing/verifying callback_data
 *   SUPABASE_URL              — Supabase project URL (or reuse VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { answerCallbackQuery, editTelegramMessage } from './_telegram.js';
import { verifyFtCallbackData } from './_ft-hmac.js';

// ── Supabase service client (bypasses RLS) ──────────────────────────────────
function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role not configured');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── Allowed Telegram admin user IDs ────────────────────────────────────────
function isAllowedAdmin(telegramUserId: number): boolean {
  const raw = process.env.TELEGRAM_ADMIN_IDS || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .some((id) => Number(id) === telegramUserId);
}

// ── Apply Fast Track in DB ──────────────────────────────────────────────────
async function approveFastTrack(
  userId: string,
  approverUsername: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const supabase = getServiceClient();

  // Check current state to avoid double-apply
  const { data: profile, error: fetchErr } = await supabase
    .from('user_profiles')
    .select('id, external_verified')
    .eq('id', userId)
    .single();

  if (fetchErr || !profile) {
    return { ok: false, reason: `User not found: ${fetchErr?.message ?? 'no row'}` };
  }
  if (profile.external_verified) {
    return { ok: false, reason: 'already_verified' };
  }

  const note = `Fast-track enabled via Telegram by @${approverUsername}`;

  const { error: updateErr } = await supabase
    .from('user_profiles')
    .update({
      external_verified: true,
      external_verified_at: new Date().toISOString(),
      external_verified_by: null,   // no auth.users link for bot approver
      external_verification_note: note,
    })
    .eq('id', userId);

  if (updateErr) return { ok: false, reason: updateErr.message };

  const { error: logErr } = await supabase
    .from('external_verification_events')
    .insert({
      user_id: userId,
      changed_by: null,   // nullable after migration 036
      old_verified: false,
      new_verified: true,
      note,
    });

  if (logErr) {
    console.error('[ft-approve] audit log failed:', logErr.message);
    // Non-fatal: user is already updated; log and continue
  }

  return { ok: true };
}

// ── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  // Telegram sends POST; 405 for anything else
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Telegram doesn't send a shared secret by default.
  // We rely on the URL being secret (Vercel HTTPS, not guessable).
  // Additionally: only process callback_query payloads.

  const update = req.body as Record<string, unknown> | null;
  if (!update || typeof update !== 'object') {
    return res.status(400).json({ error: 'Invalid body' });
  }

  // We only care about callback_query updates
  const cq = update.callback_query as Record<string, unknown> | undefined;
  if (!cq) {
    // Telegram sends many update types; silently ack non-callback ones
    return res.status(200).json({ ok: true });
  }

  const callbackQueryId = typeof cq.id === 'string' ? cq.id : String(cq.id ?? '');
  const data            = typeof cq.data === 'string' ? cq.data : '';
  const from            = (cq.from ?? {}) as Record<string, unknown>;
  const message         = (cq.message ?? {}) as Record<string, unknown>;
  const chatId          = (message.chat as Record<string, unknown> | undefined)?.id;
  const messageId       = typeof message.message_id === 'number' ? message.message_id : 0;
  const fromId          = typeof from.id === 'number' ? from.id : 0;
  const fromUsername    = typeof from.username === 'string' ? from.username : `id${fromId}`;

  // ── Dismiss (ignore) button ────────────────────────────────────────────
  if (data === 'dismiss') {
    const originalText = typeof message.text === 'string' ? message.text : '';
    if (chatId && messageId) {
      await editTelegramMessage(chatId as string | number, messageId, `${originalText}\n\n<i>— Ignored</i>`);
    }
    await answerCallbackQuery(callbackQueryId);
    return res.status(200).json({ ok: true });
  }

  // ── Approve button (ft:...) ────────────────────────────────────────────
  if (data.startsWith('ft:')) {
    // Check admin authorisation
    if (!isAllowedAdmin(fromId)) {
      await answerCallbackQuery(callbackQueryId, '⛔ Not authorised', true);
      return res.status(200).json({ ok: true });
    }

    // Verify HMAC + TTL
    const verified = verifyFtCallbackData(data);
    if (verified.ok === false) {
      const msg = verified.reason === 'expired'
        ? '⏰ Link expired — re-trigger from Supabase or resave links.'
        : `❌ Invalid callback (${verified.reason})`;
      await answerCallbackQuery(callbackQueryId, msg, true);
      return res.status(200).json({ ok: true });
    }

    // Apply in DB
    let result: { ok: true } | { ok: false; reason: string };
    try {
      result = await approveFastTrack(verified.userId, fromUsername);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[ft-approve] unexpected error:', msg);
      await answerCallbackQuery(callbackQueryId, `❌ Server error: ${msg}`, true);
      return res.status(200).json({ ok: true });
    }

    if (result.ok === false) {
      if (result.reason === 'already_verified') {
        const originalText = typeof message.text === 'string' ? message.text : '';
        if (chatId && messageId) {
          await editTelegramMessage(
            chatId as string | number,
            messageId,
            `${originalText}\n\n✅ <b>Already verified</b>`,
          );
        }
        await answerCallbackQuery(callbackQueryId, 'Already verified ✅');
        return res.status(200).json({ ok: true });
      }
      const errReason = result.ok === false ? result.reason : 'unknown';
      await answerCallbackQuery(callbackQueryId, `❌ DB error: ${errReason}`, true);
      return res.status(200).json({ ok: true });
    }

    // Success — edit original message, remove buttons
    const originalText = typeof message.text === 'string' ? message.text : '';
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    if (chatId && messageId) {
      await editTelegramMessage(
        chatId as string | number,
        messageId,
        `${originalText}\n\n✅ <b>Fast Track approved</b> by @${fromUsername} at ${nowStr} UTC`,
        [], // remove inline buttons
      );
    }
    await answerCallbackQuery(callbackQueryId, '✅ Fast Track approved!');
    return res.status(200).json({ ok: true });
  }

  // Unknown callback_data — ack silently
  await answerCallbackQuery(callbackQueryId);
  return res.status(200).json({ ok: true });
}
