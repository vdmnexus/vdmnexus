# VDM Nexus

VDM Nexus is an AI infrastructure company. This repo is a Turbo + pnpm monorepo. The public marketing site at **vdmnexus.com** lives in `apps/web` and is the focus of this document.

## Positioning

- **Tagline**: The infrastructure layer for autonomous AI.
- **Tone**: Dark, technical, credible. No hype.
- **Products**:
  - **Nexus Compute** — Smart compute routing for AI businesses. Routes workloads to the cheapest or best provider in real-time. Accepts crypto payments for on-chain agents. (Live)
  - **Nexus Agents** — Infrastructure for autonomous on-chain AI agents that acquire and spend compute independently. (Coming soon)
- The SDK is open source. The cloud routing layer is closed.

## Repo layout

```
apps/
  web/         ← the marketing site (this document)
  api/         ← separate backend (out of scope here)
  vdmvastgoed/ ← separate product (out of scope here)
packages/
  ui/          ← shared package (not used by apps/web)
```

## `apps/web` stack

- Next.js 15 (App Router)
- React 19
- Tailwind CSS 3
- Framer Motion
- Supabase (`@supabase/supabase-js`) — direct client-side writes to the `waitlist` table
- Inter via `next/font/google`

### Routes

- `/` — Homepage (hero → problem → products → how it works → audience split → open source → waitlist → footer)
- `/compute` — Nexus Compute product page
- `/agents` — Nexus Agents (coming soon)

### Key files

- `apps/web/app/layout.tsx` — root layout, metadata, Inter font
- `apps/web/app/globals.css` — dark theme tokens, grid/dot backgrounds, reduced-motion overrides
- `apps/web/app/page.tsx` — homepage composition
- `apps/web/app/compute/page.tsx`, `apps/web/app/agents/page.tsx` — product pages
- `apps/web/components/` — Nav, Footer, GridBg, Card, Section, WaitlistForm, HeroWaitlistInput, FadeIn, WaitlistProvider
- `apps/web/lib/supabase.ts` — singleton Supabase client
- `apps/web/tailwind.config.ts` — design tokens

### Design tokens

```
bg:        #080810
surface:   #0e0e18
border:    #1e1e2e
text:      #f1f5f9 (default), #94a3b8 (muted)
accent:    #6366f1 (indigo), #3b82f6 (blue)
```

## Env vars

`apps/web/.env.local` must define:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

If either is missing the waitlist form fails closed with a user-facing error; the rest of the site renders normally.

## Supabase schema

```sql
create table waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  building text,
  created_at timestamptz default now()
);

alter table waitlist enable row level security;

create policy "anon can insert waitlist"
  on waitlist for insert to anon with check (true);
```

Duplicate emails return a unique-violation; the form treats this as success (idempotent join).

## Dev commands

```bash
pnpm install
pnpm --filter web dev      # http://localhost:3000
pnpm --filter web build
pnpm --filter web lint
```

## Conventions

- Use the copy in this document verbatim. Don't invent features.
- All animations must respect `prefers-reduced-motion` (handled in `globals.css` and `FadeIn`).
- Mobile baseline: 375px. Cards stack, nav stays usable, no horizontal scroll.
- Do not modify `apps/api`, `apps/vdmvastgoed`, or `packages/ui` from this site's workflows.
