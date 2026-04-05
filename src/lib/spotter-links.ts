import type { LucideIcon } from 'lucide-react';
import { Globe, Instagram, Youtube, Facebook, Send, Plane, Radar, AtSign, Camera } from 'lucide-react';

export type SpotterLinkGroup = 'social' | 'aviation';

export type SpotterLinkItem = {
  title: string;
  url: string;
  group: SpotterLinkGroup;
};

export const SPOTTER_LINKS_MAX = 14;
const TITLE_MAX = 48;

export function parseSpotterLinks(raw: unknown): SpotterLinkItem[] {
  if (!Array.isArray(raw)) return [];
  const out: SpotterLinkItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const title = String(o.title || '').trim().slice(0, TITLE_MAX);
    let url = String(o.url || '').trim();
    const group = o.group === 'aviation' ? 'aviation' : 'social';
    if (!title || !url) continue;
    if (!/^https:\/\//i.test(url)) {
      if (/^http:\/\//i.test(url)) url = 'https://' + url.slice(7);
      else url = 'https://' + url.replace(/^\/+/, '');
    }
    try {
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      continue;
    }
    out.push({ title, url, group });
    if (out.length >= SPOTTER_LINKS_MAX) break;
  }
  return out;
}

export function normalizeUrlInput(s: string): string {
  const t = s.trim();
  if (!t) return '';
  if (/^https:\/\//i.test(t)) return t;
  if (/^http:\/\//i.test(t)) return 'https://' + t.slice(7);
  return 'https://' + t.replace(/^\/+/, '');
}

type LinkStyle = { Icon: LucideIcon; gradient: string; glow: string };

export function spotterLinkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

export function spotterLinkStyle(url: string, group: SpotterLinkGroup): LinkStyle {
  const u = url.toLowerCase();
  if (u.includes('instagram.com')) return { Icon: Instagram, gradient: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', glow: 'rgba(225, 48, 108, 0.25)' };
  if (u.includes('youtube.com') || u.includes('youtu.be')) return { Icon: Youtube, gradient: 'linear-gradient(135deg, #ff0000, #990000)', glow: 'rgba(239, 68, 68, 0.2)' };
  if (u.includes('twitter.com') || u.includes('x.com')) return { Icon: AtSign, gradient: 'linear-gradient(135deg, #0f172a, #334155)', glow: 'rgba(15, 23, 42, 0.2)' };
  if (u.includes('facebook.com') || u.includes('fb.com')) return { Icon: Facebook, gradient: 'linear-gradient(135deg, #1877f2, #0c63d4)', glow: 'rgba(24, 119, 242, 0.2)' };
  if (u.includes('t.me') || u.includes('telegram')) return { Icon: Send, gradient: 'linear-gradient(135deg, #2aabee, #229ed9)', glow: 'rgba(42, 171, 238, 0.22)' };
  if (u.includes('tiktok.com')) return { Icon: Globe, gradient: 'linear-gradient(135deg, #00f2ea, #ff0050)', glow: 'rgba(0, 242, 234, 0.15)' };
  if (u.includes('jetphotos.com')) return { Icon: Camera, gradient: 'linear-gradient(135deg, #059669, #0d9488)', glow: 'rgba(5, 150, 105, 0.2)' };
  if (u.includes('planespotters.net')) return { Icon: Plane, gradient: 'linear-gradient(135deg, #475569, #0f172a)', glow: 'rgba(71, 85, 105, 0.2)' };
  if (u.includes('flightradar') || u.includes('fr24')) return { Icon: Radar, gradient: 'linear-gradient(135deg, #2563eb, #1d4ed8)', glow: 'rgba(37, 99, 235, 0.2)' };
  if (group === 'aviation') return { Icon: Plane, gradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)', glow: 'rgba(14, 165, 233, 0.2)' };
  return { Icon: Globe, gradient: 'linear-gradient(135deg, #8b5cf6, #6366f1)', glow: 'rgba(139, 92, 246, 0.2)' };
}
