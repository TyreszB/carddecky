---
name: drizzle-database
description: Enforce Drizzle ORM for all database reads, writes, schema changes, and migrations. Use when querying or mutating the database, editing tables, writing server actions/API routes that touch Postgres, running migrations, or when the user mentions DB, SQL, schema, Neon, or Drizzle.
---

# Drizzle Database

database interactions must always use drizzle schema and queries

## Rules

1. **All DB access goes through Drizzle** — import `db` from `@/db` (or `src/db`) and query with the Drizzle query API (`db.select`, `db.insert`, `db.update`, `db.delete`, `db.query.*`).
2. **Schema is the source of truth** — tables, columns, and relations live only in `src/db/schema.ts`. Do not invent parallel types or raw table definitions elsewhere.
3. **Never use raw SQL clients for app queries** — no direct `neon()` / `sql` template queries for CRUD, no `pg`/`postgres.js` query strings, no ad-hoc SQL in routes or actions. Use Drizzle builders and the schema tables (`decks`, `cards`, etc.).
4. **Schema changes require Drizzle Kit** — edit `src/db/schema.ts`, then run the project scripts (`db:generate` / `db:migrate` or `db:push`). Do not hand-edit production SQL outside the Drizzle workflow unless fixing a generated migration.
5. **Auth stays in Clerk** — `userId` on `decks` is a Clerk user ID string; there is no local users table.

## Layout

| Path | Role |
|------|------|
| `src/db/schema.ts` | Tables + relations |
| `src/db/index.ts` | `db` client (`drizzle-orm/neon-http` + schema) |
| `drizzle.config.ts` | Drizzle Kit config (`schema`, `out: ./drizzle`) |

## Query patterns

```ts
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { decks, cards } from "@/db/schema";

// Select
const userDecks = await db.select().from(decks).where(eq(decks.userId, userId));

// Relational query
const deckWithCards = await db.query.decks.findFirst({
  where: eq(decks.id, deckId),
  with: { cards: true },
});

// Insert / update / delete
await db.insert(cards).values({ deckId, front, back, position });
await db.update(decks).set({ title }).where(eq(decks.id, deckId));
await db.delete(cards).where(eq(cards.id, cardId));
```

## Schema changes

1. Update `src/db/schema.ts` (and relations if needed).
2. Run `npm run db:generate` then `npm run db:migrate`, or `npm run db:push` for local prototyping.
3. Keep app code importing from `@/db/schema` — never duplicate column names as magic strings.

## Anti-patterns

- Raw `neon\`...\`` or string SQL for application data access
- Bypassing `src/db/schema.ts` with inline table/column definitions
- Creating a second DB client that is not the shared `db` export
- Local `users` table mirroring Clerk
