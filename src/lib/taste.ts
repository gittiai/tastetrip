import { withImages } from "./images";
import { drivers, image, insights, search, searchTags, signals, type QlooEntity } from "./qloo";

export type TasteItem = { id: string; name: string };

// "interest" covers things that aren't a single entity: foods, drinks, genres, hobbies, vibes.
export const ENTITY_KINDS = ["artist", "movie", "tv_show", "book", "place", "brand", "podcast", "video_game", "person", "interest"] as const;

// For an interest, prefer tags that describe taste over listing collections (e.g. Resy lists).
const TAG_PREFERENCE = [/destination/, /cuisine/, /genre/, /:view:/, /good_for/, /interests/, /keyword/, /specialty_dish/];
const tagRank = (type: string) => {
  const i = TAG_PREFERENCE.findIndex((r) => r.test(type));
  return i === -1 ? TAG_PREFERENCE.length : i;
};

// Qloo's destination results cluster around the user's "home" culture, so we query each
// world region separately and merge. Polygons are rough lon/lat boxes.
export const REGIONS = {
  europe: "POLYGON((-25 34, 45 34, 45 72, -25 72, -25 34))",
  asia: "POLYGON((60 -11, 150 -11, 150 55, 60 55, 60 -11))",
  north_america: "POLYGON((-170 24, -50 24, -50 72, -170 72, -170 24))",
  latin_america: "POLYGON((-120 -56, -30 -56, -30 24, -120 24, -120 -56))",
  africa_middle_east: "POLYGON((-20 -36, 60 -36, 60 34, -20 34, -20 -36))",
  oceania: "POLYGON((110 -50, 180 -50, 180 -11, 110 -11, 110 -50))",
} as const;
export type Region = keyof typeof REGIONS;

export type Destination = {
  id: string;
  name: string;
  region: string;
  country?: string;
  area?: string; // state / province, e.g. Maine
  lat: number;
  lon: number;
  match: number; // Qloo affinity, 0-100
  popularity: number;
  because: { name: string; share: number }[];
  vibes: string[];
  image?: string;
};

export function kmBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** Qloo often returns neighborhoods of one city (Santa Monica, Malibu...). Keep only the best-ranked within 60 km. */
function spread<T extends { lat: number; lon: number }>(list: T[], minKm = 60) {
  const kept: T[] = [];
  for (const d of list) if (!kept.some((k) => kmBetween(k, d) < minKm)) kept.push(d);
  return kept;
}

function toDestination(e: QlooEntity, region: string, names: Map<string, string>): Destination | null {
  if (!e.location) return null;
  const g = e.properties?.geocode;
  return {
    id: e.entity_id,
    name: e.name,
    region,
    country: g?.country_code,
    area: g?.admin1_region,
    lat: e.location.lat,
    lon: e.location.lon,
    match: Math.round((e.query?.affinity ?? 0) * 100),
    popularity: Math.round((e.popularity ?? 0) * 100),
    because: drivers(e, names),
    vibes: (e.tags ?? []).map((t) => t.name).slice(0, 4),
  };
}

type Resolved = { query: string; id: string; name: string; kind: string; image?: string; blurb?: string };

async function resolveOne(name: string, kind?: string, tryInterest = true): Promise<Resolved | null> {
  if (kind === "interest") {
    // Qloo's tag search is literal ("sunsets" misses "Sunset View"), so search the singular too,
    // keep tags that contain the interest, and prefer taste-like types over dishes and landmarks.
    const norm = (x: string) => x.toLowerCase().replace(/(es|s)$/, "").trim();
    const q = norm(name);
    const found = (await Promise.all([...new Set([name, q])].map((x) => searchTags(x).catch(() => [])))).flat();
    const relevant = found.filter((x) => norm(x.name).includes(q));
    const pool = relevant.length ? relevant : found;
    const t = [...pool].sort(
      (a, b) => tagRank(a.type) - tagRank(b.type) || Number(norm(b.name) === q) - Number(norm(a.name) === q) || a.name.length - b.name.length,
    )[0];
    return t ? { query: name, id: t.id, name: t.name, kind: "interest" } : resolveOne(name, undefined, false);
  }
  // The model's guess at the kind can be wrong ("Wes Anderson" as a movie), so also search
  // untyped and prefer an exact name match.
  const [typed, any] = await Promise.all([
    kind ? search(name, `urn:entity:${kind}`, 3).catch(() => []) : Promise.resolve([]),
    search(name, undefined, 3).catch(() => []),
  ]);
  const exact = (e: QlooEntity) => e.name.toLowerCase() === name.toLowerCase();
  const e = typed.find(exact) ?? any.find(exact) ?? typed[0] ?? any[0];
  if (e) {
    return {
      query: name,
      id: e.entity_id,
      name: e.name,
      kind: (e.types?.[0] ?? "").replace("urn:entity:", ""),
      image: image(e),
      blurb: e.properties?.short_description,
    };
  }
  // Not an entity at all? Try it as an interest.
  return tryInterest ? resolveOne(name, "interest") : null;
}

export async function resolveTaste(items: { name: string; kind?: string }[]) {
  return Promise.all(
    items.map(async ({ name, kind }): Promise<Omit<Resolved, "id" | "kind"> & { id: string | null; kind?: string }> =>
      (await resolveOne(name, kind)) ?? { query: name, id: null, name },
    ),
  );
}

