---
name: server-data-flow
description: Enforce that all data retrieval happens in Server Components, all inserts/updates/deletes happen in Server Actions, and all Server Action inputs are typed (not FormData) and validated with Zod. Use when fetching data for a page/component, adding a form or mutation, writing a Route Handler, or when the user mentions loading data, fetching, mutations, validation, or creating/updating/deleting decks or cards.
---

# Server Data Flow

Data retrieval must always be done via Server Components. Any updates, deletes, or inserts into the database must always be done via Server Actions. Any data passed to a Server Action must be validated by Zod and typed with a TypeScript type — never typed as `FormData`.

## Rules

1. **Reads live in Server Components.** Fetch data (via Drizzle, per the `drizzle-database` skill) directly inside an `async` Server Component — a `page.tsx`, `layout.tsx`, or a server-only child component. Pass the resolved data down as props to Client Components.
2. **Never fetch initial data from the client.** No `useEffect` + `fetch`, no SWR/React Query hitting your own API, for data a Server Component could load directly. Client Components render data they're given; they don't go fetch it themselves.
3. **Writes live in Server Actions.** Every insert, update, or delete is a function with `"use server"` (file-level or inline). Never call `db.insert` / `db.update` / `db.delete` from a Client Component or from client-triggered `fetch`.
4. **Server Action parameters are typed, not `FormData`.** Define an explicit TypeScript type/interface (or `z.infer<typeof schema>`) for each action's argument(s). Do not declare a parameter as `FormData` and read fields out of it inside the action — build the typed object on the caller side (e.g. in a `"use client"` submit handler) and pass that in.
5. **Validate every Server Action input with Zod.** Anything crossing the client → server boundary is untrusted (see `clerk-data-isolation`). Define a `z.object({...})` schema per action, derive its TS type with `z.infer`, and `parse`/`safeParse` the argument as the first line of the action body, before it touches Drizzle. Zod checks shape only — it does not replace the `userId`-scoped ownership check.
6. **Route Handlers are not for app CRUD.** Reserve `route.ts` for things that aren't browser-initiated app mutations/reads: webhooks (e.g. Clerk), external API consumers, or a GET the app itself needs to `fetch()` mid-render. If a Client Component needs to trigger a DB write, that's a Server Action, not a `POST` Route Handler.
7. **Every Server Action still enforces ownership.** Server Actions are public POST endpoints (see `clerk-data-isolation` skill) — call `auth()` and scope the mutation's `where` clause by `userId` inside the action itself, regardless of what page called it.
8. **Revalidate after mutating.** After a Server Action's DB write, call `revalidatePath`/`revalidateTag` (or `redirect`) so the Server Component that owns the read re-fetches fresh data. Don't hand-patch client state to simulate the new server state.

## Read pattern (Server Component)

```tsx
// app/decks/page.tsx
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { decks } from "@/db/schema";
import { DeckList } from "@/components/deck-list";

export default async function DecksPage() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const userDecks = await db.select().from(decks).where(eq(decks.userId, userId));

  return <DeckList decks={userDecks} />;
}
```

`DeckList` can be a Client Component (`"use client"`) — it only renders the `decks` prop, it never fetches them.

## Write pattern (Server Action)

Define a Zod schema per action, derive its type with `z.infer`, and type the action's parameter with that — never `FormData`.

```ts
// app/decks/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { decks } from "@/db/schema";

const createDeckSchema = z.object({
  title: z.string().trim().min(1).max(120),
});
type CreateDeckInput = z.infer<typeof createDeckSchema>;

export async function createDeck(input: CreateDeckInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { title } = createDeckSchema.parse(input);

  await db.insert(decks).values({ userId, title });

  revalidatePath("/decks");
}

const deleteDeckSchema = z.object({
  deckId: z.string().uuid(),
});
type DeleteDeckInput = z.infer<typeof deleteDeckSchema>;

export async function deleteDeck(input: DeleteDeckInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { deckId } = deleteDeckSchema.parse(input);

  await db
    .delete(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));

  revalidatePath("/decks");
}
```

Call it from a `"use client"` component — build the typed object from form/UI state yourself, then invoke the action directly (via `useTransition`/`useActionState`), rather than passing `FormData` through `<form action={...}>`:

```tsx
// app/decks/deck-form.tsx
"use client";

import { useState, useTransition } from "react";
import { createDeck } from "./actions";

export function DeckForm() {
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(() => createDeck({ title }));
      }}
    >
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <button type="submit" disabled={isPending}>
        Create
      </button>
    </form>
  );
}
```

## Anti-patterns

- A Client Component calling `useEffect(() => { fetch("/api/decks") }, [])` to load a list that a Server Component could have fetched and passed as a prop.
- A `POST`/`PATCH`/`DELETE` Route Handler that exists only so a Client Component can mutate the database — use a Server Action instead.
- Importing `db` or Drizzle schema into a file marked `"use client"`.
- A Server Action that only reads and returns data with no mutation — that's a job for the Server Component, not an action.
- Skipping `revalidatePath`/`revalidateTag` after a mutation and instead relying on client-side state guesses to reflect the new DB state.
- Passing raw `FormData`/JSON fields straight into a Drizzle `.values()`/`.set()` call without a Zod schema in between.
- Validating only on the client (e.g. HTML `required`/React state) and trusting that on the server — client validation is UX only; the Server Action must re-validate with Zod.
- Typing a Server Action's parameter as `FormData` and calling `formData.get(...)` inside the action. Type it with the Zod-inferred type instead, and build/pass that typed object from the caller.
- Skipping the `z.infer` type and hand-writing a parallel `interface`/`type` for the same shape — derive the type from the schema so they can't drift.
