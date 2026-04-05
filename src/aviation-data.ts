// Airlines & Aircraft types for autocomplete
// Used in manual entry when aircraft not found in hexdb

export interface Airline {
  name: string;
  iata: string;
  icao: string;
}

export interface AircraftType {
  name: string;        // Full display name: "Airbus A320-200"
  search: string;      // Search key: "a320 a320-200 airbus"
  manufacturer: string;
}

// ── Airlines (300+) ──────────────────────────────────────
export const AIRLINES: Airline[] = [
  // Central Asia & CIS
  { name:'Uzbekistan Airways',        iata:'HY', icao:'UZB' },
  { name:'Qazaq Air',                 iata:'IQ', icao:'QAZ' },
  { name:'Air Astana',                iata:'KC', icao:'KZR' },
  { name:'FlyArystan',                iata:'KC', icao:'KZR' },
  { name:'SCAT Airlines',             iata:'DV', icao:'VSV' },
  { name:'Manas Air',                 iata:'',   icao:'MBB' },
  { name:'Air Kyrgyzstan',            iata:'QH', icao:'LYN' },
  { name:'Tajik Air',                 iata:'7J', icao:'TJK' },
  { name:'Turkmenistan Airlines',     iata:'T5', icao:'TUA' },
  { name:'Azerbaijan Airlines',       iata:'J2', icao:'AHY' },
  { name:'Buta Airways',              iata:'UA', icao:'BUS' },
  { name:'Georgian Airways',          iata:'A9', icao:'TGZ' },
  { name:'Armenia Aircompany',        iata:'QN', icao:'RMA' },

  // Middle East
  { name:'Emirates',                  iata:'EK', icao:'UAE' },
  { name:'Qatar Airways',             iata:'QR', icao:'QTR' },
  { name:'Etihad Airways',            iata:'EY', icao:'ETD' },
  { name:'flydubai',                  iata:'FZ', icao:'FDB' },
  { name:'Air Arabia',                iata:'G9', icao:'ABY' },
  { name:'Kuwait Airways',            iata:'KU', icao:'KAC' },
  { name:'Oman Air',                  iata:'WY', icao:'OMA' },
  { name:'Saudia',                    iata:'SV', icao:'SVA' },
  { name:'Flynas',                    iata:'XY', icao:'NAS' },
  { name:'Flyadeal',                  iata:'F3', icao:'FAD' },
  { name:'Royal Jordanian',           iata:'RJ', icao:'RJA' },
  { name:'Middle East Airlines',      iata:'ME', icao:'MEA' },
  { name:'Iraqi Airways',             iata:'IA', icao:'IAW' },
  { name:'Iran Air',                  iata:'IR', icao:'IRA' },
  { name:'Mahan Air',                 iata:'W5', icao:'IRM' },
  { name:'Israir',                    iata:'6H', icao:'ISR' },
  { name:'El Al',                     iata:'LY', icao:'ELY' },
  { name:'Arkia',                     iata:'IZ', icao:'AIZ' },

  // Europe — Major
  { name:'Lufthansa',                 iata:'LH', icao:'DLH' },
  { name:'Air France',                iata:'AF', icao:'AFR' },
  { name:'British Airways',           iata:'BA', icao:'BAW' },
  { name:'KLM',                       iata:'KL', icao:'KLM' },
  { name:'Swiss International',       iata:'LX', icao:'SWR' },
  { name:'Austrian Airlines',         iata:'OS', icao:'AUA' },
  { name:'Brussels Airlines',         iata:'SN', icao:'BEL' },
  { name:'Iberia',                    iata:'IB', icao:'IBE' },
  { name:'Vueling',                   iata:'VY', icao:'VLG' },
  { name:'Ryanair',                   iata:'FR', icao:'RYR' },
  { name:'easyJet',                   iata:'U2', icao:'EZY' },
  { name:'Wizz Air',                  iata:'W6', icao:'WZZ' },
  { name:'Norwegian Air Shuttle',     iata:'DY', icao:'NAX' },
  { name:'SAS Scandinavian',          iata:'SK', icao:'SAS' },
  { name:'Finnair',                   iata:'AY', icao:'FIN' },
  { name:'Turkish Airlines',          iata:'TK', icao:'THY' },
  { name:'Pegasus Airlines',          iata:'PC', icao:'PGT' },
  { name:'AnadoluJet',                iata:'TK', icao:'AJA' },
  { name:'LOT Polish Airlines',       iata:'LO', icao:'LOT' },
  { name:'Czech Airlines',            iata:'OK', icao:'CSA' },
  { name:'Aeroflot',                  iata:'SU', icao:'AFL' },
  { name:'Rossiya Airlines',          iata:'FV', icao:'SDM' },
  { name:'S7 Airlines',               iata:'S7', icao:'SBI' },
  { name:'Ural Airlines',             iata:'U6', icao:'SVR' },
  { name:'Utair',                     iata:'UT', icao:'UTA' },
  { name:'Pobeda',                    iata:'DP', icao:'PBD' },
  { name:'Nordwind Airlines',         iata:'N4', icao:'NWS' },
  { name:'Azur Air',                  iata:'ZF', icao:'AZV' },
  { name:'Red Wings',                 iata:'WZ', icao:'RWZ' },
  { name:'Alrosa Airlines',           iata:'6R', icao:'DRU' },
  { name:'IrAero',                    iata:'IO', icao:'IAE' },
  { name:'IFly',                      iata:'F5', icao:'RSY' },
  { name:'Smartavia',                 iata:'5N', icao:'URG' },
  { name:'Belavia',                   iata:'B2', icao:'BRU' },
  { name:'Ukraine International',     iata:'PS', icao:'AUI' },
  { name:'SkyUp Airlines',            iata:'PQ', icao:'SQP' },
  { name:'Wizz Air Ukraine',          iata:'WU', icao:'WAU' },
  { name:'Aegean Airlines',           iata:'A3', icao:'AEE' },
  { name:'Olympic Air',               iata:'OA', icao:'OAL' },
  { name:'Croatia Airlines',          iata:'OU', icao:'CTN' },
  { name:'Adria Airways',             iata:'JP', icao:'ADR' },
  { name:'Air Serbia',                iata:'JU', icao:'ASL' },
  { name:'TAROM',                     iata:'RO', icao:'ROT' },
  { name:'Bulgaria Air',              iata:'FB', icao:'LZB' },
  { name:'Wizz Air Hungary',          iata:'W6', icao:'WZZ' },
  { name:'Air Baltic',                iata:'BT', icao:'BTI' },
  { name:'airBaltic',                 iata:'BT', icao:'BTI' },
  { name:'Smartlynx Airlines',        iata:'6Y', icao:'ART' },
  { name:'Nordica',                   iata:'MI', icao:'EST' },
  { name:'Aer Lingus',                iata:'EI', icao:'EIN' },
  { name:'Stobart Air',               iata:'RE', icao:'STK' },
  { name:'Icelandair',                iata:'FI', icao:'ICE' },
  { name:'TAP Air Portugal',          iata:'TP', icao:'TAP' },
  { name:'SATA Air Açores',           iata:'SP', icao:'RZO' },
  { name:'Transavia',                 iata:'HV', icao:'TRA' },
  { name:'Transavia France',          iata:'TO', icao:'TVF' },
  { name:'Eurowings',                 iata:'EW', icao:'EWG' },
  { name:'Condor',                    iata:'DE', icao:'CFG' },
  { name:'TUI fly',                   iata:'X3', icao:'TUI' },
  { name:'Corendon Airlines',         iata:'CAI',icao:'CAI' },
  { name:'SunExpress',                iata:'XQ', icao:'SXS' },
  { name:'Alitalia',                  iata:'AZ', icao:'AZA' },
  { name:'ITA Airways',               iata:'AZ', icao:'ITY' },
  { name:'Neos',                      iata:'NO', icao:'NOS' },
  { name:'Blue Panorama',             iata:'BV', icao:'BPA' },
  { name:'Volotea',                   iata:'V7', icao:'VOE' },

  // Asia-Pacific
  { name:'Singapore Airlines',        iata:'SQ', icao:'SIA' },
  { name:'Scoot',                     iata:'TR', icao:'TGW' },
  { name:'SilkAir',                   iata:'MI', icao:'SLK' },
  { name:'Cathay Pacific',            iata:'CX', icao:'CPA' },
  { name:'HK Express',                iata:'UO', icao:'HKE' },
  { name:'Air China',                 iata:'CA', icao:'CCA' },
  { name:'China Eastern',             iata:'MU', icao:'CES' },
  { name:'China Southern',            iata:'CZ', icao:'CSN' },
  { name:'Shenzhen Airlines',         iata:'ZH', icao:'CSZ' },
  { name:'Hainan Airlines',           iata:'HU', icao:'CHH' },
  { name:'Xiamen Airlines',           iata:'MF', icao:'CXA' },
  { name:'Sichuan Airlines',          iata:'3U', icao:'CSC' },
  { name:'Shandong Airlines',         iata:'SC', icao:'CDG' },
  { name:'Juneyao Airlines',          iata:'HO', icao:'DKH' },
  { name:'Spring Airlines',           iata:'9C', icao:'CQH' },
  { name:'Chengdu Airlines',          iata:'EU', icao:'UEA' },
  { name:'Japan Airlines',            iata:'JL', icao:'JAL' },
  { name:'All Nippon Airways',        iata:'NH', icao:'ANA' },
  { name:'Peach Aviation',            iata:'MM', icao:'APJ' },
  { name:'Jetstar Japan',             iata:'GK', icao:'JJP' },
  { name:'Skymark Airlines',          iata:'BC', icao:'SKY' },
  { name:'Korean Air',                iata:'KE', icao:'KAL' },
  { name:'Asiana Airlines',           iata:'OZ', icao:'AAR' },
  { name:'Jeju Air',                  iata:'7C', icao:'JJA' },
  { name:'Air Busan',                 iata:'BX', icao:'ABL' },
  { name:'T\'way Air',                iata:'TW', icao:'TWB' },
  { name:'Eva Air',                   iata:'BR', icao:'EVA' },
  { name:'China Airlines',            iata:'CI', icao:'CAL' },
  { name:'Starlux Airlines',          iata:'JX', icao:'SJX' },
  { name:'Thai Airways',              iata:'TG', icao:'THA' },
  { name:'Thai Lion Air',             iata:'SL', icao:'TLM' },
  { name:'Bangkok Airways',           iata:'PG', icao:'BKP' },
  { name:'Nok Air',                   iata:'DD', icao:'NOK' },
  { name:'AirAsia',                   iata:'AK', icao:'AXM' },
  { name:'AirAsia X',                 iata:'D7', icao:'XAX' },
  { name:'Malaysia Airlines',         iata:'MH', icao:'MAS' },
  { name:'Batik Air Malaysia',        iata:'OD', icao:'MXD' },
  { name:'Garuda Indonesia',          iata:'GA', icao:'GIA' },
  { name:'Lion Air',                  iata:'JT', icao:'LNI' },
  { name:'Batik Air',                 iata:'ID', icao:'BTK' },
  { name:'Citilink',                  iata:'QG', icao:'CTV' },
  { name:'Philippine Airlines',       iata:'PR', icao:'PAL' },
  { name:'Cebu Pacific',              iata:'5J', icao:'CEB' },
  { name:'Vietnam Airlines',          iata:'VN', icao:'HVN' },
  { name:'VietJet Air',               iata:'VJ', icao:'VJC' },
  { name:'Bamboo Airways',            iata:'QH', icao:'BAV' },
  { name:'IndiGo',                    iata:'6E', icao:'IGO' },
  { name:'Air India',                 iata:'AI', icao:'AIC' },
  { name:'Air India Express',         iata:'IX', icao:'AXB' },
  { name:'SpiceJet',                  iata:'SG', icao:'SEJ' },
  { name:'GoAir',                     iata:'G8', icao:'GOW' },
  { name:'Vistara',                   iata:'UK', icao:'VTI' },
  { name:'PIA Pakistan',              iata:'PK', icao:'PIA' },
  { name:'AirBlue',                   iata:'PA', icao:'ABQ' },
  { name:'SriLankan Airlines',        iata:'UL', icao:'ALK' },
  { name:'Biman Bangladesh',          iata:'BG', icao:'BBC' },
  { name:'US-Bangla Airlines',        iata:'BS', icao:'UBG' },
  { name:'Nepal Airlines',            iata:'RA', icao:'RNA' },
  { name:'Air New Zealand',           iata:'NZ', icao:'ANZ' },
  { name:'Jetstar Airways',           iata:'JQ', icao:'JST' },
  { name:'Virgin Australia',          iata:'VA', icao:'VOZ' },
  { name:'Qantas',                    iata:'QF', icao:'QFA' },
  { name:'Rex Regional Express',      iata:'ZL', icao:'RXA' },

  // Americas
  { name:'American Airlines',         iata:'AA', icao:'AAL' },
  { name:'United Airlines',           iata:'UA', icao:'UAL' },
  { name:'Delta Air Lines',           iata:'DL', icao:'DAL' },
  { name:'Southwest Airlines',        iata:'WN', icao:'SWA' },
  { name:'Alaska Airlines',           iata:'AS', icao:'ASA' },
  { name:'JetBlue Airways',           iata:'B6', icao:'JBU' },
  { name:'Spirit Airlines',           iata:'NK', icao:'NKS' },
  { name:'Frontier Airlines',         iata:'F9', icao:'FFT' },
  { name:'Sun Country Airlines',      iata:'SY', icao:'SCX' },
  { name:'Allegiant Air',             iata:'G4', icao:'AAY' },
  { name:'Air Canada',                iata:'AC', icao:'ACA' },
  { name:'WestJet',                   iata:'WS', icao:'WJA' },
  { name:'Porter Airlines',           iata:'PD', icao:'POE' },
  { name:'LATAM Airlines',            iata:'LA', icao:'LAN' },
  { name:'Avianca',                   iata:'AV', icao:'AVA' },
  { name:'Copa Airlines',             iata:'CM', icao:'CMP' },
  { name:'Aeromexico',                iata:'AM', icao:'AMX' },
  { name:'Volaris',                   iata:'Y4', icao:'VOI' },
  { name:'VivaAerobus',               iata:'VB', icao:'VIV' },
  { name:'Interjet',                  iata:'4O', icao:'AIJ' },
  { name:'GOL Linhas Aéreas',         iata:'G3', icao:'GLO' },
  { name:'LATAM Brasil',              iata:'JJ', icao:'TAM' },
  { name:'Azul Brazilian Airlines',   iata:'AD', icao:'AZU' },

  // Africa
  { name:'Ethiopian Airlines',        iata:'ET', icao:'ETH' },
  { name:'Kenya Airways',             iata:'KQ', icao:'KQA' },
  { name:'EgyptAir',                  iata:'MS', icao:'MSR' },
  { name:'Royal Air Maroc',           iata:'AT', icao:'RAM' },
  { name:'Tunisair',                  iata:'TU', icao:'TAR' },
  { name:'Air Algérie',               iata:'AH', icao:'DAH' },
  { name:'South African Airways',     iata:'SA', icao:'SAA' },
  { name:'Fastjet',                   iata:'FN', icao:'FJT' },
];

