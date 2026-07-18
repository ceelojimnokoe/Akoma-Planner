// src/hooks/useSubmitGuard.ts
//
// Shared duplicate-submission guard for the auth forms (login, signup,
// forgot-password, reset-password) — the one place with a real cost to a
// second, accidental request (a second signup attempt against Supabase's
// rate-limited email sending, a second password-reset email). A plain
// `disabled={isPending}` button alone doesn't fully close this: `isPending`
// only flips true on the *next* render, leaving a small window where a
// fast double-click/double-tap fires the handler twice before that
// render happens. `submittingRef` closes that window synchronously (see
// guard()'s own comment); the cooldown afterwards additionally absorbs
// an immediate retry once the first request has already settled.

"use client";

import { useCallback, useRef, useState } from "react";

const DEFAULT_COOLDOWN_MS = 2000;

export function useSubmitGuard(cooldownMs: number = DEFAULT_COOLDOWN_MS) {
  const submittingRef = useRef(false);
  const [cooldown, setCooldown] = useState(false);

  const guard = useCallback(
    async (run: () => Promise<void>) => {
      if (submittingRef.current || cooldown) return;
      // Synchronous, before any `await` — this is what actually closes
      // the double-click race; React state (`isPending`/`cooldown`)
      // can't, since it only takes effect on the next render.
      submittingRef.current = true;
      try {
        await run();
      } finally {
        submittingRef.current = false;
        setCooldown(true);
        setTimeout(() => setCooldown(false), cooldownMs);
      }
    },
    [cooldown, cooldownMs]
  );

  return { guard, blocked: cooldown };
}
