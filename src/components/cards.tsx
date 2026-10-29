"use client";

import type { TasteTripMessage } from "@/agent/tastetrip";

type Part = TasteTripMessage["parts"][number];
type Output<N extends string> = Extract<Part, { type: `tool-${N}`; state: "output-available" }>["output"];

const flag = (cc?: string) =>
  cc && cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "📍";

const money = (n: number, currency: string) =>
  new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

const hm = (min?: number) => (min ? `${Math.floor(min / 60)}h ${min % 60 ? `${min % 60}m` : ""}`.trim() : "");

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-card p-4 ${className}`}>{children}</div>;
}

function Because({ items }: { items: { name: string; share: number }[] }) {
  if (!items.length) return null;
  const tones = ["bg-accent", "bg-good", "bg-ink/60", "bg-muted"];
  return (
    <div className="mt-3">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-line">
        {items.map((b, i) => (
          <div key={b.name} className={tones[i % tones.length]} style={{ width: `${b.share}%` }} />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted">
        Because you love{" "}
        {items.slice(0, 3).map((b, i) => (
          <span key={b.name}>
            {i > 0 && (i === Math.min(items.length, 3) - 1 ? " & " : ", ")}
            <span className="font-medium text-ink">{b.name}</span>
          </span>
        ))}
      </p>
    </div>
  );
}

function MatchBadge({ value, label = "match" }: { value: number; label?: string }) {
  return (
    <div className="text-right leading-none">
      <div className="font-display text-2xl font-semibold text-accent">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
    </div>
  );
}

export function Thinking({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
      {label}
    </div>
  );
}

export function TasteChips({ items }: { items: Output<"findDestinations">["taste"] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t) => (
        <div
          key={t.query}
          className={`flex items-center gap-2 rounded-full border border-line py-1 pr-3 pl-1 text-sm ${t.id ? "bg-card" : "opacity-50"}`}
          title={"blurb" in t ? t.blurb : undefined}
        >
          {"image" in t && t.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.image} alt="" className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-soft text-xs">✦</span>
          )}
          <span className="font-medium">{t.name}</span>
          {"kind" in t && t.kind && <span className="text-xs text-muted">{t.kind.replace("_", " ")}</span>}
          {!t.id && <span className="text-xs text-muted">not found</span>}
        </div>
      ))}
    </div>
  );
}

export function Destinations({ data, onPick }: { data: Output<"findDestinations">; onPick: (q: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {data.destinations.map((d, i) => (
        <Card key={d.id} className={i === 0 ? "sm:col-span-2 border-accent/40" : ""}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-muted">
                {flag(d.country)} {d.area ?? d.region.replace("_", " ")}
              </div>
              <h3 className="font-display text-xl font-semibold">{d.name}</h3>
            </div>
            <MatchBadge value={d.match} />
          </div>
          {d.vibes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {d.vibes.map((v) => (
                <span key={v} className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px]">
                  {v}
                </span>
              ))}
            </div>
          )}
          <Because items={d.because} />
          <button onClick={() => onPick(`Plan ${d.name} for me`)} className="mt-3 text-sm font-medium text-accent hover:underline">
            Plan {d.name} →
          </button>
        </Card>
      ))}
    </div>
  );
}

export function Trips({ data, onPick }: { data: Output<"priceTrips">; onPick: (q: string) => void }) {
  const best = data.trips.find((t) => t.value !== null);
  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
        <h3 className="font-display text-lg font-semibold">
          Cheapest fares from {data.origin.iata}
          {"city" in data.origin && data.origin.city ? ` · ${data.origin.city}` : ""}
        </h3>
        <span className="text-xs text-muted">
          {data.departDate}
          {data.returnDate ? ` → ${data.returnDate}` : " · one way"} · live from Google Flights
        </span>
      </div>
      <ul className="divide-y divide-line">
        {data.trips.map((t) => {
          const f = t.fare;
          return (
            <li key={t.name} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.name}</span>
                  {t === best && <span className="rounded-full bg-good-soft px-2 py-0.5 text-[11px] font-medium text-good">Best value</span>}
                  {f?.priceLevel === "low" && <span className="rounded-full bg-good-soft px-2 py-0.5 text-[11px] text-good">Below typical</span>}
                </div>
                <div className="text-xs text-muted">
                  {t.airport ? `${t.airport.iata}${t.airport.km > 15 ? ` · ${t.airport.km} km away` : ""}` : "no airport nearby"}
                  {f?.airline ? ` · ${f.airline}` : ""}
                  {f?.status === "ok" ? ` · ${f.stops ? `${f.stops} stop${f.stops > 1 ? "s" : ""}` : "nonstop"}` : ""}
                  {f?.durationMin ? ` · ${hm(f.durationMin)}` : ""}
                </div>
              </div>
              <div className="w-14 text-center">
                <div className="font-display text-lg font-semibold text-accent">{t.match}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted">match</div>
              </div>
              <div className="w-32 text-right">
                {f?.status === "ok" && f.price ? (
                  <>
                    <div className="font-display text-lg font-semibold">{money(f.price, f.currency)}</div>
                    {f.typicalRange && (
                      <div className="text-[11px] text-muted">
                        typical {money(f.typicalRange[0], f.currency)}–{money(f.typicalRange[1], f.currency)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-muted">{f?.status === "no_flights" ? "no flights found" : "live price unavailable"}</div>
                )}
              </div>
              <div className="flex gap-3 text-sm">
                {f && (
                  <a href={f.link} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">
                    Flights ↗
                  </a>
                )}
                <button onClick={() => onPick(`Plan ${t.name} for me`)} className="text-muted hover:text-ink">
                  Plan
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

const PRICE = ["", "$", "$$", "$$$", "$$$$"];

export function CityPlan({ data }: { data: Output<"planCity"> }) {
  if (!data.sections.length) return <Card className="text-sm text-muted">Qloo had no venue matches near {data.destination}.</Card>;
  return (
    <div className="space-y-4">
      <h3 className="font-display text-xl font-semibold">Your {data.destination}</h3>
      {data.sections.map((s) => (
        <div key={s.category}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{s.label}</div>
          <div className="grid gap-3 sm:grid-cols-3">
            {s.places.map((p) => (
              <a key={p.id} href={p.mapUrl} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-2xl border border-line bg-card">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" className="h-28 w-full object-cover transition group-hover:scale-[1.03]" />
                ) : (
                  <div className="h-28 bg-accent-soft" />
                )}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium leading-tight">{p.name}</span>
                    <span className="text-sm font-semibold text-accent">{p.match}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {[p.neighborhood, p.rating ? `★ ${p.rating.toFixed(1)}` : null, p.priceLevel ? PRICE[p.priceLevel] : null].filter(Boolean).join(" · ")}
                  </div>
                  {p.vibes.length > 0 && <div className="mt-1.5 text-[11px] text-muted">{p.vibes.join(" · ")}</div>}
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Group({ data }: { data: Output<"blendGroup"> }) {
  return (
    <Card className="p-0">
      <div className="border-b border-line px-4 py-3">
        <h3 className="font-display text-lg font-semibold">Where {data.people.join(" & ")} all win</h3>
        <p className="text-xs text-muted">Each city scored against each person&apos;s taste separately. Nobody gets dragged along.</p>
      </div>
      <ul className="divide-y divide-line">
        {data.destinations.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
            <div className="w-40">
              <div className="font-medium">
                {flag(d.country)} {d.name}
              </div>
            </div>
            <div className="min-w-48 flex-1 space-y-1">
              {d.perPerson.map((p) => (
                <div key={p.name} className="flex items-center gap-2 text-xs">
                  <span className="w-16 truncate text-muted">{p.name}</span>
                  <div className="h-1.5 flex-1 rounded-full bg-line">
                    <div className="h-1.5 rounded-full bg-accent" style={{ width: `${p.match}%` }} />
                  </div>
                  <span className="w-6 text-right">{p.match}</span>
                </div>
              ))}
            </div>
            <MatchBadge value={d.groupScore} label="group" />
          </li>
        ))}
      </ul>
    </Card>
  );
}
