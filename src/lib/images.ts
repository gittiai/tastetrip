// Destination photos from Wikipedia's lead image. Qloo destinations carry no images.
// Same-name cities are common (Portland, Salem), so a candidate page only counts if its
// coordinates are near the Qloo destination.

type Summary = {
  type?: string;
  thumbnail?: { source: string; width: number };
  originalimage?: { source: string; width: number };
  coordinates?: { lat: number; lon: number };
};

const cache = new Map<string, Promise<string | undefined>>();

function km(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

async function summary(title: string): Promise<Summary | null> {
  const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`, {
    headers: { "User-Agent": "TasteTrip/1.0 (https://github.com/gittiai/tastetrip)" },
  }).catch(() => null);
  return r?.ok ? r.json() : null;
}

// Wikimedia only serves a fixed set of thumbnail widths.
function sized(s: Summary) {
  const t = s.thumbnail;
  if (!t) return undefined;
  if ((s.originalimage?.width ?? 0) <= 960) return s.originalimage?.source ?? t.source;
  return t.source.replace(/\/\d+px-/, "/960px-");
}

export function placeImage(p: { name: string; area?: string; country?: string; lat: number; lon: number }) {
  const key = `${p.name}|${p.lat.toFixed(2)}|${p.lon.toFixed(2)}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        const titles = [...new Set([p.area ? `${p.name}, ${p.area}` : null, p.name].filter(Boolean) as string[])];
        for (const t of titles) {
          const s = await summary(t);
          if (!s || s.type === "disambiguation" || !s.thumbnail) continue;
          if (s.coordinates && km(s.coordinates.lat, s.coordinates.lon, p.lat, p.lon) > 150) continue;
          return sized(s);
        }
        return undefined;
      })(),
    );
  }
  return cache.get(key)!;
}

export async function withImages<T extends { name: string; area?: string; country?: string; lat: number; lon: number; image?: string }>(list: T[]) {
  return Promise.all(list.map(async (d) => ({ ...d, image: d.image ?? (await placeImage(d).catch(() => undefined)) })));
}
