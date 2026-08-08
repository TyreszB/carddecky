import { auth } from "@clerk/nextjs/server";
import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listDecksForUser } from "@/db/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
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

  const userDecks = await listDecksForUser(userId);

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
        <div className="grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {userDecks.map((deck) => (
            <Link
              href={`/decks/${deck.id}`}
              key={deck.id}
              className="mx-auto flex h-[420px] w-[300px] flex-col no-underline"
            >
              <Card className="flex h-full flex-1 flex-col">
                <CardHeader className="w-full flex-1 text-center">
                  <CardTitle className="text-xl leading-snug font-semibold break-words">
                    {deck.title}
                  </CardTitle>
                  {deck.description ? (
                    <CardDescription>{deck.description}</CardDescription>
                  ) : null}
                </CardHeader>
                <div className="flex-1" /> {/* Spacer to fill the body and push footer down */}
                <CardFooter className="mt-auto flex w-full flex-col items-center gap-3 bg-transparent">
                  <Badge variant="secondary">
                    Last updated:{" "}
                    {new Date(deck.createdAt).toLocaleDateString("en-US")}
                  </Badge>
                </CardFooter>
              </Card>
            </Link>
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