// ── Aircraft Types ───────────────────────────────────────
export const AIRCRAFT_TYPES: AircraftType[] = [
  // Airbus Narrowbody
  { name:'Airbus A318-100',     search:'a318 airbus 318',                   manufacturer:'Airbus' },
  { name:'Airbus A319-100',     search:'a319 airbus 319',                   manufacturer:'Airbus' },
  { name:'Airbus A319neo',      search:'a319neo a319 neo airbus',           manufacturer:'Airbus' },
  { name:'Airbus A320-200',     search:'a320 airbus 320 200',               manufacturer:'Airbus' },
  { name:'Airbus A320neo',      search:'a320neo a320 neo airbus',           manufacturer:'Airbus' },
  { name:'Airbus A321-100',     search:'a321 airbus 321 100',               manufacturer:'Airbus' },
  { name:'Airbus A321-200',     search:'a321 airbus 321 200',               manufacturer:'Airbus' },
  { name:'Airbus A321neo',      search:'a321neo a321 neo airbus',           manufacturer:'Airbus' },
  { name:'Airbus A321XLR',      search:'a321xlr a321 xlr airbus',           manufacturer:'Airbus' },

  // Airbus Widebody
  { name:'Airbus A300-600',     search:'a300 airbus 300 600',               manufacturer:'Airbus' },
  { name:'Airbus A310-300',     search:'a310 airbus 310',                   manufacturer:'Airbus' },
  { name:'Airbus A330-200',     search:'a330 airbus 330 200',               manufacturer:'Airbus' },
  { name:'Airbus A330-300',     search:'a330 airbus 330 300',               manufacturer:'Airbus' },
  { name:'Airbus A330-800neo',  search:'a330neo a330 800 neo airbus',       manufacturer:'Airbus' },
  { name:'Airbus A330-900neo',  search:'a330neo a330 900 neo airbus',       manufacturer:'Airbus' },
  { name:'Airbus A340-300',     search:'a340 airbus 340 300',               manufacturer:'Airbus' },
  { name:'Airbus A340-500',     search:'a340 airbus 340 500',               manufacturer:'Airbus' },
  { name:'Airbus A340-600',     search:'a340 airbus 340 600',               manufacturer:'Airbus' },
  { name:'Airbus A350-900',     search:'a350 airbus 350 900',               manufacturer:'Airbus' },
  { name:'Airbus A350-1000',    search:'a350 airbus 350 1000',              manufacturer:'Airbus' },
  { name:'Airbus A380-800',     search:'a380 airbus 380 800',               manufacturer:'Airbus' },
  { name:'Airbus A380-841',     search:'a380 airbus 380 841',               manufacturer:'Airbus' },
  { name:'Airbus A380-842',     search:'a380 airbus 380 842',               manufacturer:'Airbus' },

  // Boeing Narrowbody
  { name:'Boeing 717-200',      search:'717 boeing b717',                   manufacturer:'Boeing' },
  { name:'Boeing 737-700',      search:'737 boeing b737 700',               manufacturer:'Boeing' },
  { name:'Boeing 737-800',      search:'737 boeing b737 800',               manufacturer:'Boeing' },
  { name:'Boeing 737-900',      search:'737 boeing b737 900',               manufacturer:'Boeing' },
  { name:'Boeing 737-900ER',    search:'737 boeing b737 900er',             manufacturer:'Boeing' },
  { name:'Boeing 737 MAX 7',    search:'737max 737 max 7 boeing',           manufacturer:'Boeing' },
  { name:'Boeing 737 MAX 8',    search:'737max 737 max 8 boeing',           manufacturer:'Boeing' },
  { name:'Boeing 737 MAX 9',    search:'737max 737 max 9 boeing',           manufacturer:'Boeing' },
  { name:'Boeing 737 MAX 10',   search:'737max 737 max 10 boeing',          manufacturer:'Boeing' },
  { name:'Boeing 757-200',      search:'757 boeing b757 200',               manufacturer:'Boeing' },
  { name:'Boeing 757-300',      search:'757 boeing b757 300',               manufacturer:'Boeing' },

  // Boeing Widebody
  { name:'Boeing 767-200',      search:'767 boeing b767 200',               manufacturer:'Boeing' },
  { name:'Boeing 767-300',      search:'767 boeing b767 300',               manufacturer:'Boeing' },
  { name:'Boeing 767-300ER',    search:'767 boeing b767 300er',             manufacturer:'Boeing' },
  { name:'Boeing 767-400ER',    search:'767 boeing b767 400er',             manufacturer:'Boeing' },
  { name:'Boeing 777-200',      search:'777 boeing b777 200',               manufacturer:'Boeing' },
  { name:'Boeing 777-200ER',    search:'777 boeing b777 200er',             manufacturer:'Boeing' },
  { name:'Boeing 777-200LR',    search:'777 boeing b777 200lr',             manufacturer:'Boeing' },
  { name:'Boeing 777-300',      search:'777 boeing b777 300',               manufacturer:'Boeing' },
  { name:'Boeing 777-300ER',    search:'777 boeing b777 300er',             manufacturer:'Boeing' },
  { name:'Boeing 777X',         search:'777x boeing b777x',                 manufacturer:'Boeing' },
  { name:'Boeing 787-8',        search:'787 dreamliner boeing b787 8',      manufacturer:'Boeing' },
  { name:'Boeing 787-9',        search:'787 dreamliner boeing b787 9',      manufacturer:'Boeing' },
  { name:'Boeing 787-10',       search:'787 dreamliner boeing b787 10',     manufacturer:'Boeing' },
  { name:'Boeing 747-400',      search:'747 boeing b747 400',               manufacturer:'Boeing' },
  { name:'Boeing 747-8',        search:'747 boeing b747 8',                 manufacturer:'Boeing' },

  // Embraer
  { name:'Embraer E170',        search:'e170 embraer 170',                  manufacturer:'Embraer' },
  { name:'Embraer E175',        search:'e175 embraer 175',                  manufacturer:'Embraer' },
  { name:'Embraer E190',        search:'e190 embraer 190',                  manufacturer:'Embraer' },
  { name:'Embraer E195',        search:'e195 embraer 195',                  manufacturer:'Embraer' },
  { name:'Embraer E190-E2',     search:'e190 e2 embraer 190 e2',            manufacturer:'Embraer' },
  { name:'Embraer E195-E2',     search:'e195 e2 embraer 195 e2',            manufacturer:'Embraer' },
  { name:'Embraer ERJ-135',     search:'erj135 erj 135 embraer',            manufacturer:'Embraer' },
  { name:'Embraer ERJ-145',     search:'erj145 erj 145 embraer',            manufacturer:'Embraer' },

  // Bombardier / Learjet
  { name:'Bombardier CRJ-200',  search:'crj200 crj 200 bombardier canadair',manufacturer:'Bombardier' },
  { name:'Bombardier CRJ-700',  search:'crj700 crj 700 bombardier',        manufacturer:'Bombardier' },
  { name:'Bombardier CRJ-900',  search:'crj900 crj 900 bombardier',        manufacturer:'Bombardier' },
  { name:'Bombardier CRJ-1000', search:'crj1000 crj 1000 bombardier',      manufacturer:'Bombardier' },
  { name:'Bombardier Q400',     search:'q400 dash 8 bombardier',           manufacturer:'Bombardier' },
  { name:'Bombardier CS100',    search:'cs100 cseries bombardier',          manufacturer:'Bombardier' },
  { name:'Airbus A220-100',     search:'a220 cs100 airbus bombardier',      manufacturer:'Airbus' },
  { name:'Airbus A220-300',     search:'a220 cs300 airbus bombardier',      manufacturer:'Airbus' },

  // ATR
  { name:'ATR 42-300',          search:'atr42 atr 42 300',                  manufacturer:'ATR' },
  { name:'ATR 42-500',          search:'atr42 atr 42 500',                  manufacturer:'ATR' },
  { name:'ATR 42-600',          search:'atr42 atr 42 600',                  manufacturer:'ATR' },
  { name:'ATR 72-500',          search:'atr72 atr 72 500',                  manufacturer:'ATR' },
  { name:'ATR 72-600',          search:'atr72 atr 72 600',                  manufacturer:'ATR' },

  // Russian / Soviet
  { name:'Sukhoi Superjet 100', search:'ssj100 ssj 100 superjet sukhoi',    manufacturer:'Sukhoi' },
  { name:'Irkut MC-21-300',     search:'mc21 mc 21 irkut',                  manufacturer:'Irkut' },
  { name:'Tupolev Tu-134',      search:'tu134 tu 134 tupolev',              manufacturer:'Tupolev' },
  { name:'Tupolev Tu-154',      search:'tu154 tu 154 tupolev',              manufacturer:'Tupolev' },
  { name:'Tupolev Tu-204',      search:'tu204 tu 204 tupolev',              manufacturer:'Tupolev' },
  { name:'Tupolev Tu-214',      search:'tu214 tu 214 tupolev',              manufacturer:'Tupolev' },
  { name:'Ilyushin Il-76',      search:'il76 il 76 ilyushin',               manufacturer:'Ilyushin' },
  { name:'Ilyushin Il-86',      search:'il86 il 86 ilyushin',               manufacturer:'Ilyushin' },
  { name:'Ilyushin Il-96',      search:'il96 il 96 ilyushin',               manufacturer:'Ilyushin' },
  { name:'Antonov An-12',       search:'an12 an 12 antonov',                manufacturer:'Antonov' },
  { name:'Antonov An-24',       search:'an24 an 24 antonov',                manufacturer:'Antonov' },
  { name:'Antonov An-26',       search:'an26 an 26 antonov',                manufacturer:'Antonov' },
  { name:'Antonov An-28',       search:'an28 an 28 antonov',                manufacturer:'Antonov' },
  { name:'Antonov An-72',       search:'an72 an 72 antonov',                manufacturer:'Antonov' },
  { name:'Yakovlev Yak-40',     search:'yak40 yak 40 yakovlev',             manufacturer:'Yakovlev' },
  { name:'Yakovlev Yak-42',     search:'yak42 yak 42 yakovlev',             manufacturer:'Yakovlev' },

  // Cargo / Freighter
  { name:'Boeing 747-400F',     search:'747f 747 freighter cargo boeing',   manufacturer:'Boeing' },
  { name:'Boeing 747-8F',       search:'747f 747 8f freighter cargo boeing',manufacturer:'Boeing' },
  { name:'Airbus A330-200F',    search:'a330f a330 freighter cargo airbus', manufacturer:'Airbus' },
  { name:'McDonnell Douglas MD-11F', search:'md11 md 11 freighter mcdonnell', manufacturer:'McDonnell Douglas' },

  // Other
  { name:'Fokker 50',           search:'fokker 50 f50',                     manufacturer:'Fokker' },
  { name:'Fokker 70',           search:'fokker 70 f70',                     manufacturer:'Fokker' },
  { name:'Fokker 100',          search:'fokker 100 f100',                   manufacturer:'Fokker' },
  { name:'Saab 340',            search:'saab 340',                          manufacturer:'Saab' },
  { name:'Saab 2000',           search:'saab 2000',                         manufacturer:'Saab' },
  { name:'De Havilland Q200',   search:'q200 dash 8 dhc',                   manufacturer:'De Havilland' },
  { name:'De Havilland Q300',   search:'q300 dash 8 dhc',                   manufacturer:'De Havilland' },
  { name:'De Havilland Q400',   search:'q400 dash 8 dhc',                   manufacturer:'De Havilland' },
];

