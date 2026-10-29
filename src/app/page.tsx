"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import type { TasteTripMessage } from "@/agent/tastetrip";
import { CityPlan, Destinations, Group, TasteChips, Thinking, Trips } from "@/components/cards";
import { Icon } from "@/components/icons";

const REPO = "https://github.com/gittiai/tastetrip";

const STARTERS = [
  {
    label: "Khruangbin + Past Lives · from NYC",
    prompt: "I love Khruangbin, Past Lives and Anthony Bourdain's Parts Unknown. Flying from New York, a week in December.",
  },
  {
    label: "Phoebe Bridgers + Wes Anderson · from SF",
    prompt: "Phoebe Bridgers, Wes Anderson films and specialty coffee. Long weekend from San Francisco.",
  },
  {
    label: "Group trip · from Chicago",
    prompt: "Me: Radiohead, Succession, natural wine. My friend Sam: Taylor Swift, Friends, Disney. Where should we go together from Chicago?",
  },
  { label: "Bad Bunny + street tacos · from Miami", prompt: "Bad Bunny, Bridgerton and street tacos. From Miami in March." },
];

const LOADING: Record<string, string> = {
  "tool-findDestinations": "Reading your taste in Qloo's graph · ranking the world · checking fares",
  "tool-priceTrips": "Searching live fares",
  "tool-planCity": "Picking places you'll love",
  "tool-blendGroup": "Scoring cities against everyone's taste",
};

// Real output for the first starter prompt, shown on the landing page.
const WIKI = "https://thumb.wikimedia.org/wikipedia/commons/thumb";
const SHOWCASE = [
  { name: "Salem", where: "Massachusetts", match: 88, img: `${WIKI}/2/26/Federal_Street_District.jpg/960px-Federal_Street_District.jpg`, tags: ["Outdoor Activities"] },
  { name: "Reykjavik", where: "Iceland", match: 80, img: `${WIKI}/0/04/Reykjav%C3%ADk%2C_view_from_Hallgr%C3%ADmskirkja_%282%29.jpg/960px-Reykjav%C3%ADk%2C_view_from_Hallgr%C3%ADmskirkja_%282%29.jpg`, tags: ["12 Tónar", "Lucky Records"] },
  { name: "Portland", where: "Maine", match: 89, img: `${WIKI}/b/b6/TheOldPort.jpg/960px-TheOldPort.jpg`, tags: ["Foodie Destination", "$207 nonstop"] },
  { name: "Oaxaca City", where: "Mexico", match: 78, img: "https://upload.wikimedia.org/wikipedia/commons/e/ea/MonteAlbanWest.jpg", tags: ["Foodie Destination"] },
  { name: "Siem Reap", where: "Cambodia", match: 71, img: `${WIKI}/1/1c/Front_porch_of_Wat_Damnak.jpg/960px-Front_porch_of_Wat_Damnak.jpg`, tags: ["Culture"] },
];

const STEPS = ["Tell it what you love", "Qloo maps your taste", "Live fares, ranked", "A city plan, just for you"];

const FEATURES = [
  {
    title: "Not the same ten cities",
    body: "Qloo's taste graph links 250M+ songs, films, shows and places. Your favorites pull out destinations that match you, with the reasons why.",
  },
  {
    title: "Cheapest flight, not just a vibe",
    body: "Every match is priced live from Google Flights from your home airport, then ranked by how much you'll love it per dollar.",
  },
  {
    title: "Group trips nobody hates",
    body: "Each city is scored against each friend's taste separately, so the pick works for the whole group, not just the loudest person.",
  },
];

function Composer({
  value,
  onChange,
  onSubmit,
  busy,
  big,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
  big?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className={`flex items-center gap-2 rounded-full border border-white/70 bg-white/95 shadow-[0_18px_50px_-20px_rgba(39,38,32,0.55)] backdrop-blur ${big ? "p-2 pl-6" : "p-1.5 pl-5"}`}
    >
      <Icon name="sparkle" className="h-4 w-4 shrink-0 text-accent" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Artists, films, food you love… and where you fly from"
        className={`min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted ${big ? "py-2 text-base" : "text-sm"}`}
      />
      <button
        disabled={busy || !value.trim()}
        className={`shrink-0 rounded-full bg-ink-2 text-white transition hover:bg-ink disabled:opacity-40 ${big ? "px-6 py-3 text-base" : "px-4 py-2 text-sm"}`}
      >
        {busy ? "Finding…" : big ? "Find my places" : "Send"}
      </button>
    </form>
  );
}

