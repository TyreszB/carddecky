import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, Layers } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDeckForUser, listCardsForUserDeck } from "@/db/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
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
import { Separator } from "@/components/ui/separator";

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

  return (
    <div className="flex flex-1 flex-col gap-8 px-6 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Button variant="ghost" size="sm" className="w-fit" render={<Link href="/dashboard" />}>
          <ArrowLeft data-icon="inline-start" />
          Back to dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {deck.title}
            </CardTitle>
            {deck.description ? (
              <CardDescription>{deck.description}</CardDescription>
            ) : null}
            <CardDescription>
              Updated {new Date(deck.updatedAt).toLocaleDateString("en-US")}
            </CardDescription>
            <CardAction>
              <Badge variant="secondary">
                {deckCards.length} {deckCards.length === 1 ? "card" : "cards"}
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>

        <Separator />

        {deckCards.length === 0 ? (
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
          <div className="flex flex-col gap-4">
            {deckCards.map((card, index) => (
              <Card key={card.id}>
                <CardHeader className="border-b">
                  <CardDescription>Card {index + 1}</CardDescription>
                  <CardTitle className="text-base font-medium">
                    {card.front}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-(--card-spacing)">
                  <CardDescription>{card.back}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
