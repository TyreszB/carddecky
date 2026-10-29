import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, Layers, Play } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDeckForUser, listCardsForUserDeck } from "@/db/queries";
import { AddCardDialog } from "@/components/add-card-dialog";
import { DeleteCardDialog } from "@/components/delete-card-dialog";
import { EditCardDialog } from "@/components/edit-card-dialog";
import { EditDeckDialog } from "@/components/edit-deck-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default async function DeckPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { deckId } = await params;
  const [deck, deckCards] = await Promise.all([
    getDeckForUser(userId, deckId),
    listCardsForUserDeck(userId, deckId),
  ]);

  if (!deck) {
    notFound();
  }

  const cardCount = deckCards.length;

  return (
    <div className="flex flex-1 flex-col gap-8 px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          render={<Link href="/dashboard" />}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to Dashboard
        </Button>

        <Card className="[--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {deck.title}
            </CardTitle>
            {deck.description ? (
              <CardDescription className="text-base">
                {deck.description}
              </CardDescription>
            ) : null}
            <div className="col-span-full mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">
                {cardCount} {cardCount === 1 ? "card" : "cards"}
              </Badge>
              <Badge variant="secondary">
                Created {new Date(deck.createdAt).toLocaleDateString("en-US")}
              </Badge>
            </div>
            <div
              data-slot="card-action"
              className="col-start-2 row-span-2 row-start-1 flex items-start gap-2 self-start justify-self-end"
            >
              <EditDeckDialog
                deckId={deck.id}
                title={deck.title}
                description={deck.description}
              />
            </div>
          </CardHeader>

          <CardContent>
            <Button size="lg" className="w-full" disabled={cardCount === 0}>
              <Play data-icon="inline-start" />
              Start Study Session
            </Button>
          </CardContent>
        </Card>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight">Cards</h2>
            <AddCardDialog deckId={deck.id} />
          </div>

          {cardCount === 0 ? (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Layers />
                </EmptyMedia>
                <EmptyTitle>No cards yet</EmptyTitle>
                <EmptyDescription>
                  Add flashcards to this deck to start studying.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {deckCards.map((card) => (
                <Card key={card.id} className="h-full">
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium">Front</span>
                      <div className="rounded-lg bg-muted px-3 py-2.5 text-sm">
                        {card.front}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium">Back</span>
                      <div className="rounded-lg bg-muted px-3 py-2.5 text-sm">
                        {card.back}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="gap-2 border-t-0 bg-transparent">
                    <EditCardDialog
                      deckId={deck.id}
                      cardId={card.id}
                      front={card.front}
                      back={card.back}
                    />
                    <DeleteCardDialog deckId={deck.id} cardId={card.id} />
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