export default function Home() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, setMessages, status, error } = useChat<TasteTripMessage>();
  const busy = status === "submitted" || status === "streaming";
  const bottom = useRef<HTMLDivElement>(null);
  const heroInput = useRef<HTMLInputElement>(null);
  const chatting = messages.length > 0;

  useEffect(() => {
    if (chatting) bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status, chatting]);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <div className="min-h-dvh">
      <nav className="fixed inset-x-0 top-3 z-30 px-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between rounded-full border border-white/60 bg-white/90 py-2 pr-2 pl-5 shadow-[0_8px_30px_-12px_rgba(39,38,32,0.35)] backdrop-blur">
          <button onClick={() => setMessages([])} className="flex items-center gap-1.5 text-lg font-semibold tracking-tight text-ink">
            <Icon name="compass" className="h-5 w-5 text-accent" />
            tastetrip
          </button>
          <div className="hidden items-center gap-7 text-sm text-ink-2 sm:flex">
            <a href="#how" onClick={() => setMessages([])} className="hover:text-ink">
              How it works
            </a>
            <a href={REPO} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-ink">
              <Icon name="github" className="h-4 w-4" /> GitHub
            </a>
          </div>
          {chatting ? (
            <button onClick={() => setMessages([])} className="rounded-full bg-ink-2 px-4 py-2 text-sm text-white hover:bg-ink">
              New trip
            </button>
          ) : (
            <button
              onClick={() => heroInput.current?.focus()}
              className="rounded-full bg-ink-2 px-4 py-2 text-sm text-white hover:bg-ink"
            >
              Plan my trip
            </button>
          )}
        </div>
      </nav>

      {!chatting ? (
        <>
          <header className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4">
            <div className="absolute inset-0 bg-[url('/hero.jpg')] bg-cover bg-[center_35%]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(250,248,245,0.92)_0%,rgba(250,248,245,0.7)_38%,rgba(250,248,245,0.15)_75%)]" />
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-bg" />
            <div className="relative mx-auto max-w-3xl pt-20 text-center">
              <div className="label rise">AI travel agent · powered by Qloo Taste AI</div>
              <h1 className="rise mt-4 font-display text-5xl leading-[1.02] font-medium tracking-tight text-ink sm:text-7xl">
                Go where your <em className="text-accent">taste</em> lives
              </h1>
              <p className="rise mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg">
                Tell it the music, films and food you love. It finds the places in the world that match <em>you</em>, then the cheapest
                flight there.
              </p>
              <div className="rise mx-auto mt-8 max-w-2xl">
                <Composer value={input} onChange={setInput} onSubmit={() => send(input)} busy={busy} big inputRef={heroInput} />
              </div>
              <div className="rise mt-5 flex flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => send(s.prompt)}
                    className="rounded-full border border-white/70 bg-white/70 px-3.5 py-1.5 text-sm text-ink-2 backdrop-blur transition hover:bg-white"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <section id="how" className="px-4 py-20">
            <h2 className="text-center font-display text-5xl text-ink sm:text-6xl">How it works.</h2>
            <div className="relative mx-auto mt-10 max-w-6xl overflow-hidden rounded-[2rem] bg-[url('/hero.jpg')] bg-cover bg-bottom p-4 sm:p-10">
              <div className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]" />
              <div className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl bg-bg shadow-2xl">
                <div className="flex items-center gap-1.5 border-b border-line bg-sand px-4 py-2.5">
                  <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                  <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                  <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                  <span className="mx-auto rounded-full border border-line bg-card px-4 py-0.5 text-xs text-muted">tastetrip · your matches</span>
                </div>
                <div className="px-4 pt-8 pb-0 text-center">
                  <div className="label">Khruangbin + Past Lives + Parts Unknown, from New York</div>
                  <div className="mt-1 font-display text-3xl text-ink">5 places that fit you, ranked</div>
                  <div className="relative mt-8 flex h-72 items-end justify-center sm:h-80">
                    {SHOWCASE.map((c, i) => {
                      const offset = i - 2;
                      return (
                        <div
                          key={c.name}
                          className="absolute bottom-0 w-44 overflow-hidden rounded-t-3xl border border-line bg-card text-left shadow-xl sm:w-56"
                          style={{
                            transform: `translateX(${offset * 72}%) translateY(${Math.abs(offset) * 18}px) rotate(${offset * 4}deg) scale(${1 - Math.abs(offset) * 0.08})`,
                            zIndex: 10 - Math.abs(offset),
                          }}
                        >
                          <div className="relative h-32 sm:h-40">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={c.img} alt="" className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute top-2 right-3 font-display text-4xl text-white">
                              {c.match}
                              <span className="text-base">%</span>
                            </div>
                            <div className="absolute bottom-2 left-3 font-display text-2xl text-white">{c.name}</div>
                          </div>
                          <div className="space-y-2 p-3 pb-8">
                            <div className="text-xs text-muted">{c.where}</div>
                            <div className="flex flex-wrap gap-1">
                              {c.tags.map((t) => (
                                <span key={t} className="rounded-full border border-accent/25 bg-accent-soft px-2 py-0.5 text-[11px] text-accent-deep">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="mx-auto mt-8 flex max-w-5xl flex-wrap items-center justify-center gap-3">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-3">
                  <span
                    className={`rounded-full border px-5 py-2.5 text-sm sm:text-base ${i === 0 ? "border-accent/40 bg-accent-soft text-accent-deep" : "border-line bg-card text-ink-2"}`}
                  >
                    {s}
                  </span>
                  {i < STEPS.length - 1 && <Icon name="arrow" className="hidden h-4 w-4 text-muted sm:block" />}
                </div>
              ))}
            </div>
            <div className="mx-auto mt-16 grid max-w-5xl gap-4 sm:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-3xl border border-line bg-card p-6">
                  <h3 className="font-display text-2xl text-ink">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
                </div>
              ))}
            </div>
            <div className="mx-auto mt-16 max-w-2xl text-center">
              <h2 className="font-display text-4xl text-ink">Where would your taste take you?</h2>
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  heroInput.current?.focus();
                }}
                className="mt-6 rounded-full bg-ink-2 px-6 py-3 text-white hover:bg-ink"
              >
                Find my places
              </button>
            </div>
          </section>

          <footer className="border-t border-line px-4 py-8 text-center text-xs leading-relaxed text-muted">
            Taste data by <a className="underline" href="https://www.qloo.com" target="_blank" rel="noreferrer">Qloo</a> · Live fares from Google
            Flights via SerpAPI · Place photos from Wikipedia · Hero: Albert Bierstadt, <em>Among the Sierra Nevada</em> (1868), public domain ·{" "}
            <a className="underline" href={REPO} target="_blank" rel="noreferrer">
              Open source (MIT)
            </a>
          </footer>
        </>
      ) : (
        <main className="mx-auto max-w-5xl space-y-8 px-4 pt-28 pb-40">
          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="rise flex justify-end">
                <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-ink-2 px-5 py-3 text-[15px] leading-relaxed text-white">
                  {m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
                </div>
              </div>
            ) : (
              <div key={m.id} className="space-y-8">
                {m.parts.map((p, i) => {
                  const key = `${m.id}-${i}`;
                  if (p.type === "text")
                    return p.text.trim() ? (
                      <div key={key} className="rise flex gap-3">
                        <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-white">
                          <Icon name="compass" className="h-4 w-4" />
                        </span>
                        <div className="max-w-3xl space-y-3 font-display text-xl leading-relaxed text-ink [&_strong]:font-semibold">
                          <Markdown>{p.text}</Markdown>
                        </div>
                      </div>
                    ) : null;
                  if (!p.type.startsWith("tool-") || !("state" in p)) return null;
                  if (p.state === "output-error")
                    return (
                      <p key={key} className="rounded-2xl border border-line bg-card p-4 text-sm text-muted">
                        Something went wrong: {p.errorText}
                      </p>
                    );
                  if (p.state !== "output-available") return <Thinking key={key} label={LOADING[p.type] ?? "Working"} />;
                  switch (p.type) {
                    case "tool-findDestinations":
                      return (
                        <div key={key} className="space-y-8">
                          <TasteChips items={p.output.taste} />
                          <Destinations data={p.output} onPick={send} />
                          {p.output.pricing && <Trips data={p.output.pricing} onPick={send} />}
                        </div>
                      );
                    case "tool-priceTrips":
                      return <Trips key={key} data={p.output} onPick={send} />;
                    case "tool-planCity":
                      return <CityPlan key={key} data={p.output} />;
                    case "tool-blendGroup":
                      return <Group key={key} data={p.output} />;
                  }
                })}
              </div>
            ),
          )}
          {status === "submitted" && <Thinking label="Thinking" />}
          {error && <p className="rounded-2xl border border-line bg-card p-4 text-sm text-muted">Error: {error.message}</p>}
          <div ref={bottom} />
          <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-bg via-bg/90 to-transparent px-4 pt-10 pb-5">
            <div className="mx-auto max-w-3xl">
              <Composer value={input} onChange={setInput} onSubmit={() => send(input)} busy={busy} />
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
