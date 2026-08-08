import { eq } from "drizzle-orm";
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
