// src/hooks/useInstantFilters.ts
//
// Shared "update the URL's query string the moment a filter changes"
// logic for VendorFilters.tsx and AccommodationFilters.tsx — both are
// Server Components underneath (vendors/page.tsx, accommodation/page.tsx
// do the actual Prisma filtering, reading these same searchParams), so
// changing the URL via router.replace() triggers a real re-fetch of that
// Server Component with the new filters already applied. No full page
// reload: this is a soft navigation, and { scroll: false } keeps the
// viewport from jumping back to the top on every change.
//
// First useSearchParams-driven live-filter pattern in this app — until
// now every filter here was a plain <form method="get"> requiring a
// submit click (see the header comments this replaces in both consumers).

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function useInstantFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function replace(params: URLSearchParams) {
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  /** Sets or removes a single filter param, preserving every other
   *  currently-set param — this is what makes filters combine instead of
   *  each change wiping out the others. */
  function setParam(name: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(name);
    else params.set(name, value);
    replace(params);
  }

  /** Resets every param except the ones named in `keep` — used for a
   *  "Clear filters" control. Accommodation's clear deliberately keeps
   *  `city` (see accommodation/page.tsx); vendors' clears everything. */
  function clearParams(keep: string[] = []) {
    const params = new URLSearchParams();
    for (const key of keep) {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    }
    replace(params);
  }

  return { searchParams, setParam, clearParams, isPending };
}