export async function findDestinations(taste: TasteItem[], regions: Region[], count: number) {
  const names = new Map(taste.map((t) => [t.id, t.name]));
  const signal = signals(taste.map((t) => t.id));
  const perRegion = await Promise.all(
    regions.map(async (region) => {
      const ents = await insights({
        "filter.type": "urn:entity:destination",
        ...signal,
        "filter.location": REGIONS[region],
        "filter.popularity.min": 0.6,
        "feature.explainability": true,
        take: 15,
      }).catch(() => []);
      const ds = ents.map((e) => toDestination(e, region, names)).filter((d): d is Destination => !!d);
      return spread(ds).slice(0, Math.max(2, Math.ceil(count / regions.length) + 1));
    }),
  );
  const merged = spread(perRegion.flat().sort((a, b) => b.match - a.match));
  const perCountry = new Map<string, number>();
  const picked = merged
    .filter((d) => {
      const n = perCountry.get(d.country ?? d.name) ?? 0;
      perCountry.set(d.country ?? d.name, n + 1);
      return n < 2;
    })
    .slice(0, count);
  return withImages(picked);
}

// Category tags for venue picks inside a destination.
export const CATEGORIES = {
  eat: { label: "Eat", tags: ["urn:tag:category:place:restaurant"] },
  coffee: { label: "Coffee", tags: ["urn:tag:category:place:cafe", "urn:tag:category:place:coffee_shop"] },
  drink: { label: "Drink", tags: ["urn:tag:category:place:bar", "urn:tag:category:place:wine_bar", "urn:tag:category:place:cocktail_bar"] },
  music: { label: "Music & records", tags: ["urn:tag:category:place:live_music_venue", "urn:tag:category:place:record_store"] },
  see: { label: "See", tags: ["urn:tag:category:place:museum", "urn:tag:category:place:tourist_attraction", "urn:tag:category:place:art_gallery"] },
  stay: { label: "Stay", tags: ["urn:tag:category:place:hotel"] },
} as const;
export type Category = keyof typeof CATEGORIES;

export async function planCity(dest: { name: string; lat: number; lon: number }, taste: TasteItem[], categories: Category[], radiusKm: number) {
  const names = new Map(taste.map((t) => [t.id, t.name]));
  const base = {
    "filter.type": "urn:entity:place",
    ...signals(taste.map((t) => t.id)),
    "filter.location": `POINT(${dest.lon} ${dest.lat})`,
    "filter.location.radius": radiusKm * 1000,
    "feature.explainability": true,
    take: 8,
  };
  const fetched = await Promise.all(
    categories.map(async (c) => {
      const ents = await insights({ ...base, "filter.tags": CATEGORIES[c].tags.join(",") }).catch(() => []);
      return {
        category: c,
        label: CATEGORIES[c].label,
        places: ents.map((e) => ({
          id: e.entity_id,
          name: e.name,
          match: Math.round((e.query?.affinity ?? 0) * 100),
          address: e.properties?.address,
          neighborhood: e.properties?.neighborhood,
          rating: e.properties?.business_rating,
          priceLevel: e.properties?.price_level,
          image: image(e),
          blurb: (e.properties?.short_description ?? e.properties?.description)?.slice(0, 220),
          vibes: (e.tags ?? []).filter((t) => /ambience|category:place|interests/.test(t.type)).map((t) => t.name).slice(0, 4),
          because: drivers(e, names).slice(0, 2),
          mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.name} ${e.properties?.address ?? dest.name}`)}`,
        })),
      };
    }),
  );
  // A record store that is also a bar and a cafe would fill three sections. Show each place once,
  // letting the more specific categories claim it first.
  const used = new Set<string>();
  const claimed = new Map<Category, typeof fetched[number]["places"]>();
  for (const c of CLAIM_ORDER) {
    const section = fetched.find((s) => s.category === c);
    if (!section) continue;
    const picks = section.places.filter((p) => !used.has(p.id)).slice(0, 3);
    picks.forEach((p) => used.add(p.id));
    claimed.set(c, picks);
  }
  return fetched.map((s) => ({ ...s, places: claimed.get(s.category) ?? [] })).filter((s) => s.places.length);
}

const CLAIM_ORDER: Category[] = ["music", "stay", "see", "eat", "coffee", "drink"];

/** Candidates from everyone's combined taste, then each person scores the same set, so the group sees who loves what. */
export async function blendGroup(people: { name: string; taste: TasteItem[] }[], regions: Region[], count: number) {
  const everyone = people.flatMap((p) => p.taste);
  const candidates = await findDestinations(everyone, regions, Math.max(count * 2, 10));
  const ids = candidates.map((c) => c.id).join(",");
  const scores = await Promise.all(
    people.map(async (p) => {
      const ents = await insights({
        "filter.type": "urn:entity:destination",
        ...signals(p.taste.map((t) => t.id)),
        "filter.results.entities": ids,
        take: candidates.length,
      }).catch(() => []);
      return new Map(ents.map((e) => [e.entity_id, Math.round((e.query?.affinity ?? 0) * 100)]));
    }),
  );
  return candidates
    .map((c) => {
      const perPerson = people.map((p, i) => ({ name: p.name, match: scores[i].get(c.id) ?? 0 }));
      const vals = perPerson.map((x) => x.match);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const min = Math.min(...vals);
      // Weight the least-happy person as much as the average: a trip one friend hates is a bad trip.
      return { ...c, perPerson, groupScore: Math.round(0.5 * mean + 0.5 * min) };
    })
    .sort((a, b) => b.groupScore - a.groupScore)
    .slice(0, count);
}
