/**
 * Telegram notify: new user registered OR aviation profile links updated.
 * Called by a single Supabase Database Webhook on `user_profiles` (INSERT + UPDATE).
 *
 * Security: set TELEGRAM_WEBHOOK_SECRET and send the same value as
 *   Authorization: Bearer <secret>
 * or header x-telegram-webhook-secret: <secret>
 * in the Supabase webhook configuration.
 *
 * Events:
 *  INSERT → 🆕 new user notification
 *  UPDATE → 🔗 Fast Track candidate (only when spotter_links changed AND
 *            the new value contains a JetPhotos or PlaneSpotters URL)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { escapeHtml, sendTelegramMessage, sendTelegramMessageWithButtons, verifyWebhookSecret } from './_telegram.js';
import { buildFdCallbackData, buildFtCallbackData } from './_ft-hmac.js';

/** Supabase / proxies sometimes deliver the body as a string; Vercel may leave it unparsed. */
function parseJsonObjectBody(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeEventType(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Accept `user_profiles`, `public.user_profiles`, optional quoting. */
function isUserProfilesTable(raw: string): boolean {
  let t = raw.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1);
  }
  t = t.replace(/^public\./i, '');
  const dot = t.lastIndexOf('.');
  if (dot >= 0) t = t.slice(dot + 1);
  return t.toLowerCase() === 'user_profiles';
}

/**
 * Minimal server-side trusted-link check.
 * Avoids importing src/lib/spotter-links which pulls in client-only lucide-react.
 */
function hasTrustedAviationLink(raw: unknown): boolean {
  if (!Array.isArray(raw)) return false;
  return raw.some((item: unknown) => {
    try {
      const url = String((item as Record<string, unknown>)?.url || '');
      const host = new URL(url).hostname.replace(/^www\./i, '');
      return host === 'jetphotos.com' || host === 'planespotters.net';
    } catch {
      return false;
    }
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!verifyWebhookSecret(req)) return res.status(401).json({ error: 'Unauthorized' });

  const body = parseJsonObjectBody(req.body);
  if (!body) {
    return res.status(400).json({ error: 'Invalid body' });
  }

  const type      = typeof body.type  === 'string' ? normalizeEventType(body.type)  : '';
  const table     = typeof body.table === 'string' ? body.table : '';
  const record    = (body.record     ?? null) as Record<string, unknown> | null;
  const oldRecord = (body.old_record ?? null) as Record<string, unknown> | null;

  if (table && !isUserProfilesTable(table)) {
    return res.status(200).json({ ok: true, skipped: 'not user_profiles table' });
  }

  const username = typeof record?.username   === 'string' ? record.username   : '';
  const userId   = typeof record?.id         === 'string' ? record.id         : '';
  const joinedAt = typeof record?.joined_at  === 'string' ? record.joined_at
                 : typeof record?.created_at === 'string' ? record.created_at : '';

  // ── INSERT: new user ─────────────────────────────────────
  if (type === 'INSERT') {
    const dateStr = joinedAt
      ? new Date(joinedAt).toISOString().slice(0, 16).replace('T', ' ')
      : '—';

    const text = [
      '🆕 <b>New user registered</b> — SILKSPOT',
      '',
      `@${escapeHtml(username || '?')}  (id: <code>${escapeHtml(userId)}</code>)`,
      `Joined: ${escapeHtml(dateStr)} UTC`,
    ].join('\n');

    const send = await sendTelegramMessage(text);
    if (!send.ok && send.error === 'Telegram not configured') {
      return res.status(200).json({ ok: true, warning: send.error });
    }
    if (!send.ok) return res.status(502).json({ ok: false, error: send.error });
    return res.status(200).json({ ok: true, event: 'new_user' });
  }

  // ── UPDATE: spotter_links changed with trusted aviation link ──
  if (type === 'UPDATE') {
    const newLinks = record?.spotter_links;
    const oldLinks = oldRecord?.spotter_links;

    // Anti-spam: skip if links didn't actually change
    if (JSON.stringify(newLinks ?? null) === JSON.stringify(oldLinks ?? null)) {
      return res.status(200).json({ ok: true, skipped: 'spotter_links unchanged' });
    }

    // Only notify when the new value has a JetPhotos / PlaneSpotters link
    if (!hasTrustedAviationLink(newLinks)) {
      return res.status(200).json({ ok: true, skipped: 'no trusted aviation link in new value' });
    }

    // Skip if already verified or admin already dismissed this candidate
    if (record?.external_verified === true) {
      return res.status(200).json({ ok: true, skipped: 'already verified' });
    }
    if (record?.fast_track_dismissed === true) {
      return res.status(200).json({ ok: true, skipped: 'fast track dismissed' });
    }

    const text = [
      '🔗 <b>Aviation links updated</b> — SILKSPOT',
      '',
      `@${escapeHtml(username || '?')}  (id: <code>${escapeHtml(userId)}</code>)`,
      'Candidate for <b>Fast Track</b> — review JetPhotos / PlaneSpotters link in Admin → User Management.',
    ].join('\n');

    // Build inline buttons only when we have a userId to sign
    let send: { ok: boolean; error?: string };
    if (userId) {
      const callbackData = buildFtCallbackData(userId);
      send = await sendTelegramMessageWithButtons(text, [
        [
          { text: '✅ Approve Fast Track', callback_data: callbackData },
          { text: '❌ Ignore',             callback_data: buildFdCallbackData(userId) },
        ],
      ]);
    } else {
      send = await sendTelegramMessage(text);
    }

    if (!send.ok && send.error === 'Telegram not configured') {
      return res.status(200).json({ ok: true, warning: send.error });
    }
    if (!send.ok) return res.status(502).json({ ok: false, error: send.error });
    return res.status(200).json({ ok: true, event: 'links_updated' });
  }

  return res.status(200).json({ ok: true, skipped: `unhandled event type: ${type || '(empty)'}` });
}
