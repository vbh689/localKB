# Codebase Overview for New Contributors

## 1) What this project is

LocalKB is an internal knowledge base and FAQ platform built on Next.js App Router.
It has:

- a **public-facing experience** for browsing/searching published content,
- and an **admin CMS** for managing articles, FAQs, categories, users, media, and search analytics.

Core technologies include Next.js + React + TypeScript, Prisma + PostgreSQL, and Meilisearch.

## 2) High-level architecture

The app follows a fairly standard monolith layout:

- **UI + routes** live in `src/app` and `src/components`.
- **Business logic and integrations** live in `src/lib`.
- **Data model + migrations + seed** live in `prisma`.
- **Operations scripts** (reindex, backup/restore helpers) live in `scripts/ops`.

A useful mental model:

1. Request enters a route/page in `src/app/*`.
2. Route calls helpers from `src/lib/*`.
3. Helpers use Prisma (`src/lib/db.ts`) and/or Meilisearch (`src/lib/search.ts`).
4. Admin mutations trigger index sync helpers (`src/lib/search-index.ts`) to keep search current.

## 3) Directory map (what to open first)

- `src/app/`
  - `layout.tsx`: root app shell, fonts, global styles.
  - `page.tsx`: homepage + instant search + latest content.
  - `search/`, `kb/`, `faq/`: public content routes.
  - `admin/`: protected CMS routes and server actions.
  - `api/`: route handlers (`auth`, `search`, `health`, admin exports/uploads).

- `src/components/`
  - Reusable UI for auth, editor, media, search, pagination, admin charts/forms.

- `src/lib/`
  - `config.ts`: validated environment config.
  - `db.ts`: Prisma client singleton.
  - `auth/*`: session/password/role checks.
  - `content.ts`: query helpers for published content/homepage.
  - `search.ts`: Meilisearch client.
  - `search-index.ts`: index setup + sync/remove/reindex flows.
  - `health.ts`: DB/search health checks.

- `prisma/`
  - `schema.prisma`: core data model (users, sessions, articles, faqs, revisions, search logs).
  - `migrations/`: migration history.
  - `seed.ts`: baseline local data.

## 4) Data model essentials

The schema centers around:

- **User** + **Session** for auth.
- **Article** and **Faq** as primary content types.
- **Category** and optional **Tag** classification.
- **Revision** snapshots for restore/history support.
- **SearchLog** for analytics and admin reporting.

`ContentStatus` gates visibility (`DRAFT`, `PUBLISHED`, `UNPUBLISHED`).
Only published content should appear in public pages and search.

## 5) Auth & authorization basics

- Login is email/password.
- Session token is stored in DB and sent via HttpOnly cookie.
- Role checks are done server-side (`requireRoles`).
- Admin area requires `ADMIN` or `EDITOR`; user management is stricter (`ADMIN`).

## 6) Search flow you should understand early

Search relies on Meilisearch and has two important layers:

1. **Query layer** for public results (`searchPublishedContent`, API/search page usage).
2. **Index sync layer** that updates documents when article/faq content changes.

If you change publish/unpublish/content mutation logic, verify index sync is still called.
This is one of the easiest places for subtle regressions.

## 7) Feature flags & current defaults

`src/lib/features.ts` currently disables tags (`areTagsEnabled = false`).
Tag-related UI and filters are guarded by this flag in both public and admin codepaths.

## 8) Local dev lifecycle

Typical startup flow:

1. `npm install`
2. copy env file
3. start PostgreSQL + Meilisearch with Docker Compose
4. generate/push Prisma schema and seed
5. run `npm run dev`

Use `npm run lint` and `npm run build` as baseline checks before shipping.

## 9) Good “learn next” path for newcomers

Suggested sequence:

1. Read `README.md` end-to-end for product scope and route map.
2. Trace the homepage (`src/app/page.tsx`) to see how route → lib → DB data wiring works.
3. Read `src/app/admin/layout.tsx` + `src/lib/auth/session.ts` to understand permission boundaries.
4. Read `prisma/schema.prisma` to map every screen to data tables.
5. Read `src/lib/search-index.ts` and trigger a reindex once to understand indexing semantics.
6. Walk through one admin mutation in `src/app/admin/actions.ts` from form submit to DB write to revalidation/search sync.

## 10) Common pitfalls

- Forgetting that public pages must only show `PUBLISHED` records.
- Updating content mutation logic without keeping Meilisearch in sync.
- Enabling tags without checking all guarded codepaths.
- Breaking slug uniqueness rules in admin actions.
- Missing role checks in new admin routes or APIs.
