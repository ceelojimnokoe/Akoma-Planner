// src/app/(app)/vendors/compare/page.tsx
//
// Wedding Pass comparison view: price range, rating, and city side by
// side for up to 4 vendors selected from the browse grid. Gated with
// requirePass() — a Free user can still select vendors and land here
// (the checkboxes on /vendors are visible to everyone), they just see
// the upgrade prompt instead of the table once they arrive.

import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getCurrentWeddingPlan } from "@/lib/session";
import { requirePass } from "@/lib/plan";
import { formatGHS } from "@/lib/currency";
import { getVendorImage } from "@/lib/vendor-images";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UpgradePrompt } from "@/components/pro/UpgradePrompt";
import { categoryLabel, cityLabel } from "@/components/vendors/VendorCard";
import { LinkButton } from "@/components/ui/Button";

export default async function VendorComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const weddingPlan = await getCurrentWeddingPlan();
  const gate = requirePass(weddingPlan!, "The vendor comparison view");

  const vendorIds = ids?.split(",").filter(Boolean) ?? [];
  const vendors = vendorIds.length
    ? await prisma.vendor.findMany({ where: { id: { in: vendorIds } } })
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-akoma-ink">Compare vendors</h1>
        <p className="mt-1 text-sm text-akoma-ink/60">Price range, rating and city, side by side.</p>
      </div>

      {!gate.allowed ? (
        <UpgradePrompt reason={gate.upgradeReason} />
      ) : vendors.length === 0 ? (
        <Card>
          <p className="text-sm text-akoma-ink/60">
            No vendors selected yet. Go to Vendors, check the &quot;Compare&quot; box on 2–4 listings, then come back here.
          </p>
          <LinkButton href="/vendors" size="sm" className="mt-4">
            Browse vendors
          </LinkButton>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-akoma-ink/10 text-xs uppercase tracking-wide text-akoma-ink/40">
                  <th className="py-2 pr-4 font-medium">Vendor</th>
                  <th className="py-2 pr-4 font-medium">Category</th>
                  <th className="py-2 pr-4 font-medium">City</th>
                  <th className="py-2 pr-4 font-medium">Price range</th>
                  <th className="py-2 pr-4 font-medium">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-akoma-ink/5">
                {vendors.map((v) => (
                  <tr key={v.id}>
                    <td className="py-3 pr-4">
                      <a href={`/vendors/${v.id}`} className="flex items-center gap-3 hover:underline">
                        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-akoma-cream">
                          <Image src={getVendorImage(v)} alt="" fill className="object-cover" />
                        </span>
                        <span className="text-sm font-medium text-akoma-ink">{v.name}</span>
                      </a>
                    </td>
                    <td className="py-3 pr-4 text-sm text-akoma-ink/70">{categoryLabel(v.category)}</td>
                    <td className="py-3 pr-4 text-sm text-akoma-ink/70">{cityLabel(v.city)}</td>
                    <td className="py-3 pr-4 text-sm text-akoma-ink/70">
                      {formatGHS(v.priceLowGHS)} – {formatGHS(v.priceHighGHS)}
                    </td>
                    <td className="py-3 pr-4 text-sm">
                      <Badge tone="gold">★ {v.rating.toFixed(1)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
