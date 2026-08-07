import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { decks } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <div className="flex flex-1 flex-col items-center gap-8 px-6 py-10">
      <p className="text-center text-muted-foreground">
        Manage your flashcard decks and study progress
      </p>

      {userDecks.length === 0 ? (
        <Card className="w-full max-w-md border-dashed py-16 text-center shadow-none [--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardTitle className="text-lg">No decks yet</CardTitle>
            <CardDescription>
              Create your first deck to start studying.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2">
          {userDecks.map((deck) => (
            <Card key={deck.id} className="gap-4 [--card-spacing:--spacing(6)]">
              <CardHeader>
                <CardTitle className="text-xl font-semibold leading-snug">
                  {deck.title}
                </CardTitle>
                {deck.description ? (
                  <CardDescription>{deck.description}</CardDescription>
                ) : null}
                <CardAction>
                  <Badge variant="secondary">
                    {deck.createdAt.toLocaleDateString("en-US")}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="justify-between bg-transparent">
                <span className="text-sm text-muted-foreground">
                  Ready to study
                </span>
                <Button>Study</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Button variant="outline" size="lg">
        <Plus data-icon="inline-start" />
        Create New Deck
      </Button>
    </div>
  );
}
