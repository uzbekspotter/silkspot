import { motion, AnimatePresence } from 'motion/react';
import {
  Plane, Search, ChevronRight, ChevronDown, Camera, Eye,
  X, LayoutGrid, List, Globe2, Clock, Building2, ArrowLeft,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AIRLINES, searchAirlines, searchAircraftTypes, type Airline as CatalogAirline, type AircraftType as CatalogAircraftType } from '../aviation-data';
import { guessIcaoCodeFromDisplayName } from '../lib/icao-type-map';

// ── Types ────────────────────────────────────────────────
type Status = 'ACTIVE' | 'STORED' | 'SCRAPPED';

// ── Airline brand colors ─────────────────────────────────
const AIRLINE_COLORS: Record<string, string> = {
  'AA': '#0078D2', 'EK': '#D71920', 'QR': '#5C0632', 'HY': '#1A7A4A',
  'LH': '#05164D', 'SQ': '#F0A500', 'BA': '#075AAA', 'AF': '#002157',
  'KL': '#00A1DE', 'LX': '#B40A2D', 'TK': '#E81932', 'EY': '#BD8B13',
  'UA': '#003580', 'HU': '#E31937', 'DL': '#E01933', 'FR': '#073590', 'U2': '#FF6600',
};

// ── Airline logo — Aviasales CDN ─────────────────────────
const AirlineLogo = ({ iata, name, size = 48 }: { iata: string; name: string; size?: number }) => {
  const [err, setErr] = useState(false);
  const color = AIRLINE_COLORS[iata] || '#64748b';
  return err ? (
    <div style={{ width: size, height: size, background: color + '18', color,
      fontSize: size * 0.28, fontWeight: 700, letterSpacing: '-0.02em',
      border: `1.5px solid ${color}30`, borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {iata}
    </div>
  ) : (
    <img
      src={`https://pics.avs.io/${Math.round(size * 2)}/${Math.round(size * 2)}/${iata}.png`}
      alt={name} onError={() => setErr(true)}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
};

// ── Manufacturer badges ──────────────────────────────────
const MFR: Record<string, { bg: string; text: string; label: string }> = {
  'Boeing':     { bg: '#1B3A6B', text: '#fff', label: 'BOEING'   },
  'Airbus':     { bg: '#00205B', text: '#fff', label: 'AIRBUS'   },
  'Embraer':    { bg: '#003DA6', text: '#fff', label: 'EMBRAER'  },
  'Bombardier': { bg: '#E4002B', text: '#fff', label: 'BOMBAR.'  },
  'ATR':        { bg: '#0033A0', text: '#fff', label: 'ATR'      },
  'Sukhoi':     { bg: '#1A1A2E', text: '#C8A951', label: 'SUKHOI' },
};

const MfrBadge = ({ name, size = 32 }: { name: string; size?: number }) => {
  const cfg = MFR[name];
  if (!cfg) return (
    <div style={{ width: size, height: size, background: '#f1f5f9', color: '#64748b',
      fontSize: 9, fontWeight: 700, borderRadius: 6,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {name.slice(0, 3).toUpperCase()}
    </div>
  );
  const fs = size <= 20 ? 7 : size <= 32 ? 9 : Math.max(8, size * 0.22);
  return (
    <div style={{ width: size, height: size, background: cfg.bg, color: cfg.text,
      fontSize: fs, fontWeight: 800, letterSpacing: '0.04em', borderRadius: 6,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {cfg.label}
    </div>
  );
};

// ── Data ─────────────────────────────────────────────────
interface Aircraft {
  reg: string; type: string; typeShort: string;
  manufacturer: string; family: string;
  msn: string; age: number; status: Status;
  config: string; hub: string; photos: number;
  firstFlight: string; engines: string;
}
interface Airline {
  name: string; iata: string; icao: string;
  country: string; countryFlag: string;
  hub: string; founded: string; alliance: string;
  totalFleet: number; avgAge: number; orders: number;
  fleet: Aircraft[];
}

const DEMO_AIRLINES: Airline[] = [
  {
    name: 'American Airlines', iata: 'AA', icao: 'AAL',
    country: 'United States', countryFlag: '🇺🇸', hub: 'Dallas/Fort Worth',
    founded: '1926', alliance: 'oneworld', totalFleet: 964, avgAge: 12.8, orders: 164,
    fleet: [
      { reg:'N829AN', type:'Boeing 787-9',     typeShort:'B789', manufacturer:'Boeing', family:'787 Dreamliner', msn:'40639', age:8.4,  status:'ACTIVE',   config:'C30 W21 Y234',    hub:'DFW', photos:342, firstFlight:'2016-05-12', engines:'2× GEnx-1B76' },
      { reg:'N717AN', type:'Boeing 777-300ER', typeShort:'B77W', manufacturer:'Boeing', family:'777',            msn:'31161', age:11.2, status:'ACTIVE',   config:'F8 C52 W28 Y216', hub:'DFW', photos:218, firstFlight:'2013-02-08', engines:'2× GE90-115B' },
      { reg:'N101NN', type:'Airbus A321-231',  typeShort:'A321', manufacturer:'Airbus', family:'A320',           msn:'5848',  age:10.1, status:'ACTIVE',   config:'F10 C20 Y120',    hub:'PHL', photos:89,  firstFlight:'2014-08-14', engines:'2× CFM56-5B3' },
      { reg:'N9002U', type:'Boeing 737 MAX 8', typeShort:'B38M', manufacturer:'Boeing', family:'737 MAX',        msn:'44312', age:2.1,  status:'ACTIVE',   config:'C16 Y156',        hub:'MIA', photos:156, firstFlight:'2022-11-03', engines:'2× LEAP-1B27' },
      { reg:'N800AN', type:'Boeing 787-8',     typeShort:'B788', manufacturer:'Boeing', family:'787 Dreamliner', msn:'40618', age:9.5,  status:'STORED',   config:'C20 W28 Y186',    hub:'ORD', photos:74,  firstFlight:'2015-03-21', engines:'2× GEnx-1B64' },
      { reg:'N751AN', type:'Boeing 777-200ER', typeShort:'B772', manufacturer:'Boeing', family:'777',            msn:'29550', age:23.4, status:'ACTIVE',   config:'C37 W24 Y212',    hub:'JFK', photos:411, firstFlight:'2001-04-16', engines:'2× PW4090' },
      { reg:'N400AN', type:'Airbus A319-112',  typeShort:'A319', manufacturer:'Airbus', family:'A320',           msn:'5782',  age:10.8, status:'ACTIVE',   config:'F8 Y120',         hub:'CLT', photos:47,  firstFlight:'2014-01-27', engines:'2× CFM56-5B5' },
      { reg:'N327AA', type:'Airbus A321-231',  typeShort:'A321', manufacturer:'Airbus', family:'A320',           msn:'6124',  age:8.7,  status:'SCRAPPED', config:'F10 C20 Y120',    hub:'—',   photos:31,  firstFlight:'2016-03-05', engines:'2× CFM56-5B3' },
      { reg:'N200UU', type:'Airbus A321neo',   typeShort:'A21N', manufacturer:'Airbus', family:'A320neo',        msn:'9012',  age:1.8,  status:'ACTIVE',   config:'C20 Y138',        hub:'PHL', photos:312, firstFlight:'2023-02-14', engines:'2× LEAP-1A26' },
      { reg:'N505AN', type:'Boeing 767-300ER', typeShort:'B763', manufacturer:'Boeing', family:'767',            msn:'27450', age:27.1, status:'STORED',   config:'C28 Y188',        hub:'JFK', photos:167, firstFlight:'1997-07-11', engines:'2× PW4060' },
    ],
  },
  {
    name: 'Emirates', iata: 'EK', icao: 'UAE',
    country: 'United Arab Emirates', countryFlag: '🇦🇪', hub: 'Dubai (DXB)',
    founded: '1985', alliance: 'None', totalFleet: 259, avgAge: 8.1, orders: 200,
    fleet: [
      { reg:'A6-EVB', type:'Airbus A380-841',  typeShort:'A388', manufacturer:'Airbus', family:'A380', msn:'234',   age:9.1,  status:'ACTIVE', config:'F14 J76 Y427', hub:'DXB', photos:891, firstFlight:'2015-04-20', engines:'4× Rolls-Royce Trent 970' },
      { reg:'A6-ENM', type:'Boeing 777-300ER', typeShort:'B77W', manufacturer:'Boeing', family:'777',  msn:'44497', age:4.2,  status:'ACTIVE', config:'F6 J42 Y304',  hub:'DXB', photos:234, firstFlight:'2020-01-15', engines:'2× GE90-115B' },
      { reg:'A6-EAN', type:'Airbus A380-841',  typeShort:'A388', manufacturer:'Airbus', family:'A380', msn:'189',   age:11.3, status:'ACTIVE', config:'F14 J76 Y427', hub:'DXB', photos:567, firstFlight:'2013-02-01', engines:'4× Rolls-Royce Trent 970' },
      { reg:'A6-ECG', type:'Boeing 777-200LR', typeShort:'B77L', manufacturer:'Boeing', family:'777',  msn:'35584', age:16.2, status:'ACTIVE', config:'F8 J42 Y216',  hub:'DXB', photos:145, firstFlight:'2007-11-03', engines:'2× GE90-110B1L' },
      { reg:'A6-EVI', type:'Airbus A380-841',  typeShort:'A388', manufacturer:'Airbus', family:'A380', msn:'251',   age:8.4,  status:'ACTIVE', config:'F14 J76 Y427', hub:'DXB', photos:432, firstFlight:'2016-07-14', engines:'4× Rolls-Royce Trent 970' },
    ],
  },
  {
    name: 'Qatar Airways', iata: 'QR', icao: 'QTR',
    country: 'Qatar', countryFlag: '🇶🇦', hub: 'Doha (DOH)',
    founded: '1994', alliance: 'oneworld', totalFleet: 230, avgAge: 7.3, orders: 180,
    fleet: [
      { reg:'A7-ANL', type:'Airbus A350-941',  typeShort:'A359', manufacturer:'Airbus', family:'A350',           msn:'412',   age:5.2,  status:'ACTIVE', config:'J36 Y247',   hub:'DOH', photos:678, firstFlight:'2019-03-11', engines:'2× Rolls-Royce Trent XWB-84' },
      { reg:'A7-BAH', type:'Boeing 787-8',     typeShort:'B788', manufacturer:'Boeing', family:'787 Dreamliner', msn:'40296', age:10.4, status:'ACTIVE', config:'J22 Y232',   hub:'DOH', photos:234, firstFlight:'2014-09-05', engines:'2× GEnx-1B64' },
      { reg:'A7-AMA', type:'Airbus A380-861',  typeShort:'A388', manufacturer:'Airbus', family:'A380',           msn:'148',   age:13.2, status:'STORED', config:'F8 J48 Y371',hub:'DOH', photos:543, firstFlight:'2011-08-14', engines:'4× Engine Alliance GP7270' },
      { reg:'A7-BFF', type:'Boeing 777-300ER', typeShort:'B77W', manufacturer:'Boeing', family:'777',            msn:'43703', age:7.1,  status:'ACTIVE', config:'J42 Y304',   hub:'DOH', photos:189, firstFlight:'2017-05-22', engines:'2× GE90-115B' },
    ],
  },
  {
    name: 'Uzbekistan Airways', iata: 'HY', icao: 'UZB',
    country: 'Uzbekistan', countryFlag: '🇺🇿', hub: 'Tashkent (TAS)',
    founded: '1992', alliance: 'None', totalFleet: 35, avgAge: 11.4, orders: 12,
    fleet: [
      { reg:'UK32101', type:'Airbus A320-214',  typeShort:'A320', manufacturer:'Airbus', family:'A320', msn:'5124',  age:10.2, status:'ACTIVE', config:'C8 Y150',  hub:'TAS', photos:234, firstFlight:'2014-03-12', engines:'2× CFM56-5B4' },
      { reg:'UK67004', type:'Boeing 767-300ER', typeShort:'B763', manufacturer:'Boeing', family:'767',  msn:'27982', age:24.1, status:'ACTIVE', config:'C30 Y188', hub:'TAS', photos:156, firstFlight:'2001-01-15', engines:'2× PW4060' },
      { reg:'UK75701', type:'Boeing 757-200',   typeShort:'B752', manufacturer:'Boeing', family:'757',  msn:'27153', age:28.4, status:'STORED', config:'C12 Y180', hub:'TAS', photos:89,  firstFlight:'1996-08-20', engines:'2× RB211-535E4B' },
      { reg:'UK78701', type:'Airbus A321-231',  typeShort:'A321', manufacturer:'Airbus', family:'A320', msn:'8341',  age:3.1,  status:'ACTIVE', config:'C8 Y165',  hub:'TAS', photos:312, firstFlight:'2022-02-14', engines:'2× CFM56-5B3' },
      { reg:'UK91201', type:'Airbus A330-243',  typeShort:'A332', manufacturer:'Airbus', family:'A330', msn:'1456',  age:7.8,  status:'ACTIVE', config:'C24 Y248', hub:'TAS', photos:445, firstFlight:'2017-05-08', engines:'2× CF6-80E1A4B' },
    ],
  },
  {
    name: 'Lufthansa', iata: 'LH', icao: 'DLH',
    country: 'Germany', countryFlag: '🇩🇪', hub: 'Frankfurt (FRA)',
    founded: '1953', alliance: 'Star Alliance', totalFleet: 287, avgAge: 11.2, orders: 95,
    fleet: [
      { reg:'D-ABYA', type:'Boeing 747-8',      typeShort:'B748', manufacturer:'Boeing', family:'747',    msn:'37829', age:11.3, status:'ACTIVE', config:'F8 C98 W24 Y220',  hub:'FRA', photos:567, firstFlight:'2013-04-11', engines:'4× GEnx-2B67' },
      { reg:'D-AIMA', type:'Airbus A380-841',   typeShort:'A388', manufacturer:'Airbus', family:'A380',   msn:'091',   age:15.1, status:'ACTIVE', config:'F8 C98 W52 Y371',  hub:'FRA', photos:789, firstFlight:'2009-12-11', engines:'4× Engine Alliance GP7270' },
      { reg:'D-AIXI', type:'Airbus A350-941',   typeShort:'A359', manufacturer:'Airbus', family:'A350',   msn:'302',   age:6.4,  status:'ACTIVE', config:'C48 P24 Y199',     hub:'MUC', photos:345, firstFlight:'2018-10-05', engines:'2× Rolls-Royce Trent XWB-84' },
      { reg:'D-AIZZ', type:'Airbus A320neo',    typeShort:'A20N', manufacturer:'Airbus', family:'A320neo',msn:'8234',  age:2.3,  status:'ACTIVE', config:'C8 Y156',          hub:'FRA', photos:112, firstFlight:'2022-09-14', engines:'2× LEAP-1A26' },
    ],
  },
  {
    name: 'Singapore Airlines', iata: 'SQ', icao: 'SIA',
    country: 'Singapore', countryFlag: '🇸🇬', hub: 'Singapore (SIN)',
    founded: '1947', alliance: 'Star Alliance', totalFleet: 132, avgAge: 7.4, orders: 101,
    fleet: [
      { reg:'9V-SKA', type:'Airbus A380-841',  typeShort:'A388', manufacturer:'Airbus', family:'A380', msn:'018',   age:17.2, status:'ACTIVE', config:'F12 C60 W36 Y333', hub:'SIN', photos:1024, firstFlight:'2007-10-25', engines:'4× Rolls-Royce Trent 970' },
      { reg:'9V-SCC', type:'Airbus A350-941',  typeShort:'A359', manufacturer:'Airbus', family:'A350', msn:'356',   age:5.8,  status:'ACTIVE', config:'J40 Y187',          hub:'SIN', photos:567,  firstFlight:'2019-04-11', engines:'2× Rolls-Royce Trent XWB-84' },
      { reg:'9V-SWA', type:'Boeing 777-200ER', typeShort:'B772', manufacturer:'Boeing', family:'777',  msn:'27574', age:25.1, status:'STORED', config:'C50 Y218',          hub:'SIN', photos:234,  firstFlight:'1999-02-14', engines:'2× Rolls-Royce Trent 884' },
    ],
  },
  {
    name: 'United Airlines', iata: 'UA', icao: 'UAL',
    country: 'United States', countryFlag: '🇺🇸', hub: 'Chicago–O\'Hare (ORD) / Denver (DEN)',
    founded: '1926', alliance: 'Star Alliance', totalFleet: 950, avgAge: 14.2, orders: 440,
    fleet: [],
  },
  {
    name: 'Hainan Airlines', iata: 'HU', icao: 'CHH',
    country: 'China', countryFlag: '🇨🇳', hub: 'Haikou (HAK) / Beijing–Capital (PEK)',
    founded: '1993', alliance: 'None', totalFleet: 210, avgAge: 8.6, orders: 45,
    fleet: [],
  },
];

// ── Merge approved DB photos into demo fleet (same UI, live photo counts) ──
type FleetAircraftEmbed = {
  registration: string;
  msn: string | null;
  first_flight: string | null;
  seat_config: string | null;
  engines: string | null;
  year_built: number | null;
  status: string | null;
  home_hub_iata: string | null;
  aircraft_types: { name: string; icao_code: string; manufacturer: string } | null;
};

type FleetPhotoRow = {
  notes: string | null;
  livery_notes: string | null;
  aircraft: FleetAircraftEmbed | FleetAircraftEmbed[] | null;
  operator: { iata: string | null; icao: string | null; name: string; country_code: string | null; hub_iata: string | null } | null;
};

/** When photos.operator_id is null, recover operator from free text (upload notes / livery). */
function pickStr(prev: string | null | undefined, next: string | null | undefined): string | null {
  const t = (x: string | null | undefined) => (x != null && String(x).trim() !== '' ? String(x).trim() : null);
  return t(next) || t(prev) || null;
}

function pickFlight(prev: string | null | undefined, next: string | null | undefined): string | null {
  const t = (x: string | null | undefined) => {
    if (x == null) return null;
    const s = String(x).trim().slice(0, 10);
    return s || null;
  };
  return t(next) || t(prev) || null;
}

function pickYear(prev: number | null | undefined, next: number | null | undefined): number | null {
  if (next != null && next > 1900) return next;
  if (prev != null && prev > 1900) return prev;
  return null;
}

function mapDbStatusToFleet(s: string | null | undefined): Status | null {
  if (!s) return null;
  const u = String(s).toUpperCase();
  if (u === 'ACTIVE' || u === 'STORED' || u === 'SCRAPPED') return u;
  if (u === 'WFU') return 'SCRAPPED';
  if (u === 'PRESERVED') return 'STORED';
  return 'ACTIVE';
}

function computeFleetAge(yearBuilt: number | null | undefined, firstFlight: string | null | undefined): number {
  const y = new Date().getFullYear();
  if (yearBuilt != null && yearBuilt >= 1900 && yearBuilt <= y + 1) {
    return Math.round((y - yearBuilt) * 10) / 10;
  }
  if (firstFlight && firstFlight.length >= 4) {
    const fy = parseInt(firstFlight.slice(0, 4), 10);
    if (!Number.isNaN(fy) && fy >= 1900 && fy <= y + 1) return Math.round((y - fy) * 10) / 10;
  }
  return 0;
}

function inferOperatorFromRow(row: FleetPhotoRow): {
  iata: string | null;
  icao: string | null;
  airlineName: string | null;
  countryCode: string | null;
} {
  const op = asSingular(row.operator);
  let iata = op?.iata?.trim().replace(/\0/g, '') || null;
  let icao = op?.icao?.trim().replace(/\0/g, '') || null;
  let airlineName = op?.name?.trim() || null;
  let countryCode = op?.country_code?.trim() || null;
  if (!icao && !iata && airlineName) {
    const hit = searchAirlines(airlineName, 1)[0];
    if (hit) {
      if (hit.iata?.trim()) iata = hit.iata.trim();
      if (hit.icao) icao = hit.icao;
      airlineName = hit.name;
    }
  }
  if (!icao && !iata) {
    const guess = inferCatalogAirlineFromPhotoText(row.notes, row.livery_notes);
    if (guess) {
      iata = guess.iata?.trim() || null;
      icao = guess.icao || null;
      airlineName = guess.name;
    }
  }
  return {
    iata: normFleetIata(iata),
    icao: normFleetIcao(icao),
    airlineName,
    countryCode,
  };
}

function inferCatalogAirlineFromPhotoText(
  notes: string | null | undefined,
  livery: string | null | undefined,
): CatalogAirline | null {
  const blob = `${notes || ''} ${livery || ''}`.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!blob) return null;

  const sorted = [...AIRLINES].sort((a, b) => b.name.length - a.name.length);
  for (const al of sorted) {
    const nm = al.name.toLowerCase();
    if (nm.length < 4) continue;
    if (blob.includes(nm)) return al;
  }
  for (const al of sorted) {
    const first = al.name.toLowerCase().split(/\s+/)[0];
    if (first.length < 4) continue;
    if (blob.includes(first)) return al;
  }
  const tokens = blob.split(/[^a-z0-9]+/i).filter(t => t.length >= 2);
  const tok = new Set(tokens.map(t => t.toLowerCase()));
  for (const al of AIRLINES) {
    if (al.iata && tok.has(al.iata.toLowerCase())) return al;
    if (al.icao && tok.has(al.icao.toLowerCase())) return al;
  }
  return null;
}

function inferCatalogTypeFromPhotoText(
  notes: string | null | undefined,
  livery: string | null | undefined,
): CatalogAircraftType | null {
  const blob = `${notes || ''} ${livery || ''}`.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!blob) return null;
  const compact = blob.replace(/[^a-z0-9]+/g, ' ');
  const hits = searchAircraftTypes(compact, 8);
  if (!hits.length) return null;
  // Prefer longest explicit match in free text to avoid short ambiguous hits.
  const sorted = [...hits].sort((a, b) => b.name.length - a.name.length);
  for (const h of sorted) {
    const nm = h.name.toLowerCase();
    if (blob.includes(nm)) return h;
  }
  return sorted[0] ?? null;
}

function normReg(reg: string): string {
  return reg.toUpperCase().trim().replace(/\s+/g, '');
}

/** DB CHAR(n) / user input — trim, upper, strip nulls so UZB matches demo "UZB". */
function normFleetIata(s: string | null | undefined): string | null {
  const t = (s ?? '').trim().replace(/\0/g, '').toUpperCase();
  return t.length ? t : null;
}

function normFleetIcao(s: string | null | undefined): string | null {
  const t = (s ?? '').trim().replace(/\0/g, '').toUpperCase();
  return t.length ? t : null;
}

/** PostgREST sometimes embeds many-to-one FKs as a one-element array — normalize to a single object. */
function asSingular<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] ?? null) : x;
}

function normDisplayName(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFKC');
}

function normAirlineName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Stable 3-letter ICAO-like key for operators missing ICAO in DB (avoid colliding with ZZZ = Other uploads). */
function syntheticIcaoFromName(name: string): string {
  const s = normAirlineName(name);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'Z' + chars[Math.abs(h) % chars.length] + chars[Math.abs(h >> 7) % chars.length];
  if (out === 'ZZZ') out = 'ZZY';
  return out;
}

function inferFamily(typeName: string, manufacturer: string): string {
  const n = typeName.toLowerCase();
  if (n.includes('787')) return '787 Dreamliner';
  if (n.includes('777')) return '777';
  if (n.includes('737 max')) return '737 MAX';
  if (n.includes('737')) return '737';
  if (n.includes('767')) return '767';
  if (n.includes('757')) return '757';
  if (n.includes('747')) return '747';
  if (n.includes('a380')) return 'A380';
  if (n.includes('a350')) return 'A350';
  if (n.includes('a330')) return 'A330';
  if (n.includes('a321')) return 'A320';
  if (n.includes('a320')) return 'A320';
  if (n.includes('a319')) return 'A320';
  return typeName || manufacturer || 'Other';
}

type RegMeta = {
  iata: string | null;
  icao: string | null;
  airlineName: string | null;
  countryCode: string | null;
  typeName: string;
  icaoType: string;
  manufacturer: string;
  msn: string | null;
  firstFlight: string | null;
  seatConfig: string | null;
  engines: string | null;
  yearBuilt: number | null;
  dbStatus: Status | null;
  homeHubIata: string | null;
  airlineHubIata: string | null;
};

function buildSyntheticAircraft(reg: string, count: number, meta: RegMeta): Aircraft {
  const mfr = meta.manufacturer || 'Unknown';
  const typeName = meta.typeName || 'Unknown type';
  const age = computeFleetAge(meta.yearBuilt, meta.firstFlight);
  const msn = meta.msn?.trim() || null;
  const cfg = meta.seatConfig?.trim() || null;
  const ff = meta.firstFlight ? String(meta.firstFlight).slice(0, 10) : null;
  const eng = meta.engines?.trim() || null;
  const hubRaw =
    (meta.homeHubIata && meta.homeHubIata.trim()) ||
    (meta.airlineHubIata && meta.airlineHubIata.trim()) ||
    null;
  return {
    reg,
    type: typeName,
    typeShort: meta.icaoType || '—',
    manufacturer: mfr,
    family: inferFamily(typeName, mfr),
    msn: msn || '—',
    age,
    status: meta.dbStatus ?? 'ACTIVE',
    config: cfg || '—',
    hub: hubRaw || '—',
    photos: count,
    firstFlight: ff || '—',
    engines: eng || '—',
  };
}

function mergeDbIntoStaticRow(staticRow: Aircraft, syn: Aircraft): Aircraft {
  return {
    ...staticRow,
    msn: syn.msn !== '—' ? syn.msn : staticRow.msn,
    age: syn.age !== 0 ? syn.age : staticRow.age,
    config: syn.config !== '—' ? syn.config : staticRow.config,
    firstFlight: syn.firstFlight !== '—' ? syn.firstFlight : staticRow.firstFlight,
    engines: syn.engines !== '—' ? syn.engines : staticRow.engines,
    hub: syn.hub !== '—' ? syn.hub : staticRow.hub,
    status: syn.status,
  };
}

function regMetaHasDbDetails(meta: RegMeta): boolean {
  return !!(
    (meta.msn && meta.msn.trim()) ||
    meta.firstFlight ||
    (meta.seatConfig && meta.seatConfig.trim()) ||
    (meta.engines && meta.engines.trim()) ||
    (meta.yearBuilt != null && meta.yearBuilt > 0) ||
    meta.dbStatus != null ||
    !!(meta.homeHubIata && meta.homeHubIata.trim()) ||
    !!(meta.airlineHubIata && meta.airlineHubIata.trim())
  );
}

function mergeDemoAirlinesWithPhotos(demo: Airline[], rows: FleetPhotoRow[]): Airline[] {
  const countByReg = new Map<string, number>();
  const metaByReg = new Map<string, RegMeta>();

  for (const row of rows) {
    const ac = asSingular(row.aircraft);
    if (!ac?.registration) continue;
    const reg = normReg(ac.registration);
    countByReg.set(reg, (countByReg.get(reg) || 0) + 1);
    const t = asSingular(ac.aircraft_types);
    const inferredType = inferCatalogTypeFromPhotoText(row.notes, row.livery_notes);
    const inferredIcao = inferredType ? guessIcaoCodeFromDisplayName(inferredType.name) : null;
    const opMeta = inferOperatorFromRow(row);
    const opRow = asSingular(row.operator);
    const prev = metaByReg.get(reg);
    const iata = prev?.iata || opMeta.iata || null;
    const icao = prev?.icao || opMeta.icao || null;
    const airlineName = prev?.airlineName || opMeta.airlineName || null;
    const countryCode = prev?.countryCode || opMeta.countryCode || null;
    const rowAirlineHub = normFleetIcao(opRow?.hub_iata) || null;
    metaByReg.set(reg, {
      iata,
      icao,
      airlineName,
      countryCode,
      typeName: t?.name ?? inferredType?.name ?? prev?.typeName ?? 'Unknown type',
      icaoType: t?.icao_code?.trim() || inferredIcao || prev?.icaoType || '—',
      manufacturer: t?.manufacturer ?? inferredType?.manufacturer ?? prev?.manufacturer ?? 'Unknown',
      msn: pickStr(prev?.msn, ac.msn),
      firstFlight: pickFlight(prev?.firstFlight, ac.first_flight),
      seatConfig: pickStr(prev?.seatConfig, ac.seat_config),
      engines: pickStr(prev?.engines, ac.engines),
      yearBuilt: pickYear(prev?.yearBuilt, ac.year_built),
      dbStatus: mapDbStatusToFleet(ac.status) ?? prev?.dbStatus ?? null,
      homeHubIata: pickStr(prev?.homeHubIata, ac.home_hub_iata),
      airlineHubIata: pickStr(prev?.airlineHubIata, rowAirlineHub),
    });
  }

  const staticIcaos = new Set(
    demo.map(a => normFleetIcao(a.icao)).filter((x): x is string => x != null),
  );

  const mergedDemo = demo.map(al => {
    const staticRegs = new Set(al.fleet.map(a => normReg(a.reg)));
    const mergedFleet = al.fleet.map(ac => {
      const r = normReg(ac.reg);
      const n = countByReg.get(r);
      if (n === undefined) return ac;
      const meta = metaByReg.get(r);
      if (!meta) return { ...ac, photos: n };
      const syn = buildSyntheticAircraft(r, n, meta);
      if (!regMetaHasDbDetails(meta)) return { ...ac, photos: n };
      return mergeDbIntoStaticRow({ ...ac, photos: n }, syn);
    });

    const extras: Aircraft[] = [];
    const demoIata = normFleetIata(al.iata) || '';
    const demoIcao = normFleetIcao(al.icao) || '';
    const demoNameNorm = normDisplayName(al.name);
    for (const [reg, n] of countByReg) {
      if (staticRegs.has(reg)) continue;
      const meta = metaByReg.get(reg);
      if (!meta) continue;
      const matchIata = !!meta.iata && !!demoIata && meta.iata === demoIata;
      const matchIcao = !!meta.icao && !!demoIcao && meta.icao === demoIcao;
      const matchName =
        !!demoNameNorm &&
        !!meta.airlineName &&
        normDisplayName(meta.airlineName) === demoNameNorm;
      if (!matchIata && !matchIcao && !matchName) continue;
      extras.push(buildSyntheticAircraft(reg, n, meta));
    }

    return { ...al, fleet: [...mergedFleet, ...extras] };
  });

  const coveredAfterDemo = new Set<string>();
  mergedDemo.forEach(al => al.fleet.forEach(a => coveredAfterDemo.add(normReg(a.reg))));

  const dynamicByIcao = new Map<string, { meta: RegMeta; regs: Map<string, number> }>();
  const dynamicByName = new Map<string, { meta: RegMeta; regs: Map<string, number> }>();
  for (const [reg, n] of countByReg) {
    if (coveredAfterDemo.has(reg)) continue;
    const meta = metaByReg.get(reg);
    if (!meta) continue;
    const metaIcao = meta.icao;
    if (metaIcao && !staticIcaos.has(metaIcao)) {
      if (!dynamicByIcao.has(metaIcao)) {
        dynamicByIcao.set(metaIcao, { meta, regs: new Map() });
      }
      dynamicByIcao.get(metaIcao)!.regs.set(reg, n);
    } else if (!metaIcao && meta.airlineName) {
      const nk = normAirlineName(meta.airlineName);
      if (!dynamicByName.has(nk)) {
        dynamicByName.set(nk, { meta, regs: new Map() });
      }
      dynamicByName.get(nk)!.regs.set(reg, n);
    }
  }

  const dynamicAirlines: Airline[] = [];
  for (const [icao, { meta, regs }] of dynamicByIcao) {
    const fleet: Aircraft[] = [];
    for (const [reg, n] of regs) {
      const m = metaByReg.get(reg)!;
      fleet.push(buildSyntheticAircraft(reg, n, m));
    }
    fleet.sort((a, b) => a.reg.localeCompare(b.reg));
    dynamicAirlines.push({
      name: meta.airlineName || `Airline ${meta.iata || icao}`,
      iata: meta.iata || '—',
      icao,
      country: meta.countryCode || '—',
      countryFlag: '🌍',
      hub: '—',
      founded: '—',
      alliance: 'None',
      totalFleet: fleet.length,
      avgAge: 0,
      orders: 0,
      fleet,
    });
  }
  for (const [, { meta, regs }] of dynamicByName) {
    const fleet: Aircraft[] = [];
    for (const [reg, n] of regs) {
      const m = metaByReg.get(reg)!;
      fleet.push(buildSyntheticAircraft(reg, n, m));
    }
    fleet.sort((a, b) => a.reg.localeCompare(b.reg));
    const icao = syntheticIcaoFromName(meta.airlineName || '');
    dynamicAirlines.push({
      name: meta.airlineName || 'Unknown airline',
      iata: meta.iata || '—',
      icao,
      country: meta.countryCode || '—',
      countryFlag: '🌍',
      hub: '—',
      founded: '—',
      alliance: 'None',
      totalFleet: fleet.length,
      avgAge: 0,
      orders: 0,
      fleet,
    });
  }
  dynamicAirlines.sort((a, b) => a.name.localeCompare(b.name));

  const coveredAll = new Set(coveredAfterDemo);
  [...dynamicByIcao.values(), ...dynamicByName.values()].forEach(({ regs }) => {
    for (const reg of regs.keys()) coveredAll.add(reg);
  });

  const orphanFleet: Aircraft[] = [];
  for (const [reg, n] of countByReg) {
    if (coveredAll.has(reg)) continue;
    const meta = metaByReg.get(reg);
    if (!meta) continue;
    orphanFleet.push(buildSyntheticAircraft(reg, n, meta));
  }
  orphanFleet.sort((a, b) => a.reg.localeCompare(b.reg));

  if (orphanFleet.length > 0) {
    dynamicAirlines.push({
      name: 'Other uploads',
      iata: '•',
      icao: 'ZZZ',
      country: '—',
      countryFlag: '📷',
      hub: '—',
      founded: '—',
      alliance: 'None',
      totalFleet: orphanFleet.length,
      avgAge: 0,
      orders: 0,
      fleet: orphanFleet,
    });
  }

  return [...mergedDemo, ...dynamicAirlines];
}

// ── Small components ─────────────────────────────────────
const STATUS_CFG = {
  ACTIVE:  { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Active'   },
  STORED:  { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: 'Stored'   },
  SCRAPPED:{ bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Scrapped' },
};

const StatusBadge = ({ status }: { status: Status }) => {
  const c = STATUS_CFG[status];
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: 20, whiteSpace: 'nowrap' as const }}>
      {c.label}
    </span>
  );
};

const AgeBar = ({ age }: { age: number }) => {
  const pct   = Math.min((age / 30) * 100, 100);
  const color = age > 20 ? '#dc2626' : age > 12 ? '#d97706' : '#16a34a';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 36, height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, color: '#64748b', minWidth: 24 }}>{age}y</span>
    </div>
  );
};

