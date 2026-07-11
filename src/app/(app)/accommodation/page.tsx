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
//
// Cards follow the same "image occupies the top, info below" shell as
// VendorCard (components/vendors/VendorCard.tsx) for visual consistency
// across the two listing surfaces.

import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { formatGHS } from "@/lib/currency";
import { getAccommodationImage } from "@/lib/accommodation-images";
import { Badge } from "@/components/ui/Badge";
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
    <div className="mx-auto max-w-6xl space-y-6">
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {accommodations.map((a) => {
            const amenities = a.amenities ? a.amenities.split(",").map((s) => s.trim()).filter(Boolean) : [];
            return (
              <div
                key={a.id}
                className="flex flex-col overflow-hidden rounded-xl border border-akoma-ink/10 bg-white shadow-sm"
              >
                <div className="relative h-44 w-full shrink-0 bg-akoma-cream">
                  <Image src={getAccommodationImage(a)} alt={a.name} fill className="object-cover" />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-akoma-ink">{a.name}</h3>
                    <Badge tone="gold" className="shrink-0">★ {a.rating.toFixed(1)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-akoma-ink/50">
                    {a.distanceFromVenueKm.toFixed(1)} km from {a.nearVendor?.name ?? "the venue"}
                  </p>
                  {a.description && <p className="mt-3 flex-1 text-sm text-akoma-ink/70">{a.description}</p>}
                  {amenities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {amenities.map((amenity) => (
                        <span
                          key={amenity}
                          className="rounded-full bg-akoma-cream px-2.5 py-1 text-xs text-akoma-ink/70"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-akoma-ink">
                      {formatGHS(a.priceLowGHS)}–{formatGHS(a.priceHighGHS)}{" "}
                      <span className="font-normal text-akoma-ink/50">/ night</span>
                    </p>
                    {a.contactPhone && <p className="text-xs text-akoma-ink/50">{a.contactPhone}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
