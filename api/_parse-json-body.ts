import type { VercelRequest } from '@vercel/node';

/** Vercel may deliver `req.body` as object, string, or Buffer depending on runtime. */
export function parseJsonBody(req: VercelRequest): Record<string, unknown> {
  const b = req.body as unknown;
  if (b == null) return {};
  if (typeof b === 'string') {
    try {
      return JSON.parse(b) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (Buffer.isBuffer(b)) {
    try {
      return JSON.parse(b.toString('utf8')) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof b === 'object') return b as Record<string, unknown>;
  return {};
}
