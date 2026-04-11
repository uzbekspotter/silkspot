import type { Page } from '../types';

export type ParsedAppLocation = {
  page: Page;
  selectedPhotoId: string | null;
  selectedAircraftReg: string | null;
  selectedProfileUserId: string | null;
  mapFocusAirportIata: string | null;
  /** False when pathname was unknown and we fell back to explore */
  recognized: boolean;
};

const DEFAULT: ParsedAppLocation = {
  page: 'explore',
  selectedPhotoId: null,
  selectedAircraftReg: null,
  selectedProfileUserId: null,
  mapFocusAirportIata: null,
  recognized: true,
};

/** Read app route from pathname + query (client only). */
export function parseAppLocation(pathname: string, search: string): ParsedAppLocation {
  const p = pathname.replace(/\/+$/, '') || '/';
  const q = new URLSearchParams(search);
  const airport = q.get('airport')?.trim().toUpperCase() || null;

  if (p === '/' || p === '') return { ...DEFAULT, page: 'explore', recognized: true };
  if (p === '/map') return { ...DEFAULT, page: 'map', mapFocusAirportIata: airport, recognized: true };
  if (p === '/fleet') return { ...DEFAULT, page: 'fleet', recognized: true };
  if (p === '/community') return { ...DEFAULT, page: 'community', recognized: true };
  if (p === '/stats') return { ...DEFAULT, page: 'stats', recognized: true };
  if (p === '/about/wake-turbulence') return { ...DEFAULT, page: 'about-wake', recognized: true };
  if (p === '/about') return { ...DEFAULT, page: 'about', recognized: true };
  if (p === '/terms') return { ...DEFAULT, page: 'terms', recognized: true };
  if (p === '/privacy') return { ...DEFAULT, page: 'privacy', recognized: true };
  if (p === '/upload') return { ...DEFAULT, page: 'upload', recognized: true };
  if (p === '/settings') return { ...DEFAULT, page: 'settings', recognized: true };
  if (p === '/admin') return { ...DEFAULT, page: 'admin', recognized: true };
  if (p === '/login') return { ...DEFAULT, page: 'login', recognized: true };
  if (p === '/register') return { ...DEFAULT, page: 'register', recognized: true };

  const profileMatch = /^\/profile(?:\/([^/]+))?$/.exec(p);
  if (profileMatch) {
    return {
      ...DEFAULT,
      page: 'profile',
      selectedProfileUserId: profileMatch[1] ? decodeURIComponent(profileMatch[1]) : null,
      recognized: true,
    };
  }

  const acMatch = /^\/aircraft\/(.+)$/.exec(p);
  if (acMatch) {
    const reg = decodeURIComponent(acMatch[1]).trim().toUpperCase().replace(/\s+/g, '');
    return { ...DEFAULT, page: 'aircraft-detail', selectedAircraftReg: reg || null, recognized: true };
  }

  const phMatch = /^\/photo\/([^/]+)$/.exec(p);
  if (phMatch) {
    return {
      ...DEFAULT,
      page: 'photo-detail',
      selectedPhotoId: decodeURIComponent(phMatch[1]),
      recognized: true,
    };
  }

  return { ...DEFAULT, page: 'explore', recognized: false };
}

export function urlForAppState(args: {
  page: Page;
  selectedPhotoId?: string | null;
  selectedAircraftReg?: string | null;
  selectedProfileUserId?: string | null;
  mapFocusAirportIata?: string | null;
}): string {
  const {
    page,
    selectedPhotoId = null,
    selectedAircraftReg = null,
    selectedProfileUserId = null,
    mapFocusAirportIata = null,
  } = args;

  switch (page) {
    case 'explore':
      return '/';
    case 'map':
      return mapFocusAirportIata
        ? `/map?airport=${encodeURIComponent(mapFocusAirportIata)}`
        : '/map';
    case 'fleet':
      return '/fleet';
    case 'community':
      return '/community';
    case 'stats':
      return '/stats';
    case 'about':
      return '/about';
    case 'about-wake':
      return '/about/wake-turbulence';
    case 'terms':
      return '/terms';
    case 'privacy':
      return '/privacy';
    case 'upload':
      return '/upload';
    case 'settings':
      return '/settings';
    case 'admin':
      return '/admin';
    case 'login':
      return '/login';
    case 'register':
      return '/register';
    case 'profile':
      return selectedProfileUserId
        ? `/profile/${encodeURIComponent(selectedProfileUserId)}`
        : '/profile';
    case 'photo-detail':
      return selectedPhotoId ? `/photo/${encodeURIComponent(selectedPhotoId)}` : '/';
    case 'aircraft-detail':
      return selectedAircraftReg
        ? `/aircraft/${encodeURIComponent(selectedAircraftReg)}`
        : '/fleet';
    default:
      return '/';
  }
}
