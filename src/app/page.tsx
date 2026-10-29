"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import type { TasteTripMessage } from "@/agent/tastetrip";
import { CityPlan, Destinations, Group, TasteChips, Thinking, Trips } from "@/components/cards";

const STARTERS = [
  "I love Khruangbin, Past Lives and Anthony Bourdain's Parts Unknown. Flying from Delhi, long weekend in December.",
  "Phoebe Bridgers, Wes Anderson films and specialty coffee. Somewhere in Asia, from Mumbai.",
  "Me: Radiohead, Succession, natural wine. My friend Sam: Taylor Swift, Friends, Disney. Where should we go together from London?",
  "Bad Bunny, Bridgerton and street tacos. From New York in March.",
];

const LOADING: Record<string, string> = {
  "tool-resolveTaste": "Finding your favorites in Qloo's taste graph…",
  "tool-findDestinations": "Ranking destinations worldwide by taste…",
  "tool-priceTrips": "Searching live fares…",
  "tool-planCity": "Picking places you'll love…",
  "tool-blendGroup": "Scoring cities against everyone's taste…",
};

export default function Home() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat<TasteTripMessage>();
  const busy = status === "submitted" || status === "streaming";
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [messages, status]);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4">
      <header className="flex items-center justify-between py-5">
        <div className="font-display text-xl font-semibold">
          Taste<span className="text-accent">Trip</span>
        </div>
        <span className="text-xs text-muted">powered by Qloo Taste AI</span>
      </header>

      <main className="flex-1 space-y-6 pb-40">
        {messages.length === 0 && (
          <section className="pt-10 sm:pt-16">
            <h1 className="font-display text-4xl leading-tight font-semibold sm:text-5xl">
              Go where your <span className="text-accent italic">taste</span> lives.
            </h1>
            <p className="mt-4 max-w-xl text-muted">
              Tell me the music, films and food you love. I&apos;ll find the places in the world that match you, not everyone, using
              Qloo&apos;s taste graph, then find the cheapest flight there.
            </p>
            <div className="mt-8 grid gap-2 sm:grid-cols-2">
              {STARTERS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-2xl border border-line bg-card p-4 text-left text-sm hover:border-accent">
                  {s}
                </button>
              ))}
            </div>
          </section>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl bg-ink px-4 py-2.5 text-sm text-bg">
                {m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
              </div>
            </div>
          ) : (
            <div key={m.id} className="space-y-4">
              {m.parts.map((p, i) => {
                const key = `${m.id}-${i}`;
                if (p.type === "text") return p.text.trim() ? <p key={key} className="leading-relaxed whitespace-pre-wrap">{p.text}</p> : null;
                if (!p.type.startsWith("tool-")) return null;
                if (!("state" in p)) return null;
                if (p.state === "output-error") return <p key={key} className="text-sm text-accent">Something went wrong: {p.errorText}</p>;
                if (p.state !== "output-available") return <Thinking key={key} label={LOADING[p.type] ?? "Working…"} />;
                switch (p.type) {
                  case "tool-resolveTaste":
                    return <TasteChips key={key} data={p.output} />;
                  case "tool-findDestinations":
                    return <Destinations key={key} data={p.output} onPick={send} />;
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
        {status === "submitted" && <Thinking label="Thinking…" />}
        {error && <p className="text-sm text-accent">Error: {error.message}</p>}
        <div ref={bottom} />
      </main>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-8 pb-5"
      >
        <div className="mx-auto flex max-w-3xl gap-2 rounded-2xl border border-line bg-card p-2 shadow-lg">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Your favorite artists, films, food… and where you fly from"
            className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted"
          />
          <button disabled={busy || !input.trim()} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
            {busy ? "…" : "Go"}
          </button>
        </div>
      </form>
    </div>
  );
}
