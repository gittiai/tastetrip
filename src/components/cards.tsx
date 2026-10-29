"use client";

import type { TasteTripMessage } from "@/agent/tastetrip";
import { Icon } from "./icons";

type Part = TasteTripMessage["parts"][number];
type Output<N extends string> = Extract<Part, { type: `tool-${N}`; state: "output-available" }>["output"];
type Pricing = Output<"priceTrips">;
type Trip = Pricing["trips"][number];

const money = (n: number, currency: string) =>
  new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

const hm = (min?: number) => (min ? `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ""}` : "");

const PRICE = ["", "$", "$$", "$$$", "$$$$"];

/* eslint-disable @next/next/no-img-element -- remote photos from Qloo and Wikimedia, any host */

function Photo({ src, className = "" }: { src?: string; className?: string }) {
  return src ? (
    <img src={src} alt="" loading="lazy" className={`h-full w-full object-cover ${className}`} />
  ) : (
    <div className={`h-full w-full bg-gradient-to-br from-accent to-accent-deep ${className}`} />
  );
}

function Chip({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "green" | "glass" }) {
  const tones = {
    plain: "border-line bg-card text-ink-2",
    green: "border-accent/25 bg-accent-soft text-accent-deep",
    glass: "border-white/40 bg-white/85 text-ink-2 backdrop-blur",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${tones[tone]}`}>{children}</span>;
}

function Heading({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-4">
      <div className="label">{label}</div>
      <h3 className="mt-1 font-display text-3xl leading-tight text-ink">{title}</h3>
    </div>
  );
}

function Because({ items }: { items: { name: string; share: number }[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="label mb-1.5 text-[10px]">Because you love</div>
      <div className="flex flex-wrap gap-1.5">
        {items.slice(0, 3).map((b) => (
          <Chip key={b.name} tone="green">
            {b.name}
            <span className="opacity-60">{b.share}%</span>
          </Chip>
        ))}
      </div>
    </div>
  );
}

export function Thinking({ label }: { label: string }) {
  return (
    <div className="rise space-y-3">
      <div className="label flex items-center gap-2 !text-ink-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        {label}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="shimmer h-40 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

export function TasteChips({ items }: { items: Output<"findDestinations">["taste"] }) {
  return (
    <div className="rise">
      <div className="label mb-2">Your taste, as Qloo sees it</div>
      <div className="flex flex-wrap gap-2">
        {items.map((t) => (
          <div
            key={t.query}
            className={`flex items-center gap-2 rounded-full border border-line bg-card py-1 pr-3.5 pl-1 text-sm shadow-sm ${t.id ? "" : "opacity-50"}`}
            title={t.blurb}
          >
            {t.image ? (
              <img src={t.image} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-accent">
                <Icon name="sparkle" className="h-3.5 w-3.5" />
              </span>
            )}
            <span className="font-medium text-ink">{t.name}</span>
            <span className="text-xs text-muted">{t.id ? (t.kind ?? "").replace("_", " ") : "not found"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Destinations({
  data,
  onPick,
}: {
  data: Output<"findDestinations">;
  onPick: (q: string) => void;
}) {
  if (!data.destinations.length) return null;
  const fares = new Map((data.pricing?.trips ?? []).map((t) => [t.name, t.fare]));
  return (
    <section className="rise">
      <Heading label="Your matches" title={`${data.destinations.length} places that fit you, ranked`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.destinations.map((d, i) => {
          const fare = fares.get(d.name);
          const featured = i === 0;
          return (
            <article
              key={d.id}
              className={`group flex flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(39,38,32,0.25)] transition hover:-translate-y-1 ${featured ? "sm:col-span-2 lg:row-span-2" : ""}`}
            >
              <div className={`relative overflow-hidden ${featured ? "h-64 lg:h-auto lg:min-h-80 lg:flex-1" : "h-44"}`}>
                <Photo src={d.image} className="transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <Chip tone="glass">
                    <Icon name="pin" className="h-3 w-3" />
                    {[d.area, d.country].filter(Boolean).join(", ")}
                  </Chip>
                </div>
                <div className="absolute top-3 right-3 text-right text-white">
                  <div className={`font-display leading-none ${featured ? "text-6xl" : "text-5xl"}`}>
                    {d.match}
                    <span className="text-xl">%</span>
                  </div>
                  {featured && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] backdrop-blur">
                      <Icon name="star" className="h-3 w-3" /> Best match
                    </span>
                  )}
                </div>
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3 text-white">
                  <h4 className={`font-display leading-none ${featured ? "text-5xl" : "text-3xl"}`}>{d.name}</h4>
                  {fare?.status === "ok" && fare.price && (
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink">
                      <Icon name="plane" className="mr-1 inline h-3 w-3" />
                      {money(fare.price, fare.currency)}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-3 p-4">
                {d.vibes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {d.vibes.map((v) => (
                      <Chip key={v}>{v}</Chip>
                    ))}
                  </div>
                )}
                <Because items={d.because} />
                <button
                  onClick={() => onPick(`Plan ${d.name} for me`)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink-2 px-4 py-2 text-sm text-white transition hover:bg-ink"
                >
                  Plan my days in {d.name} <Icon name="arrow" className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TripRow({ t, best, onPick }: { t: Trip; best: boolean; onPick: (q: string) => void }) {
  const f = t.fare;
  return (
    <li className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:px-5 ${best ? "bg-accent-soft/60" : ""}`}>
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl">
        <Photo src={t.image} />
      </div>
      <div className="min-w-0 flex-1 basis-48">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-2xl leading-none text-ink">{t.name}</span>
          {best && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-white">Best value</span>
          )}
          {f?.priceLevel === "low" && <Chip tone="green">Below typical</Chip>}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs text-muted">
          {t.airport && (
            <span className="inline-flex items-center gap-1">
              <Icon name="plane" className="h-3 w-3" />
              {t.airport.iata}
              {t.airport.km > 15 ? ` · ${t.airport.km} km out` : ""}
            </span>
          )}
          {f?.airline && <span>· {f.airline}</span>}
          {f?.status === "ok" && <span>· {f.stops ? `${f.stops} stop${f.stops > 1 ? "s" : ""}` : "nonstop"}</span>}
          {f?.durationMin ? <span>· {hm(f.durationMin)}</span> : null}
        </div>
      </div>
      <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-deep">{t.match}% match</span>
      <div className="w-32 text-right">
        {f?.status === "ok" && f.price ? (
          <>
            <div className="font-display text-3xl leading-none text-ink">{money(f.price, f.currency)}</div>
            {f.typicalRange && (
              <div className="mt-1 text-[11px] text-muted">
                usually {money(f.typicalRange[0], f.currency)}–{money(f.typicalRange[1], f.currency)}
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-muted">{f?.status === "no_flights" ? "no flights found" : "live price unavailable"}</div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {f && (
          <a
            href={f.link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-ink-2 px-3.5 py-1.5 text-sm text-white hover:bg-ink"
          >
            Flights <Icon name="external" className="h-3 w-3" />
          </a>
        )}
        <button onClick={() => onPick(`Plan ${t.name} for me`)} className="rounded-full border border-line px-3.5 py-1.5 text-sm hover:border-ink-2">
          Plan
        </button>
      </div>
    </li>
  );
}

export function Trips({ data, onPick }: { data: Pricing; onPick: (q: string) => void }) {
  const best = data.trips.find((t) => t.value !== null);
  const city = "city" in data.origin && data.origin.city ? data.origin.city : data.origin.iata;
  return (
    <section className="rise overflow-hidden rounded-3xl border border-line bg-card shadow-[0_12px_32px_-16px_rgba(39,38,32,0.25)]">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line px-5 pt-5 pb-4">
        <div>
          <div className="label">
            Live fares · {data.origin.iata} · {data.departDate}
            {data.returnDate ? ` → ${data.returnDate}` : " · one way"}
          </div>
          <h3 className="mt-1 font-display text-3xl text-ink">The cheapest way there, from {city}</h3>
        </div>
        <span className="text-xs text-muted">Ranked by taste per dollar · Google Flights</span>
      </div>
      <ul className="divide-y divide-line">
        {data.trips.map((t) => (
          <TripRow key={t.name} t={t} best={t === best} onPick={onPick} />
        ))}
      </ul>
    </section>
  );
}

export function CityPlan({ data }: { data: Output<"planCity"> }) {
  if (!data.sections.length)
    return <p className="rounded-3xl border border-line bg-card p-5 text-sm text-muted">Qloo had no venue matches near {data.destination}.</p>;
  return (
    <section className="rise space-y-6">
      <div className="relative h-56 overflow-hidden rounded-3xl sm:h-72">
        <Photo src={data.image} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
        <div className="absolute bottom-5 left-6 text-white">
          <div className="label text-white/80">Picked for your taste by Qloo</div>
          <h3 className="font-display text-5xl leading-none sm:text-6xl">Your {data.destination}</h3>
        </div>
      </div>
      {data.sections.map((s) => (
        <div key={s.category}>
          <div className="label mb-3 flex items-center gap-2">
            <Icon name={s.category} className="h-3.5 w-3.5" />
            {s.label}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {s.places.map((p) => (
              <a
                key={p.id}
                href={p.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="group overflow-hidden rounded-3xl border border-line bg-card shadow-[0_8px_24px_-16px_rgba(39,38,32,0.3)] transition hover:-translate-y-1"
              >
                <div className="relative h-40 overflow-hidden">
                  <Photo src={p.image} className="transition duration-700 group-hover:scale-105" />
                  <span className="absolute top-2.5 right-2.5 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-accent-deep backdrop-blur">
                    {p.match}%
                  </span>
                </div>
                <div className="p-3.5">
                  <div className="font-display text-xl leading-tight text-ink">{p.name}</div>
                  <div className="mt-1 text-xs text-muted">
                    {[p.neighborhood, p.rating ? `★ ${p.rating.toFixed(1)}` : null, p.priceLevel ? PRICE[p.priceLevel] : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  {p.vibes.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {p.vibes.slice(0, 3).map((v) => (
                        <span key={v} className="rounded-full bg-sand px-2 py-0.5 text-[11px] text-ink-2">
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent">
                    Open in Maps <Icon name="external" className="h-3 w-3" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export function Group({ data }: { data: Output<"blendGroup"> }) {
  return (
    <section className="rise overflow-hidden rounded-3xl border border-line bg-card shadow-[0_12px_32px_-16px_rgba(39,38,32,0.25)]">
      <div className="border-b border-line px-5 pt-5 pb-4">
        <div className="label">Group trip · scored per person</div>
        <h3 className="mt-1 font-display text-3xl text-ink">Where {data.people.join(" & ")} all win</h3>
        <p className="mt-1 text-sm text-muted">Every city is scored against each person&apos;s taste separately, so nobody gets dragged along.</p>
      </div>
      <ul className="divide-y divide-line">
        {data.destinations.map((d, i) => (
          <li key={d.id} className={`flex flex-wrap items-center gap-4 px-5 py-4 ${i === 0 ? "bg-accent-soft/60" : ""}`}>
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
              <Photo src={d.image} />
            </div>
            <div className="w-40">
              <div className="font-display text-2xl leading-none text-ink">{d.name}</div>
              <div className="mt-1 text-xs text-muted">{[d.area, d.country].filter(Boolean).join(", ")}</div>
            </div>
            <div className="min-w-48 flex-1 space-y-1.5">
              {d.perPerson.map((p) => (
                <div key={p.name} className="flex items-center gap-2 text-xs">
                  <span className="w-14 truncate text-muted">{p.name}</span>
                  <div className="h-2 flex-1 rounded-full bg-sand">
                    <div className="h-2 rounded-full bg-gradient-to-r from-accent to-accent-deep" style={{ width: `${p.match}%` }} />
                  </div>
                  <span className="w-7 text-right font-medium">{p.match}</span>
                </div>
              ))}
            </div>
            <div className="text-right">
              <div className="font-display text-4xl leading-none text-accent-deep">{d.groupScore}</div>
              <div className="label text-[9px]">group</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