/**
 * Map redundant API/registry operator strings to the catalog name in AIRLINES.
 * (e.g. adsbdb often returns "Emirates Airline" while we use "Emirates".)
 */
export function normalizeOperatorDisplayName(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (/^emirates\s+airlines?\b/i.test(t)) return 'Emirates';
  return t;
}

// ── Search functions ─────────────────────────────────────
export function searchAirlines(query: string, limit = 8): Airline[] {
  if (!query || query.length < 1) return [];
  const q = normalizeOperatorDisplayName(query).toLowerCase().trim();
  const results: Airline[] = [];
  const seen = new Set<string>();
  const add = (a: Airline) => { if (!seen.has(a.name)) { seen.add(a.name); results.push(a); } };

  // Exact IATA/ICAO
  AIRLINES.filter(a => a.iata.toLowerCase() === q || a.icao.toLowerCase() === q).forEach(add);
  // Name starts with
  AIRLINES.filter(a => a.name.toLowerCase().startsWith(q)).forEach(add);
  // Name contains
  AIRLINES.filter(a => a.name.toLowerCase().includes(q)).forEach(add);

  return results.slice(0, limit);
}

export function searchAircraftTypes(query: string, limit = 8): AircraftType[] {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase().trim().replace(/\s+/g, '');
  const results: AircraftType[] = [];
  const seen = new Set<string>();
  const add = (a: AircraftType) => { if (!seen.has(a.name)) { seen.add(a.name); results.push(a); } };

  // Name starts with (high priority)
  AIRCRAFT_TYPES.filter(a => a.name.toLowerCase().replace(/\s+/g,'').startsWith(q)).forEach(add);
  // Search field contains
  AIRCRAFT_TYPES.filter(a => a.search.replace(/\s+/g,'').includes(q)).forEach(add);
  // Name contains
  AIRCRAFT_TYPES.filter(a => a.name.toLowerCase().replace(/\s+/g,'').includes(q)).forEach(add);

  return results.slice(0, limit);
}
