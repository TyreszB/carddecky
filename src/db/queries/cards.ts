import { and, asc, eq } from "drizzle-orm";
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
    .orderBy(asc(cards.position));
}
