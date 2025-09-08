/**
 * Minimal ISO helpers and country basics.
 * For robustness, we attempt to read ISO3 from geometry.properties if present; fallback relies on name matching.
 */

import type { Feature } from "geojson";

export function iso2ToIso3(iso2: string): string | null {
  const key = iso2.toUpperCase();
  return ISO2_TO_3[key] ?? null;
}

export function iso3ToIso2(iso3: string): string | null {
  const key = iso3.toUpperCase();
  return ISO3_TO_2[key] ?? null;
}

export function getIso3FromGeom(
  g: Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon, any>
): string | null {
  const p = g.properties || {};

  // ISO3 direct
  const iso3 = (p.iso_a3 || p.ISO_A3 || p.iso3 || p.adm0_a3 || p.name_long_iso3) as
    | string
    | undefined;
  if (iso3 && /^[A-Z]{3}$/.test(iso3)) return iso3.toUpperCase();

  // Name-based lookup
  const name =
    (p.name as string) ||
    (p.NAME as string) ||
    (p.admin as string) ||
    (p.sovereignt as string);
  if (name) {
    const found = findCountryByName(name);
    if (found) return found;

    // Fallback: if no ISO3 mapping, return the raw name prefixed so we can still fetch facts
    return `NAME:${name}`;
  }

  return null;
}


export function findCountryByName(name: string): string | null {
  const norm = name.toLowerCase();
  // Direct name
  if (NAME_TO_ISO3[norm]) return NAME_TO_ISO3[norm];
  // Strip common suffix
  const cleaned = norm
    .replace(/republic of /g, "")
    .replace(/federation of /g, "")
    .replace(/democratic /g, "")
    .replace(/ the$/g, "")
    .trim();
  if (NAME_TO_ISO3[cleaned]) return NAME_TO_ISO3[cleaned];
  return null;
}

export function flagEmojiFromIso2(iso2: string): string {
  const A = 0x1f1e6;
  return String.fromCodePoint(
    A + (iso2.toUpperCase().charCodeAt(0) - 65),
    A + (iso2.toUpperCase().charCodeAt(1) - 65)
  );
}

export function countryBasicsByISO3(iso3: string) {
  const iso2 = iso3ToIso2(iso3);
  const record =
    BASIC_COUNTRIES[iso3.toUpperCase() as keyof typeof BASIC_COUNTRIES];
  return record
    ? {
        ...record,
        iso3: iso3.toUpperCase(),
        iso2: iso2,
        flag: iso2 ? flagEmojiFromIso2(iso2) : "🏳️"
      }
    : {
        iso3,
        iso2,
        flag: iso2 ? flagEmojiFromIso2(iso2) : "🏳️",
        name: ISO3_TO_NAME[iso3.toUpperCase()] ?? iso3,
        capital: "—",
        region: "—",
        currency: "—",
        population: undefined as number | undefined
      };
}

//Data (concise but covers most usage) 

const ISO2_TO_3: Record<string, string> = {
  US: "USA",
  GB: "GBR",
  FR: "FRA",
  DE: "DEU",
  IT: "ITA",
  ES: "ESP",
  PT: "PRT",
  NL: "NLD",
  BE: "BEL",
  CH: "CHE",
  AT: "AUT",
  IE: "IRL",
  DK: "DNK",
  NO: "NOR",
  SE: "SWE",
  FI: "FIN",
  IS: "ISL",
  CA: "CAN",
  MX: "MEX",
  BR: "BRA",
  AR: "ARG",
  CL: "CHL",
  CO: "COL",
  PE: "PER",
  VE: "VEN",
  AU: "AUS",
  NZ: "NZL",
  JP: "JPN",
  CN: "CHN",
  IN: "IND",
  PK: "PAK",
  BD: "BGD",
  KR: "KOR",
  KP: "PRK",
  SG: "SGP",
  MY: "MYS",
  TH: "THA",
  VN: "VNM",
  KH: "KHM",
  LA: "LAO",
  PH: "PHL",
  ID: "IDN",
  SA: "SAU",
  AE: "ARE",
  QA: "QAT",
  KW: "KWT",
  OM: "OMN",
  IR: "IRN",
  IQ: "IRQ",
  TR: "TUR",
  EG: "EGY",
  MA: "MAR",
  DZ: "DZA",
  TN: "TUN",
  NG: "NGA",
  ZA: "ZAF",
  KE: "KEN",
  ET: "ETH",
  GH: "GHA"
};

