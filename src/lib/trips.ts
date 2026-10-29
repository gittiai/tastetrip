import { airportByCode, nearestAirport } from "./airports";
import { cheapestFare } from "./flights";

export type PriceQuery = { origin: string; departDate: string; returnDate?: string; currency: string };

/** Live cheapest fare to each destination's best airport, ranked by taste-per-price. */
export async function priceDestinations<T extends { name: string; lat: number; lon: number; match: number }>(q: PriceQuery, destinations: T[]) {
  const origin = q.origin.toUpperCase();
  const currency = q.currency.toUpperCase();
  const rows = await Promise.all(
    destinations.map(async (d) => {
      const airport = nearestAirport(d.lat, d.lon);
      const fare = airport && airport.iata !== origin ? await cheapestFare(origin, airport.iata, q.departDate, q.returnDate, currency) : null;
      return { ...d, airport, fare };
    }),
  );
  // Best value: taste match per unit of price, relative to the cheapest option.
  const prices = rows.map((r) => r.fare?.price).filter((p): p is number => !!p);
  const cheapest = prices.length ? Math.min(...prices) : 0;
  const trips = rows
    .map((r) => ({ ...r, value: r.fare?.price ? Math.round(r.match / Math.sqrt(r.fare.price / cheapest)) : null }))
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1) || b.match - a.match);
  return { origin: airportByCode(origin) ?? { iata: origin }, departDate: q.departDate, returnDate: q.returnDate, currency, trips };
}
