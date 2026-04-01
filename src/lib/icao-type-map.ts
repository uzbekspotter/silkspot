/** ICAO designator → display name (subset; matches UploadPage + DB seeds). */
export const ICAO_TYPE_MAP: Record<string, string> = {
  A388: 'Airbus A380-841',
  A389: 'Airbus A380-842',
  A35K: 'Airbus A350-941',
  A359: 'Airbus A350-900',
  A332: 'Airbus A330-200',
  A333: 'Airbus A330-300',
  A343: 'Airbus A340-300',
  A345: 'Airbus A340-500',
  A320: 'Airbus A320-200',
  A321: 'Airbus A321-200',
  A319: 'Airbus A319-100',
  A318: 'Airbus A318-100',
  A21N: 'Airbus A321neo',
  A20N: 'Airbus A320neo',
  A19N: 'Airbus A319neo',
  B744: 'Boeing 747-400',
  B748: 'Boeing 747-8',
  B77L: 'Boeing 777-200LR',
  B77W: 'Boeing 777-300ER',
  B772: 'Boeing 777-200',
  B773: 'Boeing 777-300',
  B788: 'Boeing 787-8',
  B789: 'Boeing 787-9',
  B78X: 'Boeing 787-10',
  B738: 'Boeing 737-800',
  B739: 'Boeing 737-900',
  B38M: 'Boeing 737 MAX 8',
  B39M: 'Boeing 737 MAX 9',
  B752: 'Boeing 757-200',
  B763: 'Boeing 767-300ER',
  E190: 'Embraer E190',
  E195: 'Embraer E195',
  E75L: 'Embraer E175',
  AT75: 'ATR 72-500',
  AT72: 'ATR 72-600',
  IL76: 'Ilyushin Il-76',
  IL96: 'Ilyushin Il-96',
  T154: 'Tupolev Tu-154',
  T204: 'Tupolev Tu-204',
  AN12: 'Antonov An-12',
  AN24: 'Antonov An-24',
  AN26: 'Antonov An-26',
  AN72: 'Antonov An-72',
  SU95: 'Sukhoi Superjet 100',
  MC21: 'Irkut MC-21',
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');

/** Best-effort ICAO designator from a human-readable type string. */
export function guessIcaoCodeFromDisplayName(typeName: string): string | null {
  const n = norm(typeName);
  if (!n) return null;
  for (const [icao, full] of Object.entries(ICAO_TYPE_MAP)) {
    const f = norm(full);
    if (f.includes(n) || n.includes(f)) return icao;
  }
  return null;
}
