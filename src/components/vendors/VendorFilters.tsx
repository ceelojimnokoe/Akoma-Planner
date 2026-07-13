// src/components/vendors/VendorFilters.tsx
//
// Plain GET form — no client JS needed. Submitting re-requests /vendors
// with query params, which the page reads server-side. Filtering doesn't
// need to feel instantaneous enough to justify a client component here.

import Link from "next/link";
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

export function VendorFilters({
  category,
  city,
  featured,
  withinBudget,
  rating,
  price,
  status,
}: {
  category?: string;
  city?: string;
  featured?: string;
  withinBudget?: string;
  rating?: string;
  price?: string;
  status?: string;
}) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Category</label>
        <select name="category" defaultValue={category ?? ""} className={selectClasses}>
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
        <select name="city" defaultValue={city ?? ""} className={selectClasses}>
          <option value="">Accra & Kumasi</option>
          <option value="ACCRA">Accra</option>
          <option value="KUMASI">Kumasi</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Listing</label>
        <select name="featured" defaultValue={featured ?? ""} className={selectClasses}>
          <option value="">All vendors</option>
          <option value="STANDARD">Standard</option>
          <option value="FEATURED">Featured</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Rating</label>
        <select name="rating" defaultValue={rating ?? ""} className={selectClasses}>
          {RATING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Price</label>
        <select name="price" defaultValue={price ?? ""} className={selectClasses}>
          {PRICE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">My status</label>
        <select name="status" defaultValue={status ?? ""} className={selectClasses}>
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
          name="withinBudget"
          value="1"
          defaultChecked={withinBudget === "1"}
          className="h-4 w-4 rounded border-akoma-ink/30 text-akoma-green focus:ring-akoma-green"
        />
        Within my budget
      </label>
      <button type="submit" className="rounded-lg bg-akoma-green px-4 py-2 text-sm font-medium text-white hover:bg-akoma-green/90">
        Filter
      </button>
      {(category || city || featured || withinBudget || rating || price || status) && (
        <Link href="/vendors" className="text-sm text-akoma-ink/50 hover:underline">
          Clear
        </Link>
      )}
    </form>
  );
}

const selectClasses =
  "rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green";