const ISO3_TO_2: Record<string, string> = Object.fromEntries(
  Object.entries(ISO2_TO_3).map(([a2, a3]) => [a3, a2])
);

const NAME_TO_ISO3: Record<string, string> = {
  "united states": "USA",
  "united kingdom": "GBR",
  britain: "GBR",
  england: "GBR",
  france: "FRA",
  germany: "DEU",
  italy: "ITA",
  spain: "ESP",
  portugal: "PRT",
  netherlands: "NLD",
  belgium: "BEL",
  switzerland: "CHE",
  austria: "AUT",
  ireland: "IRL",
  denmark: "DNK",
  norway: "NOR",
  sweden: "SWE",
  finland: "FIN",
  iceland: "ISL",
  canada: "CAN",
  mexico: "MEX",
  brazil: "BRA",
  argentina: "ARG",
  chile: "CHL",
  colombia: "COL",
  peru: "PER",
  venezuela: "VEN",
  australia: "AUS",
  "new zealand": "NZL",
  japan: "JPN",
  china: "CHN",
  india: "IND",
  pakistan: "PAK",
  bangladesh: "BGD",
  "south korea": "KOR",
  "north korea": "PRK",
  singapore: "SGP",
  malaysia: "MYS",
  thailand: "THA",
  vietnam: "VNM",
  cambodia: "KHM",
  laos: "LAO",
  philippines: "PHL",
  indonesia: "IDN",
  "saudi arabia": "SAU",
  "united arab emirates": "ARE",
  qatar: "QAT",
  kuwait: "KWT",
  oman: "OMN",
  iran: "IRN",
  iraq: "IRQ",
  turkey: "TUR",
  egypt: "EGY",
  morocco: "MAR",
  algeria: "DZA",
  tunisia: "TUN",
  nigeria: "NGA",
  "south africa": "ZAF",
  kenya: "KEN",
  ethiopia: "ETH",
  ghana: "GHA"
};

const ISO3_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(NAME_TO_ISO3).map(([n, i]) => [i, n.replace(/\b\w/g, (m) => m.toUpperCase())])
);

const BASIC_COUNTRIES: Record<
  string,
  { name: string; capital: string; region: string; currency: string; population?: number }
> = {
  USA: {
    name: "United States",
    capital: "Washington, D.C.",
    region: "Americas",
    currency: "USD",
    population: 331000000
  },
  GBR: {
    name: "United Kingdom",
    capital: "London",
    region: "Europe",
    currency: "GBP",
    population: 67800000
  },
  FRA: {
    name: "France",
    capital: "Paris",
    region: "Europe",
    currency: "EUR",
    population: 67000000
  },
  DEU: {
    name: "Germany",
    capital: "Berlin",
    region: "Europe",
    currency: "EUR",
    population: 83100000
  },
  JPN: {
    name: "Japan",
    capital: "Tokyo",
    region: "Asia",
    currency: "JPY",
    population: 125800000
  },
  AUS: {
    name: "Australia",
    capital: "Canberra",
    region: "Oceania",
    currency: "AUD",
    population: 25800000
  },
  CAN: {
    name: "Canada",
    capital: "Ottawa",
    region: "Americas",
    currency: "CAD",
    population: 38000000
  },
  BRA: {
    name: "Brazil",
    capital: "Brasília",
    region: "Americas",
    currency: "BRL",
    population: 213000000
  },
  IND: {
    name: "India",
    capital: "New Delhi",
    region: "Asia",
    currency: "INR",
    population: 1380000000
  },
  CHN: {
    name: "China",
    capital: "Beijing",
    region: "Asia",
    currency: "CNY",
    population: 1402000000
  }
};
