import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { decks } from "@/db/schema";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const userDecks = await db
    .select()
    .from(decks)
    .where(eq(decks.userId, userId));

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Your flashcard decks, all in one place.
        </p>
      </div>

      {userDecks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-lg font-medium">No decks yet</p>
          <p className="text-muted-foreground">
            Create your first deck to start studying.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {userDecks.map((deck) => (
            <div
              key={deck.id}
              className="flex flex-col gap-2 rounded-lg border border-border p-4"
            >
              <h2 className="font-semibold">{deck.title}</h2>
              {deck.description ? (
                <p className="text-sm text-muted-foreground">
                  {deck.description}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
