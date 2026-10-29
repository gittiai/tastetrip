// Live cheapest fares from Google Flights via SerpAPI. Without a key we never guess a price;
// we return a Google Flights link instead.

// Prices are the total for every traveler, as Google Flights shows them.
export type Fare = {
  status: "ok" | "no_key" | "no_flights" | "error";
  price?: number;
  currency: string;
  typicalRange?: [number, number];
  priceLevel?: string; // "low" | "typical" | "high"
  airline?: string;
  stops?: number;
  durationMin?: number;
  arrivalAirport?: string; // which of the searched airports the cheapest itinerary lands at
  link: string;
  error?: string;
};

type SerpFlight = {
  price?: number;
  total_duration?: number;
  flights?: { airline?: string; arrival_airport?: { id?: string } }[];
  layovers?: unknown[];
};

const cache = new Map<string, Promise<Fare>>();

export function googleFlightsLink(from: string, to: string, depart: string, ret?: string) {
  const q = `Flights from ${from} to ${to} on ${depart}${ret ? ` through ${ret}` : " one way"}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`;
}

/** Models sometimes pick a month that has already passed ("March" -> this year's March). Roll it forward a year. */
export function futureDate(date: string | undefined, today = new Date().toISOString().slice(0, 10)) {
  if (!date || date > today) return date;
  const next = `${Number(date.slice(0, 4)) + 1}${date.slice(4)}`;
  return next > today ? next : undefined;
}

/** `to` may be several comma-separated airports; Google Flights returns the cheapest across them. */
export function cheapestFare(from: string, to: string, depart: string, ret: string | undefined, currency: string, adults = 1): Promise<Fare> {
  const k = [from, to, depart, ret, currency, adults].join("|");
  if (!cache.has(k)) {
    const p = fetchFare(from, to, depart, ret, currency, adults);
    p.then((f) => f.status === "error" && cache.delete(k));
    cache.set(k, p);
  }
  return cache.get(k)!;
}

async function fetchFare(from: string, to: string, depart: string, ret: string | undefined, currency: string, adults: number): Promise<Fare> {
  const link = googleFlightsLink(from, to, depart, ret);
  const key = process.env.SERPAPI_KEY;
  if (!key) return { status: "no_key", currency, link };
  const qs = new URLSearchParams({
    engine: "google_flights",
    departure_id: from,
    arrival_id: to,
    outbound_date: depart,
    type: ret ? "1" : "2",
    currency,
    adults: String(adults),
    hl: "en",
    api_key: key,
  });
  if (ret) qs.set("return_date", ret);
  try {
    const r = await fetch(`https://serpapi.com/search.json?${qs}`);
    const d = await r.json();
    if (d.error) return { status: "error", currency, link, error: String(d.error) };
    const all: SerpFlight[] = [...(d.best_flights ?? []), ...(d.other_flights ?? [])].filter((f: SerpFlight) => f.price);
    if (!all.length) return { status: "no_flights", currency, link: d.search_metadata?.google_flights_url ?? link };
    const best = all.reduce((a, b) => (b.price! < a.price! ? b : a));
    const pi = d.price_insights ?? {};
    return {
      status: "ok",
      price: best.price,
      currency,
      typicalRange: pi.typical_price_range,
      priceLevel: pi.price_level,
      airline: best.flights?.[0]?.airline,
      stops: best.layovers?.length ?? 0,
      durationMin: best.total_duration,
      arrivalAirport: best.flights?.at(-1)?.arrival_airport?.id,
      link: d.search_metadata?.google_flights_url ?? link,
    };
  } catch (e) {
    return { status: "error", currency, link, error: (e as Error).message };
  }
}
