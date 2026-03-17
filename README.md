# LocalKB

Internal wiki / knowledge base / FAQ application for company use.

## Current status

- Next.js App Router scaffolded
- Initial homepage concept implemented
- Prisma schema and Docker Compose infrastructure added
- Implementation plan stored in `IMPLEMENTATION_PLAN.md`

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Next milestones

- Build internal auth with email/password
- Replace static homepage results with real instant search
- Add CRUD flows for articles, FAQs, categories, and tags

## Infrastructure

Copy `.env.example` to `.env` before running database-related commands.

```bash
docker compose up -d
npm run db:generate
npm run db:push
npm run db:seed
```
