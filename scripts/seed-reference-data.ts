// scripts/seed-reference-data.ts
//
// Explicit, manual way to run the same idempotent reference-data seed
// (src/lib/reference-data.ts's ensureReferenceDataSeeded()) that the app
// also runs automatically on first read of an empty Vendor/Accommodation/
// TraditionalListItem table — see (app)/layout.tsx. This script exists
// for cases where you'd rather seed explicitly and confirm it (CI, right
// after provisioning a fresh database) instead of waiting for the first
// page load to trigger it.
//
// Safe to re-run any number of times: only ever inserts into a table
// that's completely empty, never touches User/WeddingPlan/Guest/anything
// wedding-specific, and never creates duplicate vendor/accommodation rows.
//
// Run with: npm run seed:reference-data
// (never wired into postinstall/build/deploy)

import { PrismaClient } from "@prisma/client";
import { VENDOR_SEED_DATA, TRADITIONAL_LIST_SEED_DATA, ACCOMMODATION_SEED_DATA } from "../src/lib/reference-data";

const prisma = new PrismaClient();

async function main() {
  const [vendorCount, accommodationCount, traditionalCount] = await Promise.all([
    prisma.vendor.count(),
    prisma.accommodation.count(),
    prisma.traditionalListItem.count(),
  ]);

  console.log(`Current counts — vendors: ${vendorCount}, accommodations: ${accommodationCount}, traditional list items: ${traditionalCount}`);

  if (vendorCount === 0) {
    await prisma.vendor.createMany({ data: VENDOR_SEED_DATA });
    console.log(`  seeded ${VENDOR_SEED_DATA.length} vendors`);
  } else {
    console.log("  vendors table already has rows — left untouched");
  }

  if (accommodationCount === 0) {
    const vendors = await prisma.vendor.findMany({
      where: { name: { in: ["Silver Star Gardens", "Golden Bean Events Centre"] } },
      select: { id: true, name: true },
    });
    const vendorIdByName = new Map(vendors.map((v) => [v.name, v.id]));
    const accommodations = ACCOMMODATION_SEED_DATA.map(({ nearVendorName, ...rest }) => ({
      ...rest,
      nearVendorId: vendorIdByName.get(nearVendorName),
    }));
    await prisma.accommodation.createMany({ data: accommodations });
    console.log(`  seeded ${accommodations.length} accommodations`);
  } else {
    console.log("  accommodations table already has rows — left untouched");
  }

  if (traditionalCount === 0) {
    await prisma.traditionalListItem.createMany({ data: TRADITIONAL_LIST_SEED_DATA });
    console.log(`  seeded ${TRADITIONAL_LIST_SEED_DATA.length} traditional list items`);
  } else {
    console.log("  traditional list items table already has rows — left untouched");
  }

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
