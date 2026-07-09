// src/components/collaboration/MemberList.tsx
//
// Lists current wedding members and the add-collaborator form. No real
// invite email is sent — see the header comment in
// src/server/actions/collaboration.ts for why, and the note rendered
// right in this form so it's honest in the UI too, not just in code
// comments.

"use client";

import { useState, useTransition } from "react";
import type { WeddingMember, User } from "@prisma/client";
import { addCollaborator, removeCollaborator } from "@/server/actions/collaboration";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type MemberWithUser = WeddingMember & { user: User };

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  PARTNER: "Partner",
  PLANNER: "Planner",
  COLLABORATOR: "Collaborator",
};

export function MemberList({ weddingPlanId, members }: { weddingPlanId: string; members: MemberWithUser[] }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"PARTNER" | "PLANNER" | "COLLABORATOR">("PARTNER");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addCollaborator({ weddingPlanId, name, email, role });
      if (!result.ok) return setError(result.error ?? "Couldn't add collaborator.");
      setName("");
      setEmail("");
    });
  }

  function handleRemove(memberId: string) {
    startTransition(async () => {
      await removeCollaborator(memberId, weddingPlanId);
    });
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-akoma-ink/5">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between py-2.5">
            <div>
              <p className="text-sm font-medium text-akoma-ink">{m.user.name}</p>
              <p className="text-xs text-akoma-ink/50">{m.user.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={m.role === "OWNER" ? "gold" : "neutral"}>{ROLE_LABEL[m.role]}</Badge>
              {m.role !== "OWNER" && (
                <button
                  onClick={() => handleRemove(m.id)}
                  disabled={isPending}
                  className="text-xs text-akoma-ink/40 hover:text-akoma-terracotta"
                >
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="space-y-2 border-t border-akoma-ink/10 pt-4">
        <p className="text-sm font-medium text-akoma-ink">Add a collaborator</p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            required
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-40 rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-52 rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
          >
            <option value="PARTNER">Partner</option>
            <option value="PLANNER">Planner</option>
            <option value="COLLABORATOR">Collaborator</option>
          </select>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Adding…" : "Add"}
          </Button>
        </div>
        <p className="text-xs text-akoma-ink/40">
          This adds them as a collaborator record right away — this MVP doesn&apos;t send a real invite email or have
          separate logins yet (see README).
        </p>
        {error && <p className="text-sm text-akoma-terracotta">{error}</p>}
      </form>
    </div>
  );
}
