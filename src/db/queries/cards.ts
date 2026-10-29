import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { cards, decks } from "@/db/schema";

export async function listCardsForUserDeck(userId: string, deckId: string) {
  return db
    .select({
      id: cards.id,
      front: cards.front,
      back: cards.back,
      position: cards.position,
    })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .orderBy(desc(cards.updatedAt));
}

export async function createCardForUser(
  userId: string,
  deckId: string,
  data: { front: string; back: string },
) {
  const [created] = await db
    .insert(cards)
    .select(
      db
        .select({
          id: sql`gen_random_uuid()`.as("id"),
          deckId: decks.id,
          front: sql<string>`${data.front}`.as("front"),
          back: sql<string>`${data.back}`.as("back"),
          position: sql<number>`0`.as("position"),
          createdAt: sql`now()`.as("created_at"),
          updatedAt: sql`now()`.as("updated_at"),
        })
        .from(decks)
        .where(and(eq(decks.id, deckId), eq(decks.userId, userId))),
    )
    .returning({ id: cards.id });

  return created ?? null;
}

export async function updateCardForUser(
  userId: string,
  deckId: string,
  cardId: string,
  data: { front: string; back: string },
) {
  const ownedDeck = db
    .select({ id: decks.id })
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));

  const [updated] = await db
    .update(cards)
    .set({
      front: data.front,
      back: data.back,
    })
    .where(
      and(
        eq(cards.id, cardId),
        eq(cards.deckId, deckId),
        inArray(cards.deckId, ownedDeck),
      ),
    )
    .returning({ id: cards.id });

  return updated ?? null;
}

export async function deleteCardForUser(
  userId: string,
  deckId: string,
  cardId: string,
) {
  const ownedDeck = db
    .select({ id: decks.id })
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));

  const [deleted] = await db
    .delete(cards)
    .where(
      and(
        eq(cards.id, cardId),
        eq(cards.deckId, deckId),
        inArray(cards.deckId, ownedDeck),
      ),
    )
    .returning({ id: cards.id });

  return deleted ?? null;
}
