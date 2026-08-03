---
name: clerk-data-isolation
description: Enforce Clerk-based auth and per-user data isolation on every query, Server Action, and Route Handler. Use whenever reading, writing, or deleting decks/cards (or any user-owned row), when adding Server Actions or Route Handlers, or when the user mentions auth, authorization, ownership, or a user accessing another user's data.
---

# Clerk Data Isolation

All auth is handled by Clerk — there is no local `users` table. A signed-in user must only ever be able to read or mutate rows they own. Every server-side entry point (Server Action, Route Handler, Server Component data fetch) is a public network boundary and must independently verify ownership, regardless of `src/proxy.ts` or UI-level checks.

## Rules

1. **Get the user ID from Clerk on the server, never from the client.** Call `auth()` from `@clerk/nextjs/server` inside the Server Action / Route Handler / Server Component itself. Never accept `userId` as a form field, JSON body key, query param, or prop from the client.
2. **`src/proxy.ts` is optimistic only.** It gates which routes require a session but does not check row-level ownership. Do not treat "the route ran" as proof of authorization — re-verify in the Server Action or Route Handler itself (see Next.js `data-security.md`: "a page-level authentication check does not extend to the Server Actions defined within it").
3. **Scope every query by ownership, not just by ID.** Fetching, updating, or deleting by primary key alone (`eq(decks.id, deckId)`) is an IDOR bug. Always AND the ownership condition into the `where` clause.
4. **`decks.userId` is direct; `cards` is owned transitively.** `cards` has no `userId` column — ownership is via `cards.deckId -> decks.id -> decks.userId`. Every card query must join/verify through its parent deck.
5. **Unauthenticated → 401/redirect. Authenticated-but-not-owner → 404, not 403.** Returning 403 (or a "not authorized" message) on someone else's resource confirms the row exists. Treat not-owned exactly like not-found.
6. **Rows a query returns zero of (because of an ownership filter) mean "not found," not "database error."** Don't `.findFirst()` without the ownership check first and then error separately — build ownership into the query.
7. **Insert `userId` from `auth()`, always.** Never let `userId` be a settable field on create.

## Getting the current user

```ts
import { auth } from "@clerk/nextjs/server";

// In a Server Action / Route Handler / Server Component:
const { userId } = await auth();
if (!userId) {
  throw new Error("Unauthorized");
  // or: redirect("/sign-in")  — in a page/layout context
  // or: (await auth()).redirectToSignIn()
}
```

Use `currentUser()` (also from `@clerk/nextjs/server`) only when you need profile data (name, email, image) — for ownership checks `userId` from `auth()` is enough and cheaper.

## Query patterns

Scope `decks` directly on `userId`:

```ts
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { decks } from "@/db/schema";

const userDecks = await db
  .select()
  .from(decks)
  .where(eq(decks.userId, userId));

const deck = await db.query.decks.findFirst({
  where: and(eq(decks.id, deckId), eq(decks.userId, userId)),
});
if (!deck) throw new Error("Not found"); // don't distinguish "not yours" from "doesn't exist"
```

Scope `cards` through the parent deck (join, not a two-step trust):

```ts
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { cards, decks } from "@/db/schema";

const card = await db.query.cards.findFirst({
  where: eq(cards.id, cardId),
  with: { deck: true },
});
if (!card || card.deck.userId !== userId) throw new Error("Not found");

// Or as a single scoped query when listing many:
const deckCards = await db
  .select({ id: cards.id, front: cards.front, back: cards.back })
  .from(cards)
  .innerJoin(decks, eq(cards.deckId, decks.id))
  .where(and(eq(cards.deckId, deckId), eq(decks.userId, userId)));
```

Mutations: put the ownership check **in the `where`**, not just before it. This is one round trip and closes the race between "check" and "act":

```ts
// Update
const [updated] = await db
  .update(decks)
  .set({ title })
  .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
  .returning();
if (!updated) throw new Error("Not found");

// Delete
const [deleted] = await db
  .delete(decks)
  .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
  .returning();
if (!deleted) throw new Error("Not found");

// Card mutation — verify the deck join, since cards carries no userId
const [deletedCard] = await db
  .delete(cards)
  .where(
    and(
      eq(cards.id, cardId),
      eq(
        cards.deckId,
        db.select({ id: decks.id }).from(decks).where(eq(decks.userId, userId)),
      ),
    ),
  )
  .returning();
```

If a subquery like the last example gets unwieldy, fetch-and-check the deck ownership first (pattern above), then perform the plain-`id` mutation — the earlier `findFirst` with the join already proved ownership within the same request.

Insert: take `userId` from `auth()`, not from the payload:

```ts
"use server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { decks } from "@/db/schema";

export async function createDeck(title: string, description?: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return db.insert(decks).values({ userId, title, description }).returning();
}
```

## Server Actions and Route Handlers

Treat both as public POST endpoints reachable outside your UI (Next.js `data-security.md`). Each one must:

1. Call `auth()` and bail if `!userId`.
2. Scope every read/write to that `userId` (directly on `decks`, via join for `cards`).
3. Return only the fields the client needs — don't return whole rows if they might grow sensitive columns later.

```ts
"use server";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { decks } from "@/db/schema";

export async function deleteDeck(deckId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [deleted] = await db
    .delete(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .returning({ id: decks.id });

  if (!deleted) throw new Error("Not found");
}
```

```ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { decks } from "@/db/schema";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ deckId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return new Response(null, { status: 401 });

  const { deckId } = await params;
  const deck = await db.query.decks.findFirst({
    where: and(eq(decks.id, deckId), eq(decks.userId, userId)),
    with: { cards: true },
  });
  if (!deck) return new Response(null, { status: 404 });

  return NextResponse.json(deck);
}
```

## Anti-patterns

- Trusting a `userId` passed in from the client (form data, JSON body, query string).
- Querying/mutating `decks` or `cards` by `id` alone and checking ownership afterward on the returned object (TOCTOU — the fetch/mutate itself should already be scoped).
- Assuming `src/proxy.ts` running means the request is authorized for the specific resource being accessed.
- Returning 403/"forbidden" for another user's resource instead of 404 — this leaks existence of the row.
- Fetching a `card` by `cards.id` without joining/checking `deck.userId`.
- Skipping the `auth()` check inside a Server Action because "the page that calls it already checked" — actions are independently invokable.
- Returning full Drizzle row objects from Server Actions/Route Handlers when the client only needs a subset of fields.
