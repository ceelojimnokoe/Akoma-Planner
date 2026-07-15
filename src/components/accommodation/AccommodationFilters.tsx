// src/components/accommodation/AccommodationFilters.tsx
//
// Instant filtering, same pattern as vendors/VendorFilters.tsx (see
// hooks/useInstantFilters.ts) — extracted out of what used to be an
// inline <form method="get"> directly in accommodation/page.tsx. Adds
// price and rating alongside the two filters that already existed
// (city, withinBudget), since Accommodation.priceLowGHS/priceHighGHS/
// rating already exist as columns and just weren't filterable before.
//
// `defaultCity` is the one value that can't be derived client-side —
// accommodation/page.tsx falls back to the wedding plan's own city when
// `?city=` isn't in the URL yet, so this component needs that same
// default passed in to show the right initial selection.

"use client";

import clsx from "clsx";
import { useInstantFilters } from "@/hooks/useInstantFilters";
import type { City } from "@prisma/client";

const RATING_OPTIONS = [
  { value: "", label: "Any rating" },
  { value: "4", label: "4+ ★" },
  { value: "4.5", label: "4.5+ ★" },
];

// Bucket boundaries mirror ACCOMMODATION_PRICE_RANGES in accommodation/page.tsx —
// sized from the real seed data range (GH₵350–2,200/night), not vendors'
// up-front-total scale.
const PRICE_OPTIONS = [
  { value: "", label: "Any price" },
  { value: "low", label: "Under GH₵600/night" },
  { value: "mid", label: "GH₵600–1,200/night" },
  { value: "high", label: "GH₵1,200+/night" },
];

export function AccommodationFilters({ defaultCity }: { defaultCity: City }) {
  const { searchParams, setParam, clearParams, isPending } = useInstantFilters();

  const city = searchParams.get("city") ?? defaultCity;
  const withinBudget = searchParams.get("withinBudget") ?? "";
  const price = searchParams.get("price") ?? "";
  const rating = searchParams.get("rating") ?? "";
  const hasClearableFilter = Boolean(withinBudget || price || rating);

  return (
    <div className={clsx("flex flex-wrap items-end gap-3 transition-opacity", isPending && "opacity-60")}>
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">City</label>
        <select value={city} onChange={(e) => setParam("city", e.target.value)} className={selectClasses}>
          <option value="ACCRA">Accra</option>
          <option value="KUMASI">Kumasi</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Price</label>
        <select value={price} onChange={(e) => setParam("price", e.target.value)} className={selectClasses}>
          {PRICE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Rating</label>
        <select value={rating} onChange={(e) => setParam("rating", e.target.value)} className={selectClasses}>
          {RATING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-1.5 pb-2.5 text-sm text-akoma-ink/70">
        <input
          type="checkbox"
          checked={withinBudget === "1"}
          onChange={(e) => setParam("withinBudget", e.target.checked ? "1" : null)}
          className="h-4 w-4 rounded border-akoma-ink/30 text-akoma-green focus:ring-akoma-green"
        />
        Within my budget
      </label>
      {hasClearableFilter && (
        <button type="button" onClick={() => clearParams(["city"])} className="pb-2.5 text-sm text-akoma-ink/50 hover:underline">
          Clear
        </button>
      )}
    </div>
  );
}

const selectClasses =
  "rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green";
