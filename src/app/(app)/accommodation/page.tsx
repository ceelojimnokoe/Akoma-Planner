// src/app/(app)/accommodation/page.tsx
//
// Accommodation finder: lodging for out-of-town family, sorted by
// distance from the venue (nearVendorId links each listing back to a
// seeded venue — see prisma/schema.prisma). Free for every plan — Pro
// widening this to more results/filters is a real idea but deliberately
// deferred, not built yet (see LEARNING.md); don't invent a fake
// free/Pro split here just because most other tools have one.
//
// Accommodation is global reference data with no per-wedding "side"
// assignment field, so "by side" is handled as a workflow — the couple
// filters/sorts this same shared list and decides what to share with
// each side — rather than a persisted per-listing tag.

import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { formatGHS } from "@/lib/currency";
import { Card } from "@/components/ui/Card";
import type { City } from "@prisma/client";

export default async function AccommodationPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city: cityParam } = await searchParams;
  const weddingPlan = await getCurrentWeddingPlan();
  const city = (cityParam as City) ?? weddingPlan!.city;

  const accommodations = await prisma.accommodation.findMany({
    where: { city },
    include: { nearVendor: true },
    orderBy: { distanceFromVenueKm: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-akoma-ink">Accommodation</h1>
        <p className="mt-1 text-sm text-akoma-ink/60">
          Lodging for out-of-town family, closest to the venue first. Share different options with each side
          depending on budget and who&apos;s traveling.
        </p>
      </div>

      <form method="get" className="flex items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-akoma-ink/70">City</label>
          <select
            name="city"
            defaultValue={city}
            className="rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
          >
            <option value="ACCRA">Accra</option>
            <option value="KUMASI">Kumasi</option>
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-akoma-green px-4 py-2 text-sm font-medium text-white hover:bg-akoma-green/90">
          Update
        </button>
      </form>

      {accommodations.length === 0 ? (
        <p className="py-8 text-center text-sm text-akoma-ink/50">No accommodation listings for this city yet.</p>
      ) : (
        <div className="space-y-3">
          {accommodations.map((a) => (
            <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-akoma-ink">{a.name}</p>
                <p className="text-xs text-akoma-ink/50">
                  {a.distanceFromVenueKm.toFixed(1)} km from {a.nearVendor?.name ?? "the venue"}
                  {a.contactPhone && ` · ${a.contactPhone}`}
                </p>
              </div>
              <p className="text-sm font-medium text-akoma-ink">
                {formatGHS(a.priceLowGHS)} – {formatGHS(a.priceHighGHS)}{" "}
                <span className="font-normal text-akoma-ink/50">/ night</span>
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
