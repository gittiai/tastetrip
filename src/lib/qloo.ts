// Thin client for Qloo's Taste AI hackathon API.
// Responses are cached in memory only (Qloo's terms forbid storing them in a public repo).

const BASE = process.env.QLOO_API_URL ?? "https://hackathon.api.qloo.com";

export type QlooTag = { name: string; tag_id?: string; id?: string; type: string };

export type QlooEntity = {
  name: string;
  entity_id: string;
  types?: string[];
  subtype?: string;
  popularity?: number;
  location?: { lat: number; lon: number };
  properties?: {
    image?: { url: string };
    images?: { url: string }[];
    short_description?: string;
    description?: string;
    address?: string;
    business_rating?: number;
    price_level?: number;
    neighborhood?: string;
    website?: string;
    geocode?: { name?: string; admin1_region?: string; country_code?: string };
    [k: string]: unknown;
  };
  tags?: QlooTag[];
  query?: {
    affinity?: number;
    explainability?: { "signal.interests.entities"?: { entity_id: string; score: number }[] };
  };
};

const cache = new Map<string, Promise<unknown>>();

async function get<T>(path: string, params: Record<string, string | number | boolean | undefined>): Promise<T> {
  const key = process.env.QLOO_API_KEY;
  if (!key) throw new Error("QLOO_API_KEY is not set");
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  const url = `${BASE}${path}?${qs}`;
  if (!cache.has(url)) {
    const p = fetch(url, { headers: { "X-Api-Key": key } }).then(async (r) => {
      if (!r.ok) throw new Error(`Qloo ${path} ${r.status}: ${(await r.text()).slice(0, 200)}`);
      return r.json();
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return cache.get(url) as Promise<T>;
}

export async function search(query: string, type?: string, take = 3): Promise<QlooEntity[]> {
  const d = await get<{ results?: QlooEntity[] }>("/search", { query, types: type, take });
  return d.results ?? [];
}

export async function insights(params: Record<string, string | number | boolean | undefined>): Promise<QlooEntity[]> {
  const d = await get<{ results?: { entities?: QlooEntity[] } }>("/v2/insights", params);
  return d.results?.entities ?? [];
}

export function image(e: QlooEntity): string | undefined {
  return e.properties?.image?.url ?? e.properties?.images?.[0]?.url;
}

/** Which of the user's favorites drove this match, as {name, share} pairs. */
export function drivers(e: QlooEntity, names: Map<string, string>) {
  const sig = e.query?.explainability?.["signal.interests.entities"] ?? [];
  const total = sig.reduce((s, x) => s + x.score, 0) || 1;
  return sig
    .map((x) => ({ name: names.get(x.entity_id) ?? "your taste", share: Math.round((x.score / total) * 100) }))
    .sort((a, b) => b.share - a.share);
}
