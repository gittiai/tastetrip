import data from "@/data/airports.json";

// [iata, name, city, country, lat, lon, isLarge] from OurAirports (public domain).
type Row = [string, string, string, string, number, number, number];
const rows = data as Row[];

export type Airport = { iata: string; name: string; city: string; country: string; km: number };

function km(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

/** Best airport to fly into: the nearest large airport within 200 km, else the nearest one with scheduled service. */
export function nearestAirport(lat: number, lon: number): Airport | null {
  let large: Airport | null = null;
  let any: Airport | null = null;
  for (const [iata, name, city, country, la, lo, isLarge] of rows) {
    const d = km(lat, lon, la, lo);
    const a = { iata, name, city, country, km: Math.round(d) };
    if (!any || d < any.km) any = a;
    if (isLarge && (!large || d < large.km)) large = a;
  }
  return large && large.km <= 200 ? large : any;
}

/** Every airport worth searching for a city: all with scheduled service within 80 km (large first, max 3), else the nearest one. */
export function airportsNear(lat: number, lon: number): Airport[] {
  const near = rows
    .map(([iata, name, city, country, la, lo, isLarge]) => ({ iata, name, city, country, km: Math.round(km(lat, lon, la, lo)), isLarge }))
    .filter((a) => a.km <= 80)
    .sort((a, b) => b.isLarge - a.isLarge || a.km - b.km)
    .slice(0, 3)
    .map(({ iata, name, city, country, km }) => ({ iata, name, city, country, km }));
  if (near.length) return near;
  const one = nearestAirport(lat, lon);
  return one ? [one] : [];
}

export function airportCoords(code: string): { lat: number; lon: number } | null {
  const r = rows.find((x) => x[0] === code.toUpperCase());
  return r ? { lat: r[4], lon: r[5] } : null;
}

export function airportByCode(code: string): Airport | null {
  const r = rows.find((x) => x[0] === code.toUpperCase());
  return r ? { iata: r[0], name: r[1], city: r[2], country: r[3], km: 0 } : null;
}
