// src/components/guests/AddGuestForm.tsx
//
// Add-a-guest form. On the Free plan this can fail once the 100-guest cap
// (lib/plan.ts canAddGuest) is hit — same upgrade-prompt pattern as the
// checklist and budget forms.

"use client";

import { useState, useTransition } from "react";
import { addGuest } from "@/server/actions/guests";
import { Button, LinkButton } from "@/components/ui/Button";

export function AddGuestForm({ weddingPlanId }: { weddingPlanId: string }) {
  const [name, setName] = useState("");
  const [side, setSide] = useState<"BRIDE" | "GROOM" | "BOTH">("BRIDE");
  const [contact, setContact] = useState("");
  const [plusOne, setPlusOne] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addGuest({ weddingPlanId, name, side, contact, plusOne });
      if (!result.ok) {
        setError(result.error ?? "Something went wrong");
        return;
      }
      setName("");
      setContact("");
      setPlusOne(false);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 border-t border-akoma-ink/10 pt-4">
      <div className="min-w-[160px] flex-1">
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Name</label>
        <input
          type="text"
          required
          placeholder="Guest name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClasses}
        />
      </div>
      <div className="w-32">
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Side</label>
        <select value={side} onChange={(e) => setSide(e.target.value as typeof side)} className={inputClasses}>
          <option value="BRIDE">Bride</option>
          <option value="GROOM">Groom</option>
          <option value="BOTH">Both</option>
        </select>
      </div>
      <div className="min-w-[140px]">
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Contact (optional)</label>
        <input
          type="text"
          placeholder="Phone or email"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className={inputClasses}
        />
      </div>
      <label className="mb-2 flex items-center gap-2 text-sm text-akoma-ink/70">
        <input
          type="checkbox"
          checked={plusOne}
          onChange={(e) => setPlusOne(e.target.checked)}
          className="h-4 w-4 rounded border-akoma-ink/30 text-akoma-green focus:ring-akoma-green"
        />
        +1
      </label>
      <Button type="submit" disabled={isPending} size="sm">
        {isPending ? "Adding…" : "Add guest"}
      </Button>
      {error && (
        <div className="w-full rounded-lg bg-akoma-gold/10 px-3 py-2 text-sm text-akoma-ink">
          {error}{" "}
          <LinkButton href="/pricing" size="sm" variant="secondary" className="ml-2">
            Upgrade to Pro
          </LinkButton>
        </div>
      )}
    </form>
  );
}

const inputClasses =
  "w-full rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green";