// ── Table header + row ────────────────────────────────────
const COLS = '88px 1fr 66px 80px 88px 80px 50px 22px';

const THead = () => (
  <div style={{
    display: 'grid', gridTemplateColumns: COLS,
    height: 28, padding: '0 12px', alignItems: 'center',
    background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
  }}>
    {['REG','AIRCRAFT TYPE','MSN','AGE','CONFIG','STATUS','PHOTOS',''].map((h, i) => (
      <div key={i} style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8',
        letterSpacing: '0.07em', textTransform: 'uppercase', paddingRight: 8 }}>
        {h}
      </div>
    ))}
  </div>
);

const TRow = ({ a, last, expanded, onToggle, onDetail }: {
  a: Aircraft; last: boolean; expanded: boolean;
  onToggle: () => void; onDetail: (reg: string) => void;
}) => (
  <>
    <div
      onClick={onToggle}
      style={{
        display: 'grid', gridTemplateColumns: COLS,
        height: 34, padding: '0 12px', alignItems: 'center', cursor: 'pointer',
        borderBottom: last && !expanded ? 'none' : '1px solid #f8fafc',
        background: expanded ? '#f0f9ff' : '#fff',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!expanded) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = expanded ? '#f0f9ff' : '#fff'; }}
    >
      <div style={{ fontFamily: '"B612 Mono",monospace', fontSize: 12, fontWeight: 600, color: '#0ea5e9', paddingRight: 8 }}>{a.reg}</div>
      <div style={{ fontSize: 12, color: '#0f172a', paddingRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.type}</div>
      <div style={{ fontFamily: '"B612 Mono",monospace', fontSize: 11, color: '#64748b', paddingRight: 8 }}>{a.msn}</div>
      <div style={{ paddingRight: 8 }}><AgeBar age={a.age} /></div>
      <div style={{ fontFamily: '"B612 Mono",monospace', fontSize: 10, color: '#64748b', paddingRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.config}</div>
      <div style={{ paddingRight: 8 }}><StatusBadge status={a.status} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#94a3b8', fontFamily: '"B612 Mono",monospace' }}>
        <Camera style={{ width: 11, height: 11 }} />{a.photos}
      </div>
      <ChevronDown style={{ width: 14, height: 14, color: '#cbd5e1', justifySelf: 'center',
        transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
    </div>

    <AnimatePresence>
      {expanded && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
          style={{ overflow: 'hidden', borderBottom: last ? 'none' : '1px solid #e8e8ed', background: '#f8fafc' }}>
          <div style={{ padding: '10px 12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px 20px', marginBottom: 10 }}>
              {[
                { l: 'First Flight', v: a.firstFlight },
                { l: 'Engines',     v: a.engines },
                { l: 'Config',      v: a.config },
                { l: 'Hub',         v: a.hub },
                { l: 'ICAO code',   v: a.typeShort },
              ].map(f => (
                <div key={f.l}>
                  <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>{f.l}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>{f.v}</div>
                </div>
              ))}
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); onDetail(a.reg); }} style={{ display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600, color: '#0ea5e9', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <Eye style={{ width: 12, height: 12 }} /> View full record
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
);

// ── Grid card ─────────────────────────────────────────────
const AcCard = ({ a, onDetail }: { a: Aircraft; onDetail: (reg: string) => void }) => (
  <div onClick={() => onDetail(a.reg)} style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10,
    padding: 14, cursor: 'pointer', transition: 'border-color 0.15s' }}
    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'}
    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#f1f5f9'}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
      <div style={{ fontFamily: '"B612 Mono",monospace', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{a.reg}</div>
      <StatusBadge status={a.status} />
    </div>
    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>{a.type}</div>
    <AgeBar age={a.age} />
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10,
      paddingTop: 8, borderTop: '1px solid #f8fafc' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#94a3b8' }}>
        <Camera style={{ width: 11, height: 11 }} />{a.photos}
      </div>
      <ChevronRight style={{ width: 13, height: 13, color: '#e2e8f0' }} />
    </div>
  </div>
);

// ── Main ─────────────────────────────────────────────────
export const FleetPage = ({ onAircraftClick }: { onAircraftClick: (registration: string) => void }) => {
  const [airline,   setAirline]   = useState<Airline | null>(null);
  const [mfr,       setMfr]       = useState('All');
  const [family,    setFamily]    = useState('All');
  const [status,    setStatus]    = useState<'ALL' | Status>('ALL');
  const [search,    setSearch]    = useState('');
  const [view,      setView]      = useState<'table' | 'grid'>('table');
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [photoRows, setPhotoRows] = useState<FleetPhotoRow[]>([]);
  const [fleetLoad, setFleetLoad] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const airlines = useMemo(() => mergeDemoAirlinesWithPhotos(DEMO_AIRLINES, photoRows), [photoRows]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFleetLoad('loading');
      const { data, error } = await supabase
        .from('photos')
        .select(`
          notes,
          livery_notes,
          aircraft (
            registration,
            msn,
            first_flight,
            seat_config,
            engines,
            year_built,
            status,
            home_hub_iata,
            aircraft_types ( name, icao_code, manufacturer )
          ),
          operator:airlines ( iata, icao, name, country_code, hub_iata )
        `)
        .eq('status', 'APPROVED')
        .order('created_at', { ascending: false })
        .limit(8000);
      if (cancelled) return;
      if (error) {
        console.error('Fleet photo aggregate:', error);
        setFleetLoad('error');
        return;
      }
      setPhotoRows((data ?? []) as FleetPhotoRow[]);
      setFleetLoad('done');
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setAirline(prev => {
      if (!prev) return prev;
      const next = airlines.find(a => a.icao === prev.icao && a.name === prev.name);
      return next ?? prev;
    });
  }, [airlines]);

  // ── derived (all useMemo before any conditional return) ──
  const mfrs = useMemo(() =>
    !airline ? [] : ['All', ...Array.from(new Set(airline.fleet.map(a => a.manufacturer)))],
  [airline]);

  const families = useMemo(() => {
    if (!airline) return [];
    const pool = mfr === 'All' ? airline.fleet : airline.fleet.filter(a => a.manufacturer === mfr);
    return ['All', ...Array.from(new Set(pool.map(a => a.family)))];
  }, [airline, mfr]);

  const filtered = useMemo(() => {
    if (!airline) return [];
    let d = [...airline.fleet];
    if (mfr    !== 'All') d = d.filter(a => a.manufacturer === mfr);
    if (family !== 'All') d = d.filter(a => a.family === family);
    if (status !== 'ALL') d = d.filter(a => a.status === status);
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(a => a.reg.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.msn.includes(q));
    }
    return d;
  }, [airline, mfr, family, status, search]);

  const grouped = useMemo(() => {
    const map: Record<string, Record<string, Aircraft[]>> = {};
    filtered.forEach(a => {
      if (!map[a.manufacturer]) map[a.manufacturer] = {};
      if (!map[a.manufacturer][a.family]) map[a.manufacturer][a.family] = [];
      map[a.manufacturer][a.family].push(a);
    });
    return map;
  }, [filtered]);

  const isGrouped = mfr === 'All' && family === 'All' && !search;

  const handleBack = () => {
    setAirline(null); setMfr('All'); setFamily('All');
    setStatus('ALL'); setSearch(''); setExpanded(null);
  };

  // ── VIEW 1: Airline picker ──────────────────────────────
  if (!airline) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'transparent', minHeight: '100vh' }} className="relative z-10">
        <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div className="site-w py-10">
            <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Fleet Database</div>
            <h1 className="font-headline" style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 4 }}>Airlines</h1>
            <p style={{ fontSize: 13, color: '#64748b' }}>Select an airline to browse its fleet grouped by manufacturer and aircraft family.</p>
            <p className="mt-2 text-xs px-3 py-1.5 rounded-lg inline-block" style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>
              Demo airline profiles; <strong>Photos</strong> column uses <strong>approved</strong> uploads from the database (pending moderation only appear after approval).
              {fleetLoad === 'loading' && ' Loading counts…'}
              {fleetLoad === 'error' && ' Could not load live counts — showing demo numbers only.'}
            </p>
          </div>
        </div>

        <div className="site-w py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {airlines.map((al, i) => {
              const mfrCounts: Record<string, number> = {};
              al.fleet.forEach(a => { mfrCounts[a.manufacturer] = (mfrCounts[a.manufacturer] || 0) + 1; });
              const active = al.fleet.filter(a => a.status === 'ACTIVE').length;
              return (
                <motion.div key={`${al.icao}-${al.name}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }} onClick={() => setAirline(al)}
                  style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20,
                    cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#0ea5e9'; el.style.boxShadow = '0 4px 20px rgba(14,165,233,0.1)'; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#e2e8f0'; el.style.boxShadow = ''; }}>

                  {/* Logo + name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 56, height: 56, background: '#f8fafc', border: '1px solid #f1f5f9',
                      borderRadius: 12, padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <AirlineLogo iata={al.iata} name={al.name} size={44} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', letterSpacing: '-0.01em',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{al.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0ea5e9', fontFamily: '"B612 Mono",monospace' }}>{al.iata}</span>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>· {al.countryFlag} {al.country}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', background: '#f8fafc', border: '1px solid #f1f5f9',
                    borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
                    {[{ l: 'Aircraft rows', v: al.fleet.length }, { l: 'Active', v: active }, { l: 'Avg age', v: `${al.avgAge}y` }]
                      .map((s, idx, arr) => (
                        <div key={s.l} style={{ flex: 1, textAlign: 'center', padding: '8px 4px',
                          borderRight: idx < arr.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{s.v}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>{s.l}</div>
                        </div>
                      ))}
                  </div>

                  {/* Mfr pills */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {Object.entries(mfrCounts).map(([m, n]) => (
                        <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', background: '#f1f5f9', borderRadius: 20 }}>
                          <MfrBadge name={m} size={14} />
                          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{m.slice(0,3)}</span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>{n}</span>
                        </div>
                      ))}
                    </div>
                    <ChevronRight style={{ width: 16, height: 16, color: '#cbd5e1' }} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    );
  }

  // ── VIEW 2: Fleet detail ──────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'transparent', minHeight: '100vh' }} className="relative z-10">

      {/* Header */}
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div className="site-w py-6">
          <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, marginBottom: 16 }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#0f172a'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#64748b'}>
            <ArrowLeft style={{ width: 15, height: 15 }} /> Back to Airlines
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            {/* Logo + info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 68, height: 68, background: '#fff', border: '1px solid #e2e8f0',
                borderRadius: 16, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flexShrink: 0 }}>
                <AirlineLogo iata={airline.iata} name={airline.name} size={48} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                  <h1 className="font-headline" style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
                    {airline.name}
                  </h1>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', background: '#f1f5f9',
                    color: '#64748b', borderRadius: 20, fontFamily: '"B612 Mono",monospace' }}>
                    {airline.icao} · {airline.iata}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 13, color: '#64748b' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Globe2 style={{ width: 13, height: 13 }} />{airline.countryFlag} {airline.country}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Plane style={{ width: 13, height: 13 }} />{airline.hub}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock style={{ width: 13, height: 13 }} />Est. {airline.founded}</span>
                  {airline.alliance !== 'None' && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Building2 style={{ width: 13, height: 13 }} />{airline.alliance}</span>}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', marginLeft: 'auto', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
              {[{ l: 'Total Fleet', v: airline.totalFleet, s: 'ac' }, { l: 'Avg Age', v: `${airline.avgAge}y`, s: '' }, { l: 'On Order', v: airline.orders, s: 'ac' }]
                .map((s, i, arr) => (
                  <div key={s.l} style={{ padding: '10px 22px', textAlign: 'center',
                    borderRight: i < arr.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', fontFamily: '"B612 Mono",monospace' }}>
                      {s.v}<span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 3 }}>{s.s}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 52, zIndex: 40 }}>
        <div className="site-w py-2.5" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Row 1: search + count + view toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative', minWidth: 180, flex: 1, maxWidth: 260 }}>
              <Search style={{ width: 13, height: 13, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Reg, type, MSN…"
                style={{ paddingLeft: 30, height: 32, fontSize: 12, width: '100%', borderRadius: 8,
                  border: '1px solid #e2e8f0', outline: 'none', color: '#0f172a' }} />
              {search && <X onClick={() => setSearch('')} style={{ width: 13, height: 13, position: 'absolute',
                right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer' }} />}
            </div>
            <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: '"B612 Mono",monospace', marginLeft: 'auto' }}>
              {filtered.length} aircraft
            </span>
            <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              {(['table', 'grid'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  style={{ padding: '5px 8px', background: view === v ? '#f8fafc' : '#fff',
                    color: view === v ? '#0f172a' : '#94a3b8', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  {v === 'table' ? <List style={{ width: 13, height: 13 }} /> : <LayoutGrid style={{ width: 13, height: 13 }} />}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {/* Maker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Maker</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {mfrs.map(m => (
                  <button key={m} onClick={() => { setMfr(m); setFamily('All'); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px',
                      fontSize: 11, fontWeight: mfr === m ? 600 : 400, borderRadius: 6, cursor: 'pointer',
                      background: mfr === m ? '#0f172a' : '#f8fafc', color: mfr === m ? '#fff' : '#475569',
                      border: `1px solid ${mfr === m ? '#0f172a' : '#e2e8f0'}` }}>
                    {m !== 'All' && <MfrBadge name={m} size={14} />}
                    {m}
                  </button>
                ))}
              </div>
            </div>
            {/* Family */}
            {families.length > 2 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Family</span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {families.map(f => (
                    <button key={f} onClick={() => setFamily(f)}
                      style={{ padding: '3px 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                        background: family === f ? '#0ea5e9' : '#f8fafc',
                        color: family === f ? '#fff' : '#475569',
                        border: `1px solid ${family === f ? '#0ea5e9' : '#e2e8f0'}` }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Status</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['ALL', 'ACTIVE', 'STORED', 'SCRAPPED'] as const).map(s => (
                  <button key={s} onClick={() => setStatus(s)}
                    style={{ padding: '3px 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                      background: status === s ? '#0f172a' : '#f8fafc',
                      color: status === s ? '#fff' : '#475569',
                      border: `1px solid ${status === s ? '#0f172a' : '#e2e8f0'}` }}>
                    {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="site-w py-6">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
            <Plane style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.2 }} />
            <div style={{ fontSize: 14 }}>No aircraft found</div>
            <button onClick={() => { setSearch(''); setMfr('All'); setFamily('All'); setStatus('ALL'); }}
              style={{ marginTop: 10, fontSize: 12, color: '#0ea5e9', background: 'none', border: 'none', cursor: 'pointer' }}>
              Clear filters
            </button>
          </div>
        ) : isGrouped ? (
          // Grouped by Mfr → Family
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {Object.entries(grouped).map(([mfrKey, fams]) => (
              <div key={mfrKey}>
                {/* Mfr header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <MfrBadge name={mfrKey} size={34} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{mfrKey}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {Object.values(fams).flat().length} aircraft · {Object.keys(fams).length} {Object.keys(fams).length === 1 ? 'family' : 'families'}
                    </div>
                  </div>
                  <div style={{ flex: 1, height: 1, background: '#e2e8f0', marginLeft: 6 }} />
                </div>

                {/* Families */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginLeft: 46 }}>
                  {Object.entries(fams).map(([fam, acs]) => (
                    <div key={fam}>
                      {/* Family label */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{fam}</span>
                        <span style={{ fontSize: 10, padding: '1px 7px', background: '#f1f5f9',
                          color: '#64748b', borderRadius: 20 }}>{acs.length} ac</span>
                        <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
                      </div>

                      {/* Table or Grid */}
                      {view === 'grid' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                          {acs.map(a => <AcCard key={a.reg} a={a} onDetail={onAircraftClick} />)}
                        </div>
                      ) : (
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                          <THead />
                          {acs.map((a, idx) => (
                            <TRow key={a.reg} a={a} last={idx === acs.length - 1}
                              expanded={expanded === a.reg}
                              onToggle={() => setExpanded(expanded === a.reg ? null : a.reg)}
                              onDetail={onAircraftClick} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Flat filtered list
          view === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
              {filtered.map(a => <AcCard key={a.reg} a={a} onDetail={onAircraftClick} />)}
            </div>
          ) : (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
              <THead />
              {filtered.map((a, idx) => (
                <TRow key={a.reg} a={a} last={idx === filtered.length - 1}
                  expanded={expanded === a.reg}
                  onToggle={() => setExpanded(expanded === a.reg ? null : a.reg)}
                  onDetail={onAircraftClick} />
              ))}
            </div>
          )
        )}
      </div>
    </motion.div>
  );
};
