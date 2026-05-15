# TripSync

A full-stack collaborative travel planner — plan trips, build itineraries, track group expenses with balances, manage tasks, and view budget analytics, all in one place.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/tripsync run dev` — run the frontend (port 22645, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind v4, shadcn/ui, wouter, recharts, react-hook-form + zod
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- Build: esbuild (CJS bundle for API server)

## Where things live

- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `lib/db/src/schema/` — Drizzle ORM schema (trips, members, itinerary, expenses, tasks)
- `lib/api-client-react/src/generated/` — generated React Query hooks and Zod schemas (do not edit)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/tripsync/src/pages/trips/` — all trip-related pages
- `artifacts/tripsync/src/index.css` — theme CSS (ocean blue primary, sunset orange accent)

## Architecture decisions

- Contract-first API via OpenAPI spec; never write API types by hand — run codegen instead.
- All API hooks come from `@workspace/api-client-react`; pages import only from there.
- wouter is used for routing (lightweight alternative to react-router).
- Expense balances are computed server-side in the `/api/trips/:id/balances` endpoint.
- Budget analytics (by category, by person) are computed server-side in `/api/trips/:id/expense-analytics`.

## Product

- **Dashboard** — card grid of all trips with destination, dates, budget
- **Trip Detail** — hero banner, 4 stat cards (budget, spent, members, tasks), tabbed navigation
- **Itinerary** — day-by-day activity timeline with create/edit/delete
- **Expenses** — expense list with member balances shown at top; create/edit/delete
- **Budget** — donut chart by category + bar chart per person; budget progress bar
- **Tasks** — kanban-style 3-column board (Pending / In Progress / Done) with priorities
- **Members** — member list with roles (owner/admin/member); invite/remove

## User preferences

- Theme: deep ocean blue primary (`215 90% 32%`), warm sunset orange accent (`30 90% 60%`)

## Gotchas

- After modifying the OpenAPI spec, always run codegen before editing frontend code.
- `pnpm run build` requires `PORT` and `BASE_PATH` env vars (workflow-provided); use `typecheck` from CLI instead.
- The API server must be rebuilt (workflow restart) after any route file changes.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
