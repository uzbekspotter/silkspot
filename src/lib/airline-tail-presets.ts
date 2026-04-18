/**
 * Visual tail presets for known airlines.
 *
 * Keyed by 2-letter IATA code.
 * Used by DreamlinerTailCard for branded gradient fills.
 * Fallback chain: preset → accentForAirline (hash) → neutral.
 */

export type TailGradient = {
  /** Top colour */
  from: string;
  /** Bottom colour */
  to: string;
};

export type TailPreset = {
  /** Primary brand colour (solid fill when gradient skipped). */
  color: string;
  /** Optional vertical gradient rendered as SVG linearGradient. */
  gradient?: TailGradient;
};

/** IATA → TailPreset.  Add entries as needed — no DB migration required. */
export const AIRLINE_TAIL_PRESETS: Record<string, TailPreset> = {
  // ── Middle East ──────────────────────────────────────────────────────────
  EK: { color: '#C0162C', gradient: { from: '#D71920', to: '#8B0000' } },   // Emirates
  QR: { color: '#5C0632', gradient: { from: '#6B0039', to: '#3A0020' } },   // Qatar Airways
  EY: { color: '#9B6F00', gradient: { from: '#BD8B13', to: '#6B4900' } },   // Etihad
  // ── Europe ───────────────────────────────────────────────────────────────
  LH: { color: '#05164D', gradient: { from: '#172B7E', to: '#05164D' } },   // Lufthansa
  BA: { color: '#075AAA', gradient: { from: '#1A6FC4', to: '#003976' } },   // British Airways
  AF: { color: '#002157', gradient: { from: '#003DA5', to: '#001240' } },   // Air France
  KL: { color: '#00A1DE', gradient: { from: '#00BEFF', to: '#0075A8' } },   // KLM
  LX: { color: '#B40A2D', gradient: { from: '#CC1535', to: '#7A0020' } },   // Swiss
  TK: { color: '#C0001A', gradient: { from: '#E81932', to: '#8B0012' } },   // Turkish Airlines
  OS: { color: '#C8102E', gradient: { from: '#E0182F', to: '#8B000B' } },   // Austrian
  AY: { color: '#003580', gradient: { from: '#0050CC', to: '#001A5E' } },   // Finnair
  SK: { color: '#003E87', gradient: { from: '#0055B8', to: '#002560' } },   // SAS
  IB: { color: '#C8102E', gradient: { from: '#E01530', to: '#900015' } },   // Iberia
  // ── North America ────────────────────────────────────────────────────────
  AA: { color: '#0078D2', gradient: { from: '#1890E0', to: '#003B6F' } },   // American Airlines
  UA: { color: '#003087', gradient: { from: '#0047CC', to: '#001A5E' } },   // United Airlines
  DL: { color: '#003366', gradient: { from: '#003F86', to: '#C0001A' } },   // Delta (split brand)
  AC: { color: '#CE0000', gradient: { from: '#FF1515', to: '#8B0000' } },   // Air Canada
  WS: { color: '#0B4EA2', gradient: { from: '#1460C4', to: '#072F6B' } },   // WestJet
  // ── Asia-Pacific ─────────────────────────────────────────────────────────
  SQ: { color: '#F0A500', gradient: { from: '#F5C842', to: '#C67C00' } },   // Singapore Airlines
  CX: { color: '#005959', gradient: { from: '#00706E', to: '#003333' } },   // Cathay Pacific
  NH: { color: '#003087', gradient: { from: '#0050B8', to: '#001A5E' } },   // ANA
  JL: { color: '#D50000', gradient: { from: '#F01515', to: '#8B0000' } },   // Japan Airlines
  KE: { color: '#003DA5', gradient: { from: '#0052CC', to: '#001A5E' } },   // Korean Air
  CI: { color: '#003087', gradient: { from: '#0050B8', to: '#880010' } },   // China Airlines
  MH: { color: '#C0001A', gradient: { from: '#E01530', to: '#003080' } },   // Malaysia Airlines
  // ── Central Asia / CIS ───────────────────────────────────────────────────
  HY: { color: '#1A7A4A', gradient: { from: '#23A362', to: '#0D5233' } },   // Uzbekistan Airways
  KC: { color: '#005CA9', gradient: { from: '#006BC4', to: '#003575' } },   // Air Astana
  // ── India / South Asia ───────────────────────────────────────────────────
  AI: { color: '#B40A2D', gradient: { from: '#CC1535', to: '#7A0020' } },   // Air India
  // ── Africa ───────────────────────────────────────────────────────────────
  ET: { color: '#0E4C96', gradient: { from: '#1560B8', to: '#082E5A' } },   // Ethiopian
  SA: { color: '#003087', gradient: { from: '#0050B8', to: '#001040' } },   // South African
};
