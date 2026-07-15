// src/components/vendors/VendorFilters.tsx
//
// Instant filtering: every select/checkbox updates the URL the moment it
// changes (see hooks/useInstantFilters.ts), which vendors/page.tsx (a
// Server Component) re-reads on each change — no submit button, no full
// page reload. Reads its own current values from useSearchParams() rather
// than receiving them as props, so vendors/page.tsx no longer needs to
// thread all 7 filter values down.

"use client";

import clsx from "clsx";
import { useInstantFilters } from "@/hooks/useInstantFilters";
import { VENDOR_PROGRESS_FILTER_OPTIONS, VENDOR_PROGRESS_LABEL } from "@/lib/vendor-booking-progress";
import { VENDOR_CATEGORY_LABEL } from "@/lib/vendor-category-labels";

const CATEGORIES = Object.entries(VENDOR_CATEGORY_LABEL) as [keyof typeof VENDOR_CATEGORY_LABEL, string][];

const RATING_OPTIONS = [
  { value: "", label: "Any rating" },
  { value: "4", label: "4+ ★" },
  { value: "4.5", label: "4.5+ ★" },
];

const PRICE_OPTIONS = [
  { value: "", label: "Any price" },
  { value: "low", label: "Under GH₵5,000" },
  { value: "mid", label: "GH₵5,000–15,000" },
  { value: "high", label: "GH₵15,000+" },
];

const FILTER_KEYS = ["category", "city", "featured", "withinBudget", "rating", "price", "status"];

export function VendorFilters() {
  const { searchParams, setParam, clearParams, isPending } = useInstantFilters();

  const get = (key: string) => searchParams.get(key) ?? "";
  const hasAnyFilter = FILTER_KEYS.some((key) => searchParams.get(key));

  return (
    <div className={clsx("flex flex-wrap items-end gap-3 transition-opacity", isPending && "opacity-60")}>
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Category</label>
        <select value={get("category")} onChange={(e) => setParam("category", e.target.value)} className={selectClasses}>
          <option value="">All categories</option>
          {CATEGORIES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">City</label>
        <select value={get("city")} onChange={(e) => setParam("city", e.target.value)} className={selectClasses}>
          <option value="">Accra & Kumasi</option>
          <option value="ACCRA">Accra</option>
          <option value="KUMASI">Kumasi</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Listing</label>
        <select value={get("featured")} onChange={(e) => setParam("featured", e.target.value)} className={selectClasses}>
          <option value="">All vendors</option>
          <option value="STANDARD">Standard</option>
          <option value="FEATURED">Featured</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Rating</label>
        <select value={get("rating")} onChange={(e) => setParam("rating", e.target.value)} className={selectClasses}>
          {RATING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Price</label>
        <select value={get("price")} onChange={(e) => setParam("price", e.target.value)} className={selectClasses}>
          {PRICE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">My status</label>
        <select value={get("status")} onChange={(e) => setParam("status", e.target.value)} className={selectClasses}>
          <option value="">Any status</option>
          {VENDOR_PROGRESS_FILTER_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {VENDOR_PROGRESS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-1.5 pb-2.5 text-sm text-akoma-ink/70">
        <input
          type="checkbox"
          checked={get("withinBudget") === "1"}
          onChange={(e) => setParam("withinBudget", e.target.checked ? "1" : null)}
          className="h-4 w-4 rounded border-akoma-ink/30 text-akoma-green focus:ring-akoma-green"
        />
        Within my budget
      </label>
      {hasAnyFilter && (
        <button type="button" onClick={() => clearParams([])} className="pb-2.5 text-sm text-akoma-ink/50 hover:underline">
          Clear
        </button>
      )}
    </div>
  );
}

const selectClasses =
  "rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green";
