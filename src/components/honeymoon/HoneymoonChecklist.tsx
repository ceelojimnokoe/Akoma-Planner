// src/components/honeymoon/HoneymoonChecklist.tsx
//
// Toggle-only — no add/remove UI for this list (not requested; keeps
// scope tight, matches the 7 fixed defaults from lib/honeymoon-defaults.ts).

"use client";

import { useTransition } from "react";
import { toggleHoneymoonChecklistItem } from "@/server/actions/honeymoon";
import { Checkbox } from "@/components/ui/Checkbox";

export interface HoneymoonChecklistItemLike {
  id: string;
  title: string;
  done: boolean;
}

export function HoneymoonChecklist({ items }: { items: HoneymoonChecklistItemLike[] }) {
  const [, startTransition] = useTransition();

  function toggle(item: HoneymoonChecklistItemLike) {
    startTransition(async () => {
      await toggleHoneymoonChecklistItem(item.id, !item.done);
    });
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-2.5">
          <Checkbox checked={item.done} onChange={() => toggle(item)} ariaLabel={item.title} />
          <span className={item.done ? "text-sm text-akoma-ink/40 line-through" : "text-sm text-akoma-ink/80"}>{item.title}</span>
        </li>
      ))}
    </ul>
  );
}
