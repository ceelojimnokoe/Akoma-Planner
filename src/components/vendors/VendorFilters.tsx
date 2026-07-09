// src/components/vendors/VendorFilters.tsx
//
// Plain GET form — no client JS needed. Submitting re-requests /vendors
// with ?category=&city= query params, which the page reads server-side.
// Filtering doesn't need to feel instantaneous enough to justify a client
// component here.

import Link from "next/link";

const CATEGORIES = [
  "VENUE", "CATERING", "PHOTOGRAPHY", "ATTIRE", "DECOR",
  "MUSIC", "MAKEUP", "TRANSPORT", "CAKE", "OTHER",
] as const;

export function VendorFilters({ category, city }: { category?: string; city?: string }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Category</label>
        <select name="category" defaultValue={category ?? ""} className={selectClasses}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0) + c.slice(1).toLowerCase()}
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
      <button type="submit" className="rounded-lg bg-akoma-green px-4 py-2 text-sm font-medium text-white hover:bg-akoma-green/90">
        Filter
      </button>
      {(category || city) && (
        <Link href="/vendors" className="text-sm text-akoma-ink/50 hover:underline">
          Clear
        </Link>
      )}
    </form>
  );
}

const selectClasses =
  "rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green";
