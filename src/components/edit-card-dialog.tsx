"use client";

import { useState, useTransition, type FormEvent } from "react";
import { SquarePen } from "lucide-react";
import { updateCard } from "@/app/decks/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type EditCardDialogProps = {
  deckId: string;
  cardId: string;
  front: string;
  back: string;
};

export function EditCardDialog({
  deckId,
  cardId,
  front,
  back,
}: EditCardDialogProps) {
  const [open, setOpen] = useState(false);
  const [draftFront, setDraftFront] = useState(front);
  const [draftBack, setDraftBack] = useState(back);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setDraftFront(front);
      setDraftBack(back);
      setError(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await updateCard({
          deckId,
          cardId,
          front: draftFront,
          back: draftBack,
        });
        setOpen(false);
      } catch {
        setError("Could not update card. Please try again.");
      }
    });
  }

  const frontId = `card-front-${cardId}`;
  const backId = `card-back-${cardId}`;
  const canSave = draftFront.trim().length > 0 && draftBack.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" className="flex-1" />}>
        <SquarePen data-icon="inline-start" />
        Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Edit card</DialogTitle>
            <DialogDescription>
              Update the front and back of this card.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor={frontId}>Front</Label>
              <Textarea
                id={frontId}
                value={draftFront}
                onChange={(event) => setDraftFront(event.target.value)}
                maxLength={2000}
                required
                disabled={isPending}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={backId}>Back</Label>
              <Textarea
                id={backId}
                value={draftBack}
                onChange={(event) => setDraftBack(event.target.value)}
                maxLength={2000}
                required
                disabled={isPending}
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isPending || !canSave}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
