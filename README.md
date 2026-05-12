# Kickstart Rush

A fantasy football platform for managing fixtures, results, standings, and player dashboards. Built with Next.js (App Router), TypeScript, and Tailwind CSS.

## Getting started

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the values from the **kickstart-rush-dev** Supabase project dashboard.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

To verify the Supabase connection is working, visit:

```
http://localhost:3000/api/health
```

Expected response (before schema migrations are applied):

```json
{ "ok": true, "supabase": "reachable", "note": "expected: schema not deployed" }
```

## Documentation

See the [`/docs`](./docs) folder for product overview, architecture, data model, and more.
