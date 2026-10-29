import { airportByCode, airportsNear } from "./airports";
import { cheapestFare, futureDate } from "./flights";
import { withImages } from "./images";

export type PriceQuery = { origin: string; departDate: string; returnDate?: string; currency: string };

/** Live cheapest fare to each destination's best airport, ranked by taste-per-price. */
export async function priceDestinations<T extends { name: string; lat: number; lon: number; match: number; image?: string }>(q: PriceQuery, list: T[]) {
  const destinations = await withImages(list);
  const origin = q.origin.toUpperCase();
  const currency = q.currency.toUpperCase();
  const departDate = futureDate(q.departDate) ?? q.departDate;
  // Keep the trip length when the departure rolls forward a year.
  const returnDate = q.returnDate && departDate !== q.departDate ? futureDate(q.returnDate) : q.returnDate;
  const rows = await Promise.all(
    destinations.map(async (d) => {
      const airports = airportsNear(d.lat, d.lon).filter((a) => a.iata !== origin);
      const fare = airports.length ? await cheapestFare(origin, airports.map((a) => a.iata).join(","), departDate, returnDate, currency) : null;
      const airport = airports.find((a) => a.iata === fare?.arrivalAirport) ?? airports[0] ?? null;
      return { ...d, airport, fare };
    }),
  );
  // Best value: taste match per unit of price, relative to the cheapest option.
  const prices = rows.map((r) => r.fare?.price).filter((p): p is number => !!p);
  const cheapest = prices.length ? Math.min(...prices) : 0;
  const trips = rows
    .map((r) => ({ ...r, value: r.fare?.price ? Math.round(r.match / Math.sqrt(r.fare.price / cheapest)) : null }))
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1) || b.match - a.match);
  return { origin: airportByCode(origin) ?? { iata: origin }, departDate, returnDate, currency, trips };
}
