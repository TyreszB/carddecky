"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateDeckForUser } from "@/db/queries";

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
