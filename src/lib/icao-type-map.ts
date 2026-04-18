/**
 * ICAO designator → canonical display name.
 *
 * SINGLE SOURCE OF TRUTH — imported by aircraft-lookup.ts (adsbdb/hexdb display)
 * and used by resolveAircraftTypeId (upload-helpers.ts step 3).
 *
 * Naming rules
 * ────────────
 * 1. Names MUST match aircraft_types.name in the DB (migrations 003, 012) so that
 *    resolveAircraftTypeId step 2 (exact ilike) hits without falling through to guessIcao.
 * 2. EXCEPTION — A388: DB has 'Airbus A380-800' (generic), but adsbdb returns
 *    'A388' for A380-841 variants. Using 'Airbus A380-841' keeps partial-match
 *    working for both '841' input (adsbdb) and '800' (catalog → falls to step 4 ilike).
 *    Changing to 'A380-800' would silently break '841' resolution.
 * 3. A318 has no DB row yet (add migration if needed). A318-100 stays for lookup display.
 * 4. To add a new type: add row here AND a DB migration INSERT into aircraft_types.
 */
export const ICAO_TYPE_MAP: Record<string, string> = {
  // ── Airbus A380 ────────────────────────────────────────────────────────────
  A388: 'Airbus A380-841',   // ⚠️ intentional: DB='A380-800'; see rule 2 above
  A389: 'Airbus A380-842',
  // ── Airbus A350 ────────────────────────────────────────────────────────────
  A35K: 'Airbus A350-1000',
  A359: 'Airbus A350-900',
  // ── Airbus A330 / A330neo / A340 ───────────────────────────────────────────
  A332: 'Airbus A330-200',
  A333: 'Airbus A330-300',
  A338: 'Airbus A330-800neo',
  A339: 'Airbus A330-900neo',
  A343: 'Airbus A340-300',
  A345: 'Airbus A340-500',
  A346: 'Airbus A340-600',
  // ── Airbus A220 (ex-Bombardier C Series) ───────────────────────────────────
  CS1:  'Airbus A220-100',
  CS3:  'Airbus A220-300',
  // ── Airbus A320 family (classic) ───────────────────────────────────────────
  A320: 'Airbus A320-200',
  A321: 'Airbus A321-200',
  A319: 'Airbus A319-100',
  A318: 'Airbus A318-100',
  // ── Airbus A320 family (neo) ────────────────────────────────────────────────
  A21N: 'Airbus A321neo',
  A20N: 'Airbus A320neo',
  A19N: 'Airbus A319neo',
  // ── Boeing 737 ─────────────────────────────────────────────────────────────
  B737: 'Boeing 737-700',
  B738: 'Boeing 737-800',
  B739: 'Boeing 737-900',
  B37M: 'Boeing 737 MAX 7',
  B38M: 'Boeing 737 MAX 8',
  B39M: 'Boeing 737 MAX 9',
  B3XM: 'Boeing 737 MAX 10',
  // ── Boeing 747 ─────────────────────────────────────────────────────────────
  B744: 'Boeing 747-400',
  B74F: 'Boeing 747-400F',        // 747-400 freighter (FedEx, UPS, Cargolux, Atlas Air)
  B748: 'Boeing 747-8F',          // 747-8 freighter
  B74I: 'Boeing 747-8',           // 747-8 Intercontinental (passenger)
  // ── Boeing 757 ─────────────────────────────────────────────────────────────
  B752: 'Boeing 757-200',
  // ── Boeing 767 ─────────────────────────────────────────────────────────────
  B762: 'Boeing 767-200',
  B763: 'Boeing 767-300ER',
  B764: 'Boeing 767-400ER',
  // ── Boeing 777 ─────────────────────────────────────────────────────────────
  B772: 'Boeing 777-200ER',
  B773: 'Boeing 777-300',
  B77L: 'Boeing 777-200LR',
  B77W: 'Boeing 777-300ER',
  B77F: 'Boeing 777F',            // 777 freighter (FedEx, Qatar Cargo, Lufthansa Cargo)
  B779: 'Boeing 777-9',           // 777X passenger (Emirates, Lufthansa)
  // ── Boeing 787 ─────────────────────────────────────────────────────────────
  B788: 'Boeing 787-8 Dreamliner',
  B789: 'Boeing 787-9 Dreamliner',
  B78X: 'Boeing 787-10',
  // ── Embraer E-Jet (E1) ─────────────────────────────────────────────────────
  E190: 'Embraer E190',
  E195: 'Embraer E195',
  E75L: 'Embraer E175',
  // ── Embraer E-Jet E2 ───────────────────────────────────────────────────────
  E290: 'Embraer E190-E2',
  E295: 'Embraer E195-E2',
  // ── ATR ────────────────────────────────────────────────────────────────────
  AT75: 'ATR 72-500',
  AT72: 'ATR 72-600',
  // ── Soviet / Russian ───────────────────────────────────────────────────────
  IL76: 'Ilyushin Il-76',
  IL96: 'Ilyushin Il-96',
  T154: 'Tupolev Tu-154',
  T204: 'Tupolev Tu-204',
  SU95: 'Sukhoi Superjet 100',
  MC21: 'Irkut MC-21',
  // ── Antonov ────────────────────────────────────────────────────────────────
  AN12: 'Antonov An-12',
  AN24: 'Antonov An-24',
  AN26: 'Antonov An-26',
  AN72: 'Antonov An-72',
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');
/** Same as norm but also drops hyphens so "Boeing 787 8" matches "Boeing 787-8". */
const normLoose = (s: string) => norm(s).replace(/-/g, '');

/**
 * Best-effort ICAO designator from a human-readable type string.
 *
 * Two-pass strategy:
 *   1st pass — exact match:   prevents '777-200' → B77L ('777-200LR') false-positive.
 *   2nd pass — partial match: catches suffixed variants, e.g. '787-8 Dreamliner' → B788,
 *                             or short names like '787-8' matching '787-8 Dreamliner'.
 */
export function guessIcaoCodeFromDisplayName(typeName: string): string | null {
  const n = normLoose(typeName);
  if (!n) return null;
  // Pass 1: exact
  for (const [icao, full] of Object.entries(ICAO_TYPE_MAP)) {
    if (normLoose(full) === n) return icao;
  }
  // Pass 2: partial
  for (const [icao, full] of Object.entries(ICAO_TYPE_MAP)) {
    const f = normLoose(full);
    if (f.includes(n) || n.includes(f)) return icao;
  }
  return null;
}
