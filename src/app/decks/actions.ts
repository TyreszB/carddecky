"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createCardForUser,
  deleteCardForUser,
  updateCardForUser,
  updateDeckForUser,
} from "@/db/queries";

const updateDeckSchema = z.object({
  deckId: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  description: z
    .string()
    .trim()
    .max(500)
    .transform((value) => (value.length === 0 ? null : value)),
});

type UpdateDeckInput = z.infer<typeof updateDeckSchema>;

export async function updateDeck(input: UpdateDeckInput) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const { deckId, title, description } = updateDeckSchema.parse(input);
  const updated = await updateDeckForUser(userId, deckId, {
    title,
    description,
  });

  if (!updated) {
    throw new Error("Not found");
  }

  revalidatePath("/dashboard");
  revalidatePath(`/decks/${deckId}`);
}

const updateCardSchema = z.object({
  deckId: z.string().uuid(),
  cardId: z.string().uuid(),
  front: z.string().trim().min(1).max(2000),
  back: z.string().trim().min(1).max(2000),
});

type UpdateCardInput = z.infer<typeof updateCardSchema>;

export async function updateCard(input: UpdateCardInput) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const { deckId, cardId, front, back } = updateCardSchema.parse(input);
  const updated = await updateCardForUser(userId, deckId, cardId, {
    front,
    back,
  });

  if (!updated) {
    throw new Error("Not found");
  }

  revalidatePath(`/decks/${deckId}`);
}

const deleteCardSchema = z.object({
  deckId: z.string().uuid(),
  cardId: z.string().uuid(),
});

type DeleteCardInput = z.infer<typeof deleteCardSchema>;

export async function deleteCard(input: DeleteCardInput) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const { deckId, cardId } = deleteCardSchema.parse(input);
  const deleted = await deleteCardForUser(userId, deckId, cardId);

  if (!deleted) {
    throw new Error("Not found");
  }

  revalidatePath(`/decks/${deckId}`);
}

const createCardSchema = z.object({
  deckId: z.string().uuid(),
  front: z.string().trim().min(1).max(2000),
  back: z.string().trim().min(1).max(2000),
});

type CreateCardInput = z.infer<typeof createCardSchema>;

export async function createCard(input: CreateCardInput) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const { deckId, front, back } = createCardSchema.parse(input);
  const created = await createCardForUser(userId, deckId, { front, back });

  if (!created) {
    throw new Error("Not found");
  }

  revalidatePath(`/decks/${deckId}`);
}
