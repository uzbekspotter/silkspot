/**
 * HMAC helpers for Fast Track Telegram callback_data.
 *
 * Format: ft:{userId}:{unixSec}:{sig11}
 * Length: 3 + 36 + 1 + 10 + 1 + 11 = 62 bytes — under Telegram's 64-byte limit.
 *
 * Env: TELEGRAM_FT_HMAC_SECRET
 */
import { createHmac } from 'node:crypto';

const TTL_SECONDS = 48 * 60 * 60; // 48 hours

function getSecret(): string {
  const s = process.env.TELEGRAM_FT_HMAC_SECRET;
  if (!s) throw new Error('TELEGRAM_FT_HMAC_SECRET not set');
  return s;
}

function computeSig(payload: string): string {
  return createHmac('sha256', getSecret())
    .update(payload)
    .digest('base64url')
    .slice(0, 11);
}

/** Build callback_data for a Fast Track approve button. */
export function buildFtCallbackData(userId: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const payload = `ft:${userId}:${ts}`;
  return `${payload}:${computeSig(payload)}`;
}

export type FtVerifyResult =
  | { ok: true; userId: string }
  | { ok: false; reason: string };

/** Parse and verify callback_data from a Fast Track button press. */
export function verifyFtCallbackData(data: string): FtVerifyResult {
  if (!data.startsWith('ft:')) return { ok: false, reason: 'wrong prefix' };
  // Expected: ["ft", userId, unixTs, sig]
  const parts = data.split(':');
  if (parts.length !== 4) return { ok: false, reason: 'malformed' };
  const [, userId, tsStr, givenSig] = parts;
  const ts = parseInt(tsStr, 10);
  if (!userId || isNaN(ts) || !givenSig) return { ok: false, reason: 'malformed' };

  const payload = `ft:${userId}:${ts}`;
  if (givenSig !== computeSig(payload)) return { ok: false, reason: 'invalid signature' };

  const age = Math.floor(Date.now() / 1000) - ts;
  if (age > TTL_SECONDS) return { ok: false, reason: 'expired' };

  return { ok: true, userId };
}
