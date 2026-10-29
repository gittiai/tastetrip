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
    explainability?: Record<string, { entity_id?: string; tag_id?: string; id?: string; score: number }[]>;
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
    const p = fetchWithRetry(url, key);
    p.catch((e) => {
      console.error("qloo_request_failed", path, (e as Error).message);
      cache.delete(url);
    });
    cache.set(url, p);
  }
  return cache.get(url) as Promise<T>;
}

// Retry rate limits and server errors; a silent failure would look like "not found" to the user.
async function fetchWithRetry(url: string, key: string, attempts = 3): Promise<unknown> {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { headers: { "X-Api-Key": key } });
      if (r.ok) return r.json();
      if (i + 1 >= attempts || (r.status !== 429 && r.status < 500)) {
        throw new Error(`Qloo ${r.status}: ${(await r.text()).slice(0, 200)}`);
      }
    } catch (e) {
      if (i + 1 >= attempts || (e as Error).message.startsWith("Qloo ")) throw e;
    }
    await new Promise((res) => setTimeout(res, 400 * 2 ** i));
  }
}

export async function search(query: string, type?: string, take = 3): Promise<QlooEntity[]> {
  const d = await get<{ results?: QlooEntity[] }>("/search", { query, types: type, take });
  return d.results ?? [];
}

export type QlooTagHit = { id: string; name: string; type: string };

export async function searchTags(query: string, take = 6): Promise<QlooTagHit[]> {
  const d = await get<{ results?: { tags?: QlooTagHit[] } }>("/v2/tags", { "filter.query": query, take });
  return d.results?.tags ?? [];
}

/** Favorites become Qloo signals: entities (artists, films...) and tags (interests like "natural wine"). */
export function signals(ids: string[]) {
  return {
    "signal.interests.entities": ids.filter((id) => !id.startsWith("urn:tag:")).join(","),
    "signal.interests.tags": ids.filter((id) => id.startsWith("urn:tag:")).join(","),
  };
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
  const ex = e.query?.explainability ?? {};
  const sig = [...(ex["signal.interests.entities"] ?? []), ...(ex["signal.interests.tags"] ?? [])];
  const total = sig.reduce((s, x) => s + x.score, 0) || 1;
  return sig
    .map((x) => ({ name: names.get(x.entity_id ?? x.tag_id ?? x.id ?? "") ?? "your taste", share: Math.round((x.score / total) * 100) }))
    .sort((a, b) => b.share - a.share);
}
