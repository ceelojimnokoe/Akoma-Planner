// src/components/vendors/VendorGrid.tsx
//
// Client wrapper around the vendor cards. Its only real job is managing
// "which vendors are checked for comparison" — that selection has to live
// above any individual card, so it can't be server-rendered. The compare
// checkboxes are shown to every plan (visibly-present-but-gated): a Free
// user can select vendors and click through, and /vendors/compare is
// where the actual Pro gate lives.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Vendor } from "@prisma/client";
import { VendorCard } from "@/components/vendors/VendorCard";
import { Button } from "@/components/ui/Button";

export function VendorGrid({ vendors, plan }: { vendors: Vendor[]; plan: "FREE" | "PRO" }) {
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();

  function toggle(vendorId: string) {
    setSelected((prev) =>
      prev.includes(vendorId) ? prev.filter((id) => id !== vendorId) : prev.length < 4 ? [...prev, vendorId] : prev
    );
  }

  function goToCompare() {
    router.push(`/vendors/compare?ids=${selected.join(",")}`);
  }

  return (
    <div className="pb-20">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vendors.map((vendor) => (
          <VendorCard
            key={vendor.id}
            vendor={vendor}
            locked={vendor.isProFeatured && plan === "FREE"}
            selectable
            selected={selected.includes(vendor.id)}
            onToggleSelect={toggle}
          />
        ))}
      </div>

      {selected.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full border border-akoma-ink/10 bg-white px-5 py-3 shadow-lg">
          <span className="text-sm text-akoma-ink/70">{selected.length} vendors selected</span>
          <Button size="sm" onClick={goToCompare}>
            Compare
          </Button>
        </div>
      )}
    </div>
  );
}
