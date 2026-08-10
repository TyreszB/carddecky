import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { decks } from "@/db/schema";

export async function listDecksForUser(userId: string) {
  return db
    .select({
      id: decks.id,
      title: decks.title,
      description: decks.description,
      createdAt: decks.createdAt,
    })
    .from(decks)
    .where(eq(decks.userId, userId));
}

export async function getDeckForUser(userId: string, deckId: string) {
  const [deck] = await db
    .select({
      id: decks.id,
      title: decks.title,
      description: decks.description,
      createdAt: decks.createdAt,
      updatedAt: decks.updatedAt,
    })
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .limit(1);

  return deck ?? null;
}
