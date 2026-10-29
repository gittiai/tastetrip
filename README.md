# TasteTrip

**Go where your taste lives.** TasteTrip is an AI travel agent that picks destinations from what you love (your music, films, shows and food), then finds the cheapest flight there.

Google Flights Explore sorts the world by price. Ask a plain LLM where to travel and everyone gets Paris, Tokyo and Lisbon. TasteTrip sorts the world by *your* taste, using [Qloo's Taste AI](https://www.qloo.com/) graph, and then prices it.

## What it does

Type something like *"I love Khruangbin, Past Lives and Anthony Bourdain's Parts Unknown. Flying from Delhi in December."* The agent:

1. **Resolves your taste.** It finds each favorite in Qloo's graph of 250M+ entities, or as a Qloo tag when it is an interest such as "street tacos".
2. **Ranks destinations worldwide.** It queries Qloo's insights for `urn:entity:destination` in six world regions, merges them, and drops near-duplicates such as neighborhoods of the same city. Each card shows the Qloo affinity score and **which of your favorites drove the match** (Qloo explainability).
3. **Prices the trip.** It maps each destination to its best airport and pulls the **live cheapest fare** from Google Flights, with Google's typical price range. It then ranks by taste-per-price to call out the best value.
4. **Plans the city.** For the destination you pick, it asks Qloo for taste-matched venues within 10 km: where to eat, get coffee, drink, hear music, see and stay.
5. **Blends a group.** For friends with different tastes, it scores the same candidate cities against each person separately (`filter.results.entities`) and favors places nobody dislikes.

The agent never invents a destination, venue, score or price. Everything on screen comes from a tool call.

## Why it needs Qloo

Without Qloo this is a generic chatbot that suggests the same famous cities to everyone. Qloo provides the parts an LLM cannot reliably produce:

- cross-domain affinity (music + film + TV → places)
- the explanation of *why* a place matches
- per-person scoring of the same options, which makes group trips fair

## Stack

- Next.js 16 (App Router) + Tailwind
- Vercel AI SDK 7 `ToolLoopAgent` with four tools: `findDestinations`, `priceTrips`, `planCity`, `blendGroup`. Each tool resolves favorites itself (artists, films and people as Qloo entities; foods, drinks and vibes like "natural wine" as Qloo tags) and hands the model a compact summary, while the UI renders the full result.
- Any OpenAI-compatible model. Defaults: APInex `free/gpt-6-luna`, Groq `openai/gpt-oss-120b`, or the Vercel AI Gateway
- Qloo Taste AI hackathon API
- SerpAPI Google Flights for live fares
- OurAirports (public domain) for destination → airport mapping

## Run locally

```bash
pnpm install
cp .env.example .env.local   # add your keys
pnpm dev
```

Open http://localhost:3000.

## Deploy

Deploy to Vercel and set `QLOO_API_KEY`, `SERPAPI_KEY` and one model key (`APINEX_API_KEY` or `GROQ_API_KEY`). With no model key set, it falls back to the Vercel AI Gateway, which authenticates through OIDC on Vercel.

## License

MIT
